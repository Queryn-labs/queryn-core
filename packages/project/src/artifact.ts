/**
 * Artifact registration and publishing for the folder-based project format.
 * Payloads enter project-owned paths only after canonical and size checks.
 */
// see queryn-docs/docs/adr/adr-0003-folder-based-projects.md
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactDescriptor,
  ArtifactPayload,
  QuerynProject,
  PublishArtifactInput,
  RegisterArtifactInput
} from "@queryn/types";
import { ARTIFACTS_DIR, QUERYN_DIR } from "./constants.js";
import { detectMediaType } from "./media.js";
import { normalizeProjectRelativePath, resolveProjectPath, toProjectRelativePath } from "./path.js";
import { writeFileAtomic } from "./atomic.js";
import { slugifyIdentifier } from "./slug.js";

const defaultMaxPayloadBytes = 256 * 1024 * 1024;

export async function registerExistingArtifact(
  project: QuerynProject,
  input: RegisterArtifactInput,
  now = new Date()
): Promise<ArtifactDescriptor> {
  assertNamespacedId(input.type, "artifact type");
  assertArtifactContext(input.context);
  const projectRelativePath = normalizeProjectRelativePath(input.projectRelativePath);
  const filePath = resolveProjectPath(project.rootPath, projectRelativePath);
  await assertCanonicalInside(project.rootPath, filePath, "Artifact payload escapes project.");
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error("Artifact payload must be a regular file.");
  }

  const id = normalizeArtifactId(input.id ?? createArtifactId(input.title ?? path.basename(filePath)));
  const payload = await describePayload(project.rootPath, filePath, projectRelativePath);
  const descriptor: ArtifactDescriptor = {
    schemaVersion: "1",
    id,
    type: input.type,
    title: input.title,
    createdAt: now.toISOString(),
    payloads: [payload],
    provenance: input.provenance ?? { source: "manual" },
    context: input.context,
    tags: input.tags,
    metadata: input.metadata
  };

  await writeArtifactDescriptor(project.rootPath, descriptor);
  return descriptor;
}

export async function publishArtifact(
  project: QuerynProject,
  input: PublishArtifactInput,
  now = new Date()
): Promise<ArtifactDescriptor> {
  assertNamespacedId(input.type, "artifact type");
  assertArtifactContext(input.context);
  if (input.payloads.length === 0) {
    throw new Error("Artifact requires at least one payload.");
  }

  const id = normalizeArtifactId(input.id ?? createArtifactId(input.title ?? input.type));
  const finalRelativeDirectory = `${ARTIFACTS_DIR}/data/${id}`;
  const finalDirectory = resolveProjectPath(project.rootPath, finalRelativeDirectory);
  const stagingDirectory = path.join(project.rootPath, QUERYN_DIR, "staging", `artifact-${id}-${randomUUID()}`);
  const maxPayloadBytes = input.maxPayloadBytes ?? defaultMaxPayloadBytes;
  const seenNames = new Set<string>();
  let finalDirectoryCreated = false;

  await mkdir(stagingDirectory, { recursive: true });

  try {
    const stagedPayloads: Array<{ stagedPath: string; relativeName: string; role?: string; mediaType?: string }> = [];
    for (const candidate of input.payloads) {
      const relativeSource = normalizeProjectRelativePath(candidate.path);
      const sourcePath = resolveInside(input.outboxPath, relativeSource);
      await assertCanonicalInside(input.outboxPath, sourcePath, "Artifact payload escapes outbox through a symlink.");
      const sourceStat = await lstat(sourcePath);
      if (sourceStat.isSymbolicLink() || !sourceStat.isFile()) {
        throw new Error(`Artifact payload must be a regular non-symlink file: ${candidate.path}`);
      }
      if (sourceStat.size > maxPayloadBytes) {
        throw new Error(`Artifact payload exceeds ${maxPayloadBytes} bytes: ${candidate.path}`);
      }

      const relativeName = uniquePayloadName(path.basename(relativeSource), seenNames);
      const stagedPath = path.join(stagingDirectory, relativeName);
      await copyFile(sourcePath, stagedPath);
      stagedPayloads.push({ stagedPath, relativeName, role: candidate.role, mediaType: candidate.mediaType });
    }

    await assertNoSymlinkPath(project.rootPath, path.dirname(finalDirectory));
    await mkdir(path.dirname(finalDirectory), { recursive: true });
    try {
      await lstat(finalDirectory);
      throw new Error(`Artifact payload directory already exists: ${finalRelativeDirectory}`);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
    await rename(stagingDirectory, finalDirectory);
    finalDirectoryCreated = true;

    const payloads = [] as unknown as ArtifactDescriptor["payloads"];
    for (const staged of stagedPayloads) {
      const finalPath = path.join(finalDirectory, staged.relativeName);
      const payload = await describePayload(
        project.rootPath,
        finalPath,
        `${finalRelativeDirectory}/${staged.relativeName}`,
        staged.mediaType,
        staged.role
      );
      if (input.allowedMediaTypes?.length && !input.allowedMediaTypes.includes(payload.mediaType)) {
        throw new Error(`Artifact media type ${payload.mediaType} is not allowed for ${input.type}.`);
      }
      payloads.push(payload);
    }

    const descriptor: ArtifactDescriptor = {
      schemaVersion: "1",
      id,
      type: input.type,
      title: input.title,
      createdAt: now.toISOString(),
      payloads,
      provenance: input.provenance,
      context: input.context,
      tags: input.tags,
      metadata: input.metadata
    };
    await writeArtifactDescriptor(project.rootPath, descriptor);
    return descriptor;
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true }).catch(() => undefined);
    if (finalDirectoryCreated) await rm(finalDirectory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readArtifact(rootPath: string, artifactId: string): Promise<ArtifactDescriptor> {
  const descriptorPath = artifactDescriptorPath(rootPath, normalizeArtifactId(artifactId));
  return JSON.parse(await readFile(descriptorPath, "utf8")) as ArtifactDescriptor;
}

export async function listArtifacts(rootPath: string): Promise<ArtifactDescriptor[]> {
  const descriptorDirectory = path.join(rootPath, ARTIFACTS_DIR);
  let entries;
  try {
    entries = await readdir(descriptorDirectory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const descriptors = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => readArtifact(rootPath, entry.name.slice(0, -5)))
  );
  return descriptors.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function verifyArtifact(rootPath: string, artifactId: string): Promise<{ valid: boolean; issues: string[] }> {
  const artifact = await readArtifact(rootPath, artifactId);
  const issues: string[] = [];

  for (const payload of artifact.payloads) {
    try {
      const filePath = resolveProjectPath(rootPath, payload.path);
      const described = await describePayload(rootPath, filePath, payload.path, payload.mediaType, payload.role);
      if (described.size !== payload.size) {
        issues.push(`${payload.path}: size changed.`);
      }
      if (described.sha256 !== payload.sha256) {
        issues.push(`${payload.path}: sha256 changed.`);
      }
    } catch (error) {
      issues.push(`${payload.path}: ${error instanceof Error ? error.message : "missing payload"}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

async function writeArtifactDescriptor(rootPath: string, descriptor: ArtifactDescriptor): Promise<void> {
  await writeFileAtomic(artifactDescriptorPath(rootPath, descriptor.id), `${JSON.stringify(descriptor, null, 2)}\n`);
}

function artifactDescriptorPath(rootPath: string, artifactId: string): string {
  return path.join(rootPath, ARTIFACTS_DIR, `${artifactId}.json`);
}

async function describePayload(
  rootPath: string,
  filePath: string,
  projectRelativePath: string,
  mediaType?: string,
  role?: string
): Promise<ArtifactPayload> {
  const fileStat = await stat(filePath);
  const data = await readFilePrefix(filePath, Math.min(fileStat.size, 1024 * 1024));
  const inspectedMediaType = inspectMediaType(filePath, data, data.byteLength === fileStat.size);
  if (mediaType && isVerifiableMediaType(mediaType) && inspectedMediaType !== mediaType) {
    throw new Error(`Artifact MIME mismatch: declared ${mediaType}, detected ${inspectedMediaType ?? "unknown"}.`);
  }
  return {
    path: normalizeProjectRelativePath(projectRelativePath || toProjectRelativePath(rootPath, filePath)),
    mediaType: mediaType ?? inspectedMediaType ?? detectMediaType(filePath) ?? "application/octet-stream",
    role,
    size: fileStat.size,
    sha256: await hashFile(filePath)
  };
}

function inspectMediaType(filePath: string, data: Buffer, complete: boolean): string | undefined {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WAVE") return "audio/wav";
  if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (data.length >= 5 && data.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && [0x03, 0x05, 0x07].includes(data[2]) && [0x04, 0x06, 0x08].includes(data[3])) return "application/zip";
  if (data.length >= 3 && data.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (data.length >= 12 && data.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (data.includes(0)) return undefined;
  const text = data.toString("utf8");
  if (Buffer.from(text, "utf8").length !== data.length) return undefined;
  const trimmed = text.trimStart();
  if (/^<svg(?:\s|>)/i.test(trimmed) || /^<\?xml[\s\S]*?<svg(?:\s|>)/i.test(trimmed)) return "image/svg+xml";
  const extensionType = detectMediaType(filePath);
  if (extensionType === "application/json") {
    if (!complete) return extensionType;
    try { JSON.parse(text); return extensionType; } catch { return undefined; }
  }
  if (extensionType?.startsWith("text/") || extensionType === "application/x-ndjson" || extensionType === "application/xml") return extensionType;
  return "text/plain";
}

function isVerifiableMediaType(mediaType: string): boolean {
  return new Set([
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
    "audio/wav", "audio/mpeg", "video/mp4", "application/pdf", "application/zip",
    "application/json", "text/plain", "text/markdown"
  ]).has(mediaType);
}

function resolveInside(rootPath: string, relativePath: string): string {
  const root = path.resolve(rootPath);
  const resolved = path.resolve(root, ...relativePath.split("/"));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Artifact payload escapes outbox.");
  }
  return resolved;
}

async function assertCanonicalInside(rootPath: string, filePath: string, message: string): Promise<void> {
  const [root, candidate] = await Promise.all([realpath(rootPath), realpath(filePath)]);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) throw new Error(message);
}

async function assertNoSymlinkPath(rootPath: string, targetPath: string): Promise<void> {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Artifact destination escapes project.");
  let cursor = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    try {
      const value = await lstat(cursor);
      if (value.isSymbolicLink()) throw new Error("Artifact destination contains a symlink.");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") break;
      throw error;
    }
  }
}

function normalizeArtifactId(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    throw new Error("Invalid artifact id.");
  }
  return value;
}

function createArtifactId(value: string): string {
  return `${slugifyIdentifier(value) || "artifact"}-${randomUUID()}`;
}

function assertNamespacedId(value: string, label: string): void {
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertArtifactContext(context: RegisterArtifactInput["context"] | PublishArtifactInput["context"]): void {
  if (context === undefined) return;
  if (!context || typeof context !== "object" || !["none", "automatic", "declarative", "custom"].includes((context as { mode?: string }).mode ?? "")) {
    throw new Error("Invalid artifact context policy.");
  }
  if (context.mode === "custom" && (!context.providerId || !/^[a-z0-9][a-z0-9._-]+$/.test(context.providerId))) {
    throw new Error("Custom artifact context requires a namespaced provider id.");
  }
  if (context.fields && (!Array.isArray(context.fields) || context.fields.some((field) => typeof field !== "string" || !field))) {
    throw new Error("Artifact context fields must be non-empty strings.");
  }
  if (context.template !== undefined && typeof context.template !== "string") throw new Error("Artifact context template must be a string.");
}

async function readFilePrefix(filePath: string, maxBytes: number): Promise<Buffer> {
  if (maxBytes <= 0) return Buffer.alloc(0);
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally { await handle.close(); }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function uniquePayloadName(name: string, seen: Set<string>): string {
  const safeName = name.replace(/[\\/]/g, "-") || "payload";
  const extension = path.extname(safeName);
  const base = path.basename(safeName, extension);
  let candidate = safeName;
  let index = 2;
  while (seen.has(candidate)) {
    candidate = `${base}-${index}${extension}`;
    index += 1;
  }
  seen.add(candidate);
  return candidate;
}
