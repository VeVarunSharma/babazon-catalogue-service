# Catalogue service design

## Baseline and target

The published baseline has **two independent runnable applications**. The React/Express app still uses its existing in-memory `ProductCatalogue`. This separate Express service serves the same eight deterministic products, but only supports browse and detail. Running both processes does not connect them.

The participant target is:

```text
Browser -> app's same-origin APIs -> participant-built ProductCatalogue HTTP adapter
        -> catalogue service on 127.0.0.1:3001 -> deterministic products
```

The app remains responsible for its UI, cart, and checkout. The service owns catalogue data and its wire contract. The browser does not call port 3001 directly. No database, authentication, payment integration, shipping system, cloud deployment, or npm package is introduced.

The source decisions were approved in [VeVarunSharma/build-days-agentic-sdlc#34](https://github.com/VeVarunSharma/build-days-agentic-sdlc/issues/34); the companion foundation is [VeVarunSharma/build-days-agentic-sdlc#35](https://github.com/VeVarunSharma/build-days-agentic-sdlc/issues/35). Participants create fresh outcome/child issues in their own copies rather than using those workshop-delivery issues as their task board.

## Implementation boundaries

| Surface | Responsibility |
|---|---|
| `src/shared/contracts.ts` | Runtime product/query validation and TypeScript response types |
| `src/server/catalogue.ts` | Eight seed records and catalogue availability checks |
| `src/server/app.ts` | Four GET routes, input validation, JSON errors, and explicit unsupported-query boundary |
| `src/server/index.ts` | Validated port, loopback listener, startup errors, and shutdown |
| `contracts/catalogue-v1.schema.json` | Service-owned, versioned response contract |
| `contracts/examples/` | Exact browse/detail, health/readiness, and error examples |
| `tests/api.test.ts` | Endpoint behavior, validation, and intentional participant gaps |
| `tests/contracts.test.ts` | Seed fidelity, schema/example consistency, and actual HTTP envelopes |
| `scripts/smoke.ts` | Checks against a separately running service |

There is no persistence layer or generic repository abstraction. `createApp` accepts an in-memory product array so readiness failure can be exercised without external resources. Request handling never changes that data.

`/health` proves the process can respond. `/ready` additionally validates a nonempty catalogue with unique IDs and correctly shaped products. Unavailable data returns `503 NOT_READY` and a diagnostic log, while liveness stays healthy.

Browse returns `{items,total,query:{q:""},categories}`; detail returns `{product}`. Product IDs and integer `priceCents` are stable consumer keys. The full rich shape, all examples, HTTP status codes, and query restrictions are documented in `README.md`.

Unknown keys, duplicates, nesting, malformed URL encoding, invalid categories, overlong search strings, and malformed product IDs are validation errors, not ignored input. Well-formed nonempty search or category selection returns `400 UNSUPPORTED_QUERY`. Whitespace is not trimmed into a successful empty search.

Search/filter semantics, a consumer adapter, timeouts, outage handling, and cross-service evidence are deliberately absent. A participant contract review must precede changing those boundaries. Explicit remote mode in the app must fail visibly when the service fails, not silently use local data.

## One outcome, exactly four participant children

Start with one outcome issue in the app copy. Review a **Copilot App Plan** on that issue before creating exactly four repository-qualified child issues. The Plan must include owned/prohibited paths, contract decisions, observable acceptance criteria, dependencies, and commands/evidence.

| Child | Repository and non-overlapping ownership | Depends on |
|---|---|---|
| 1. Contract | Service copy: `contracts/**`, `src/shared/contracts.ts`, `tests/contracts.test.ts` | Reviewed parent Plan |
| 2. Service queries | Service copy: `src/server/**`, `tests/api.test.ts`, `scripts/smoke.ts` | Child 1 |
| 3. App integration | App copy: server adapter/configuration and focused adapter tests | Child 1 |
| 4. Integration evidence | App copy: distinct cross-service tests; evidence on the parent issue | Children 1, 2, and 3 |

The contract child decides supported query semantics and response compatibility; it does not implement filtering. Service and app implementation can then proceed in separate isolated sessions. The integration child checks the composed behavior only after both implementations exist. The coordinator settles any shared-path change before assigning it; do not let two sessions edit the same surface.

The service's current response schema intentionally describes the starter, including its empty query echo. When the contract child enables new query behavior, it must review the version/compatibility decision and update the schema, types, examples, and contract assertions first. Preserve existing browse/detail requests. Query implementation then updates the service's unsupported-query assertions and smoke cases to match the reviewed feature.

Keep the Plan, questions, and execution receipts on issues/in the Copilot App. Do not create local planning directories, a fifth unbounded task, or a second overlapping implementation session.

## Evidence and completion

The starter is green without solving the exercise: `npm run check` covers typed lint, TypeScript, deterministic API/contract tests, and compilation. `npm start` plus `npm run smoke` proves the compiled process responds correctly over HTTP. `git diff --check` checks the final patch.

For the composed participant outcome, the parent issue must record:

| Evidence | Required content |
|---|---|
| Source provenance | App fork/assigned source and service template source/ref; compare content/tree for template copies, not commit ancestry |
| Paired commits | Full app `owner/repo` + SHA and service `owner/repo` + SHA |
| Contract | Versioned schema/example paths and reviewed compatibility decision |
| Execution | Exact command, working repository, exit/result, service URL/port, and observed behavior |
| Failure behavior | Invalid input, missing products, service outage/timeout, and no silent remote-to-local fallback |
| Remote checks | Real CI/PR/run links, or an explicit unavailable/not-run statement |

Do not treat one repository's passing tests as evidence that the two processes are integrated. Do not claim publication, template configuration, or live CI without observing those separate operations.
