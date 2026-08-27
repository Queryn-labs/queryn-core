import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readManifest, serializeManifest } from "@queryn/manifest";
import type { ProjectMigrationPlan, ProjectMigrationResult } from "@queryn/types";
import { ARTIFACTS_DIR, MANIFEST_FILE, QUERYN_DIR, RELATIONS_DIR, SESSIONS_DIR } from "./constants.js";
import { writeFileAtomic } from "./atomic.js";

const migrationDirectories = [ARTIFACTS_DIR, SESSIONS_DIR, RELATIONS_DIR];

export async function inspectProjectMigration(rootPath: string): Promise<ProjectMigrationPlan> {
  const manifest = await readManifest(rootPath);
  if (manifest.formatVersion === "0.2") {
    return { from: "0.2", to: "0.2", required: false, createDirectories: [], updateManifest: false };
  }

  const createDirectories: string[] = [];
  for (const directory of migrationDirectories) {
    try {
      await access(path.join(rootPath, directory));
    } catch {
      createDirectories.push(directory);
    }
  }

  return { from: "0.1", to: "0.2", required: true, createDirectories, updateManifest: true };
}

export async function migrateProject(
  rootPath: string,
  options: { dryRun?: boolean } = {}
): Promise<ProjectMigrationResult> {
  const plan = await inspectProjectMigration(rootPath);
  const manifest = await readManifest(rootPath);
  const migratedManifest = { ...manifest, formatVersion: "0.2" as const };

  if (options.dryRun || !plan.required) {
    return { dryRun: Boolean(options.dryRun), plan, manifest: migratedManifest };
  }

  const backupDirectory = path.join(rootPath, QUERYN_DIR, "migrations", `0.1-to-0.2-${randomUUID()}`);
  const backupPath = path.join(backupDirectory, MANIFEST_FILE);
  const manifestPath = path.join(rootPath, MANIFEST_FILE);
  const created: string[] = [];
  await mkdir(backupDirectory, { recursive: true });
  // Preserve the original manifest in project metadata so a failed migration
  // can restore the exact bytes without making the folder format less portable.
  // see queryn-docs/docs/adr/adr-0003-folder-based-projects.md
  await copyFile(manifestPath, backupPath);

  try {
    for (const directory of plan.createDirectories) {
      await mkdir(path.join(rootPath, directory), { recursive: false });
      created.push(directory);
    }
    await writeFileAtomic(manifestPath, serializeManifest(migratedManifest));
    return { dryRun: false, plan, backupPath, manifest: migratedManifest };
  } catch (error) {
    await writeFileAtomic(manifestPath, await readFile(backupPath));
    await Promise.all(created.map((directory) => rm(path.join(rootPath, directory), { recursive: true, force: true })));
    throw error;
  }
}
