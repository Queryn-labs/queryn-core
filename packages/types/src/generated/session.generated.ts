/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
 */

export type SessionStatus = "active" | "completed" | "archived";
export type MemoryMode = "full" | "off";

export interface SessionDescriptor {
  schemaVersion: "1";
  id: string;
  title: string;
  goal?: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt?: string;
  context?: {
    artifactId: string;
  }[];
  memoryMode?: MemoryMode;
}
