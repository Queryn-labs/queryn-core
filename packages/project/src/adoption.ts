import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { createManifest, readManifest, serializeManifest } from "@osnova/manifest";
import type {
  OsnovaManifest,
  ProjectAdoptionCollision,
  ProjectAdoptionPlan,
  ProjectAdoptionResult
} from "@osnova/types";
import { MANIFEST_FILE, REBORN_PROJECT_DIRS } from "./constants.js";
import { writeFileAtomic } from "./atomic.js";
import { slugifyIdentifier } from "./slug.js";

export interface AdoptProjectInput {
  id?: string;
  name?: string;
  description?: string;
}

export async function inspectProjectAdoption(rootPath: string): Promise<ProjectAdoptionPlan> {
  const directoryName = path.basename(path.resolve(rootPath));
  const missingDirectories: string[] = [];
  for (const directory of REBORN_PROJECT_DIRS) {
    try {
      await access(path.join(rootPath, directory));
    } catch {
      missingDirectories.push(directory);
    }
  }

  let manifestExists = false;
  try {
    await readManifest(rootPath);
    manifestExists = true;
  } catch {
    manifestExists = false;
  }

  const collisions: ProjectAdoptionCollision[] = [];
  for (const directory of REBORN_PROJECT_DIRS) {
    if (missingDirectories.includes(directory)) continue;
    const entries = await readdir(path.join(rootPath, directory));
    if (entries.length > 0) {
      collisions.push({ path: directory, entryCount: entries.length });
    }
  }

  const suggestedId = slugifyIdentifier(directoryName) || "project";

  return {
    rootPath,
    directoryName,
    manifestExists,
    missingDirectories,
    collisions,
    suggestedId,
    suggestedName: directoryName
  };
}

export async function adoptProject(
  rootPath: string,
  input: AdoptProjectInput = {},
  options: { dryRun?: boolean } = {}
): Promise<ProjectAdoptionResult> {
  const plan = await inspectProjectAdoption(rootPath);
  if (plan.manifestExists) {
    throw new Error("Project manifest already exists. Use project.open.");
  }

  const dryRun = Boolean(options.dryRun);
  if (dryRun) {
    return { dryRun, plan };
  }


  const manifest: OsnovaManifest = createManifest({
    id: input.id ?? plan.suggestedId,
    name: input.name ?? plan.suggestedName,
    description: input.description,
    formatVersion: "0.2"
  });

  for (const directory of plan.missingDirectories) {
    await mkdir(path.join(rootPath, directory), { recursive: true });
  }
  await writeFileAtomic(path.join(rootPath, MANIFEST_FILE), serializeManifest(manifest));

  return { dryRun: false, plan, manifest };
}
