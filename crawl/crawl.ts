/**
 * Reads a short, fixed list of public pages, once each, at human pace.
 *
 * What it writes: the extracted article body (crawl/pages), a manifest with the
 * collection date and the hashes of what was read (crawl/manifest.json), and the
 * published trigger and action list of the integration page. The raw HTML stays
 * in a local cache that is not published.
 *
 * Run: npm run crawl                  read the pages missing from the manifest
 *      npm run crawl -- --refresh     read every page again
 *      npm run crawl -- --from-cache  rebuild pages and manifest from the local
 *                                     cache, without touching the network
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractKbArticle, extractZapierCapabilities, EXTRACTOR_VERSION } from "./lib/extract.js";

const here = dirname(fileURLToPath(import.meta.url));
const sourcesPath = join(here, "sources.json");
const manifestPath = join(here, "manifest.json");
const pagesDir = join(here, "pages");
const cacheDir = join(here, "cache");

interface Source { id: string; kind: string; url: string; why: string }
interface SourcesFile {
  sources: Source[];
  userAgent: string;
  minPauseMs: number;
  maxPauseMs: number;
  collectionNote: string;
}
interface ManifestEntry {
  id: string;
  kind: string;
  url: string;
  why: string;
  fetchedAt: string;
  httpStatus: number;
  title: string;
  selectorUsed: string;
  rawBytes: number;
  rawSha256: string;
  textChars: number;
  textSha256: string;
  extractorVersion: string;
}

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Time of the original read, taken from the page already written, else from the cache file. */
function readTimeOf(id: string): string {
  const pagePath = join(pagesDir, `${id}.txt`);
  if (existsSync(pagePath)) {
    const header = readFileSync(pagePath, "utf8").split("\n").slice(0, 6).join("\n");
    const match = header.match(/^Read at: (.+)$/m);
    if (match) return match[1].trim();
  }
  return new Date(statSync(join(cacheDir, `${id}.html`)).mtimeMs).toISOString();
}

function writeManifest(config: SourcesFile, byId: Map<string, ManifestEntry>) {
  const pages = config.sources.map((source) => byId.get(source.id)).filter(Boolean) as ManifestEntry[];
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      { note: config.collectionNote, extractorVersion: EXTRACTOR_VERSION, pageCount: pages.length, pages },
      null,
      2,
    )}\n`,
  );
  return pages.length;
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const fromCache = process.argv.includes("--from-cache");
  const config: SourcesFile = JSON.parse(readFileSync(sourcesPath, "utf8"));
  mkdirSync(pagesDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  const existing: ManifestEntry[] = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")).pages
    : [];
  const byId = new Map<string, ManifestEntry>(existing.map((entry) => [entry.id, entry]));

  let readThisRun = 0;
  for (const source of config.sources) {
    if (!refresh && !fromCache && byId.has(source.id)) {
      console.log(`skip   ${source.id} (already in manifest)`);
      continue;
    }

    let html: string;
    let fetchedAt: string;
    if (fromCache) {
      const cached = join(cacheDir, `${source.id}.html`);
      if (!existsSync(cached)) {
        console.log(`skip   ${source.id} (nothing in the local cache)`);
        continue;
      }
      html = readFileSync(cached, "utf8");
      fetchedAt = readTimeOf(source.id);
      console.log(`cache  ${source.id} ${html.length} bytes, read at ${fetchedAt}`);
    } else {
      if (readThisRun > 0) {
        const pause = config.minPauseMs + Math.random() * (config.maxPauseMs - config.minPauseMs);
        console.log(`pause  ${Math.round(pause / 1000)}s`);
        await wait(pause);
      }
      const response = await fetch(source.url, {
        headers: { "User-Agent": config.userAgent, "Accept-Language": "en-US,en;q=0.9" },
      });
      html = await response.text();
      readThisRun += 1;
      console.log(`read   ${source.id} http ${response.status} ${html.length} bytes`);
      if (!response.ok) throw new Error(`${source.url} returned ${response.status}`);
      writeFileSync(join(cacheDir, `${source.id}.html`), html);
      fetchedAt = new Date().toISOString();
    }

    let title = "";
    let text = "";
    let selectorUsed = "";

    if (source.kind === "zapier-app") {
      const capabilities = extractZapierCapabilities(html);
      selectorUsed = "triggers-and-actions-section";
      title = "Contractor Foreman on Zapier, published triggers and actions";
      text = capabilities.items
        .map((item) => `${item.kind.toUpperCase()}\t${item.name}\t${item.description}`)
        .join("\n");
      writeFileSync(
        join(here, "zapier-capabilities.json"),
        `${JSON.stringify({ url: source.url, readAt: fetchedAt, ...capabilities }, null, 2)}\n`,
      );
    } else {
      const extracted = extractKbArticle(html);
      title = extracted.title;
      text = extracted.text;
      selectorUsed = extracted.selectorUsed;
    }

    const header = [
      `# ${title}`,
      `Source: ${source.url}`,
      `Read at: ${fetchedAt}`,
      `Extractor: ${EXTRACTOR_VERSION} (${selectorUsed})`,
      "Publicly available documentation, kept here as the evidence behind the analysis in this repository.",
      "",
      "",
    ].join("\n");
    writeFileSync(join(pagesDir, `${source.id}.txt`), header + text + "\n");

    byId.set(source.id, {
      id: source.id,
      kind: source.kind,
      url: source.url,
      why: source.why,
      fetchedAt,
      httpStatus: 200,
      title,
      selectorUsed,
      rawBytes: html.length,
      rawSha256: sha256(html),
      textChars: text.length,
      textSha256: sha256(text),
      extractorVersion: EXTRACTOR_VERSION,
    });
    // Written after every page: an interrupted run keeps what it has read.
    writeManifest(config, byId);
  }

  const count = writeManifest(config, byId);
  console.log(`manifest written with ${count} pages, ${readThisRun} read from the network in this run`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
