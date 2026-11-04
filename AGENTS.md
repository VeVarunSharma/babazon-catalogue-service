# Working on the catalogue service

This repository is the browse/detail companion starter, not a finished learner solution. Read `README.md`, `DESIGN.md`, and the assigned issue before editing.

## Issue-first workflow

Use **one parent outcome issue -> reviewed Copilot App Plan -> exactly four bounded child issues across the app and service copies -> isolated sessions -> evidence**.

The Plan must define acceptance criteria, exclusions, repository-qualified issue links, path ownership, contract decisions, and dependencies. Keep the Plan on the issue/in the Copilot App; do not add planning folders or scratch notes to Git. Do not implement from an unreviewed task list.

The four participant children are:

1. **Service contract:** own `contracts/**`, `src/shared/contracts.ts`, and `tests/contracts.test.ts`. Stabilize the proposed query semantics and examples before dependent implementation.
2. **Service queries:** own `src/server/**`, `tests/api.test.ts`, and `scripts/smoke.ts`. Depend on the reviewed contract child; implement only the agreed service behavior in the participant's copy.
3. **App integration:** own the app repository's server-side catalogue adapter/configuration and focused adapter tests. Depend on the reviewed contract child; do not edit service files.
4. **Integration evidence:** own the app repository's cross-service tests and evidence on the parent issue. Depend on the preceding three children; record both commits and real two-process results.

Assign one isolated session per child. A coordinator resolves ownership or contract changes before work proceeds; sessions must not edit another repository's checkout. Use fully qualified `owner/repo#number` references when linking the other repository.

## Starter invariants

- Preserve all eight deterministic products, IDs, `priceCents`, rich fields, four categories, seed order, and browse/detail envelopes.
- Default port is 3001, bound to loopback. Node >=20.19, TypeScript, Express, Zod, Vitest, and npm are the stack. Commit `package-lock.json`; use `npm ci` to reproduce it.
- The published starter allows absent/empty `q` only. It must explicitly reject well-formed unsupported queries with `400 UNSUPPORTED_QUERY`, and malformed/unknown inputs with `400 VALIDATION_ERROR`.
- Do not pre-solve search/filtering or an app adapter on the starter branch. Implement these only when assigned the relevant participant child after Plan review; evolve its boundary assertions with the feature.
- `/health` is liveness; `/ready` checks catalogue availability. Missing products return `404 NOT_FOUND`. Return JSON errors and log unexpected failures; never disguise a failure as a successful response.
- The service owns `contracts/catalogue-v1.schema.json` and `contracts/examples/`. Review contract changes first, update code/schema/examples/tests together within the assigned ownership, and preserve existing browse/detail consumers.
- No database, cloud infrastructure, authentication, credentials, UI, npm publishing, or finished storefront adapter. Browser requests stay same-origin through the app.

## Evidence before handoff

Run `npm run check`. Start the compiled service with `npm start`, then run `npm run smoke` in a second terminal and stop your own service afterward. Run `git diff --check`.

Record exact commands, results, full service/app commit SHAs, relevant check/run links, and blockers in the issue/PR. Do not claim CI, publication, or remote integration from local tests alone. A template copy has independent history; verify source-tree/content provenance rather than commit ancestry.

Use `.github/ISSUE_TEMPLATE/service-task.md` and `.github/PULL_REQUEST_TEMPLATE.md` for concise handoffs. Keep changes surgical, respect non-overlapping ownership, and leave the baseline checks green.
