/**
 * Generated from the queryn-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
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
