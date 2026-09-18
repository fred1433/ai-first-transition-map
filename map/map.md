<!-- Generated from map/map.json by npm run map:render. Edit the JSON, not this file. -->

# Workflows examined

Five workflows, chosen because a decision had to be taken on each one. This is not an inventory of the product: the pages read are listed in crawl/manifest.json and nothing here describes the internals of the application.

## Daily log, narrative fields

**Decision: Proposed pilot.** The workflow is easy to state, the output can be read in full before it is used, and the action is bounded: three text fields on a form that already exists.

**Documented behaviour.** The daily log carries typed narrative fields, and the documentation singles one of them out as the one that matters most.

> Under the details of your Daily Logs, you have the ability to enter arrival date and time, departure time and tasks performed. It is important to say that the Tasks performed field is one of the most important to fill.

Source: [Adding a New Daily Log](https://kb.contractorforeman.com/knowledge-base/adding-a-new-daily-log/), read 2026-09-18. Status: Documented publicly.

**Proposed.** An optional draft of the narrative fields from the notes a supervisor already types, every sentence tied to the words it came from, gaps named rather than filled, and an explicit acceptance before anything is written.

**Not verified.** Where the notes are captured today, which role would run the draft, and how an assisted write inherits the module permissions already defined. (Not reviewed)

**What would change this.** Site notes are not captured as free text before the fields are filled, or the people who fill the log do not want a review step on their own words.

**Measurement.** Hypothesis: reduce the rewriting of site notes. To verify on real cases by measuring total time, review and corrections included.

## Hours, equipment and linked records inside the same log

**Decision: Keep the existing mechanism.** These values are already derived from records. A model that repeats them can only add a second version of a number that was already right.

**Documented behaviour.** Hours reach the daily log from time cards by matching project and date, without anyone retyping them.

> The Time Cards are directly associated with the Daily Logs and in order for us to see them there, we must make sure that the Time Cards are entered to the same project on the same date.

Source: [How do I see Time Card hours in the Daily Log?](https://kb.contractorforeman.com/knowledge-base/how-do-i-see-time-card-hours-in-the-daily-log/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Nothing. The draft is refused write access to hours, quantities, equipment and linked records, and is told not to restate them in prose.

**Not verified.** Nothing to verify: this line exists to state what the pilot does not touch. (Documented publicly)

**What would change this.** Not applicable. This is the boundary, not a proposal.

**Measurement.** Observable in the demonstration: the structured side of the record is identical before and after an accepted draft is applied.

## Change orders

**Decision: Deferred.** This is the workflow most often shown in demonstrations and the one with the least room for a first mistake. It is a better second step than a first one.

**Documented behaviour.** A change order is the record that carries a modification of the contract amount and the trace of who asked for it and who approved it.

> In Contractor Foreman, Change Orders are used to document and track any modifications made to the original contract amount.

Source: [Basics of Change Orders](https://kb.contractorforeman.com/knowledge-base/basics-of-change-orders/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Not in the first pilot. Drafting a change order from an observation means qualifying scope, cost and responsibility, and a wrong draft there is expensive in a way a badly worded log is not.

**Not verified.** The internal approval path and who is allowed to price a change. (Not reviewed)

**What would change this.** Revisit once the narrative pilot shows how often accepted drafts are corrected, and only for the wording of a change order, never for its amounts.

**Measurement.** No measurement proposed yet. Nothing here is quantified.

## Answers to requests for information

**Decision: Deferred.** Routing, searching prior answers and drafting a question are plausible later. Drafting the answer itself is not, until the sources it would rely on are known.

**Documented behaviour.** The purpose of the record is to obtain clarification where the documents are silent or contradictory.

> A Request for Information (RFI) is used in construction to obtain clarification when plans, drawings, specifications, or agreements contain gaps, conflicts, or missing details.

Source: [What is the purpose of a Request for Information?](https://kb.contractorforeman.com/knowledge-base/what-is-the-purpose-of-a-request-for-information/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Not in the first pilot. A record whose reason to exist is a gap in the documents is the worst place to let a model fill a gap.

**Not verified.** What an answer would have to be grounded in: drawings, specifications, prior answers, and whether those are available to the application. (Not reviewed)

**What would change this.** Stays deferred as long as the grounding sources are not identified and reachable.

**Measurement.** No measurement proposed yet.

## Leads arriving from other systems

**Decision: Keep the existing mechanism.** Putting a model in a path that already works as a rule engine adds a failure mode and no capability.

**Documented behaviour.** Lead traffic in and out of the application is already covered by the published integration, with events on both sides.

> Yes, the leads sent to the CRM can be sent to Contractor Foreman using Zapier integrations.

Source: [Can I send Leads to my CRM or email system using Zapier?](https://kb.contractorforeman.com/knowledge-base/can-i-send-leads-to-my-crm-or-email-system-using-zapier/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Nothing. The published listing shows seven triggers and two write actions on customers, leads and file uploads, read on 18 September 2026 and not exhaustive because the list paginates.

**Not verified.** Whether these same events and write actions are usable internally for an assisted step, or whether they exist only for the integration. (Not reviewed)

**What would change this.** Not applicable. This is a line where the answer is to leave it alone.

**Measurement.** Not applicable.

## Status vocabulary

- **Documented publicly**: Stated in a page listed in the manifest. A documented behaviour is not a tested implementation.
- **Not found in reviewed sources**: Looked for in the pages that were read, not found there. It may exist elsewhere.
- **Not reviewed**: Outside what public pages can show. It would be answered by the product and engineering teams.
