/**
 * Renders map/map.json as Markdown so the decisions can be read without running
 * anything. The JSON stays the source: this file is generated.
 *
 * Run: npm run map:render
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(join(here, "map.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(here, "..", "crawl", "manifest.json"), "utf8"));
const sources = new Map<string, { url: string; title: string; fetchedAt: string }>(
  manifest.pages.map((page: { id: string; url: string; title: string; fetchedAt: string }) => [page.id, page]),
);

const lines: string[] = [
  "<!-- Generated from map/map.json by npm run map:render. Edit the JSON, not this file. -->",
  "",
  `# ${map.title}`,
  "",
  map.note,
  "",
];

for (const line of map.lines) {
  const source = sources.get(line.documentedBehaviour.sourceId);
  lines.push(
    `## ${line.workflow}`,
    "",
    `**Decision: ${line.decisionLabel}.** ${line.whyThisChoice}`,
    "",
    `**Documented behaviour.** ${line.documentedBehaviour.summary}`,
    "",
    `> ${line.documentedBehaviour.excerpt}`,
    "",
    `Source: [${source?.title ?? line.documentedBehaviour.sourceId}](${source?.url ?? ""}), read ${source?.fetchedAt.slice(0, 10) ?? "unknown"}. Status: ${line.documentedBehaviour.status}.`,
    "",
    `**Proposed.** ${line.proposedAddition}`,
    "",
    `**Not verified.** ${line.unverifiedDependency.text} (${line.unverifiedDependency.status})`,
    "",
    `**What would change this.** ${line.wouldAbandonIf}`,
    "",
    `**Measurement.** ${line.measurement}`,
    "",
  );
}

lines.push("## Status vocabulary", "");
for (const [status, meaning] of Object.entries(map.statusVocabulary)) {
  lines.push(`- **${status}**: ${meaning}`);
}
lines.push("");

writeFileSync(join(here, "map.md"), `${lines.join("\n")}`);
console.log("map/map.md written");
