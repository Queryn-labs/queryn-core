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
import { slugify } from "./slug.js";
import { writeFileAtomic } from "./atomic.js";

const sessionEventQueues = new Map<string, Promise<void>>();

export async function createSession(
  project: OsnovaProject,
  input: CreateSessionInput,
  now = new Date()
): Promise<SessionDescriptor> {
  const id = normalizeSessionId(input.id ?? `${slugify(input.title) || "session"}-${randomUUID()}`);
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
    context: input.context
  };
  await writeSession(project.rootPath, session);
  await writeFileAtomic(path.join(directory, "events.jsonl"), "");
  return session;
}

export async function readSession(rootPath: string, sessionId: string): Promise<SessionDescriptor> {
  const raw = await readFile(path.join(sessionDirectory(rootPath, sessionId), "session.json"), "utf8");
  return JSON.parse(raw) as SessionDescriptor;
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
  if (!["user-message", "assistant-message", "plan", "operation-call", "operation-result", "approval", "artifact-linked", "status"].includes(value)) {
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
