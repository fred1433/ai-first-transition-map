/**
 * Caps for a public demonstration. They exist so that a page left open, or found
 * by a crawler, does not run the model in a loop.
 *
 * What they are: two counters in the memory of one server process, the instance
 * first and then the address, both reset at the start of the UTC day.
 *
 * What they are not: the spending guarantee. A restart starts the count again,
 * and a second instance keeps its own, so these numbers bound one process and
 * nothing wider. The durable limit is the monthly spend limit set on the
 * provider workspace this demonstration calls, which is what the page states.
 */
export const LIMIT_SCOPE = "process" as const;
export const PER_INSTANCE_DAILY_LIMIT = 40;
export const PER_ADDRESS_DAILY_LIMIT = 5;

export interface LimitDecision {
  allowed: boolean;
  reason?: "per_instance_daily_cap" | "per_address_daily_cap";
  instanceRemaining: number;
  addressRemaining: number;
  resetsAt: string;
}

interface Counters {
  day: string;
  instance: number;
  perAddress: Map<string, number>;
}

const counters: Counters = { day: "", instance: 0, perAddress: new Map() };

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
    counters.instance = 0;
    counters.perAddress = new Map();
  }
}

/** Reads the counters without spending anything. */
export function inspect(now: Date = new Date(), clientId = "unknown"): LimitDecision {
  rollOver(now);
  return {
    allowed:
      counters.instance < PER_INSTANCE_DAILY_LIMIT &&
      (counters.perAddress.get(clientId) ?? 0) < PER_ADDRESS_DAILY_LIMIT,
    instanceRemaining: Math.max(0, PER_INSTANCE_DAILY_LIMIT - counters.instance),
    addressRemaining: Math.max(0, PER_ADDRESS_DAILY_LIMIT - (counters.perAddress.get(clientId) ?? 0)),
    resetsAt: nextMidnightUtc(now),
  };
}

/** Spends one live generation if both caps allow it. */
export function takeLiveCall(clientId: string, now: Date = new Date()): LimitDecision {
  rollOver(now);
  const used = counters.perAddress.get(clientId) ?? 0;
  if (counters.instance >= PER_INSTANCE_DAILY_LIMIT) {
    return { ...inspect(now, clientId), allowed: false, reason: "per_instance_daily_cap" };
  }
  if (used >= PER_ADDRESS_DAILY_LIMIT) {
    return { ...inspect(now, clientId), allowed: false, reason: "per_address_daily_cap" };
  }
  counters.instance += 1;
  counters.perAddress.set(clientId, used + 1);
  return { ...inspect(now, clientId), allowed: true };
}

/** Tests only, and the shape a process restart has from the outside. */
export function resetLimits(): void {
  counters.day = "";
  counters.instance = 0;
  counters.perAddress = new Map();
}
