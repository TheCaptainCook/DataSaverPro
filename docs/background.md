# background.js

**Role:** MV3 service worker — the central brain of DataSaver Pro. Owns all network blocking rules, statistics, license gating, and inter-component messaging.

---

## Responsibilities

| Area | What it does |
|---|---|
| **DNR rules** | Builds and applies `declarativeNetRequest` dynamic rules based on current settings |
| **Settings** | Reads/writes `chrome.storage.sync`; exposes `GET_SETTINGS` / `UPDATE_SETTINGS` messages |
| **Stats** | Accumulates lifetime, daily, and per-site blocked-request counts in `chrome.storage.local` |
| **License** | Delegates to `DSLicense` (imported via `importScripts("license.js")`); gates all blocking behind a valid license |
| **Update checker** | Fetches `version.json` from GitHub and caches result; serves popup via `CHECK_UPDATE` / `FORCE_UPDATE_CHECK` |
| **Badge** | Updates the toolbar badge counter per-tab |
| **Messaging** | Single `chrome.runtime.onMessage` listener; dispatches by `msg.type` |

---

## Constants

```js
const DEFAULT = { enabled, blockImages, blockVideos, blockHeavy,
                  blockScripts, blockIframes, removeBlocked,
                  disabledSites, allowedUrls, theme }
```

Applied on fresh install. On update, user settings are merged over defaults so no preference is lost.

```js
const DEFAULT_STATS = { lifetime, today, history, installedAt, sites, liveLog }
```

`history` keeps the last 30 daily totals. `liveLog` keeps the last 200 individual blocked requests.

---

## `applyRules(settings)`

The core function. Called whenever settings change, the browser starts, or the extension installs/updates.

### Steps

1. Calls `DSLicense.isFunctional()`. If not licensed, removes all rules and sets a `!` badge — blocking stops.
2. Removes all existing dynamic rules in one `updateDynamicRules` call.
3. Builds the new rule set:

```
Rule IDs 800–898 : Per-site allow rules (priority 50)  — disabled sites
Rule IDs 1000+   : Per-URL allow rules  (priority 100) — allowlist
Rule IDs 1–2     : Image blocking       (priority 1)
Rule IDs 10–15   : Video/audio blocking (priority 1)
Rule IDs 20–26   : Heavy content        (priority 1)
Rule IDs 30–49   : Script/analytics     (priority 1)
Rule ID  60      : Iframe blocking      (priority 1)
```

4. Applies the new rule set atomically.

### Priority rationale

Higher priority wins. Disabled-site allow rules (50) always beat block rules (1), so a site toggle fully exempts all modules for that hostname. URL-level allows (100) beat even site allows, letting specific resources through on otherwise-blocked sites.

### Disabled-site allow rules

```js
condition: { initiatorDomains: [bare], resourceTypes: ALL_RESOURCE_TYPES }
```

`bare` is the hostname with `www.` stripped, so `www.example.com` and `example.com` are both covered by one rule.

---

## Update checker

The GitHub raw URL is stored as an array of char codes:

```js
const _uc = [104, 116, 116, 112, 115, ...];
function _decU() { return _uc.map(c => String.fromCharCode(c)).join(""); }
```

This prevents the URL from appearing as a plain string in the built artifact.

`checkForUpdate()` fetches `version.json`, compares semantic versions with `compareVersions(a, b)`, and writes the result to `chrome.storage.local` under the key `_upd`. The popup reads `_upd` via `FORCE_UPDATE_CHECK` (which triggers a fresh fetch) or `CHECK_UPDATE` (which reads the cached value).

Update checks run:
- On `onInstalled`
- On `onStartup`
- Every 240 minutes via the `dsp-update-check` alarm

---

## Message API

| `msg.type` | Direction | Description |
|---|---|---|
| `GET_SETTINGS` | popup/content → bg | Returns full merged settings object |
| `UPDATE_SETTINGS` | popup → bg | Merges partial settings, reapplies rules, notifies all tabs |
| `GET_SITE_DISABLED` | popup → bg | Returns `{ disabled: bool }` for a hostname |
| `SET_SITE_DISABLED` | popup → bg | Adds/removes hostname from `disabledSites`, reapplies rules |
| `PUSH_STATS` | content → bg | Merges a `delta` object into lifetime/daily stats |
| `GET_STATS` | stats page → bg | Returns full stats object |
| `RESET_STATS` | stats page → bg | Clears all stats |
| `UPDATE_BADGE` | content → bg | Updates the per-tab badge counter |
| `GET_LICENSE_STATE` | popup/profile → bg | Returns `DSLicense.getState()` |
| `ACTIVATE_LICENSE` | popup/profile → bg | Calls `DSLicense.activate(key)` |
| `DEACTIVATE_LICENSE` | profile → bg | Calls `DSLicense.deactivate()` |
| `GET_RATE_LIMIT` | popup/profile → bg | Returns `DSLicense.getRateLimit()` |
| `CHECK_UPDATE` | popup → bg | Returns cached `_upd` from local storage |
| `FORCE_UPDATE_CHECK` | popup → bg | Fetches GitHub, updates cache, returns result |
| `DISMISS_UPDATE` | popup → bg | Removes `_upd` from local storage |
| `OPEN_STATS` | popup → bg | Opens `stats.html` in a new tab |
| `OPEN_PROFILE` | popup → bg | Opens `profile.html` in a new tab |

**Security:** The listener checks `sender.id !== chrome.runtime.id` and returns early for any message not originating from this extension.

---

## Alarms

| Alarm name | Interval | Purpose |
|---|---|---|
| `dsp-license-verify` | 360 min (6 h) | Periodic license re-verification |
| `dsp-update-check` | 240 min (4 h) | Periodic update check |

Alarms are re-created on `onInstalled` and `onStartup` to survive browser restarts.

---

## Storage layout

### `chrome.storage.sync`

All user settings (see `DEFAULT` constant). Syncs across devices.

### `chrome.storage.local`

| Key | Type | Description |
|---|---|---|
| `stats` | `object` | Lifetime, daily, history, per-site counts, live log |
| `_upd` | `object \| null` | Pending update info `{ version, message, url, ts }` |
