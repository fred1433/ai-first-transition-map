# Foundations, starting from what already exists

The temptation, on a transition of this kind, is to make a platform programme the precondition of the
first useful step: interfaces, events, permissions, audit, evaluation, all of it before anything is
tested.

For this pilot, I would first verify which existing interfaces and controls can be reused. Any
additional foundation would depend on what Phase 0 establishes.

## What the public documentation already describes

**Role permissions, per module.** The documentation describes four access levels that an administrator
sets per module and per role:

> No Access: The user assigned to this role will not be able to view or interact with the feature.

> Full Access – Own Data: The user can view, modify, and interact with data that's related to that user, and create own data within that module.

> Read Only: The user can view all data within that module but will not be able to make any changes.

Source: `crawl/pages/kb-roles-create-edit.txt`.

**Events and write actions, through the published integration.** The application's listing page on the
integration platform showed, on 18 September 2026, seven triggers and two write actions covering
customers, leads and file uploads. The list paginates, so that reading is not an inventory. It is
recorded in `crawl/zapier-capabilities.json`.

**Statuses on the record the pilot touches.** The daily log carries In Progress, Deferred and Complete.
No approval status appears in the pages that were read, which is exactly why the prototype keeps the
acceptance of a draft separate from the status of the log.

> Complete: No more notes need to be added to the Daily Log

Source: `crawl/pages/kb-daily-log-status.txt`.

## The sentence that belongs on the page

Public documentation describes role permissions and Zapier triggers and write actions. Their suitability
for this pilot has not been assessed. The first step would be to verify and reuse existing internal
interfaces and controls.

## What the pilot needs, and nothing more

| Need | Why the pilot needs it | Status from outside |
| --- | --- | --- |
| The notes that exist before the fields are filled | There is nothing to draft from otherwise | Not reviewed |
| An insertion point in the form that already exists | The pilot is an addition to a screen, not a second application | Not reviewed |
| The permission the assisted write inherits | An assisted write must be refused wherever the person would be refused | Documented publicly for roles, Not reviewed for how an assisted step inherits them |
| A record of what was proposed, changed and accepted | Otherwise nothing can be reviewed afterwards | Not reviewed |
| A way to switch it off | Phase 1 has to be reversible without a release | Not reviewed |

## What is not assumed to be on the critical path

A public API, an event bus, a company wide evaluation platform, a model gateway: none of them is
assumed here, and none of them is ruled out either. Whether any is needed is a Phase 0 answer, and it
would come from the interfaces and controls that already exist, not from this document.
