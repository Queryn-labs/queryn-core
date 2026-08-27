import { describe, expect, it } from "vitest";
import { classifyFile, describeFile, detectMediaType } from "./media.js";

describe("project file type registry", () => {
  it("keeps legacy MIME detection and covers common research formats", () => {
    expect(detectMediaType("README.MD")).toBe("text/markdown");
    expect(detectMediaType("src/solver.py")).toBe("text/x-python");
    expect(detectMediaType("src/native.c++")).toBe("text/x-c++");
    expect(detectMediaType("data/results.csv")).toBe("text/csv");
    expect(detectMediaType("data/results.parquet")).toBe("application/vnd.apache.parquet");
    expect(detectMediaType("slides/report.pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    expect(classifyFile("Dockerfile").languageId).toBe("dockerfile");
  });

  it("returns language, icon and editing capabilities for text files", () => {
    expect(classifyFile("src/App.TSX")).toMatchObject({
      extension: ".tsx",
      previewKind: "code",
      languageId: "typescriptreact",
      iconKey: "file-code",
      capabilities: { canPreview: true, canEdit: true, canRead: true },
      isExtensionMismatch: false
    });
    expect(describeFile("notes/summary.md").previewKind).toBe("markdown");
    expect(classifyFile("data/table.tsv").previewKind).toBe("table");
  });

  it("uses the inspected MIME type when the extension is unknown", () => {
    expect(classifyFile("results/no-extension", "application/json")).toMatchObject({
      extension: "",
      mediaType: "application/json",
      previewKind: "json",
      languageId: "json",
      confidence: "mime",
      isExtensionMismatch: false
    });
  });

  it("marks a known extension and incompatible content as a safe fallback", () => {
    expect(classifyFile("data/results.json", "image/png")).toMatchObject({
      extension: ".json",
      mediaType: "image/png",
      previewKind: "image",
      iconKey: "file-unknown",
      confidence: "mismatch",
      isExtensionMismatch: true,
      capabilities: { canPreview: true, canEdit: false }
    });
  });

  it("keeps Office extensions useful when signature inspection reports ZIP", () => {
    expect(classifyFile("report.xlsx", "application/zip")).toMatchObject({
      previewKind: "spreadsheet",
      confidence: "mime",
      isExtensionMismatch: false
    });
  });

  it("returns an explicit unknown descriptor instead of guessing", () => {
    expect(classifyFile("archive.weird")).toMatchObject({
      extension: ".weird",
      previewKind: "unknown",
      iconKey: "file-unknown",
      confidence: "fallback",
      capabilities: { canPreview: false, canEdit: false, canRead: false }
    });
  });
});
