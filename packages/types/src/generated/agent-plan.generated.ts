/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
 */

export interface AgentPlan {
  schemaVersion: "1";
  id: string;
  goal: string;
  createdAt: string;
  maxSteps: number;
  maxDurationSeconds?: number;
  /**
   * @maxItems 50
   */
  steps: Step[];
}
export interface Step {
  id: string;
  operationId: string;
  title: string;
  arguments: {
    [k: string]: unknown;
  };
  inputArtifacts?: {
    artifactId: string;
  }[];
  inputFromSteps?: string[];
  dependsOn?: string[];
  approvalRequired: boolean;
}
