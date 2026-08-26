/**
 * Generated from the osnova-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
 */

export type JobStatus =
  "queued" | "waiting-approval" | "running" | "succeeded" | "failed" | "cancelled" | "interrupted";

export interface JobDescriptor {
  id: string;
  projectPath: string;
  sessionId?: string;
  operationId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: {
    [k: string]: unknown;
  };
  result?: {
    [k: string]: unknown;
  };
  artifactIds?: string[];
  error?: string;
  progress?: number;
  statusMessage?: string;
}
