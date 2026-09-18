# Three phases, organised around one pilot

Each phase names who owns it, the decision it exists to produce, what has to be verified, and how to
get back to the previous behaviour. "Without disrupting customers" is only real if the last column is
real.

## Phase 0, verify and reuse the minimum

**Owner**: product, with one engineer who knows the daily log module.

**Decision it produces**: a verified integration hypothesis, or the conclusion that this pilot is the
wrong one.

**What to verify**
- Where the notes a supervisor types today actually live before the narrative fields are filled.
- Which internal interface writes those fields, and whether an assisted step can reuse it rather than
  add a path around it.
- How an assisted write inherits the role permissions the documentation already describes, including
  read only and own data only.
- What the contract of a proposal is: which fields it may touch, what it must cite, what it must
  refuse, and what an acceptance is bound to.
- Where the record of proposals, changes and acceptances is kept, and who can read it.

**What it is not**: a platform programme decided in advance. Whether a public API, an event bus or
evaluation infrastructure is needed follows from the answers above, and this phase is what establishes
that.

**Back to the previous behaviour**: nothing shipped, nothing to undo.

## Phase 1, a bounded assisted step, optional and measured

**Owner**: engineering, with one supervisor and one project manager who use it daily.

**Decision it produces**: continue, change, or stop, in writing, on the numbers below.

**What ships**
- The draft is optional. The manual path stays exactly as it is, and is still the default.
- No autonomous write. Nothing reaches the record without an explicit acceptance of that exact draft.
- Only the narrative fields. Hours, quantities, costs and linked records stay out of reach.
- The business status of the log is never set by the assisted step.

**What to measure**
- Total time of the path, corrections and review included, against the time the manual path takes
  today. Review time on its own would flatter the assisted step by leaving its corrections out.
- How often a draft is accepted, and how much of it is rewritten first.
- Latency and cost per draft.
- What people say when they turn it off.

**Back to the previous behaviour**: a switch per company and per role, off by default, that removes the
button without a release. Records written through an accepted draft are ordinary records: turning the
feature off leaves them readable and editable exactly like the others.

## Phase 2, conditional extension

**Owner**: product, on the phase 1 numbers.

**Decision it produces**: which second workflow, if any, reuses the controls proven in phase 1.

**Principles**
- Reuse the acceptance, the provenance check and the record of decisions before writing new ones.
- Increase autonomy only where the phase 1 measurements show corrections are rare and cheap.
- "Several agents" is not a success criterion. A second workflow that nobody switches off is.

**Back to the previous behaviour**: same switch, per workflow, plus the phase 1 rollback for the first
one.

## What each phase is allowed to claim

Phase 0 produces a verified hypothesis. Phase 1 produces measurements on real work. Phase 2 produces a
second workflow. None of them produces a number that can be announced before it is measured, and
nothing in this repository claims one.
