/**
 * Manifest and folder-structure validation for local Osnova projects.
 * Validation reports issues without mutating the project.
 */
import { access } from "node:fs/promises";
import path from "node:path";
import type { OsnovaManifest, ValidationIssue, ValidationResult } from "@osnova/types";

const supportedKinds = new Set(["general", "subject", "exam"]);
const supportedVersions = new Set(["0.1", "0.2"]);

export function validateManifest(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", message: "Manifest must be an object." }] };
  }

  if (typeof value.formatVersion !== "string" || !supportedVersions.has(value.formatVersion)) {
    issues.push({ path: "formatVersion", message: "formatVersion must be 0.1 or 0.2." });
  }

  requireString(value, "id", issues);
  requireString(value, "name", issues);
  requireString(value, "createdAt", issues);

  if ("kind" in value && typeof value.kind === "string" && !supportedKinds.has(value.kind)) {
    issues.push({ path: "kind", message: "kind must be general, subject or exam." });
  }

  if ("tags" in value && !Array.isArray(value.tags)) {
    issues.push({ path: "tags", message: "tags must be an array of strings." });
  }

  if (Array.isArray(value.tags) && value.tags.some((tag) => typeof tag !== "string" || tag.length === 0)) {
    issues.push({ path: "tags", message: "tags must contain non-empty strings." });
  }

  if ("extensions" in value && !Array.isArray(value.extensions)) {
    issues.push({ path: "extensions", message: "extensions must be an array." });
  }

  if (Array.isArray(value.extensions)) {
    value.extensions.forEach((extension, index) => {
      if (!isRecord(extension) || typeof extension.id !== "string" || typeof extension.version !== "string") {
        issues.push({ path: `extensions[${index}]`, message: "extension requires string id and version." });
      } else if (!/^(?:\*|latest|[~^]?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/.test(extension.version)) {
        issues.push({ path: `extensions[${index}].version`, message: "extension version must be exact SemVer, ^range, ~range, *, or latest." });
      }
    });
  }

  return { valid: issues.length === 0, issues };
}

export async function validateProjectStructure(projectPath: string, formatVersion: "0.1" | "0.2" = "0.1"): Promise<ValidationResult> {
  const requiredPaths = formatVersion === "0.2"
    ? ["osnova.json", "notes", "assets", "artifacts", "sessions", "relations", ".osnova"]
    : ["osnova.json", "notes", "assets", ".osnova"];
  const issues: ValidationIssue[] = [];

  await Promise.all(
    requiredPaths.map(async (relativePath) => {
      try {
        await access(path.join(projectPath, relativePath));
      } catch {
        issues.push({ path: relativePath, message: "Required project path is missing." });
      }
    })
  );

  return { valid: issues.length === 0, issues };
}

export function assertValidManifest(value: unknown): asserts value is OsnovaManifest {
  const result = validateManifest(value);
  if (!result.valid) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}

function requireString(record: Record<string, unknown>, key: string, issues: ValidationIssue[]): void {
  if (typeof record[key] !== "string" || record[key].length === 0) {
    issues.push({ path: key, message: `${key} must be a non-empty string.` });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
