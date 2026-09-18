import { Demonstration } from "@/components/Demonstration";
import { MapLines } from "@/components/MapLines";
import { Probes } from "@/components/Probes";
import manifest from "@/crawl/manifest.json";
import { SCENARIOS, seedLogs } from "@/lib/prototype/scenario";
import zapier from "@/crawl/zapier-capabilities.json";
import { PER_ADDRESS_DAILY_LIMIT, PER_INSTANCE_DAILY_LIMIT } from "@/lib/prototype/limits";

const REPO = "https://github.com/fred1433/ai-first-transition-map";

const readingDate = new Date(
  manifest.pages.map((page) => page.fetchedAt).sort().at(-1) ?? new Date().toISOString(),
).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const PHASES = [
  {
    name: "Phase 0",
    title: "Verify and reuse the minimum",
    owner: "Product, with one engineer who knows the module",
    decision: "A verified integration hypothesis, or the conclusion that this is the wrong pilot",
    back: "Nothing shipped, nothing to undo",
    verify: [
      "Where the notes a supervisor types today live before the narrative fields are filled.",
      "Which internal interface writes those fields, and whether an assisted step can reuse it rather than add a path around it.",
      "Which existing fields the three narrative sections map to, and which write paths are permitted.",
      "How an assisted write inherits the role permissions the documentation already describes, including read only and own data only.",
      "What a proposal is bound to: the fields it may touch, what it must cite, what it must refuse, what an acceptance names.",
      "Where the record of proposals, changes and acceptances is kept, and who can read it.",
    ],
    measure: ["Nothing is measured in this phase. It produces answers, not numbers."],
  },
  {
    name: "Phase 1",
    title: "A bounded assisted step, optional and measured",
    owner: "Engineering, with the people who fill the log every day",
    decision: "Continue, change or stop, in writing, on the measurements",
    back: "A switch per company and per role, off by default, without a release",
    verify: [
      "The manual path stays the default, and the draft is optional.",
      "Nothing reaches the record without an explicit acceptance of that exact version.",
      "Only the narrative sections are written. Hours, quantities, costs and linked records stay out of reach.",
      "The business status of the log is never set by the assisted step.",
    ],
    measure: [
      "Total time of the path, corrections and review included, against the time the manual path takes today. Review time alone would leave the corrections out.",
      "How often a draft is accepted, and how much of it is rewritten first.",
      "Latency and cost per draft.",
      "What people say when they turn it off.",
    ],
  },
  {
    name: "Phase 2",
    title: "Conditional extension",
    owner: "Product, on the phase 1 numbers",
    decision: "Which second workflow reuses these controls, if any",
    back: "The same switch, per workflow",
    verify: [
      "The acceptance, the provenance check and the record of decisions are reused before any new ones are written.",
      "Autonomy increases only where the phase 1 measurements show corrections are rare and cheap.",
    ],
    measure: ["The same measurements as phase 1, on the second workflow. A second workflow nobody switches off is the criterion, not a count of agents."],
  },
];

export default function Page() {
  const triggers = zapier.items.filter((item) => item.kind === "trigger").length;
  const actions = zapier.items.filter((item) => item.kind === "action").length;
  const spendLimit = process.env.NEXT_PUBLIC_DEMO_SPEND_LIMIT;
  // The variable carries the limit as it is set on the provider ("5 USD/month").
  // The sentence already says monthly, so the period is not repeated.
  const spendAmount = spendLimit?.replace(/\s*(\/|per\s+)month\s*$/i, "").trim();

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 md:px-8">
      {/* 1. The recommendation, immediately, with the two ways into the rest */}
      <section className="pt-20 pb-20 md:pt-24 md:pb-24">
        <p className="label">Independent concept by The AI Pipe</p>
        <h1 className="mt-8 text-[42px] leading-[1.06] font-semibold tracking-[-0.028em] text-ink md:text-[62px]">
          Contractor Foreman: AI-first transition proposal
        </h1>

        <p className="label mt-12">The recommendation</p>
        <h2 className="mt-5 text-[28px] leading-[1.25] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          Start with the narrative fields of the daily log.
        </h2>
        <p className="prose-line mt-6 max-w-[660px]">
          Site notes, typed the way they are typed today, become a draft of the fields a supervisor writes by hand.
          Every sentence carries the words it came from. What the notes do not say is listed as missing instead of
          being filled in. Nothing reaches the record until a person reads that exact draft and accepts it.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#trade-offs"
            className="rounded-md bg-ink px-5 py-3 text-[14px] font-medium text-paper transition-opacity hover:opacity-85"
          >
            The five trade-offs
          </a>
          <a
            href="#demonstration"
            className="rounded-md border border-rule-strong bg-paper-raised px-5 py-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-paper-sunk"
          >
            The recorded replay
          </a>
        </div>

        <p className="mt-9 text-[14px] leading-relaxed text-ink-faint">
          Public documentation only, read up to {readingDate}. Synthetic demonstration data. No access to your
          application or codebase.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div>
            <p className="label">Why this one</p>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
              The workflow states itself in a sentence, the output can be read in full before it is used, and the
              action is bounded to three narrative sections of a form that already exists.
            </p>
          </div>
          <div>
            <p className="label">What stays unchanged</p>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
              The manual path stays the default. Hours from time cards, quantities, equipment and linked records stay
              out of reach. The status of the log is never set by the assistance.
            </p>
          </div>
          <div>
            <p className="label">The main unknown</p>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
              The demo uses three narrative sections. Their mapping to existing fields and permitted write paths is a
              Phase 0 check, together with the role permissions an assisted write would inherit.
            </p>
          </div>
        </div>

        <p className="mt-12 border-l-2 border-bronze pl-5 text-[16px] leading-[1.7] text-ink-soft">
          Hypothesis: reduce the rewriting of site notes. To verify on real cases by measuring total time, review and
          corrections included.
        </p>

        <div className="mt-12 rounded-xl border border-rule bg-paper-raised p-6 md:p-8">
          <p className="label">Experience, stated plainly</p>
          <p className="mt-4 text-[15px] leading-[1.75] text-ink-soft">
            What I have done: built and operate AI-assisted steps on a compliance platform in daily production use
            since 2026, with approval steps, replayable evidence and a second model family as reviewer; delivered a
            two-company due diligence with the same harness.
          </p>
          <p className="mt-3 text-[15px] leading-[1.75] text-ink-soft">
            What I have not done: modernize a third-party SaaS of your size.
          </p>
          <p className="mt-3 text-[15px] leading-[1.75] text-ink-soft">
            What follows is the method I would apply, with the pilot as its first test.
          </p>
        </div>
      </section>

      {/* 2. The trade-offs */}
      <section id="trade-offs" className="scroll-mt-8 border-t border-rule py-20 md:py-28">
        <p className="label">The trade-offs</p>
        <h2 className="mt-6 text-[32px] leading-[1.15] font-semibold tracking-[-0.022em] text-ink md:text-[42px]">
          Five workflows, five decisions.
        </h2>
        <p className="prose-line mt-7 max-w-[640px]">
          These are decisions, not an inventory. Each line names the documented behaviour it rests on, what I would add
          or leave alone, the dependency I could not verify from outside, and the fact that would make me drop the
          proposal.
        </p>

        <MapLines />

        <div className="mt-16 border-t border-rule pt-12">
          <p className="label">Foundations</p>
          <p className="prose-line mt-6 max-w-[660px]">
            Public documentation describes role permissions and Zapier triggers and write actions. Their suitability for
            this pilot has not been assessed. The first step would be to verify and reuse existing internal interfaces
            and controls.
          </p>
          <p className="mt-5 max-w-[660px] text-[15px] leading-[1.7] text-ink-faint">
            The published listing showed {triggers} triggers and {actions} write actions on {readingDate}, and it
            paginates, so that reading is not an inventory. Whether a public API, an event bus or a company wide
            evaluation platform is needed is a Phase 0 answer: none of them is assumed here, and none is ruled out.
          </p>
        </div>

        <div className="mt-16 divide-y divide-rule border-y border-rule">
          {PHASES.map((phase) => (
            <div key={phase.name} className="grid gap-4 py-7 md:grid-cols-[110px_1fr]">
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-bronze">{phase.name}</p>
              <div>
                <p className="text-[18px] font-medium tracking-[-0.01em] text-ink">{phase.title}</p>
                <p className="mt-2 text-[15px] leading-[1.7] text-ink-soft">
                  Owned by {phase.owner}. Ends with a decision: {phase.decision.toLowerCase()}.
                </p>
                <p className="mt-1 text-[14px] leading-[1.7] text-ink-faint">
                  Back to the previous behaviour: {phase.back.toLowerCase()}.
                </p>
                <details className="disclosure mt-3">
                  <summary>What it verifies, and what it measures</summary>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="label">Verified in this phase</p>
                      <ul className="mt-3 space-y-2 text-[14px] leading-[1.7] text-ink-soft">
                        {phase.verify.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="label">Measured in this phase</p>
                      <ul className="mt-3 space-y-2 text-[14px] leading-[1.7] text-ink-soft">
                        {phase.measure.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. The proof, at the click */}
      <section id="demonstration" className="scroll-mt-8 border-t border-rule py-20 md:py-28">
        <p className="label">The proof, at the click</p>
        <h2 className="mt-6 text-[32px] leading-[1.15] font-semibold tracking-[-0.022em] text-ink md:text-[42px]">
          One proposed workflow, demonstrated.
        </h2>
        <p className="prose-line mt-7 max-w-[660px]">
          A working prototype of the pilot on invented site notes, with the controls it would need. It runs on synthetic
          data in a sandbox, and it is connected to nothing.
        </p>
        <p className="mt-5 max-w-[660px] text-[15px] leading-[1.7] text-ink-faint">
          Source excerpts are checked against the notes. Factual fidelity still requires review. Controls tested on
          recorded fixtures. Live model demonstrations reported separately. Production generation quality not assessed.
        </p>

        <Demonstration scenario={SCENARIOS[0]} initialLog={seedLogs()[0]} liveEnabled={Boolean(spendLimit)} />

        <details className="disclosure mt-14">
          <summary>Open the seven control scenarios</summary>
          <Probes />
        </details>

        <details className="disclosure mt-10">
          <summary>What was actually tested, and what it does not show</summary>
          <div className="mt-6 border-t border-rule pt-8">
            <ul className="space-y-3 text-[15px] leading-[1.7] text-ink-soft">
              <li>
                Seven control scenarios, the ones above. The page and the test suite call the same function, and a
                scenario only passes if the state invariants of the record hold in that same verdict.
              </li>
              <li>
                One mutation: the acceptance control is neutralised in a copy of the same file the demonstration runs
                through, the blocked attempt then writes to the record, and the same invariant, run against that copy,
                fails and names the reason.
              </li>
              <li>
                Quotation checks on the sources: every sentence quoted on this page has to appear in the page it names,
                or continuous integration fails.
              </li>
            </ul>

            <div className="mt-8 rounded-xl border border-rule bg-paper-raised p-6">
              <p className="label">Fixtures and live runs, counted apart</p>
              <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
                Control fixtures: three, including one model capture and two hand-written adversarial cases.
              </p>
              <p className="mt-2 text-[15px] leading-[1.7] text-ink-soft">
                Builder live runs: three, one fixture capture, one deployed walkthrough and one check of the provider
                workspace this page now calls. Not a quality evaluation.
              </p>
              <p className="mt-3 text-[14px] leading-[1.7] text-ink-faint">
                The categories overlap: the capture used as a fixture is one of the live runs, not a separate
                demonstration.
              </p>
            </div>

            <p className="mt-8 text-[15px] leading-[1.7] text-ink-faint">
              {spendLimit ? (
                <>
                  Live generation runs on a dedicated provider workspace with a monthly spend limit of {spendAmount}.
                  Per-instance and per-address limits apply on top; they reset when the process restarts. In this
                  deployment they are {PER_INSTANCE_DAILY_LIMIT} live generations a day for one server instance and{" "}
                  {PER_ADDRESS_DAILY_LIMIT} per address.
                </>
              ) : (
                <>
                  Live generation is switched off on this deployment: the server refuses it, and what you see is the
                  recorded demonstration.
                </>
              )}
            </p>

            <p className="mt-4 text-[15px] leading-[1.7] text-ink-faint">
              What none of this shows: how good the generated wording is on real site notes, and whether this fits your
              application. Those are phase 0 and phase 1 questions.
            </p>
          </div>
        </details>
      </section>

      <footer className="border-t border-rule py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-5 text-[13px] text-ink-faint">
          <p>
            Independent concept by{" "}
            <a className="text-bronze underline underline-offset-4" href="https://theaipipe.com" target="_blank" rel="noreferrer noopener">
              The AI Pipe
            </a>
            . Not affiliated with, commissioned by or endorsed by Contractor Foreman.
          </p>
          <a className="text-bronze underline underline-offset-4" href={REPO} target="_blank" rel="noreferrer noopener">
            Code, sources and tests
          </a>
        </div>
      </footer>
    </main>
  );
}
