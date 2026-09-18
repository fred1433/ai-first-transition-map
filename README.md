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
| `lib/prototype/` | The pilot: contract, provenance checks, acceptance, audit trail, caps, and the model call |
| `tests/` | The control tests, the mutation test, and the checks on the sources |
| `app/`, `components/` | The page that presents all of it |

## The pilot

Site notes typed on a phone become a draft of the narrative fields of a daily log. Every sentence carries
the fragment of the notes it came from. What the notes do not say is listed as missing rather than filled
in. Nothing reaches the record until a person accepts that exact draft.

Out of reach by design: hours, quantities, costs, equipment, linked records, and the business status of
the log. Those come from elsewhere in the record and are not a drafting aid's to write.

## The controls, and how each one is tested

Every control below is exercised by `tests/controls.test.ts` through `lib/prototype/probes.ts`, which is
the same function the page calls when a visitor runs a check. A claim on the page and a test in this
repository cannot drift apart, because they are the same code.

| Control | The attempt | Test |
| --- | --- | --- |
| Role | A read only role accepts a draft | `read-only-role` |
| Tenant | Someone from another company applies it | `other-company` |
| Acceptance is required | The apply call is made without an acceptance | `apply-without-acceptance` |
| Acceptance is bound to a version | The draft is edited after being accepted, then applied | `edit-after-acceptance` |
| Applied once | The same proposal is applied twice | `apply-twice` |
| Notes are input, not instructions | A line in the notes orders a status change and extra hours | `instruction-in-notes` |
| Nothing beyond the notes | A draft states a duration and a headcount the notes never gave | `invented-figures` |

Each test reads the stored record before and after, not the message on screen.

**Mutation** (`tests/mutation.test.ts`): the acceptance check is neutralised in a copy of the same file
the demonstration runs through. The attempt that was refused then writes to the record, and the test
catches it. A suite that stays green when a control is removed proves nothing.

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

The model identifier is read from the environment and never written into the code. The call is bounded:
capped output length, the static instruction marked for caching, a global cap of 40 live generations a
day across all visitors and a smaller cap per address, and a polite refusal once a cap is reached. No key
ever reaches the browser.

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

- How good the generated wording is on real site notes. Three recorded answers and a couple of live
  demonstrations are not a measurement of a model.
- Whether this fits any particular application. Nothing here describes anyone's internals.
- Any figure of time saved, cost or gain. There is none in this repository, on purpose.

## Licence

MIT, see `LICENSE`.
