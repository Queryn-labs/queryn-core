/**
 * Shared domain types consumed across Queryn repositories.
 * Generated contract types remain schema-derived, while handwritten types define core operations.
 */
import type {
  QuerynManifest,
  SubjectMetadata,
  ExamMetadata,
  ExtensionRequirement,
  ProjectFormatVersion,
  ProjectKind
} from "./generated/queryn.generated.js";
import type {
  ArtifactDescriptor,
  Payload as ArtifactPayload,
  Provenance as ArtifactProvenance,
  Context as ArtifactContextPolicy,
  ArtifactContextMode,
  ArtifactRef
} from "./generated/artifact.generated.js";
import type { ArtifactRelation } from "./generated/artifact-relation.generated.js";
import type { SessionDescriptor, SessionStatus, MemoryMode } from "./generated/session.generated.js";
import type { SessionEvent, SessionEventType } from "./generated/session-event.generated.js";
import type { ContextEnvelope, ContextLevel, ContextSource } from "./generated/context-envelope.generated.js";
import type { AgentPlan, Step as AgentStep } from "./generated/agent-plan.generated.js";
import type { JobDescriptor, JobStatus } from "./generated/job.generated.js";

export type {
  QuerynManifest,
  SubjectMetadata,
  ExamMetadata,
  ExtensionRequirement,
  ProjectFormatVersion,
  ProjectKind,
  ArtifactDescriptor,
  ArtifactPayload,
  ArtifactProvenance,
  ArtifactContextPolicy,
  ArtifactContextMode,
  ArtifactRef,
  ArtifactRelation,
  SessionDescriptor,
  SessionStatus,
  MemoryMode,
  SessionEvent,
  SessionEventType,
  ContextEnvelope,
  ContextLevel,
  ContextSource,
  AgentPlan,
  AgentStep,
  JobDescriptor,
  JobStatus
};



export interface QuerynProject {
  rootPath: string;
  manifest: QuerynManifest;
}

export interface Note {
  id: string;
  title: string;
  path: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

export interface NoteSummary extends Note {
  relativePath: string;
}

export interface NoteContent {
  summary: NoteSummary;
  relativePath: string;
  path: string;
  content: string;
  frontmatter?: string;
  body: string;
}

export interface UpdateNoteDocumentInput {
  title?: string;
  body?: string;
}

export interface Asset {
  id: string;
  path: string;
  mediaType?: string;
}

export interface AssetSummary extends Asset {
  name: string;
  relativePath: string;
  size: number;
  updatedAt: string;
}

export type ProjectTreeScope = "notes" | "assets";

export interface ProjectTreeNode {
  id: string;
  name: string;
  kind: "directory" | "note" | "asset";
  scope: ProjectTreeScope;
  relativePath: string;
  projectRelativePath: string;
  path?: string;
  children?: ProjectTreeNode[];
  note?: NoteSummary;
  asset?: AssetSummary;
}

export interface ProjectTree {
  notes: ProjectTreeNode;
  assets: ProjectTreeNode;
}

export interface CreateProjectFolderInput {
  scope: ProjectTreeScope;
  parentRelativePath?: string;
  name: string;
}

export interface ImportAssetInput {
  sourcePath: string;
  targetFolderRelativePath?: string;
}

export interface MoveNoteInput {
  sourceRelativePath: string;
  targetFolderRelativePath: string;
}

export interface MoveAssetInput {
  sourceRelativePath: string;
  targetFolderRelativePath: string;
}

export interface MoveFolderInput {
  sourceRelativePath: string;
  targetFolderRelativePath: string;
}

export interface ProjectLink {
  id: string;
  kind: "wiki" | "asset";
  sourceNoteRelativePath: string;
  rawTarget: string;
  label?: string;
  resolved: boolean;
  targetRelativePath?: string;
  note?: NoteSummary;
  asset?: AssetSummary;
}

export interface ProjectOverview {
  rootPath: string;
  manifest?: QuerynManifest;
  validation: ValidationResult;
  counts: {
    notes: number;
    assets: number;
  };
  recentNotes: NoteSummary[];
  recentAssets: AssetSummary[];
  notes: NoteSummary[];
  assets: AssetSummary[];
}

export interface Card {
  id: string;
  type: "flashcard" | "definition" | "question";
  front: string;
  back: string;
  sourceNote?: string;
  tags?: string[];
}

export interface EntityRef {
  kind: "note" | "asset" | "card";
  id: string;
}

export interface Relation {
  id: string;
  from: EntityRef;
  to: EntityRef;
  type: "references" | "depends-on" | "explains" | "contradicts" | "related";
  createdAt?: string;
}



export interface PublishArtifactPayloadInput {
  path: string;
  mediaType?: string;
  role?: string;
}

export interface PublishArtifactInput {
  id?: string;
  type: string;
  title?: string;
  outboxPath: string;
  payloads: PublishArtifactPayloadInput[];
  provenance: ArtifactProvenance;
  context?: ArtifactContextPolicy;
  tags?: string[];
  metadata?: Record<string, unknown>;
  maxPayloadBytes?: number;
  allowedMediaTypes?: string[];
}

export interface RegisterArtifactInput {
  id?: string;
  type: string;
  title?: string;
  projectRelativePath: string;
  provenance?: ArtifactProvenance;
  context?: ArtifactContextPolicy;
  tags?: string[];
  metadata?: Record<string, unknown>;
}



export interface CreateSessionInput {
  id?: string;
  title: string;
  goal?: string;
  context?: ArtifactRef[];
  memoryMode?: "full" | "off";
}

export interface AppendSessionEventInput {
  id?: string;
  type: SessionEventType;
  data: Record<string, unknown>;
}

export type Permission =
  | "project:read"
  | "artifact:read"
  | "artifact:create"
  | "network:use"
  | "models:use"
  | "models:install"
  | "compute:gpu"
  | "native:execute"
  | "external:apps"
  | "secrets:read"
  | "background:run";

export type OperationRisk =
  | "safe-read"
  | "project-write"
  | "network-egress"
  | "external-side-effect"
  | "privileged";

export type AgentVisibility = "hidden" | "explicit" | "automatic";
export type OperationExecution = "immediate" | "job";

export interface OperationResources {
  cpu?: number;
  memoryMb?: number;
  diskMb?: number;
  gpu?: boolean;
  network?: boolean;
}

export interface OperationDefinition {
  id: string;
  toolId: string;
  version: string;
  title: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  accepts?: string[];
  produces?: string[];
  risk: OperationRisk;
  agentVisibility: AgentVisibility;
  execution: OperationExecution;
  timeoutSeconds?: number;
  cancellable?: boolean;
  idempotent?: boolean;
  permissions: Permission[];
  resources?: OperationResources;
}


export type RuntimeKind = "builtin" | "node-process" | "native-process" | "oci" | "remote";
export type RuntimeLifecycle = "job" | "project" | "shared";
export type RuntimeStatus = "stopped" | "starting" | "running" | "degraded" | "stopping" | "failed";

/** The declared data recipient for model inference. */
export type RecipientKind = "local" | "cloud";

/** The protocol implemented by a model provider endpoint. */
export type ModelProviderTransport = "openai-compatible";

/** The credential flow presented by a provider template. */
export type ModelProviderAuthMode = "none" | "api-key" | "cli-session";

/** A declarative, non-secret provider preset exposed by the runtime catalog. */
export interface ModelProviderTemplate {
  id: string;
  group: RecipientKind;
  displayName: string;
  description: string;
  transport: ModelProviderTransport;
  auth: ModelProviderAuthMode;
  defaultProviderId: string;
  defaultEndpoint?: string;
}

export interface OpenAICompatibleModelProviderConfig {
  id: string;
  templateId: string;
  type: "openai-compatible";
  endpoint: string;
  credentialAccount?: string;
  recipient: RecipientKind;
}

export type ModelProviderConfig = OpenAICompatibleModelProviderConfig;

export interface RuntimeDescriptor {
  id: string;
  kind: RuntimeKind;
  lifecycle: RuntimeLifecycle;
  entry?: string;
  image?: string;
  endpoint?: string;
  protocol?: "queryn-tool-v1" | "mcp";
  idleTimeoutSeconds?: number;
  resources?: OperationResources;
  models?: RuntimeModelDependency[];
}

export interface RuntimeModelDependency {
  id: string;
  version: string;
  source: string;
  sha256: string;
  size: number;
  license: string;
  platforms?: Array<"win32" | "darwin">;
  architectures?: Array<"x64" | "arm64">;
}

export interface RuntimeState {
  runtimeId: string;
  status: RuntimeStatus;
  startedAt?: string;
  lastUsedAt?: string;
  error?: string;
}



export interface ApprovalDecision {
  planId: string;
  stepId: string;
  approved: boolean;
  scope: "once" | "operation-project";
  decidedAt: string;
}

export interface ProjectMigrationPlan {
  from: ProjectFormatVersion;
  to: "0.2";
  required: boolean;
  createDirectories: string[];
  updateManifest: boolean;
}

export interface ProjectMigrationResult {
  dryRun: boolean;
  plan: ProjectMigrationPlan;
  backupPath?: string;
  manifest: QuerynManifest;
}

export interface ProjectAdoptionCollision {
  path: string;
  entryCount: number;
}

export interface ProjectAdoptionPlan {
  rootPath: string;
  directoryName: string;
  manifestExists: boolean;
  missingDirectories: string[];
  collisions: ProjectAdoptionCollision[];
  suggestedId: string;
  suggestedName: string;
}

export interface ProjectAdoptionResult {
  dryRun: boolean;
  plan: ProjectAdoptionPlan;
  manifest?: QuerynManifest;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
