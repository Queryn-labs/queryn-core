/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
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
