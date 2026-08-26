/**
 * Generated from the osnova-spec contract schemas (scripts/generate-contracts.mjs).
 * Do not edit by hand: change the schema and regenerate.
 */

export type SessionEventType =
  | "user-message"
  | "assistant-message"
  | "plan"
  | "operation-call"
  | "operation-result"
  | "approval"
  | "artifact-linked"
  | "status"
  | "tool-call"
  | "observation";

export interface SessionEvent {
  schemaVersion: "1";
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  type: SessionEventType;
  data: {
    [k: string]: unknown;
  };
}
