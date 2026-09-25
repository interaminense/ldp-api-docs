# LDP API Docs (Phase 3: GraphQL via DXP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "GraphQL via DXP" group: a schema captured by introspection through a connected DXP, a generated reference, and a hand-written overview with real, working example queries.

**Architecture:** `scripts/introspect.mjs` posts the standard introspection query to `https://<dxp-host>/o/analytics-rest/v1.0/graphql` with credentials read from environment variables, converts the result to SDL with `graphql`'s `buildClientSchema` + `printSchema`, and writes `specs/graphql/schema.graphql` atomically. `@graphql-markdown/docusaurus` renders the reference into `docs/graphql/reference/` (git-ignored). The group is enabled by default once its content exists.

**Tech Stack:** Node 22, graphql 16/17, @graphql-markdown/docusaurus 1.37, @graphql-tools/graphql-file-loader.

**Spec:** `docs/superpowers/specs/2026-09-24-ldp-api-docs-design.md` (Sources of Truth, GraphQL row; Rendering; Validation)

## Global Constraints

- Same as the phases 1–2 plan: signed title-only commits on `docusaurus-site`, no remote, no deploy, English content, unofficial label, placeholders `<dxp-host>` / `YOUR_PASSWORD`.
- Credentials are read only from `DOCS_GRAPHQL_URL`, `DOCS_GRAPHQL_USER`, `DOCS_GRAPHQL_PASSWORD` and are never written to disk or logs.
- `specs/graphql/schema.graphql` must pass `check-secrets`.
- `npm run build` must stay warning-free.

## Review Focus

1. **Introspection fails** (unreachable DXP, 401/403, a GraphQL `errors` array, HTML instead of JSON) → exit 1 with a message that names the cause; `schema.graphql` untouched. Tested in Task 1.
2. **A credential variable is missing** → exit 1 naming the variable before any request. Tested in Task 1.
3. **The schema contains something sensitive** (internal host in a description, an e-mail) → `npm run check` fails. Covered by running `check-secrets` over `specs/`.
4. **GraphQL group disabled** (`DOCS_GROUP_GRAPHQL=false`) → build passes, nothing links to it. Tested in Task 3.
5. **Examples drift from the schema** → every example query is validated against `schema.graphql` by a test. Tested in Task 4.

---

### Task 1: Introspection Script

**Files:** Create `scripts/introspect.mjs`, `scripts/introspect.test.mjs`; modify `package.json` (`introspect` script, `graphql` dev dependency).

**Interfaces — Produces:**
- `introspectionToSdl(result: {data?: object, errors?: Array<{message}>}): string` — throws `Error` with the joined `errors[].message` when present, or `'Introspection response has no data'`.
- `readCredentials(env): {url, user, password}` — throws `Error` naming the first missing variable.
- `fetchIntrospection({url, user, password}, fetchImpl = fetch): Promise<object>` — POSTs `{query: getIntrospectionQuery()}` with Basic Auth; throws `Error('HTTP <status> from <url>')` on non-2xx and `Error('Response is not JSON')` on invalid JSON.
- CLI: `node scripts/introspect.mjs` writes `process.env.GRAPHQL_OUTPUT ?? 'specs/graphql/schema.graphql'` via `.tmp` + rename.

- [ ] Step 1: Write tests (SDL from `introspectionFromSchema(buildSchema('type Query { timeRange: [TimeRange] } type TimeRange { key: String rangeKey: Int }'))` contains `type TimeRange`; errors array → throws with its message; missing data → throws; each missing variable is named; fetch non-2xx → `HTTP 401`; non-JSON body → `Response is not JSON`; CLI with no env → exit 1, output untouched).
- [ ] Step 2: Run `node --test scripts/introspect.test.mjs` → FAIL (module not found).
- [ ] Step 3: Implement.
- [ ] Step 4: Run → PASS.
- [ ] Step 5: Commit `Add a GraphQL introspection script`.

### Task 2: Capture the Schema

**Files:** Create `specs/graphql/schema.graphql`.

- [ ] Step 1: With the local DXP connected to LDP, run `DOCS_GRAPHQL_URL=http://localhost:8080/o/analytics-rest/v1.0/graphql DOCS_GRAPHQL_USER=test@liferay.com DOCS_GRAPHQL_PASSWORD=… npm run introspect`. Expected: `Wrote specs/graphql/schema.graphql`.
- [ ] Step 2: `npm run check:secrets` → `No secrets found.` Review type and field names for anything that should not be public; if a finding appears, decide and ledger it.
- [ ] Step 3: Commit `Capture the Analytics GraphQL schema`.

### Task 3: Render the Reference

**Files:** Modify `site.config.mjs` (graphql: `defaultEnabled: true`, `schema: 'specs/graphql/schema.graphql'`), `site.config.test.mjs`, `docusaurus.config.ts`, `sidebars.ts`, `package.json` (`gen` also runs `docusaurus graphql-to-doc`); create `docs/graphql/overview.mdx`.

- [ ] Step 1: Update `site.config.test.mjs` defaults to `['restPublic', 'dsr', 'graphql']` (and the dependent expectations); run → FAIL.
- [ ] Step 2: Flip the default; run → PASS.
- [ ] Step 3: Install `@graphql-markdown/docusaurus` and `@graphql-tools/graphql-file-loader`; register the plugin only when the group is enabled (`rootPath: './docs'`, `baseURL: 'graphql/reference'`, `loaders: {GraphQLFileLoader: '@graphql-tools/graphql-file-loader'}`); sidebar uses `{type: 'autogenerated', dirName: 'graphql/reference'}` when the folder exists.
- [ ] Step 4: Write the overview (endpoint on the DXP, DXP authentication, CSRF note for browser calls, stability warning, the `timeRange` example).
- [ ] Step 5: `npm run check` → all green, no build warnings; `DOCS_GROUP_GRAPHQL=false npm run build` → success and `build/graphql` absent.
- [ ] Step 6: Commit `Document the GraphQL group`.

### Task 4: Validated Examples

**Files:** Create `docs/graphql/examples.mdx`, `scripts/graphql-examples.test.mjs`, `specs/graphql/examples/*.graphql`.

- [ ] Step 1: Copy the DSR queries from `modules/apps/site/site-dsr-analytics-rest-impl/src/main/resources/.../client/dependencies/*.graphql` plus `timeRange` into `specs/graphql/examples/`.
- [ ] Step 2: Write a test that parses each example and runs `validate(buildSchema(schema.graphql), parse(example))`, expecting zero errors; run → FAIL while the folder is empty/test lists expected files.
- [ ] Step 3: Add the files; run → PASS (an example that fails validation is dropped from the page and ledgered, never edited to pass silently).
- [ ] Step 4: Write `examples.mdx` rendering each example with a curl snippet; `npm run check` → green.
- [ ] Step 5: Commit `Add validated GraphQL examples`.
