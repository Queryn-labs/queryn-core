/**
 * Project lifecycle and overview operations for folder-based Queryn projects.
 * A manifest is the source of truth, while known directories remain reconstructible.
 */
// see queryn-docs/docs/adr/adr-0003-folder-based-projects.md
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createManifest, readManifest, serializeManifest, type CreateManifestInput } from "@queryn/manifest";
import type { QuerynProject, ProjectOverview, ValidationIssue } from "@queryn/types";
import { assertValidManifest, validateManifest, validateProjectStructure } from "@queryn/validation";
import { getErrorMessage } from "./errors.js";
import { listNotes } from "./note.js";
import { listAssets } from "./asset.js";
import { MANIFEST_FILE, QUERYN_PROJECT_DIRS } from "./constants.js";

export interface CreateProjectInput extends CreateManifestInput {
  rootPath: string;
}

export async function createProject(input: CreateProjectInput): Promise<QuerynProject> {
  const manifest = createManifest(input);

  try {
    await access(path.join(input.rootPath, MANIFEST_FILE));
    throw new Error("Project manifest already exists.");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  try {
    const entries = await readdir(input.rootPath);
    if (entries.length) throw new Error("Project directory is not empty. Open an existing project or choose an empty directory.");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  await mkdir(input.rootPath, { recursive: true });
  const projectDirectories = manifest.formatVersion === "0.2"
    ? QUERYN_PROJECT_DIRS
    : (["notes", "assets", ".queryn"] as const);
  await Promise.all(projectDirectories.map((directory) => mkdir(path.join(input.rootPath, directory), { recursive: true })));

  await writeFile(path.join(input.rootPath, MANIFEST_FILE), serializeManifest(manifest), "utf8");

  return { rootPath: input.rootPath, manifest };
}

export async function openProject(rootPath: string): Promise<QuerynProject> {
  const manifest = await readManifest(rootPath);
  assertValidManifest(manifest);

  // A manifest proves this is a Queryn project; its derived state is safe to
  // recreate and must never be required for portability.
  const projectDirectories = manifest.formatVersion === "0.2"
    ? QUERYN_PROJECT_DIRS
    : (["notes", "assets", ".queryn"] as const);
  await Promise.all(projectDirectories.map((directory) => mkdir(path.join(rootPath, directory), { recursive: true })));

  const structure = await validateProjectStructure(rootPath, manifest.formatVersion);
  if (!structure.valid) {
    throw new Error(structure.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }

  return { rootPath, manifest };
}

export async function getProjectOverview(rootPath: string): Promise<ProjectOverview> {
  const issues: ValidationIssue[] = [];
  let manifest: ProjectOverview["manifest"];

  try {
    const candidate = await readManifest(rootPath);
    const manifestValidation = validateManifest(candidate);
    if (manifestValidation.valid) {
      manifest = candidate;
    } else {
      issues.push(...manifestValidation.issues);
    }
  } catch (error) {
    issues.push({ path: MANIFEST_FILE, message: getErrorMessage(error) });
  }

  const structureValidation = await validateProjectStructure(rootPath, manifest?.formatVersion ?? "0.1");
  issues.push(...structureValidation.issues);

  const [notes, assets] = await Promise.all([listNotes(rootPath), listAssets(rootPath)]);

  return {
    rootPath,
    manifest,
    validation: {
      valid: issues.length === 0,
      issues
    },
    counts: {
      notes: notes.length,
      assets: assets.length
    },
    recentNotes: notes.slice(0, 5),
    recentAssets: assets.slice(0, 5),
    notes,
    assets
  };
}
