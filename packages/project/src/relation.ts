import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { ArtifactRelation, ArtifactRef } from "@osnova/types";
import { RELATIONS_DIR } from "./constants.js";
import { readArtifact } from "./artifact.js";
import { writeFileAtomic } from "./atomic.js";

export async function createArtifactRelation(rootPath: string, input: {
  id?: string; from: ArtifactRef; to: ArtifactRef; type: string; metadata?: Record<string, unknown>;
}, now = new Date()): Promise<ArtifactRelation> {
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(input.type) || !input.type.includes(".")) throw new Error("Relation type must be namespaced.");
  await Promise.all([readArtifact(rootPath, input.from.artifactId), readArtifact(rootPath, input.to.artifactId)]);
  const relation: ArtifactRelation = {
    schemaVersion: "1", id: input.id ?? randomUUID(), from: input.from, to: input.to,
    type: input.type, createdAt: now.toISOString(), metadata: input.metadata
  };
  await writeFileAtomic(path.join(rootPath, RELATIONS_DIR, `${normalizeId(relation.id)}.json`), `${JSON.stringify(relation, null, 2)}\n`);
  return relation;
}

export async function listArtifactRelations(rootPath: string, artifactId?: string): Promise<ArtifactRelation[]> {
  const directory = path.join(rootPath, RELATIONS_DIR);
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const relations = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map(async (entry) => JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as ArtifactRelation));
  return relations.filter((relation) => !artifactId || relation.from.artifactId === artifactId || relation.to.artifactId === artifactId);
}

function normalizeId(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) throw new Error("Invalid relation id.");
  return value;
}
