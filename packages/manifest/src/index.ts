/**
 * Manifest creation, loading, and serialization for folder-based Queryn projects.
 * Manifest data remains portable JSON owned by the project folder.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionRequirement, QuerynManifest, ProjectFormatVersion, ProjectKind } from "@queryn/types";

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

export function createManifest(input: CreateManifestInput, now = new Date()): QuerynManifest {
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

export async function readManifest(projectPath: string): Promise<QuerynManifest> {
  const manifestPath = path.join(projectPath, "queryn.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as QuerynManifest;
}

export function serializeManifest(manifest: QuerynManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
