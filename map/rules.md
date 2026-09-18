# How a line was decided

Five workflows, five decisions. The rules below are the ones actually applied, written down so that a
reader can disagree with a decision rather than with a feeling.

## What can be used as a reason

1. **A documented behaviour.** A page listed in `crawl/manifest.json`, quoted verbatim in `map/map.json`.
   A behaviour described in documentation is not an implementation anyone has tested.
2. **A property of the workflow itself.** How bounded the action is, whether a person can read the whole
   output before it is used, what a wrong output would commit the company to.

## What cannot be used as a reason

- A number nobody measured. No time saved, no cost, no volume, no rate of adoption appears anywhere in
  this repository. The one hypothesis stated is labelled as a hypothesis with the measurement it needs.
- An assumption about the internals of the application. Nothing here describes an architecture, a stack,
  a database or a queue. Public pages do not show those, and a guess dressed as a finding is worse than
  a gap.
- The popularity of a workflow in demonstrations of other products.

## The three decisions

| Decision | What it means |
| --- | --- |
| Proposed pilot | The one workflow where an assisted step is worth testing first, with its acceptance step and its measurement. |
| Keep the existing mechanism | A place where something already works and a model would only add a way to be wrong. |
| Deferred | A workflow where an assisted step is plausible later, with the fact that would have to be true first. |

## What each line has to carry

- the documented behaviour, with the source page and the quoted sentence;
- the proposed addition, or the explicit absence of one;
- the reason the decision went that way;
- the dependency that was not verified, with its status;
- the fact that would make the proposal be abandoned.

## Status vocabulary

- **Documented publicly**: stated in a page listed in the manifest.
- **Not found in reviewed sources**: looked for in the pages read, not found there. It may exist elsewhere.
- **Not reviewed**: outside what public pages can show. A question for the product and engineering teams.
