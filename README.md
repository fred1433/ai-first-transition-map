# AI-first transition map

An independent proposal, built from publicly available documentation, for adding an assisted step to an
established construction management platform: what to preserve, which pilot to test first, what to defer,
and the controls such a pilot would need.

The repository holds three things: the reading that grounds the proposal, the proposal itself, and a
working prototype of the pilot with the tests that show its controls hold.

**No access to anyone's application, codebase or data was used, requested or obtained.** No account, no
trial, no integration key. Every record in the prototype is invented.

## What is here

| Path | What it is |
| --- | --- |
| `crawl/` | The pages that were read: the list, the extractor, the manifest with dates and hashes, and the extracted article bodies |
| `map/` | The five decisions, each with its quoted source, and the rules used to take them |
| `foundations.md` | What the public documentation already describes, and what the pilot actually needs |
| `roadmap.md` | Three phases, each with an owner, a decision, what to verify, and how to go back |
| `lib/prototype/` | The pilot: contract, provenance checks, acceptance, audit trail, the shared invariant, caps, and the model call |
| `tests/` | The control tests, the mutation test, and the checks on the sources |
| `app/`, `components/` | The page that presents all of it |

## The pilot

Site notes typed on a phone become a draft of the narrative fields of a daily log. Every sentence carries
the fragment of the notes it came from, and keeps it: the sentences of one field are joined for the record,
their excerpts are not merged. What the notes do not say is listed as missing rather than filled in. Nothing
reaches the record until a person accepts that exact version of the draft.

Source excerpts are checked against the notes. Factual fidelity still requires review: the check compares
words, so an invented cause or an invented responsibility, carrying an authentic excerpt and no figure,
goes through. That case is in the test suite as a counter-example rather than left to be discovered.

An acceptance names the proposal, its version and its exact text. Editing the draft ends the acceptance in
force and keeps it in the history, so going back to a wording that was accepted earlier does not revive the
old acceptance: it is a new version and it needs its own.

Out of reach by design: hours, quantities, costs, equipment, linked records, and the business status of
the log. Those come from elsewhere in the record and are not a drafting aid's to write.

## The seven control scenarios, and how each one is tested

Every scenario below is exercised by `tests/controls.test.ts` through `lib/prototype/probes.ts`, which is
the same function the page calls when a visitor runs one. A scenario passes only if both halves agree: the
call ended the way the scenario says, and the state invariants of the record hold. The invariants travel in
the same verdict the page reads, so a label cannot pass while the record moved.

Five of the seven are refusals. Two are not: the unauthorised fields are withheld and the permitted text is
applied, and they are labelled that way rather than borrowing the word refused.

| Scenario | The attempt | Outcome | Test |
| --- | --- | --- | --- |
| Role | A read only role applies a draft already accepted, then tries to accept one | Operation blocked | `read-only-role` |
| Tenant | Someone from another company opens the record, then applies the draft | Operation blocked | `other-company` |
| Acceptance is required | The apply call is made without an acceptance | Operation blocked | `apply-without-acceptance` |
| Acceptance is bound to a version | The draft is edited after being accepted, applied, changed back to the accepted wording, applied again | Operation blocked | `edit-after-acceptance` |
| Applied once | The same proposal is applied twice | Operation blocked | `apply-twice` |
| Notes are input, not instructions | A line in the notes orders a status change and extra hours | Unauthorised fields withheld, permitted text applied | `instruction-in-notes` |
| Nothing beyond the notes | A draft states a duration and a headcount the notes never gave | Unauthorised fields withheld, permitted text applied | `invented-figures` |

Each test reads the stored record before and after, not the message on screen. Two of the three recorded
answers were written by hand to exercise a check, and the page says so where they are used.

**Mutation** (`tests/mutation.test.ts`): the acceptance check is neutralised in a copy of the same file the
demonstration runs through. The attempt that was refused then writes to the record, and the invariant in
`lib/prototype/invariant.ts`, the one the `apply-without-acceptance` scenario runs on the real code, is run
against that mutated copy and fails, naming which half failed and why. A suite that stays green when a
control is removed proves nothing, and an invariant that is never run against a broken implementation is
not known to detect anything.

**Sources** (`tests/sources.test.ts`): the extractor keeps the article body and drops the navigation that
every page of a knowledge base repeats, which is the difference between a reading and a claim of
coverage. Every sentence quoted in `map/map.json` has to appear, word for word, in the page it names.

## Running it

```bash
npm install
npm test          # every check above, offline, no key needed
npm run dev       # the page, with recorded answers
```

Live generation is optional. Without `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`, the recorded answers
still demonstrate the whole flow.

```bash
ANTHROPIC_MODEL=claude-sonnet-5 ANTHROPIC_API_KEY=... npm run dev
```

The model identifier is read from the environment and never written into the code, and so is the spending
guarantee: live generation runs on a dedicated provider workspace with a monthly spend limit, declared in
`NEXT_PUBLIC_DEMO_SPEND_LIMIT` and stated on the page. Without that variable the server refuses live
generation outright, and the page announces a recorded demonstration.

On top of that limit the call is bounded: capped output length, a cap of live generations a day for one
server instance and a smaller cap per address, and a polite refusal once a cap is reached. Those two
counters live in the memory of one process, so a restart or a second instance starts its own count. They
are a comfort, not the spending guarantee, and `lib/prototype/limits.ts` says so where it defines them.
No key ever reaches the browser.

The static instruction carries a cache marker, and at its current length that marker does nothing: the
instruction is shorter than the minimum prefix the model will cache, and the responses come back with
zero cached tokens. It is left in place because it is where caching would start to pay if the
instruction grew, and it is written here rather than counted as a saving.

## Reading the sources again

```bash
npm run crawl               # reads the pages missing from the manifest, at human pace
npm run crawl -- --from-cache   # rebuilds pages and manifest from the local cache, no network
npm run crawl:fixtures      # rebuilds the reduced fixtures used by the tests
```

Fifteen pages, read once each, several seconds apart, with a browser user agent and no login. The
manifest records for each page the address, the moment it was read, the status that came back and the
hashes of what was read.

## What this does not show

- How good the generated wording is on real site notes. Three control fixtures, one of them a model capture
  and two written by hand, and three live runs by the builder are not a measurement of a model.
- Whether a sentence is true. The checks compare words against the notes; factual fidelity still requires
  review.
- Whether this fits any particular application. Nothing here describes anyone's internals.
- Any figure of time saved, cost or gain. There is none in this repository, on purpose.

## Licence

MIT, see `LICENSE`.
