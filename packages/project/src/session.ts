/**
 * Session and event persistence for folder-based projects.
 * Event appends preserve sequence order and repair only an interrupted trailing fragment.
 */
// see osnova-docs/docs/adr/adr-0003-folder-based-projects.md
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type {
  AppendSessionEventInput,
  CreateSessionInput,
  OsnovaProject,
  SessionDescriptor,
  SessionEvent,
  SessionStatus
} from "@osnova/types";
import { SESSIONS_DIR } from "./constants.js";
import { slugifyIdentifier } from "./slug.js";
import { writeFileAtomic } from "./atomic.js";

const sessionEventQueues = new Map<string, Promise<void>>();

export async function createSession(
  project: OsnovaProject,
  input: CreateSessionInput,
  now = new Date()
): Promise<SessionDescriptor> {
  const id = normalizeSessionId(input.id ?? `${slugifyIdentifier(input.title) || "session"}-${randomUUID()}`);
  await mkdir(path.join(project.rootPath, SESSIONS_DIR), { recursive: true });
  const directory = sessionDirectory(project.rootPath, id);
  await mkdir(directory, { recursive: false });

  const session: SessionDescriptor = {
    schemaVersion: "1",
    id,
    title: input.title,
    goal: input.goal,
    status: "active",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    context: input.context,
    memoryMode: input.memoryMode
  };
  await writeSession(project.rootPath, session);
  await writeFileAtomic(path.join(directory, "events.jsonl"), "");
  return session;
}

export async function readSession(rootPath: string, sessionId: string): Promise<SessionDescriptor> {
  const raw = await readFile(path.join(sessionDirectory(rootPath, sessionId), "session.json"), "utf8");
  return JSON.parse(raw) as SessionDescriptor;
}

export async function forkSession(
  project: OsnovaProject,
  input: { sourceSessionId: string; throughEventId: string; title?: string },
  now = new Date()
): Promise<SessionDescriptor> {
  const source = await readSession(project.rootPath, input.sourceSessionId);
  const sourceEvents = await readSessionEvents(project.rootPath, input.sourceSessionId);
  const throughIndex = sourceEvents.findIndex((event) => event.id === input.throughEventId);
  if (throughIndex < 0) throw new Error("Session fork target event was not found.");

  const forked = await createSession(project, {
    title: input.title?.trim() || `Ответвление · ${source.title}`,
    goal: source.goal,
    context: source.context,
    memoryMode: source.memoryMode
  }, now);
  for (const [index, event] of sourceEvents.slice(0, throughIndex + 1).entries()) {
    await appendSessionEvent(project.rootPath, forked.id, {
      type: event.type,
      data: event.data
    }, new Date(now.getTime() + index + 1));
  }
  return readSession(project.rootPath, forked.id);
}

export async function updateSession(
  rootPath: string,
  sessionId: string,
  patch: { title?: string; goal?: string; memoryMode?: "full" | "off" },
  now = new Date()
): Promise<SessionDescriptor> {
  const session = await readSession(rootPath, sessionId);
  if (patch.title !== undefined) session.title = patch.title;
  if (patch.goal !== undefined) session.goal = patch.goal;
  if (patch.memoryMode !== undefined) session.memoryMode = patch.memoryMode;
  session.updatedAt = now.toISOString();
  await writeSession(rootPath, session);
  return session;
}

export async function listSessions(rootPath: string): Promise<SessionDescriptor[]> {
  let entries;
  try {
    entries = await readdir(path.join(rootPath, SESSIONS_DIR), { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const sessions = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readSession(rootPath, entry.name))
  );
  return sessions.sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt));
}

export async function appendSessionEvent(
  rootPath: string,
  sessionId: string,
  input: AppendSessionEventInput,
  now = new Date()
): Promise<SessionEvent> {
  const directory = sessionDirectory(rootPath, sessionId);
  return withSessionEventLock(directory, async () => {
    assertSessionEventType(input.type);
    const session = await readSession(rootPath, sessionId);
    const events = await readSessionEventsInternal(rootPath, sessionId, true);
    const event: SessionEvent = {
      schemaVersion: "1",
      id: input.id ?? randomUUID(),
      sessionId: session.id,
      sequence: events.length === 0 ? 0 : Math.max(...events.map((item) => item.sequence)) + 1,
      timestamp: now.toISOString(),
      type: input.type,
      data: input.data
    };

    await appendFile(path.join(directory, "events.jsonl"), `${JSON.stringify(event)}\n`, "utf8");
    await writeSession(rootPath, { ...session, updatedAt: now.toISOString() });
    return event;
  });
}

export async function readSessionEvents(rootPath: string, sessionId: string): Promise<SessionEvent[]> {
  return readSessionEventsInternal(rootPath, sessionId, false);
}

export async function updateSessionStatus(
  rootPath: string,
  sessionId: string,
  status: SessionStatus,
  now = new Date()
): Promise<SessionDescriptor> {
  const session = await readSession(rootPath, sessionId);
  const updated = { ...session, status, updatedAt: now.toISOString() };
  await writeSession(rootPath, updated);
  return updated;
}

async function writeSession(rootPath: string, session: SessionDescriptor): Promise<void> {
  await writeFileAtomic(
    path.join(sessionDirectory(rootPath, session.id), "session.json"),
    `${JSON.stringify(session, null, 2)}\n`
  );
}

function sessionDirectory(rootPath: string, sessionId: string): string {
  return path.join(rootPath, SESSIONS_DIR, normalizeSessionId(sessionId));
}

function normalizeSessionId(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    throw new Error("Invalid session id.");
  }
  return value;
}

function assertSessionEventType(value: string): void {
  if (!["user-message", "assistant-message", "plan", "operation-call", "operation-result", "approval", "artifact-linked", "status", "tool-call", "observation"].includes(value)) {
    throw new Error(`Invalid session event type: ${value}`);
  }
}

async function withSessionEventLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = sessionEventQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  sessionEventQueues.set(key, tail);
  await previous;
  try { return await task(); }
  finally {
    release();
    if (sessionEventQueues.get(key) === tail) sessionEventQueues.delete(key);
  }
}

async function readSessionEventsInternal(rootPath: string, sessionId: string, repairTrailingFragment: boolean): Promise<SessionEvent[]> {
  const eventsPath = path.join(sessionDirectory(rootPath, sessionId), "events.jsonl");
  const raw = await readFile(eventsPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const events: SessionEvent[] = [];
  const validLines: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    try {
      events.push(JSON.parse(line) as SessionEvent);
      validLines.push(line);
    } catch (error) {
      const interruptedTail = index === lines.length - 1 && !raw.endsWith("\n");
      if (!interruptedTail) throw error;
      if (repairTrailingFragment) {
        await writeFileAtomic(eventsPath, validLines.length ? `${validLines.join("\n")}\n` : "");
      }
      break;
    }
  }
  return events;
}
