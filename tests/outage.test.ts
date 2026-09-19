/**
 * What the page answers when the provider is the thing that failed. Nothing
 * leaves this test: the client the generator builds is replaced by one whose
 * only job is to fail the way a provider fails, so the answers below are read
 * without spending anything.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIConnectionError, APIError } from "@anthropic-ai/sdk";
import { resetLimits } from "@/lib/prototype/limits";

const create = vi.fn();

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class ClientThatNeverReachesTheNetwork {
    messages = { create };
  }
  return { ...actual, default: ClientThatNeverReachesTheNetwork };
});

const { POST } = await import("@/app/api/demo/route");

const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

const ask = (body: Record<string, unknown>, address: string) =>
  POST(
    new Request("https://example.test/api/demo", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": address },
      body: JSON.stringify(body),
    }),
  );

const liveDraft = (address: string) => ask({ action: "draft", scenarioId: "site-notes", mode: "live" }, address);

/** The body the API returns when the account has nothing left to spend. */
const outOfCredit = () =>
  APIError.generate(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low." } },
    undefined,
    new Headers(),
  );

beforeEach(() => {
  resetLimits();
  create.mockReset();
  errorLog.mockClear();
  vi.stubEnv("NEXT_PUBLIC_DEMO_SPEND_LIMIT", "$25");
  vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5");
});

describe("when the model provider fails", () => {
  it("names the outage and points at the recorded run, rather than a server error", async () => {
    create.mockRejectedValue(outOfCredit());

    const response = await liveDraft("visitor-out-of-credit");
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toMatch(/The recorded run still works\.$/);
  });

  it("keeps what the provider said about the account out of the browser and in the log", async () => {
    create.mockRejectedValue(outOfCredit());

    const payload = await (await liveDraft("visitor-out-of-credit")).json();

    expect(payload.error).not.toContain("credit balance");
    expect(errorLog.mock.calls.flat().map(String).join(" ")).toContain("credit balance");
  });

  it("answers the same way when the call never reaches the provider at all", async () => {
    create.mockRejectedValue(new APIConnectionError({ message: "Connection error." }));

    const response = await liveDraft("visitor-offline");
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toMatch(/The recorded run still works\.$/);
  });

  it("separates an answer it cannot read from an outage", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: "I would rather not answer that." }],
      model: "claude-sonnet-5",
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: "end_turn",
    });

    const response = await liveDraft("visitor-unreadable-answer");
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toMatch(/The recorded run still works\.$/);
  });

  it("leaves the recorded run working, which is what the message promises", async () => {
    create.mockRejectedValue(outOfCredit());
    await liveDraft("visitor-out-of-credit");

    const response = await ask(
      { action: "draft", scenarioId: "site-notes", mode: "recorded" },
      "visitor-out-of-credit",
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.replay.kind).toBe("recorded");
    expect(payload.proposal.contentVersion).toBe(1);
  });
});
