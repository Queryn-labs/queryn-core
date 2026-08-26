/**
 * Manifest creation, loading, and serialization for folder-based projects.
 * Manifest data remains portable JSON owned by the project folder.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionRequirement, OsnovaManifest, ProjectFormatVersion, ProjectKind } from "@osnova/types";

export interface CreateManifestInput {
  id: string;
  name: string;
  description?: string;
  kind?: ProjectKind;
  locale?: string;
  tags?: string[];
  formatVersion?: ProjectFormatVersion;
  extensions?: ExtensionRequirement[];
}

export function createManifest(input: CreateManifestInput, now = new Date()): OsnovaManifest {
  return {
    formatVersion: input.formatVersion ?? "0.2",
    id: input.id,
    name: input.name,
    description: input.description,
    kind: input.kind ?? "general",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    locale: input.locale,
    tags: input.tags,
    extensions: input.extensions
  };
}

export async function readManifest(projectPath: string): Promise<OsnovaManifest> {
  const manifestPath = path.join(projectPath, "osnova.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as OsnovaManifest;
}

export function serializeManifest(manifest: OsnovaManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
