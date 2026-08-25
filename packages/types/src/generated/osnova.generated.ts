/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
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
