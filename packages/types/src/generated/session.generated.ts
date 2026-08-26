/**
 * Generated from the osnova-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
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
