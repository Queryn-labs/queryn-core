import { appendFile, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createNote,
  createArtifactRelation,
  createProject,
  createProjectFolder,
  createSession,
  forkSession,
  getProjectOverview,
  importAsset,
  listAssets,
  listNotes,
  listProjectLinks,
  listProjectTree,
  moveProjectFolder,
  openProject,
  appendSessionEvent,
  inspectProjectMigration,
  inspectProjectAdoption,
  adoptProject,
  updateSession,
  listArtifactRelations,
  listArtifacts,
  publishArtifact,
  listSessions,
  migrateProject,
  readNote,
  readSession,
  readSessionEvents,
  registerExistingArtifact,
  updateNote,
  updateNoteDocument,
  verifyArtifact
} from "./index.js";
import { slugify, slugifyIdentifier } from "./slug.js";

interface SlugVector {
  input: string;
  output: string;
}

interface SlugVectors {
  slugify: SlugVector[];
  slugifyIdentifier: SlugVector[];
}

const slugVectorsPath = fileURLToPath(new URL("../../../../queryn-spec/contract/slug-vectors.json", import.meta.url));
const slugVectors = JSON.parse(readFileSync(slugVectorsPath, "utf8")) as SlugVectors;
const createdRoots: string[] = [];

afterEach(async () => {
  await Promise.all(createdRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("slugify contract", () => {
  it("matches the shared queryn-spec slugify vectors", () => {
    expect(slugVectors.slugify.length).toBeGreaterThan(0);
    for (const vector of slugVectors.slugify) {
      expect(slugify(vector.input)).toBe(vector.output);
    }
  });

  it("matches the shared queryn-spec identifier vectors", () => {
    expect(slugVectors.slugifyIdentifier.length).toBeGreaterThan(0);
    for (const vector of slugVectors.slugifyIdentifier) {
      expect(slugifyIdentifier(vector.input)).toBe(vector.output);
    }
  });
});

describe("project operations", () => {
  it("creates and opens a project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const project = await openProject(rootPath);

    expect(project.manifest.id).toBe("test-project");
    expect(project.manifest.name).toBe("Test Project");
    expect(project.manifest.formatVersion).toBe("0.2");
    await expect(readFile(path.join(rootPath, "artifacts", "missing.json"), "utf8")).rejects.toThrow();
  });

  it("recreates disposable .queryn state when opening a known project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await rm(path.join(rootPath, ".queryn"), { recursive: true, force: true });

    const project = await openProject(rootPath);
    expect(project.manifest.id).toBe("test-project");
    expect((await stat(path.join(rootPath, ".queryn"))).isDirectory()).toBe(true);
  });

  it("does not silently initialize a non-empty folder as a project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    await writeFile(path.join(rootPath, "unrelated.txt"), "keep me", "utf8");

    await expect(createProject({ rootPath, id: "test-project", name: "Test Project" })).rejects.toThrow("not empty");
    expect(await readFile(path.join(rootPath, "unrelated.txt"), "utf8")).toBe("keep me");
    await expect(readFile(path.join(rootPath, "queryn.json"), "utf8")).rejects.toThrow();
  });

  it("registers an existing project file as an artifact", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(rootPath, "notes", "source.md"), "# Source\n", "utf8");

    const artifact = await registerExistingArtifact(project, {
      id: "source-note",
      type: "queryn.note",
      title: "Source",
      projectRelativePath: "notes/source.md",
      context: { mode: "automatic" }
    });

    expect(artifact.payloads[0].path).toBe("notes/source.md");
    expect(artifact.payloads[0].mediaType).toBe("text/markdown");
    expect(artifact.payloads[0].sha256).toHaveLength(64);
    expect((await listArtifacts(rootPath)).map((item) => item.id)).toEqual(["source-note"]);
    expect(await verifyArtifact(rootPath, "source-note")).toEqual({ valid: true, issues: [] });
    await expect(registerExistingArtifact(project, {
      type: "queryn.invalid-context", projectRelativePath: "notes/source.md", context: { mode: "custom" } as never
    })).rejects.toThrow("namespaced provider id");
  });

  it("publishes outbox payloads under an atomic artifact directory", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    const outboxPath = await mkdtemp(path.join(os.tmpdir(), "queryn-outbox-"));
    createdRoots.push(rootPath, outboxPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const wav = Buffer.alloc(44);
    wav.write("RIFF", 0, "ascii");
    wav.writeUInt32LE(36, 4);
    wav.write("WAVEfmt ", 8, "ascii");
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8_000, 24);
    wav.writeUInt32LE(16_000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36, "ascii");
    await writeFile(path.join(outboxPath, "voice.wav"), wav);

    const artifact = await publishArtifact(project, {
      id: "voice-1",
      type: "queryn.audio",
      title: "Voice",
      outboxPath,
      payloads: [{ path: "voice.wav", mediaType: "audio/wav", role: "primary" }],
      provenance: {
        source: "operation",
        toolId: "queryn.example.tts",
        operationId: "queryn.example.tts.synthesize",
        runId: "run-1"
      },
      context: { mode: "none" }
    });

    expect(artifact.payloads[0].path).toBe("artifacts/data/voice-1/voice.wav");
    const published = await readFile(path.join(rootPath, artifact.payloads[0].path));
    expect(published.subarray(0, 4).toString("ascii")).toBe("RIFF");
  });

  it("rejects a false declared MIME and rolls back final artifact data", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    const outboxPath = await mkdtemp(path.join(os.tmpdir(), "queryn-outbox-"));
    createdRoots.push(rootPath, outboxPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(outboxPath, "fake.wav"), "this is not audio", "utf8");
    await expect(publishArtifact(project, {
      id: "fake-audio", type: "queryn.audio", outboxPath,
      payloads: [{ path: "fake.wav", mediaType: "audio/wav" }], provenance: { source: "operation" }
    })).rejects.toThrow("MIME mismatch");
    await expect(readFile(path.join(rootPath, "artifacts", "data", "fake-audio", "fake.wav"))).rejects.toThrow();
  });

  it("rejects an oversized payload before copying it into the project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    const outboxPath = await mkdtemp(path.join(os.tmpdir(), "queryn-outbox-"));
    createdRoots.push(rootPath, outboxPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(outboxPath, "large.txt"), "12345", "utf8");
    await expect(publishArtifact(project, {
      id: "too-large", type: "queryn.text", outboxPath,
      payloads: [{ path: "large.txt", mediaType: "text/plain" }],
      provenance: { source: "operation" }, maxPayloadBytes: 4
    })).rejects.toThrow("exceeds 4 bytes");
    await expect(readFile(path.join(rootPath, "artifacts", "data", "too-large", "large.txt"))).rejects.toThrow();
  });

  it("rejects traversal and symlink payloads from an outbox", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    const outboxPath = await mkdtemp(path.join(os.tmpdir(), "queryn-outbox-"));
    createdRoots.push(rootPath, outboxPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });

    await expect(
      publishArtifact(project, {
        id: "bad",
        type: "queryn.file",
        outboxPath,
        payloads: [{ path: "../outside.txt" }],
        provenance: { source: "operation" }
      })
    ).rejects.toThrow("Path traversal");

    if (process.platform !== "win32") {
      const outsidePath = await mkdtemp(path.join(os.tmpdir(), "queryn-outside-"));
      createdRoots.push(outsidePath);
      await writeFile(path.join(outsidePath, "secret.txt"), "secret", "utf8");
      await symlink(outsidePath, path.join(outboxPath, "linked"), "dir");
      await expect(
        publishArtifact(project, {
          id: "symlink-parent",
          type: "queryn.file",
          outboxPath,
          payloads: [{ path: "linked/secret.txt" }],
          provenance: { source: "operation" }
        })
      ).rejects.toThrow("symlink");
    }
  });

  it("persists portable session events with stable sequence numbers", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const session = await createSession(project, { id: "research", title: "Research", goal: "Find evidence" });
    await appendSessionEvent(rootPath, session.id, { type: "user-message", data: { text: "Start" } });
    await appendSessionEvent(rootPath, session.id, { type: "plan", data: { steps: [] } });
    await expect(appendSessionEvent(rootPath, session.id, { type: "unknown" as never, data: {} })).rejects.toThrow("Invalid session event type");

    const events = await readSessionEvents(rootPath, session.id);
    expect(events.map((event) => event.sequence)).toEqual([0, 1]);
    expect((await listSessions(rootPath))[0].goal).toBe("Find evidence");
  });

  it("generates portable ids for sessions and artifacts with non-Latin titles", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "localized-project", name: "Localized Project" });
    await rm(path.join(rootPath, "sessions"), { recursive: true, force: true });
    const session = await createSession(project, { title: "Разобрать архитектуру трансформера" });
    const note = await createNote(project, { title: "Архитектура трансформера", body: "Контекст" });
    const artifact = await registerExistingArtifact(project, {
      type: "queryn.note",
      title: note.title,
      projectRelativePath: note.relativePath
    });

    expect(session.id).toMatch(/^session-[a-f0-9-]{36}$/);
    expect((await stat(path.join(rootPath, "sessions", session.id))).isDirectory()).toBe(true);
    expect(artifact.id).toMatch(/^artifact-[a-f0-9-]{36}$/);
    expect((await listSessions(rootPath))[0].title).toBe("Разобрать архитектуру трансформера");
  });

  it("serializes concurrent events inside one session", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const session = await createSession(project, { id: "parallel", title: "Parallel work" });
    await Promise.all(Array.from({ length: 20 }, (_, index) => appendSessionEvent(rootPath, session.id, {
      type: "operation-result", data: { index }
    })));

    const events = await readSessionEvents(rootPath, session.id);
    expect(events.map((event) => event.sequence)).toEqual(Array.from({ length: 20 }, (_, index) => index));
    expect(new Set(events.map((event) => event.id)).size).toBe(20);
  });

  it("forks a session through the selected response without changing the source", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "session-fork", name: "Session fork" });
    const source = await createSession(project, { title: "Research", goal: "Find evidence", memoryMode: "full" });
    const user = await appendSessionEvent(rootPath, source.id, { type: "user-message", data: { content: "Question" } });
    const answer = await appendSessionEvent(rootPath, source.id, { type: "assistant-message", data: { content: "Answer" } });
    await appendSessionEvent(rootPath, source.id, { type: "user-message", data: { content: "Later question" } });

    const forked = await forkSession(project, { sourceSessionId: source.id, throughEventId: answer.id });
    const forkedEvents = await readSessionEvents(rootPath, forked.id);
    expect(forked.title).toBe("Ответвление · Research");
    expect(forked.goal).toBe(source.goal);
    expect(forked.memoryMode).toBe("full");
    expect(forkedEvents.map((event) => event.type)).toEqual(["user-message", "assistant-message"]);
    expect(forkedEvents.map((event) => event.data.content)).toEqual(["Question", "Answer"]);
    expect(forkedEvents.map((event) => event.sessionId)).toEqual([forked.id, forked.id]);
    expect(forkedEvents.every((event) => ![user.id, answer.id].includes(event.id))).toBe(true);
    expect(await readSessionEvents(rootPath, source.id)).toHaveLength(3);
  });

  it("recovers an interrupted trailing session event before the next append", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "session-recovery", name: "Session recovery", formatVersion: "0.2" });
    const session = await createSession(project, { id: "recovery", title: "Recovery" });
    await appendSessionEvent(rootPath, session.id, { type: "user-message", data: { text: "Complete" } });
    await appendFile(path.join(rootPath, "sessions", session.id, "events.jsonl"), '{"schemaVersion":"1","id":"interrupted"');
    expect(await readSessionEvents(rootPath, session.id)).toHaveLength(1);
    await appendSessionEvent(rootPath, session.id, { type: "status", data: { recovered: true } });
    const events = await readSessionEvents(rootPath, session.id);
    expect(events.map((event) => event.sequence)).toEqual([0, 1]);
    expect(events.map((event) => event.type)).toEqual(["user-message", "status"]);
  });

  it("links arbitrary artifact types through namespaced relations", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(rootPath, "notes", "one.md"), "one", "utf8");
    await writeFile(path.join(rootPath, "notes", "two.md"), "two", "utf8");
    const one = await registerExistingArtifact(project, { id: "one", type: "custom.one", projectRelativePath: "notes/one.md" });
    const two = await registerExistingArtifact(project, { id: "two", type: "custom.two", projectRelativePath: "notes/two.md" });
    const relation = await createArtifactRelation(rootPath, { from: { artifactId: one.id }, to: { artifactId: two.id }, type: "study.explains" });
    expect((await listArtifactRelations(rootPath, one.id)).map((item) => item.id)).toEqual([relation.id]);
  });

  it("dry-runs and applies an explicit 0.1 to 0.2 migration", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);
    await createProject({ rootPath, id: "legacy", name: "Legacy", formatVersion: "0.1" });

    const plan = await inspectProjectMigration(rootPath);
    const dryRun = await migrateProject(rootPath, { dryRun: true });
    expect(plan.required).toBe(true);
    expect(dryRun.manifest.formatVersion).toBe("0.2");
    await expect(readFile(path.join(rootPath, "artifacts", "anything"), "utf8")).rejects.toThrow();

    const migrated = await migrateProject(rootPath);
    expect(migrated.backupPath).toContain("0.1-to-0.2");
    expect((await openProject(rootPath)).manifest.formatVersion).toBe("0.2");
    expect((await inspectProjectMigration(rootPath)).required).toBe(false);
  });

  it("creates a markdown note in notes", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const note = await createNote(project, { title: "First Note", body: "Body." });
    const content = await readFile(note.path, "utf8");

    expect(note.id).toBe("first-note");
    expect(content).toContain("title: First Note");
    expect(content).not.toContain("# First Note");
    expect(content).toContain("Body.");
  });

  it("creates folders and notes inside nested project folders", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await createProjectFolder(project, { scope: "notes", name: "Lectures" });
    const note = await createNote(project, { title: "Nested Note", body: "Body.", folderRelativePath: "Lectures" });

    expect(note.relativePath).toBe("notes/Lectures/nested-note.md");
    await expect(createProjectFolder(project, { scope: "notes", parentRelativePath: "../outside", name: "Bad" })).rejects.toThrow(
      "Path traversal"
    );
  });

  it("reads and updates note content", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const note = await createNote(project, { title: "Editable Note", body: "Draft." });
    const content = await readNote(rootPath, note.relativePath);

    expect(content.body).toContain("Draft.");

    const updated = await updateNote(rootPath, note.relativePath, content.content.replace("Draft.", "Published."));
    const raw = await readFile(note.path, "utf8");

    expect(updated.body).toContain("Published.");
    expect(raw).toContain("updatedAt:");
  });

  it("updates note document metadata and body without exposing frontmatter to the editor body", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const note = await createNote(project, { title: "Old Title", body: "Body." });
    const content = await readNote(rootPath, note.relativePath);
    const updated = await updateNoteDocument(rootPath, note.relativePath, {
      title: "New Title",
      body: content.body.replace("Body.", "Updated body.")
    });
    const raw = await readFile(note.path, "utf8");

    expect(updated.summary.title).toBe("New Title");
    expect(updated.body).not.toContain("# New Title");
    expect(updated.body).toContain("Updated body.");
    expect(raw).toContain('title: "New Title"');
  });

  it("hides a duplicate first heading from legacy note bodies", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(
      path.join(rootPath, "notes", "legacy.md"),
      [
        "---",
        "id: legacy",
        "title: Legacy Note",
        "createdAt: 2026-06-17T00:00:00.000Z",
        "updatedAt: 2026-06-17T00:00:00.000Z",
        "---",
        "",
        "# Legacy Note",
        "",
        "Body."
      ].join("\n"),
      "utf8"
    );

    const content = await readNote(rootPath, "notes/legacy.md");
    const updated = await updateNoteDocument(rootPath, "notes/legacy.md", {
      title: "Renamed Note",
      body: content.body
    });
    const raw = await readFile(path.join(rootPath, "notes", "legacy.md"), "utf8");

    expect(content.body).toBe("Body.");
    expect(updated.body).toBe("Body.");
    expect(raw).not.toContain("# Legacy Note");
    expect(raw).not.toContain("# Renamed Note");
    expect(raw).toContain('title: "Renamed Note"');
  });

  it("returns a project overview for a valid project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const overview = await getProjectOverview(rootPath);

    expect(overview.manifest?.name).toBe("Test Project");
    expect(overview.validation.valid).toBe(true);
    expect(overview.counts).toEqual({ notes: 0, assets: 0 });
    expect(overview.notes).toEqual([]);
    expect(overview.assets).toEqual([]);
  });

  it("lists markdown notes ordered by update time", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await createNote(project, { title: "First Note", body: "Body.", tags: ["lecture"] });
    await createNote(project, { title: "Second Note", body: "Body." });

    const notes = await listNotes(rootPath);

    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.relativePath).sort()).toEqual(["notes/first-note.md", "notes/second-note.md"]);
    expect(notes.find((note) => note.id === "first-note")?.tags).toEqual(["lecture"]);
  });

  it("lists project assets", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(rootPath, "assets", "diagram.png"), "image", "utf8");
    await mkdir(path.join(rootPath, "assets", "archives"), { recursive: true });
    await writeFile(path.join(rootPath, "assets", "archives", "source.zip"), "zip", "utf8");

    const assets = await listAssets(rootPath);

    expect(assets.map((asset) => asset.relativePath).sort()).toEqual([
      "assets/archives/source.zip",
      "assets/diagram.png"
    ]);
    expect(assets.find((asset) => asset.name === "diagram.png")?.mediaType).toBe("image/png");
    expect(assets.find((asset) => asset.name === "diagram.png")?.previewKind).toBe("image");
    expect(assets.find((asset) => asset.name === "source.zip")?.iconKey).toBe("file-archive");
  });

  it("imports assets and creates unique names on conflict", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "queryn-source-"));
    createdRoots.push(rootPath, sourceRoot);

    const sourcePath = path.join(sourceRoot, "diagram.png");
    await writeFile(sourcePath, "image", "utf8");
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });

    const firstAsset = await importAsset(project, { sourcePath, targetFolderRelativePath: "images" });
    const secondAsset = await importAsset(project, { sourcePath, targetFolderRelativePath: "images" });

    expect(firstAsset.relativePath).toBe("assets/images/diagram.png");
    expect(secondAsset.relativePath).toBe("assets/images/diagram-2.png");
  });

  it("returns a stable project tree for notes and assets", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await createProjectFolder(project, { scope: "notes", name: "Lectures" });
    await createNote(project, { title: "Tree Note", folderRelativePath: "Lectures" });
    await mkdir(path.join(rootPath, "assets", "images"), { recursive: true });
    await writeFile(path.join(rootPath, "assets", "images", "diagram.png"), "image", "utf8");

    const tree = await listProjectTree(rootPath);

    expect(tree.notes.children?.[0].name).toBe("Lectures");
    expect(tree.notes.children?.[0].children?.[0].projectRelativePath).toBe("notes/Lectures/tree-note.md");
    expect(tree.assets.children?.[0].children?.[0].projectRelativePath).toBe("assets/images/diagram.png");
  });

  it("lists existing root markdown notes and files after adopting a folder", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(rootPath, "Root Note.md"), "# Root Note\n\nBody.", "utf8");
    await mkdir(path.join(rootPath, "Nested"), { recursive: true });
    await writeFile(path.join(rootPath, "Nested", "Nested Note.md"), "# Nested Note\n\nBody.", "utf8");
    await writeFile(path.join(rootPath, "Nested", "image.png"), "image", "utf8");

    const [notes, assets, tree, rootNote] = await Promise.all([
      listNotes(rootPath),
      listAssets(rootPath),
      listProjectTree(rootPath),
      readNote(rootPath, "Root Note.md")
    ]);

    expect(notes.map((note) => note.relativePath).sort()).toEqual(["Nested/Nested Note.md", "Root Note.md"]);
    expect(assets.map((asset) => asset.relativePath)).toEqual(["Nested/image.png"]);
    expect(rootNote.summary.title).toBe("Root Note");
    expect(rootNote.body).toBe("Body.");
    expect(tree.notes.children?.find((node) => node.projectRelativePath === "Root Note.md")?.kind).toBe("note");
    expect(
      tree.assets.children
        ?.find((node) => node.name === "Nested")
        ?.children?.find((node) => node.projectRelativePath === "Nested/image.png")?.kind
    ).toBe("asset");
  });

  it("hides dotfiles and dot directories from notes, assets and tree", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await mkdir(path.join(rootPath, ".obsidian"), { recursive: true });
    await writeFile(path.join(rootPath, ".obsidian", "workspace.json"), "{}", "utf8");
    await writeFile(path.join(rootPath, ".obsidian", "hidden.md"), "# Hidden\n\nBody.", "utf8");
    await writeFile(path.join(rootPath, ".DS_Store"), "store", "utf8");
    await mkdir(path.join(rootPath, "notes", ".drafts"), { recursive: true });
    await writeFile(path.join(rootPath, "notes", ".drafts", "draft.md"), "# Draft\n\nBody.", "utf8");
    await createNote(project, { title: "Visible Note", body: "Body." });

    const [notes, assets, tree] = await Promise.all([
      listNotes(rootPath),
      listAssets(rootPath),
      listProjectTree(rootPath)
    ]);

    expect(notes.map((note) => note.relativePath)).toEqual(["notes/visible-note.md"]);
    expect(assets.map((asset) => asset.name)).not.toContain(".DS_Store");
    expect(assets.find((asset) => asset.relativePath.includes(".obsidian"))).toBeUndefined();
    expect(tree.notes.children?.find((node) => node.name === ".drafts")).toBeUndefined();
    expect(tree.assets.children?.find((node) => node.name === ".obsidian")).toBeUndefined();
  });

  it("lists resolved and unresolved project links", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await createNote(project, { title: "Target Note", body: "Target." });
    await writeFile(path.join(rootPath, "assets", "diagram.png"), "image", "utf8");
    await createNote(project, {
      title: "Source Note",
      body: "[[Target Note]]\n[[Missing Note]]\n[diagram](assets/diagram.png)"
    });

    const links = await listProjectLinks(rootPath);

    expect(links.find((link) => link.rawTarget === "Target Note")?.resolved).toBe(true);
    expect(links.find((link) => link.rawTarget === "Missing Note")?.resolved).toBe(false);
    expect(links.find((link) => link.rawTarget === "assets/diagram.png")?.resolved).toBe(true);
  });

  it("does not fail project links on traversal-like existing vault links", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await writeFile(path.join(rootPath, "Root Target.md"), "# Root Target\n\nBody.", "utf8");
    await createNote(project, {
      title: "Source Note",
      body: "[[Root Target]]\n[[../Outside]]\n[bad](assets/../secret.png)"
    });

    const links = await listProjectLinks(rootPath);

    expect(links.find((link) => link.rawTarget === "Root Target")?.resolved).toBe(true);
    expect(links.find((link) => link.rawTarget === "../Outside")?.resolved).toBe(false);
    expect(links.find((link) => link.rawTarget === "assets/../secret.png")?.resolved).toBe(false);
  });

  it("moves project folders across scopes and rejects moving into itself", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    await createProjectFolder(project, { scope: "notes", name: "Lectures" });
    await createNote(project, { title: "L1", body: "Body.", folderRelativePath: "Lectures" });
    await createProjectFolder(project, { scope: "notes", name: "Archive" });
    await mkdir(path.join(rootPath, "assets", "Lectures"), { recursive: true });
    await writeFile(path.join(rootPath, "assets", "Lectures", "diagram.png"), "image", "utf8");

    await moveProjectFolder(project, { sourceRelativePath: "Lectures", targetFolderRelativePath: "Archive" });

    const tree = await listProjectTree(rootPath);
    const archiveDir = tree.notes.children?.find((n) => n.name === "Archive");
    expect(archiveDir?.children?.find((n) => n.name === "Lectures")).toBeTruthy();
    expect(archiveDir?.children?.find((n) => n.name === "Lectures")?.children?.[0].name).toBe("L1");

    const assetsArchive = tree.assets.children?.find((n) => n.name === "Archive");
    expect(assetsArchive?.children?.find((n) => n.name === "Lectures")).toBeTruthy();

    await expect(
      moveProjectFolder(project, { sourceRelativePath: "Archive", targetFolderRelativePath: "Archive/Lectures" })
    ).rejects.toThrow("Cannot move folder into itself");
  });

  it("returns validation issues for an incomplete project", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-core-"));
    createdRoots.push(rootPath);

    await writeFile(
      path.join(rootPath, "queryn.json"),
      JSON.stringify({ formatVersion: "0.1", id: "broken", name: "Broken", createdAt: "2026-06-16T00:00:00.000Z" }),
      "utf8"
    );

    const overview = await getProjectOverview(rootPath);

    expect(overview.validation.valid).toBe(false);
    expect(overview.validation.issues.map((issue) => issue.path).sort()).toEqual([".queryn", "assets", "notes"]);
  });
});

describe("project adoption", () => {
  it("adopts a foreign directory without touching existing files", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-adoption-"));
    createdRoots.push(rootPath);
    await writeFile(path.join(rootPath, "thesis.md"), "# Thesis", "utf8");

    const plan = await inspectProjectAdoption(rootPath);
    expect(plan.manifestExists).toBe(false);
    expect(plan.directoryName).toBe(path.basename(rootPath));
    expect(plan.suggestedId).toBe(slugifyIdentifier(path.basename(rootPath)));
    expect(plan.missingDirectories).toEqual(expect.arrayContaining(["notes", "assets", "artifacts", "sessions", "relations"]));
    expect(plan.collisions).toEqual([]);

    const dryRun = await adoptProject(rootPath, { name: "Adopted" }, { dryRun: true });
    expect(dryRun.dryRun).toBe(true);
    await expect(readFile(path.join(rootPath, "queryn.json"), "utf8")).rejects.toThrow();

    const result = await adoptProject(rootPath, { name: "Adopted" });
    expect(result.dryRun).toBe(false);
    expect(result.manifest?.name).toBe("Adopted");

    const untouched = await readFile(path.join(rootPath, "thesis.md"), "utf8");
    expect(untouched).toBe("# Thesis");

    const project = await openProject(rootPath);
    expect(project.manifest.name).toBe("Adopted");
  });

  it("reports collisions for occupied reserved directories and refuses existing manifests", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-adoption-"));
    createdRoots.push(rootPath);
    await mkdir(path.join(rootPath, "assets"), { recursive: true });
    await writeFile(path.join(rootPath, "assets", "logo.png"), "image", "utf8");

    const plan = await inspectProjectAdoption(rootPath);
    expect(plan.collisions).toEqual([{ path: "assets", entryCount: 1 }]);
    expect(plan.missingDirectories).not.toContain("assets");

    await adoptProject(rootPath, {});
    await expect(adoptProject(rootPath, {})).rejects.toThrow("Project manifest already exists. Use project.open.");
  });
});

describe("session updates", () => {
  it("updates memoryMode and updatedAt on an existing session", async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), "queryn-session-"));
    createdRoots.push(rootPath);
    const project = await createProject({ rootPath, id: "test-project", name: "Test Project" });
    const session = await createSession(project, { title: "Memory check" });

    const updated = await updateSession(rootPath, session.id, { memoryMode: "full" });
    expect(updated.memoryMode).toBe("full");
    expect(updated.updatedAt !== undefined && updated.updatedAt >= session.createdAt).toBe(true);

    const reread = await readSession(rootPath, session.id);
    expect(reread.memoryMode).toBe("full");

    const reverted = await updateSession(rootPath, session.id, { memoryMode: "off" });
    expect(reverted.memoryMode).toBe("off");
  });
});
