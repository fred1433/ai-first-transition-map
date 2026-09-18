/**
 * Caps for a public demonstration. They exist so that a page left open, or
 * found by a crawler, cannot turn into a bill.
 *
 * Global cap first, then per address. Both reset at the start of the UTC day.
 * The state is in memory: a restart forgives the count, which is the right
 * failure direction for a demonstration and is stated rather than hidden.
 */
export const GLOBAL_DAILY_LIMIT = 40;
export const PER_CLIENT_DAILY_LIMIT = 5;

export interface LimitDecision {
  allowed: boolean;
  reason?: "global_daily_cap" | "per_client_daily_cap";
  globalRemaining: number;
  clientRemaining: number;
  resetsAt: string;
}

interface Counters {
  day: string;
  global: number;
  perClient: Map<string, number>;
}

const counters: Counters = { day: "", global: 0, perClient: new Map() };

const dayOf = (now: Date) => now.toISOString().slice(0, 10);

function nextMidnightUtc(now: Date): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

function rollOver(now: Date): void {
  const today = dayOf(now);
  if (counters.day !== today) {
    counters.day = today;
    counters.global = 0;
    counters.perClient = new Map();
  }
}

/** Reads the counters without spending anything. */
export function inspect(now: Date = new Date(), clientId = "unknown"): LimitDecision {
  rollOver(now);
  return {
    allowed: counters.global < GLOBAL_DAILY_LIMIT && (counters.perClient.get(clientId) ?? 0) < PER_CLIENT_DAILY_LIMIT,
    globalRemaining: Math.max(0, GLOBAL_DAILY_LIMIT - counters.global),
    clientRemaining: Math.max(0, PER_CLIENT_DAILY_LIMIT - (counters.perClient.get(clientId) ?? 0)),
    resetsAt: nextMidnightUtc(now),
  };
}

/** Spends one live generation if both caps allow it. */
export function takeLiveCall(clientId: string, now: Date = new Date()): LimitDecision {
  rollOver(now);
  const used = counters.perClient.get(clientId) ?? 0;
  if (counters.global >= GLOBAL_DAILY_LIMIT) {
    return { ...inspect(now, clientId), allowed: false, reason: "global_daily_cap" };
  }
  if (used >= PER_CLIENT_DAILY_LIMIT) {
    return { ...inspect(now, clientId), allowed: false, reason: "per_client_daily_cap" };
  }
  counters.global += 1;
  counters.perClient.set(clientId, used + 1);
  return { ...inspect(now, clientId), allowed: true };
}

/** Tests only. */
export function resetLimits(): void {
  counters.day = "";
  counters.global = 0;
  counters.perClient = new Map();
}
