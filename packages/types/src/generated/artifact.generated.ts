/**
 * Generated from the osnova-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
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
