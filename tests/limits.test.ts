/**
 * The caps held in the memory of one server process. They are a comfort, not the
 * spending guarantee: a restart, or a second instance, starts its own count.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { LIMIT_SCOPE, PER_INSTANCE_DAILY_LIMIT, PER_ADDRESS_DAILY_LIMIT, inspect, resetLimits, takeLiveCall } from "../lib/prototype/limits";

describe("daily caps", () => {
  beforeEach(resetLimits);

  it("stops one visitor after a handful of live generations", () => {
    for (let index = 0; index < PER_ADDRESS_DAILY_LIMIT; index += 1) {
      expect(takeLiveCall("visitor-a").allowed).toBe(true);
    }
    const refused = takeLiveCall("visitor-a");
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBe("per_address_daily_cap");
    expect(takeLiveCall("visitor-b").allowed).toBe(true);
  });

  it("stops this instance once its own cap is reached", () => {
    for (let index = 0; index < PER_INSTANCE_DAILY_LIMIT; index += 1) {
      expect(takeLiveCall(`visitor-${index}`).allowed).toBe(true);
    }
    const refused = takeLiveCall("someone-new");
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBe("per_instance_daily_cap");
    expect(refused.instanceRemaining).toBe(0);
  });

  it("reads the counters without spending one", () => {
    takeLiveCall("visitor-a");
    const before = inspect(new Date(), "visitor-a");
    const after = inspect(new Date(), "visitor-a");
    expect(before.instanceRemaining).toBe(after.instanceRemaining);
    expect(after.instanceRemaining).toBe(PER_INSTANCE_DAILY_LIMIT - 1);
  });

  it("starts again on the next day", () => {
    const today = new Date("2026-09-18T23:59:00Z");
    const tomorrow = new Date("2026-09-19T00:01:00Z");
    for (let index = 0; index < PER_INSTANCE_DAILY_LIMIT; index += 1) takeLiveCall(`visitor-${index}`, today);
    expect(takeLiveCall("late", today).allowed).toBe(false);
    expect(takeLiveCall("early", tomorrow).allowed).toBe(true);
  });
});

describe("what the caps are not", () => {
  beforeEach(resetLimits);

  it("forgets its count when the process starts again, so it is not a spend guarantee", () => {
    for (let index = 0; index < PER_INSTANCE_DAILY_LIMIT; index += 1) takeLiveCall(`visitor-${index}`);
    expect(takeLiveCall("late").allowed).toBe(false);

    // A restart, and a second instance, look the same from here: a fresh count.
    resetLimits();
    expect(takeLiveCall("late").allowed).toBe(true);
    expect(LIMIT_SCOPE).toBe("process");
  });
});
