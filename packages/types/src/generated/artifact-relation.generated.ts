/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
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
