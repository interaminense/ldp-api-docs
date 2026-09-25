# LDP API Docs (unofficial)

Unofficial, community-maintained usage guide for the APIs around Liferay Data Platform (LDP), built with [Docusaurus](https://docusaurus.io).

> This is not an official Liferay publication. For the official documentation, see [Managing API Access](https://learn.liferay.com/w/dxp/personalization/analytics-cloud/workspace-data/managing-api-access).

## Local Preview

```bash
npm install
npm start
```

Then open http://localhost:8765/ldp-api-docs/.

`npm start` regenerates the reference pages from `specs/` first (`npm run gen`), because they are not committed.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server at http://localhost:8765/ldp-api-docs/ |
| `npm run gen` | Regenerates the reference pages from `specs/` |
| `npm run check` | Tests, spec lint, generation, secrets check, and build |
| `npm run deploy` | Runs `check`, then publishes `build/` to the `gh-pages` branch |

## Groups

Groups are declared in `site.config.mjs`. Turn one off for a build with its variable, for example:

```bash
DOCS_GROUP_GRAPHQL=false npm run build
```
