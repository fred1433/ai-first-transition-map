/**
 * Reduced copies of two pages that were read, kept so the extractor can be
 * tested offline without the network.
 *
 * Each fixture is a real slice of the page as it was served, cut between two
 * markers so that it still contains both halves that matter: the navigation
 * shared by every page, and the part that belongs to this page. Scripts, styles
 * and inline data are removed. Nothing is rewritten.
 *
 * Run: npm run crawl:fixtures
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

interface Cut {
  id: string;
  from: string;
  /** Start of the part that belongs to this page, when the lead has to be cut short. */
  bodyFrom?: string;
  to: string;
  title: string;
}

const CUTS: Cut[] = [
  {
    id: "kb-daily-log-new",
    from: 'id="eckb-article-left-sidebar"',
    bodyFrom: 'id="eckb-article-content-body"',
    to: 'id="eckb-article-content-footer"',
    title: "Adding a New Daily Log",
  },
  {
    id: "vendor-zapier-app",
    from: "Triggers &amp; Actions",
    to: "For builders",
    title: "Contractor Foreman on Zapier",
  },
];

function strip(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s(src|srcset|href)="data:[^"]*"/gi, "")
    .replace(/\n{3,}/g, "\n\n");
}

mkdirSync(join(here, "fixtures"), { recursive: true });
for (const cut of CUTS) {
  const raw = strip(readFileSync(join(here, "cache", `${cut.id}.html`), "utf8"));
  const start = raw.indexOf(cut.from);
  const end = raw.indexOf(cut.to, start);
  if (start === -1 || end === -1) throw new Error(`Markers not found in ${cut.id}`);
  const openingTag = raw.lastIndexOf("<", start);
  // The shared navigation of the knowledge base lists every article of the site.
  // Enough of it is kept to prove the extractor drops it, not all of it.
  const bodyStart = cut.bodyFrom ? raw.indexOf(cut.bodyFrom, start) : -1;
  const lead = raw.slice(openingTag, Math.min(openingTag + 18000, bodyStart === -1 ? raw.length : bodyStart));
  const rest =
    bodyStart === -1 ? "" : raw.slice(raw.lastIndexOf("<", bodyStart), end + cut.to.length);
  const slice = bodyStart === -1 ? raw.slice(openingTag, end + cut.to.length) : `${lead}\n${rest}`;
  const document = `<!doctype html>\n<html lang="en"><head><title>${cut.title}</title></head><body>\n${slice}\n</body></html>\n`;
  writeFileSync(join(here, "fixtures", `${cut.id}.trimmed.html`), document);
  console.log(`${cut.id}: ${raw.length} bytes -> ${document.length} bytes`);
}
