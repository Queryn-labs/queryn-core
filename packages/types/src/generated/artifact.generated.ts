/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
 */

export type Id = string;
export type NamespacedId = string;
export type ArtifactContextMode = "none" | "automatic" | "declarative" | "custom";

export interface ArtifactDescriptor {
  schemaVersion: "1";
  id: Id;
  type: NamespacedId;
  title?: string;
  createdAt: string;
  updatedAt?: string;
  /**
   * @minItems 1
   */
  payloads: [Payload, ...Payload[]];
  provenance: Provenance;
  context?: Context;
  tags?: string[];
  metadata?: {
    [k: string]: unknown;
  };
}
export interface Payload {
  path: string;
  mediaType: string;
  role?: string;
  size: number;
  sha256: string;
}
export interface Provenance {
  source: "manual" | "import" | "operation";
  toolId?: NamespacedId;
  operationId?: NamespacedId;
  runId?: Id;
  model?: string;
  inputs?: ArtifactRef[];
}
export interface ArtifactRef {
  artifactId: Id;
  payloads?: {
    path: string;
    sha256: string;
  }[];
}
export interface Context {
  mode: ArtifactContextMode;
  providerId?: NamespacedId;
  fields?: string[];
  template?: string;
}
