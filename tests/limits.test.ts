/** The caps that keep a public demonstration from becoming a bill. */
import { beforeEach, describe, expect, it } from "vitest";
import { GLOBAL_DAILY_LIMIT, PER_CLIENT_DAILY_LIMIT, inspect, resetLimits, takeLiveCall } from "../lib/prototype/limits";

describe("daily caps", () => {
  beforeEach(resetLimits);

  it("stops one visitor after a handful of live generations", () => {
    for (let index = 0; index < PER_CLIENT_DAILY_LIMIT; index += 1) {
      expect(takeLiveCall("visitor-a").allowed).toBe(true);
    }
    const refused = takeLiveCall("visitor-a");
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBe("per_client_daily_cap");
    expect(takeLiveCall("visitor-b").allowed).toBe(true);
  });

  it("stops everyone once the global cap is reached", () => {
    for (let index = 0; index < GLOBAL_DAILY_LIMIT; index += 1) {
      expect(takeLiveCall(`visitor-${index}`).allowed).toBe(true);
    }
    const refused = takeLiveCall("someone-new");
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBe("global_daily_cap");
    expect(refused.globalRemaining).toBe(0);
  });

  it("reads the counters without spending one", () => {
    takeLiveCall("visitor-a");
    const before = inspect(new Date(), "visitor-a");
    const after = inspect(new Date(), "visitor-a");
    expect(before.globalRemaining).toBe(after.globalRemaining);
    expect(after.globalRemaining).toBe(GLOBAL_DAILY_LIMIT - 1);
  });

  it("starts again on the next day", () => {
    const today = new Date("2026-09-18T23:59:00Z");
    const tomorrow = new Date("2026-09-19T00:01:00Z");
    for (let index = 0; index < GLOBAL_DAILY_LIMIT; index += 1) takeLiveCall(`visitor-${index}`, today);
    expect(takeLiveCall("late", today).allowed).toBe(false);
    expect(takeLiveCall("early", tomorrow).allowed).toBe(true);
  });
});
