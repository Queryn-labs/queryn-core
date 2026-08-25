/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
 */

export type ContextLevel = "compact" | "expanded";
export type ContextSource = {
  [k: string]: unknown;
};

export interface ContextEnvelope {
  level: ContextLevel;
  text?: string;
  structured?: {
    [k: string]: unknown;
  };
  sources: ContextSource[];
  sensitivity: "public" | "project" | "sensitive";
  allowedRecipients: ("local" | "cloud")[];
  tokenEstimate: number;
  truncated: boolean;
  freshness?: string;
  providerVersion: string;
}
