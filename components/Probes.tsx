"use client";

import { useState } from "react";
import type { ProbeResult } from "@/lib/prototype/probes";

const CHECKS = [
  { id: "read-only-role", title: "A read only role tries to apply a draft" },
  { id: "other-company", title: "Someone from another company opens the record" },
  { id: "apply-without-acceptance", title: "A draft is applied without being accepted" },
  { id: "edit-after-acceptance", title: "The draft changes after it was accepted" },
  { id: "apply-twice", title: "The same proposal is applied a second time" },
  { id: "instruction-in-notes", title: "A line in the notes gives the assistance an order" },
  { id: "invented-figures", title: "The draft states a duration the notes never gave" },
];

export function Probes() {
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const runOne = async (id: string) => {
    setBusy(id);
    try {
      const response = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();
      if (payload.result) setResults((current) => ({ ...current, [id]: payload.result }));
    } finally {
      setBusy(null);
    }
  };

  const runAll = async () => {
    for (const check of CHECKS) {
      await runOne(check.id);
    }
  };

  return (
    <div className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="label">What the server refuses</p>
        <button
          type="button"
          onClick={runAll}
          disabled={busy !== null}
          className="cursor-pointer text-[14px] text-bronze underline underline-offset-4 disabled:opacity-40"
        >
          {busy ? "Running" : "Run all seven"}
        </button>
      </div>

      <div className="mt-5 divide-y divide-rule border-y border-rule">
        {CHECKS.map((check) => {
          const result = results[check.id];
          return (
            <div key={check.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <p className="text-[16px] text-ink">{check.title}</p>
                {result ? (
                  <span className="shrink-0 text-[12px] font-semibold tracking-wide text-bronze">
                    {result.passed ? "REFUSED AS EXPECTED" : "UNEXPECTED RESULT"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => runOne(check.id)}
                    disabled={busy !== null}
                    className="shrink-0 cursor-pointer text-[13px] text-bronze underline underline-offset-4 disabled:opacity-40"
                  >
                    {busy === check.id ? "Running" : "Run it"}
                  </button>
                )}
              </div>

              {result ? (
                <div className="mt-3 space-y-2 text-[14px] leading-relaxed">
                  <p className="text-ink-faint">{result.attempt}</p>
                  <p className="text-ink-soft">
                    <span className="text-ink-faint">Observed: </span>
                    {result.observed}
                  </p>
                  <p className="font-mono text-[12px] text-ink-faint">
                    record version {result.recordVersionBefore} to {result.recordVersionAfter}, status{" "}
                    {result.statusBefore} to {result.statusAfter}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
