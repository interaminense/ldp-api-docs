---
title: DSR
---

**Unofficial. Internal API.** The Digital Sales Room (DSR) analytics endpoints live on the DXP that hosts the DSR site, not on LDP. The DXP must be connected to an LDP workspace; it answers each call with analytics data about the rooms.

## Who Can Call It

Any authenticated DXP user. Results only include rooms where the caller is a company administrator or the site owner; rooms the caller cannot access are dropped from `groupIds` without an error. When no room is left, the endpoint returns an empty result.

## Authenticate

Use DXP credentials: Basic Auth, a DXP OAuth2 token, or a logged-in session (browser calls must send `x-csrf-token` with `Liferay.authToken`).

```bash
curl \
	--user "user@example.com:YOUR_PASSWORD" \
	"https://<dxp-host>/o/site-dsr-analytics-rest/v1.0/visit-frequency?rangeKey=30"
```

## Conventions

- **Rooms:** pass room site IDs in `groupIds`. Omit it to include every room the caller can access.
- **Time ranges:** use `rangeKey` (same values as the Public REST group), or `rangeStart` and `rangeEnd`. When either date is set, `rangeKey` is ignored.
- **Errors:** if the DXP is not connected to LDP, the call fails with a server error.
