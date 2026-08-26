/**
 * Generated from the queryn-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
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
