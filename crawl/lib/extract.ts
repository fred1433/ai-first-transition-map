/**
 * Extraction of the parts of a public page that actually belong to it.
 *
 * The knowledge base wraps every article in a long navigation that is identical
 * on every page: category lists, article lists, breadcrumbs, header and footer.
 * Taking the whole page as "content" would make any coverage claim false, so the
 * extractor keeps the article body only and the tests assert that shared
 * navigation never reaches the extracted text.
 */
import * as cheerio from "cheerio";

export const EXTRACTOR_VERSION = "1.0.0";

const KB_BODY_SELECTORS = ["#eckb-article-content-body", "#eckb-article-content", "article .entry-content"];

const KB_DROP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "#eckb-article-left-sidebar",
  "#eckb-article-right-sidebar",
  "#eckb-article-content-breadcrumb-container",
  "#eckb-article-back-navigation-container",
  "#eckb-article-content-footer",
  "#eprf-article-feedback-container",
  "#eprf-article-buttons-container",
  ".eckb-nav-sidebar",
  ".elay-sidebar__body",
];

const BLOCK_TAGS = new Set([
  "p", "div", "section", "li", "ul", "ol", "table", "tr", "br",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "figure", "figcaption",
]);

function normalise(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .trim();
}

export interface ExtractedPage {
  title: string;
  text: string;
  selectorUsed: string;
}

/** Article body of a knowledge base page, without the navigation shared by every page. */
export function extractKbArticle(html: string): ExtractedPage {
  const $ = cheerio.load(html);
  const title = normalise($("h1").first().text() || $("title").first().text());

  let selectorUsed = "";
  let node: cheerio.Cheerio<never> | null = null;
  for (const selector of KB_BODY_SELECTORS) {
    const found = $(selector).first();
    if (found.length > 0) {
      selectorUsed = selector;
      node = found as never;
      break;
    }
  }
  if (!node) {
    throw new Error("No article body found. The page layout changed, extraction must not silently fall back to the whole page.");
  }

  const body = $(node as never);
  for (const selector of KB_DROP_SELECTORS) {
    body.find(selector).remove();
  }
  body.find("*").each((_, element) => {
    if (BLOCK_TAGS.has((element as { tagName?: string }).tagName ?? "")) {
      $(element).append("\n");
    }
  });

  return { title, text: normalise(body.text()), selectorUsed };
}

export interface ZapierCapability {
  name: string;
  description: string;
  kind: "trigger" | "action";
}

export interface ZapierCapabilities {
  items: ZapierCapability[];
  /** The page paginates its list, so a reading of it is never a complete inventory. */
  moreAvailable: boolean;
  exhaustive: false;
}

/**
 * Published triggers and write actions of an application listing page.
 * The list is read as rendered, and the pagination control is reported so the
 * reading is never presented as the whole capability surface.
 */
export function extractZapierCapabilities(html: string): ZapierCapabilities {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  // One line per element: the list is rendered as sibling nodes, and a plain
  // text() call would glue a capability name onto its description.
  const markup = ($("body").html() ?? "").replace(/<[^>]+>/g, "\n");
  const lines = cheerio
    .load(`<div>${markup}</div>`)
    .text()
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const start = lines.findIndex((line) => line === "Triggers & Actions");
  if (start === -1) {
    throw new Error("Trigger and action section not found. The layout changed, the reading must not be guessed.");
  }
  const end = lines.findIndex((line, index) => index > start && (line === "Load more" || line === "For builders"));
  const section = lines.slice(start + 1, end === -1 ? lines.length : end);

  const items: ZapierCapability[] = [];
  for (let index = 0; index < section.length - 1; index += 1) {
    const description = section[index + 1];
    const isTrigger = /^Triggers when /.test(description);
    const isAction = /^(Creates|Updates|Adds|Finds) /.test(description);
    if (!isTrigger && !isAction) continue;
    const name = section[index];
    if (!name || name.length > 60 || /[.]$/.test(name)) continue;
    if (items.some((item) => item.name === name)) continue;
    items.push({ name, description, kind: isTrigger ? "trigger" : "action" });
  }

  return {
    items,
    moreAvailable: lines.slice(start).includes("Load more"),
    exhaustive: false,
  };
}
