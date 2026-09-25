---
title: Get Started
---

**Unofficial.** The Reports and Recommendations API is the only LDP API meant for external clients. It is read-only, returns HAL/HATEOAS JSON, and is authenticated with an LDP access token.

## Get a Token

1. Log in to LDP as a workspace **Administrator** or **Owner**.
1. Go to **Settings → APIs → Access Tokens**.
1. Pick an expiration (30 Days, 6 Months, 1 Year, Indefinite) and click **Generate Token**.

The token determines the workspace; no workspace ID is passed. Only one token is active per user and workspace: generating a new one revokes the previous one.

## Call the API

```bash
curl \
	--header "Authorization: Bearer YOUR_TOKEN" \
	"https://<ldp-host>/api/reports/pages?rangeKey=7"
```

`<ldp-host>` is the host that serves the LDP web UI and issued the token.

## Conventions

- **Pagination:** fixed page size of 20, zero-based `page`. Follow `_links.next.href` until it is absent. Links can be URI templates (`templated: true`); drop the `{...}` part before calling.
- **Time ranges:** `rangeKey` accepts only `-2`, `-1`, `0`, `1`, `7`, `28`, `30`, `90`, `180`, and `365`. No endpoint lists them. Other values return 500.
- **Durations** such as `timeOnPageMetric` are in milliseconds.
- **Errors:** some failures return HTTP 200 with `{"status": "ERROR", "message": "..."}`. Always check `status`.
- **Missing or invalid token:** 401 with an empty body.
