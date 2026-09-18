<!-- Generated from map/map.json by npm run map:render. Edit the JSON, not this file. -->

# Workflows examined

Five workflows, chosen because a decision had to be taken on each one. This is not an inventory of the product: the pages read are listed in crawl/manifest.json and nothing here describes the internals of the application.

## Daily log, narrative fields

**Decision: Proposed pilot.** The workflow is easy to state, the output can be read in full before it is used, and the action is bounded: three text fields on a form that already exists.

**Documented behaviour.** The daily log carries typed narrative fields, and the documentation singles one of them out as the one that matters most.

> Under the details of your Daily Logs, you have the ability to enter arrival date and time, departure time and tasks performed. It is important to say that the Tasks performed field is one of the most important to fill.

Source: [Adding a New Daily Log](https://kb.contractorforeman.com/knowledge-base/adding-a-new-daily-log/), read 2026-09-18. Status: Documented publicly.

**Proposed.** An optional draft of the narrative sections from the notes a supervisor already types, every sentence tied to the words it came from, gaps named rather than filled, and an explicit acceptance before anything is written. The demo uses three narrative sections. Their mapping to existing fields and permitted write paths is a Phase 0 check.

**Not verified.** Where the notes are captured today, which role would run the draft, how an assisted write inherits the module permissions already defined, and which existing fields the three sections map to. (Not reviewed)

**What would change this.** Site notes are not captured as free text before the fields are filled, or the people who fill the log do not want a review step on their own words.

**Measurement.** Hypothesis: reduce the rewriting of site notes. To verify on real cases by measuring total time, review and corrections included.

## Hours, equipment and linked records inside the same log

**Decision: Keep the existing mechanism.** Keep structured values on their existing input and linked-record paths. Do not generate replacements.

**Documented behaviour.** Hours reach the daily log from time cards by matching project and date, without anyone retyping them.

> The Time Cards are directly associated with the Daily Logs and in order for us to see them there, we must make sure that the Time Cards are entered to the same project on the same date.

Source: [How do I see Time Card hours in the Daily Log?](https://kb.contractorforeman.com/knowledge-base/how-do-i-see-time-card-hours-in-the-daily-log/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Nothing. The draft is refused write access to hours, quantities, equipment and linked records, and is told not to restate them in prose.

**Not verified.** Isolation of the assisted write from structured fields. (Not reviewed)

**What would change this.** The pilot stops if that isolation cannot be established. Generating hours or quantities is not the alternative.

**Measurement.** Observable in the demonstration: the structured side of the record is identical before and after an accepted draft is applied.

## Change orders

**Decision: Deferred.** A draft here would have to qualify scope, cost and responsibility, on a record that carries an approval trace. Those are the parts to verify before proposing anything.

**Documented behaviour.** A change order is the record that carries a modification of the contract amount and the trace of who asked for it and who approved it.

> In Contractor Foreman, Change Orders are used to document and track any modifications made to the original contract amount.

Source: [Basics of Change Orders](https://kb.contractorforeman.com/knowledge-base/basics-of-change-orders/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Defer drafting that could affect contract scope or amount until the approval path and responsible roles have been verified.

**Not verified.** The internal approval path and who is allowed to price a change. (Not reviewed)

**What would change this.** The team identifies a strictly editorial case, with its data and approvals already settled, and confirms it comes before the daily log. The order proposed here is a proposal, not a reading of their priorities.

**Measurement.** No measurement proposed yet. Nothing here is quantified.

## Answers to requests for information

**Decision: Deferred.** Routing, searching prior answers and drafting a question are plausible later. Drafting the answer itself depends on sources that have to be identified first.

**Documented behaviour.** The purpose of the record is to obtain clarification where the documents are silent or contradictory.

> A Request for Information (RFI) is used in construction to obtain clarification when plans, drawings, specifications, or agreements contain gaps, conflicts, or missing details.

Source: [What is the purpose of a Request for Information?](https://kb.contractorforeman.com/knowledge-base/what-is-the-purpose-of-a-request-for-information/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Defer answer drafting until the drawings, specifications and prior answers it would cite are identified and accessible.

**Not verified.** What an answer would have to be grounded in: drawings, specifications, prior answers, and whether those are available to the application. (Not reviewed)

**What would change this.** Stays deferred as long as the grounding sources are not identified and reachable.

**Measurement.** No measurement proposed yet.

## Leads arriving from other systems

**Decision: Keep the existing mechanism.** The documented integration already moves structured leads as a rule engine. What it does not cover has to be established before anything is added to that path.

**Documented behaviour.** The published integration can send leads into the application, and the listing shows events and write actions on both sides.

> Yes, the leads sent to the CRM can be sent to Contractor Foreman using Zapier integrations.

Source: [Can I send Leads to my CRM or email system using Zapier?](https://kb.contractorforeman.com/knowledge-base/can-i-send-leads-to-my-crm-or-email-system-using-zapier/), read 2026-09-18. Status: Documented publicly.

**Proposed.** Keep the existing integration for structured lead transfers. Verify coverage of the actual inputs and exceptions before proposing an assisted step.

**Not verified.** Coverage of the actual inputs and exceptions of the lead workflow today. (Not reviewed)

**What would change this.** Unstructured inputs the workflow needs turn out not to be covered by the existing rules.

**Measurement.** No measurement proposed: nothing is added on this line.

## Status vocabulary

- **Documented publicly**: Stated in a page listed in the manifest. A documented behaviour is not a tested implementation.
- **Not found in reviewed sources**: Looked for in the pages that were read, not found there. It may exist elsewhere.
- **Not reviewed**: Outside what public pages can show. It would be answered by the product and engineering teams.
