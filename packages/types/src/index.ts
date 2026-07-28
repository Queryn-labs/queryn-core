export type ProjectKind = "general" | "subject" | "exam";
export type ProjectFormatVersion = "0.1" | "0.2";

export interface ExtensionRequirement {
  id: string;
  version: string;
  enabled?: boolean;
}

export interface SubjectMetadata {
  name?: string;
  grade?: string;
  institution?: string;
}

export interface ExamMetadata {
  name?: string;
  date?: string;
  targetScore?: number;
}

export interface OsnovaManifest {
  formatVersion: ProjectFormatVersion;
  id: string;
  name: string;
  description?: string;
  kind?: ProjectKind;
  createdAt: string;
  updatedAt?: string;
  locale?: string;
  tags?: string[];
  subject?: SubjectMetadata;
  exam?: ExamMetadata;
  extensions?: ExtensionRequirement[];
}

export interface OsnovaProject {
  rootPath: string;
  manifest: OsnovaManifest;
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
  manifest?: OsnovaManifest;
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

export type ArtifactContextMode = "none" | "automatic" | "declarative" | "custom";

export interface ArtifactRef {
  artifactId: string;
  payloads?: Array<{ path: string; sha256: string }>;
}

export interface ArtifactPayload {
  path: string;
  mediaType: string;
  role?: string;
  size: number;
  sha256: string;
}

export interface ArtifactProvenance {
  source: "manual" | "import" | "operation";
  toolId?: string;
  operationId?: string;
  runId?: string;
  model?: string;
  inputs?: ArtifactRef[];
}

export interface ArtifactContextPolicy {
  mode: ArtifactContextMode;
  providerId?: string;
  fields?: string[];
  template?: string;
}

export interface ArtifactDescriptor {
  schemaVersion: "1";
  id: string;
  type: string;
  title?: string;
  createdAt: string;
  updatedAt?: string;
  payloads: ArtifactPayload[];
  provenance: ArtifactProvenance;
  context?: ArtifactContextPolicy;
  tags?: string[];
  metadata?: Record<string, unknown>;
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

export interface ArtifactRelation {
  schemaVersion: "1";
  id: string;
  from: ArtifactRef;
  to: ArtifactRef;
  type: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export type SessionStatus = "active" | "completed" | "archived";

export interface SessionDescriptor {
  schemaVersion: "1";
  id: string;
  title: string;
  goal?: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt?: string;
  context?: ArtifactRef[];
}

export type SessionEventType =
  | "user-message"
  | "assistant-message"
  | "plan"
  | "operation-call"
  | "operation-result"
  | "approval"
  | "artifact-linked"
  | "status";

export interface SessionEvent {
  schemaVersion: "1";
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  type: SessionEventType;
  data: Record<string, unknown>;
}

export interface CreateSessionInput {
  id?: string;
  title: string;
  goal?: string;
  context?: ArtifactRef[];
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

export type JobStatus =
  | "queued"
  | "waiting-approval"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "interrupted";

export interface JobDescriptor {
  id: string;
  projectPath: string;
  sessionId?: string;
  operationId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  artifactIds?: string[];
  error?: string;
  progress?: number;
  statusMessage?: string;
}

export type RuntimeKind = "builtin" | "node-process" | "native-process" | "oci" | "remote";
export type RuntimeLifecycle = "job" | "project" | "shared";
export type RuntimeStatus = "stopped" | "starting" | "running" | "degraded" | "stopping" | "failed";

export interface RuntimeDescriptor {
  id: string;
  kind: RuntimeKind;
  lifecycle: RuntimeLifecycle;
  entry?: string;
  image?: string;
  endpoint?: string;
  protocol?: "osnova-tool-v1" | "mcp";
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

export type ContextLevel = "compact" | "expanded";

export interface ContextSource {
  artifactId?: string;
  projectRelativePath?: string;
  title?: string;
  kind?: "artifact" | "note" | "asset";
  payloadPath?: string;
  providerId?: string;
}

export interface ContextEnvelope {
  level: ContextLevel;
  text?: string;
  structured?: Record<string, unknown>;
  sources: ContextSource[];
  sensitivity: "public" | "project" | "sensitive";
  allowedRecipients: Array<"local" | "cloud">;
  tokenEstimate: number;
  truncated: boolean;
  freshness?: string;
  providerVersion: string;
}

export interface AgentStep {
  id: string;
  operationId: string;
  title: string;
  arguments: Record<string, unknown>;
  inputArtifacts?: ArtifactRef[];
  inputFromSteps?: string[];
  dependsOn?: string[];
  approvalRequired: boolean;
}

export interface AgentPlan {
  schemaVersion: "1";
  id: string;
  goal: string;
  steps: AgentStep[];
  createdAt: string;
  maxSteps: number;
  maxDurationSeconds?: number;
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
  manifest: OsnovaManifest;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
