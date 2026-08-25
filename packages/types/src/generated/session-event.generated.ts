/* eslint-disable */
/**
 * Сгенерировано из контрактных схем osnova-spec (scripts/generate-contracts.mjs).
 * Не редактировать вручную: изменения вносятся в схемы и перегенерируются.
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
