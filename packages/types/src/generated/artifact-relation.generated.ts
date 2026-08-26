/**
 * Generated from the queryn-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
 */

export interface ArtifactRelation {
  schemaVersion: "1";
  id: string;
  from: Ref;
  to: Ref;
  type: string;
  createdAt?: string;
  metadata?: {
    [k: string]: unknown;
  };
}
export interface Ref {
  artifactId: string;
}
