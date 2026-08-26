import { describe, expect, it } from "vitest";
import { validateManifest } from "./index.js";

describe("validateManifest", () => {
  it("accepts a minimal manifest", () => {
    const result = validateManifest({
      formatVersion: "0.1",
      id: "project",
      name: "Project",
      createdAt: "2026-06-13T00:00:00.000Z"
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const result = validateManifest({ formatVersion: "0.1" });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(["id", "name", "createdAt"]);
  });

  it("accepts a 0.2 manifest with extension requirements", () => {
    const result = validateManifest({
      formatVersion: "0.2",
      id: "project",
      name: "Project",
      createdAt: "2026-07-22T00:00:00.000Z",
      extensions: [{ id: "queryn.example.tool", version: "^1.0.0", enabled: true }]
    });

    expect(result.valid).toBe(true);
  });

  it("rejects invalid extension requirements", () => {
    const result = validateManifest({
      formatVersion: "0.2",
      id: "project",
      name: "Project",
      createdAt: "2026-07-22T00:00:00.000Z",
      extensions: [{ id: "broken" }]
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0].path).toBe("extensions[0]");
  });

  it("rejects extension ranges the runtime cannot resolve", () => {
    const result = validateManifest({
      formatVersion: "0.2",
      id: "project",
      name: "Project",
      createdAt: "2026-07-22T00:00:00.000Z",
      extensions: [{ id: "queryn.example.tool", version: ">=1.0.0" }]
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "extensions[0].version")).toBe(true);
  });
});
