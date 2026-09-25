# LDP API Docs: Design

## Goal

A static documentation site that works as a usage guide for every API surface around Liferay Data Platform (LDP), grouped by how a caller reaches it. It documents endpoints, parameters, payloads, and responses, like an OpenAPI reference, but never offers to send requests from the page.

The site is unofficial. It is built locally and published to GitHub Pages only when the owner runs the deploy command.

## Audience and Visibility

The site is written as if it were public. It must never contain secrets or data that helps someone forge requests, even when a group documents an internal API.

Never included:

- Token, cookie, or signature values; project IDs; data source IDs.
- Internal hosts (such as `ldp-internal`, `*.lfr.cloud`, `osbasah*`) and direct calls to the ASAH backend (`/api/1.0/...`).
- How the Faro backend security signature is computed.
- Real workspace data: e-mail addresses (other than `@example.com`), customer URLs, real IDs.

Included:

- Entry points a caller really uses: the LDP host with a token, the DXP host with DXP authentication, and the LDP host with a logged-in session.
- Placeholders such as `YOUR_TOKEN`, `<ldp-host>`, and `<dxp-host>`.

Publishing the internal groups is a Liferay product and security decision. Each group can be switched off at build time (see Visibility Switches) so the public build can omit them without editing content.

## Groups

| Group | Entry point | Authentication | Stability label |
|---|---|---|---|
| Public REST | `https://<ldp-host>/api/reports/...`, `/api/recommendations/...` | LDP access token (Bearer) | Stable |
| GraphQL via DXP | `https://<dxp-host>/o/analytics-rest/v1.0/graphql` | DXP authentication (Basic, OAuth2, or session with `x-csrf-token`) | Internal, unstable |
| DSR | `https://<dxp-host>/o/site-dsr-analytics-rest/v1.0/...` | DXP authentication | Internal |
| Faro internal | `https://<ldp-host>/o/faro/main/...`, `/o/faro/contacts/...` | Logged-in LDP session | Internal, unstable |

Each group has a hand-written overview page (how to authenticate, which host, stability, a worked example) followed by a generated reference.

## Architecture

The existing `ldp-api-docs` repository becomes a Docusaurus 3 project (TypeScript, classic preset). The current `openapi.yaml` becomes the Public REST source; the Scalar `index.html` is removed.

```
ldp-api-docs/
├── specs/
│   ├── rest-public.yaml
│   ├── dsr.yaml
│   ├── faro-internal.yaml
│   ├── overlays/dsr.yaml
│   └── graphql/schema.graphql
├── docs/
│   ├── intro.md
│   ├── rest-public/overview.md
│   ├── dsr/overview.md
│   ├── graphql/overview.mdx
│   ├── graphql/examples/
│   └── faro-internal/overview.md
├── scripts/
│   ├── check-secrets.mjs
│   ├── extract-dsr.mjs
│   └── introspect.mjs
├── site.config.ts
├── docusaurus.config.ts
└── sidebars.ts
```

Generated reference pages are written to `docs/<group>/reference/` and are git-ignored.

Design documents under `docs/superpowers/` are internal notes. They are excluded from the Docusaurus docs plugin (`exclude: ['superpowers/**']`) and from `check-secrets`, because they name the very patterns the check rejects.

## Sources of Truth

| Group | Source | How it is produced | How it is updated |
|---|---|---|---|
| Public REST | `specs/rest-public.yaml` | The current hand-written spec, verified against a real token | By hand; validate with `curl` |
| DSR | `specs/dsr.yaml` | `scripts/extract-dsr.mjs` reads `modules/apps/site/site-dsr-analytics-rest-impl/rest-openapi.yaml` from a liferay-portal checkout (path passed as an argument) and merges `specs/overlays/dsr.yaml` (servers, security schemes, descriptions) | Re-run the script; overlay edits survive |
| GraphQL via DXP | `specs/graphql/schema.graphql` | `scripts/introspect.mjs` runs an introspection query against a connected DXP (host and credentials from environment variables, never written to disk) and saves the SDL | Re-run the script |
| Faro internal | `specs/faro-internal.yaml` | Written by hand from the `main/` and `contacts/` JAX-RS controllers in osb-faro-web | By hand |

GraphQL examples in `docs/graphql/examples/` come from real, working queries: the DSR `.graphql` files and the Analytics Cloud Charts widget.

Generating the Faro internal spec from JAX-RS annotations is out of scope until the hand-written spec becomes a burden.

## Rendering

- **REST groups:** `docusaurus-plugin-openapi-docs` with `docusaurus-theme-openapi-docs`, one config entry per REST group. The send-request panel is hidden (`hideSendButton: true`). Code samples are limited to curl, JavaScript, and Python.
- **GraphQL:** `@graphql-markdown/docusaurus` generates one page per operation and type from the SDL.
- **Look:** default Docusaurus theme with light and dark modes. No Liferay logo or branding. The site title and every overview page state that the site is unofficial.
- **Language:** English.

## Visibility Switches

`site.config.ts` exports:

```ts
export const groups = {
	dsr: true,
	faroInternal: true,
	graphql: true,
	restPublic: true,
};
```

A group set to `false` is left out of the plugin configuration, the sidebar, and the intro page. Environment variables override the file (for example `DOCS_GROUP_FARO_INTERNAL=false`) so a public build needs no source edit.

## Validation

`npm run check` runs, in order, and fails fast:

1. `redocly lint` on every enabled REST spec.
2. `scripts/check-secrets.mjs` over `specs/` and `docs/` (except `docs/superpowers/`). It fails on JWT-shaped strings (`eyJ...`), GitHub and Anthropic key prefixes (`gho_`, `ghp_`, `sk-`), internal hosts (`ldp-internal`, `lfr.cloud`, `osbasah`), `OSB-Asah-*` headers followed by a value, and e-mail addresses outside `example.com`. It also scans the introspection output.
3. `docusaurus build` with `onBrokenLinks: 'throw'`.

## Deploy

`npm run deploy` runs `npm run check` and then publishes `build/` to the `gh-pages` branch (`baseUrl: '/ldp-api-docs/'`). Nothing is pushed or published by any other command.

## Phases

Each phase is shippable on its own.

1. **Skeleton and Public REST:** Docusaurus project, migration of the current spec, overview, `check`, and `deploy`.
1. **DSR:** extraction script, overlay, overview.
1. **GraphQL via DXP:** introspection script, examples, overview. Requires a DXP connected to an LDP workspace.
1. **Faro internal:** starts with the endpoints the LDP UI uses most (accounts, individuals, segments, assets) and grows over time.

## Out of Scope

- Sending requests from the page, or any live connection to LDP or DXP from the published site.
- A reusable, product-agnostic documentation tool.
- Generating specs from Java source.
- Documenting the ASAH backend directly.
