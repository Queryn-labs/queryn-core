/**
 * Generated from the osnova-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
 */

export type ProjectFormatVersion = "0.1" | "0.2";
export type ProjectKind = "general" | "subject" | "exam";

export interface OsnovaManifest {
  formatVersion: ProjectFormatVersion;
  id: string;
  name: string;
  description?: string;
  kind?: ProjectKind;
  createdAt: string;
  updatedAt?: string;
  locale?: string;
  tags?: string[];
  subject?: SubjectMetadata;
  exam?: ExamMetadata;
  extensions?: ExtensionRequirement[];
}
export interface SubjectMetadata {
  name?: string;
  grade?: string;
  institution?: string;
}
export interface ExamMetadata {
  name?: string;
  date?: string;
  targetScore?: number;
}
export interface ExtensionRequirement {
  id: string;
  version: string;
  enabled?: boolean;
}
