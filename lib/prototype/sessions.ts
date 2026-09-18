/**
 * One synthetic workspace per visitor, held in memory for the length of a visit.
 *
 * Nothing is persisted: the demonstration is a sandbox, and a server restart
 * simply starts it again. That is stated on the page rather than papered over.
 */
import { Workspace } from "./workspace";
import { seedLogs } from "./scenario";

const TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 200;

interface Entry {
  workspace: Workspace;
  lastSeen: number;
}

const sessions = new Map<string, Entry>();

function sweep(now: number): void {
  for (const [id, entry] of sessions) {
    if (now - entry.lastSeen > TTL_MS) sessions.delete(id);
  }
  while (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
    if (!oldest) break;
    sessions.delete(oldest[0]);
  }
}

export function startSession(): Workspace {
  const now = Date.now();
  sweep(now);
  const workspace = new Workspace(seedLogs());
  sessions.set(workspace.caseId, { workspace, lastSeen: now });
  return workspace;
}

export class SessionExpired extends Error {
  constructor() {
    super("This demonstration session is no longer in memory. Reload the page to start a new one.");
  }
}

export function getSession(caseId: string): Workspace {
  const entry = sessions.get(caseId);
  if (!entry) throw new SessionExpired();
  entry.lastSeen = Date.now();
  return entry.workspace;
}
