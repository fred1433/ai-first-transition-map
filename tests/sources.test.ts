/**
 * The sources behind the page: what was read, when, and whether every sentence
 * shown as a quotation is really in the page it names.
 *
 * Runs offline, on the files in the repository.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractKbArticle, extractZapierCapabilities } from "../crawl/lib/extract";
import map from "../map/map.json";
import manifest from "../crawl/manifest.json";
import sources from "../crawl/sources.json";
import zapier from "../crawl/zapier-capabilities.json";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const ALLOWED_HOSTS = ["kb.contractorforeman.com", "zapier.com"];

// A sentence that only exists in the navigation shared by every article.
const NAVIGATION_ONLY = ["Are Bills synced with QuickBooks?", "How do I send a request to bid to bidders?"];
// A sentence that only exists in the body of this one article.
const ARTICLE_ONLY = "the Tasks performed field is one of the most important to fill";

describe("the extractor", () => {
  const html = read("crawl/fixtures/kb-daily-log-new.trimmed.html");

  it("keeps the body of the article", () => {
    expect(extractKbArticle(html).text).toContain(ARTICLE_ONLY);
  });

  it("drops the navigation that every page repeats", () => {
    const extracted = extractKbArticle(html).text;
    for (const line of NAVIGATION_ONLY) {
      expect(html, "the fixture must actually contain the navigation").toContain(line);
      expect(extracted, "navigation reached the extracted text, coverage would be false").not.toContain(line);
    }
  });

  it("refuses to fall back to the whole page when the layout changes", () => {
    expect(() => extractKbArticle("<html><body><p>Something else entirely</p></body></html>")).toThrowError();
  });

  it("reads the published triggers and write actions, and says the list paginates", () => {
    const capabilities = extractZapierCapabilities(read("crawl/fixtures/vendor-zapier-app.trimmed.html"));
    expect(capabilities.items.filter((item) => item.kind === "trigger")).toHaveLength(7);
    expect(capabilities.items.filter((item) => item.kind === "action")).toHaveLength(2);
    expect(capabilities.moreAvailable).toBe(true);
    expect(capabilities.exhaustive).toBe(false);
  });
});

describe("the manifest", () => {
  it("covers every source, and only sources that were asked for", () => {
    const declared = sources.sources.map((source) => source.id).sort();
    const read = manifest.pages.map((page) => page.id).sort();
    expect(read).toEqual(declared);
    expect(manifest.pageCount).toBe(manifest.pages.length);
  });

  it("says when each page was read, from where, and what came back", () => {
    for (const page of manifest.pages) {
      expect(page.httpStatus, page.id).toBe(200);
      expect(new Date(page.fetchedAt).toString(), page.id).not.toBe("Invalid Date");
      expect(page.rawSha256, page.id).toMatch(/^[0-9a-f]{64}$/);
      expect(page.textSha256, page.id).toMatch(/^[0-9a-f]{64}$/);
      expect(ALLOWED_HOSTS, page.id).toContain(new URL(page.url).host);
      expect(page.why.length, page.id).toBeGreaterThan(20);
    }
  });

  it("matches the pages kept in the repository, character for character", () => {
    for (const page of manifest.pages) {
      const path = `crawl/pages/${page.id}.txt`;
      expect(existsSync(join(process.cwd(), path)), path).toBe(true);
      const body = read(path).split("\n").slice(6).join("\n").replace(/\n$/, "");
      expect(sha256(body), `${page.id} was edited after it was read`).toBe(page.textSha256);
      expect(body.length, page.id).toBe(page.textChars);
    }
  });

  it("keeps the reading of the integration page dated and marked as partial", () => {
    expect(zapier.items.filter((item) => item.kind === "trigger")).toHaveLength(7);
    expect(zapier.items.filter((item) => item.kind === "action")).toHaveLength(2);
    expect(zapier.exhaustive).toBe(false);
    expect(zapier.moreAvailable).toBe(true);
    expect(new Date(zapier.readAt).toString()).not.toBe("Invalid Date");
  });
});

describe("the map", () => {
  const byId = new Map(manifest.pages.map((page) => [page.id, page]));
  const statuses = Object.keys(map.statusVocabulary);

  it("proposes exactly one pilot, and leaves at least one workflow alone", () => {
    const decisions = map.lines.map((line) => line.decision);
    expect(decisions.filter((decision) => decision === "proposed-pilot")).toHaveLength(1);
    expect(decisions.filter((decision) => decision === "keep-existing").length).toBeGreaterThan(0);
    expect(decisions.filter((decision) => decision === "deferred").length).toBeGreaterThan(0);
  });

  it("quotes a page that was really read, word for word", () => {
    for (const line of map.lines) {
      const source = byId.get(line.documentedBehaviour.sourceId);
      expect(source, `${line.id} cites a page that is not in the manifest`).toBeDefined();
      const body = read(`crawl/pages/${line.documentedBehaviour.sourceId}.txt`);
      expect(body, `${line.id}: the quotation is not in ${source!.url}`).toContain(line.documentedBehaviour.excerpt);
    }
  });

  it("carries a reason, a dependency and an abandonment condition on every line", () => {
    for (const line of map.lines) {
      expect(line.proposedAddition.length, line.id).toBeGreaterThan(20);
      expect(line.whyThisChoice.length, line.id).toBeGreaterThan(20);
      expect(line.wouldAbandonIf.length, line.id).toBeGreaterThan(10);
      expect(statuses, line.id).toContain(line.documentedBehaviour.status);
      expect(statuses, line.id).toContain(line.unverifiedDependency.status);
    }
  });

  it("states no figure of time, money or gain anywhere", () => {
    const text = JSON.stringify(map.lines);
    expect(text).not.toMatch(/\b\d+\s*(%|percent|hours saved|per cent)/i);
    expect(text).not.toMatch(/\$\s?\d/);
  });
});
