"use client";

import { useState } from "react";
import mapData from "@/map/map.json";
import manifest from "@/crawl/manifest.json";

const TONE: Record<string, string> = {
  "proposed-pilot": "bg-bronze text-white border-bronze",
  "keep-existing": "bg-paper-sunk text-ink-soft border-rule-strong",
  deferred: "bg-paper-raised text-ink-soft border-rule-strong",
};

export function MapLines() {
  const [open, setOpen] = useState<string | null>(null);
  const sources = new Map(manifest.pages.map((page) => [page.id, page]));

  return (
    <div className="mt-12 divide-y divide-rule border-y border-rule">
      {mapData.lines.map((line) => {
        const expanded = open === line.id;
        const source = sources.get(line.documentedBehaviour.sourceId);
        return (
          <div key={line.id}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : line.id)}
              className="flex w-full cursor-pointer items-baseline gap-5 py-6 text-left transition-colors hover:bg-paper-sunk/50"
            >
              <span
                className={`mt-1 shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${TONE[line.decision]}`}
              >
                {line.decisionLabel}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] font-medium tracking-[-0.01em] text-ink">{line.workflow}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-ink-faint">{line.whyThisChoice}</span>
              </span>
              <span className="mt-1 shrink-0 text-[13px] text-ink-faint">{expanded ? "Close" : "Detail"}</span>
            </button>

            {expanded ? (
              <div className="grid gap-7 pb-10 md:grid-cols-2">
                <div>
                  <p className="label">Documented behaviour</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{line.documentedBehaviour.summary}</p>
                  <blockquote className="mt-4 border-l-2 border-rule-strong pl-4 text-[14px] leading-relaxed text-ink-faint italic">
                    {line.documentedBehaviour.excerpt}
                  </blockquote>
                  {source ? (
                    <a
                      className="mt-3 inline-block text-[13px] text-bronze underline underline-offset-4"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {source.title}
                    </a>
                  ) : null}
                  <p className="mt-2 text-[12px] text-ink-faint">
                    {line.documentedBehaviour.status}. Read {new Date(source?.fetchedAt ?? "").toISOString().slice(0, 10)}.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="label">Proposed</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{line.proposedAddition}</p>
                  </div>
                  <div>
                    <p className="label">Not verified</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                      {line.unverifiedDependency.text}{" "}
                      <span className="text-ink-faint">({line.unverifiedDependency.status})</span>
                    </p>
                  </div>
                  <div>
                    <p className="label">What would change this</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{line.wouldAbandonIf}</p>
                  </div>
                  <div>
                    <p className="label">Measurement</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{line.measurement}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
