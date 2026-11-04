# Babazon catalogue service

A working TypeScript/Express **browse/detail starter**, not a completed search service. It is the companion template for [VeVarunSharma/build-days-agentic-sdlc](https://github.com/VeVarunSharma/build-days-agentic-sdlc). Participants create their own copy and add it alongside their app fork/assigned repository in one Copilot Project.

The starter serves eight deterministic products on **port 3001**. The app normally uses port 3000. No database, Azure resource, account credentials, authentication, browser UI, or package publishing is needed.

## Run locally

Use **Node.js >=20.19** and npm. In GitHub, choose **Use this template -> Create a new repository**, then clone your copy:

```shell
git clone https://github.com/YOUR-OWNER/babazon-catalogue-service.git
cd babazon-catalogue-service
npm ci
npm run check
npm run dev
```

The service listens only on `http://127.0.0.1:3001`. Keep it running in its own terminal. No `.env` file is required.

For the compiled build, stop the development process first:

```shell
npm run build
npm start
```

In another terminal, run the real HTTP checks:

```shell
npm run smoke
```

`smoke` checks exact status codes and bodies for health, readiness, browse, detail, unsupported and invalid queries, and missing products/routes. It needs a running service; it does not start one.

`PORT` is the only service setting. It must be an integer from 1 to 65535; invalid values fail startup. To use another port in PowerShell:

```powershell
$env:PORT = "3101"
npm run dev
```

Set the same `PORT` in the terminal running `npm run smoke`. For a POSIX shell, use `PORT=3101 npm run dev` and `PORT=3101 npm run smoke`. Do not stop another application's process to free a port.

| Command | Purpose |
|---|---|
| `npm run dev` | Run TypeScript with restart-on-change |
| `npm run build` | Compile to `dist` |
| `npm start` | Run the compiled service |
| `npm run lint` | Type-aware ESLint checks |
| `npm run typecheck` | Strict TypeScript checks, including tests and smoke |
| `npm test` | Deterministic API and contract tests |
| `npm run check` | Lint, typecheck, tests, and build |
| `npm run smoke` | HTTP checks against the running service |

`Catalogue CI` runs the checks and compiled-service smoke on Node 20.19.0 and 24.x. Its token has only `contents: read`; it does not publish, deploy, create issues, or modify the repository.

## HTTP contract

The service owns [contracts/catalogue-v1.schema.json](contracts/catalogue-v1.schema.json), a JSON Schema 2020-12 response contract. Its `$defs` are `ProductCategory`, `Product`, `ProductListResponse`, `ProductDetailResponse`, `HealthResponse`, `ReadyResponse`, and `ApiError`. Consumers can validate one envelope using the corresponding `#/$defs/...` reference; the schema root accepts any documented response envelope.

| Request | Status and response | Example |
|---|---|---|
| `GET /health` | `200`, process liveness: `{"status":"ok"}` | [health.json](contracts/examples/health.json) |
| `GET /ready` | `200`, nonempty, valid catalogue with unique IDs: `{"status":"ready"}` | [ready.json](contracts/examples/ready.json) |
| `GET /api/products` | `200`, `{items,total,query:{q:""},categories}`; all eight products in seed order | [products-list.json](contracts/examples/products-list.json) |
| `GET /api/products/aurora-desk-lamp` | `200`, `{product}` | [product-detail.json](contracts/examples/product-detail.json) |
| `GET /api/products?q=lamp` or `?category=office` | `400`, `UNSUPPORTED_QUERY` | [unsupported-query.json](contracts/examples/unsupported-query.json) |
| `GET /api/products?sort=price` | `400`, `VALIDATION_ERROR` | [validation-error.json](contracts/examples/validation-error.json) |
| `GET /api/products/not-a-product` | `404`, `NOT_FOUND` | [not-found.json](contracts/examples/not-found.json) |
| `GET /ready` when catalogue data is unavailable | `503`, `NOT_READY`; `/health` remains `200` | [not-ready.json](contracts/examples/not-ready.json) |

**Input rules are intentional workshop boundaries:**

- Browse permits no parameters or a single empty `q` (`?q=` or `?q`). A nonempty `q`, including whitespace, is not implemented. Values are not trimmed into an empty successful query.
- `q` must be a single string of at most 80 JavaScript string units after URL decoding. A single `category` must be `home`, `outdoors`, `office`, or `kitchen`. Well-formed nonempty `q`, a valid category, or their combination returns `400 UNSUPPORTED_QUERY`.
- Unknown names, duplicate parameters, array/object syntax, invalid or empty categories, overlong search values, and malformed percent encoding/UTF-8 return `400 VALIDATION_ERROR`. Validation happens before the unsupported-feature check; nothing is silently dropped.
- Health, readiness, and product detail accept no query parameters. Product IDs must be lowercase ASCII slugs separated by single hyphens, at most 120 characters. Malformed IDs return `400`; a valid but absent ID returns `404`.

Errors use `{error:{code,message,fieldErrors?}}`. Parameter validation may include field-specific messages. Unknown routes and unsupported methods return JSON `404 NOT_FOUND`; there are no write endpoints. Unexpected server errors are logged and return `500 INTERNAL_ERROR`. Responses do not expose stack traces.

Each `Product` preserves `id`, `name`, `shortDescription`, `description`, `category`, integer `priceCents`, `rating`, `reviewCount`, `availability`, optional `badge`, `features`, and `accent`. Money is never converted to floating-point currency amounts. The categories list is always `["home","outdoors","office","kitchen"]` in the starter.

## What participants build

**Already working:** browse, all eight detail records, strict request validation, separate health/readiness, contract examples, tests, build, and CI. The tests deliberately assert that unimplemented queries fail.

**Still participant-owned:** review and extend the query contract; implement service search/category filtering; build the app's server-side `ProductCatalogue` HTTP adapter; choose and test timeout/error behavior; and collect evidence from two running processes. When explicit service mode is added in the app, outages must not silently fall back to local seed data.

The browser continues to call the app's same-origin APIs, not this service directly. There is no CORS setup or storefront adapter here. The app's existing local catalogue can already search; that does **not** mean this separate service implements search. Do not copy the finished app query implementation into the published starter.

Follow [DESIGN.md](DESIGN.md) and [AGENTS.md](AGENTS.md): one outcome issue, a reviewed Copilot App Plan, exactly four bounded children across the two copies, isolated sessions, and paired-commit evidence. Do not create repository-local planning folders.

## Source provenance

All eight product records and the rich product shape come from the public app baseline **`0e6cfcfefa6a574c3bdf2c3a40c7cb2a592d9220`**:

- [src/shared/contracts.ts at the baseline](https://github.com/VeVarunSharma/build-days-agentic-sdlc/blob/0e6cfcfefa6a574c3bdf2c3a40c7cb2a592d9220/src/shared/contracts.ts)
- [src/server/catalogue.ts at the baseline](https://github.com/VeVarunSharma/build-days-agentic-sdlc/blob/0e6cfcfefa6a574c3bdf2c3a40c7cb2a592d9220/src/server/catalogue.ts)

The companion retains the data, not the upstream filtering implementation. `tests/contracts.test.ts` locks the seed data to the published list example and validates both examples and actual HTTP responses against the versioned schema.

Template copies have fresh Git history. Record the source repository/ref and compare the starting source tree or file contents; do not require the source commit to be an ancestor of your copy. Record both participant repository names and full commit SHAs in integration evidence.
