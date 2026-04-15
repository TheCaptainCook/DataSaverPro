# profile.html / profile.js

**Role:** Full-page profile and license management screen. Opened as a new tab via the Profile button in the popup or the `OPEN_PROFILE` background message.

---

## Sections

### License Status

Always visible. Displays the current license state with a dynamic Status row:

| `info.state` | Plan label | Badge | Days field | Status row value |
|---|---|---|---|---|
| `active` | Licensed | `ACTIVE` (green) | `∞` | `✓ Active` (green) |
| `trial` | Free Trial | `TRIAL` / `N DAYS LEFT` / `EXPIRED` | days remaining | `Trial (N days left)` |
| `expired` | Expired | `EXPIRED` (red) | `0` | `⚠ Expired` (red) |

The `licenseInfo` block (email, purchase date, status row) is **always rendered** regardless of license state. When not yet activated, email and purchase date show `—`. This ensures the Status field is visible before purchase so users understand what they are buying.

### License Activation Form

Shown for `trial` and `expired` states. Contains:
- License key input (`#licenseKeyInput`)
- Activate button (`#activateBtn`)
- Rate-limit countdown (`#profileRateLimit`) — auto-refreshes every second when a cooldown is active
- Error / success message (`#licenseMsg`)
- Gumroad purchase link (`#buyLink`)

### Deactivate Section

Shown only when `state === "active"`. Renders a single **DEACTIVATE LICENSE** button that triggers a confirmation dialog before calling `DEACTIVATE_LICENSE`.

### Your Details (Profile Form)

Stores optional user information in `chrome.storage.sync` under the key `profile`:

```js
{ name: string, email: string, usage: string }
```

Input is sanitised before saving:
- `name` capped at 100 characters
- `email` capped at 150 characters, validated against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `usage` capped at 200 characters

A temporary "Saved!" confirmation appears for 3 seconds after saving.

### Your Privacy

Static informational section explaining what data the extension collects (none sent externally except for license verification).

---

## Functions

### `loadLicense()`

Sends `GET_LICENSE_STATE` and populates all license card elements. Always sets `infoEl.style.display = "block"` so the status row is visible in all states.

### `activateLicense()`

1. Validates key is non-empty.
2. Disables button and shows `VERIFYING...`.
3. Sends `ACTIVATE_LICENSE` with the key.
4. On success: shows success message, calls `loadLicense()` after 1.5 s.
5. On failure: shows error, re-enables button. If `result.rateLimited`, starts rate-limit countdown.

### `deactivateLicense()`

Shows a native `confirm()` dialog. On confirmation sends `DEACTIVATE_LICENSE` and calls `loadLicense()`.

### `updateProfileRateLimit()`

Polls `GET_RATE_LIMIT` every second while a cooldown is active, updating `#profileRateLimit` and disabling `#activateBtn`. Stops polling when `rl.allowed === true`.

---

## DOM element reference

| ID | Element | Purpose |
|---|---|---|
| `licensePlan` | `<span>` | Plan name (Licensed / Free Trial / Expired) |
| `licenseBadge` | `<span>` | State badge |
| `licenseDays` | `<span>` | Days remaining or `∞` |
| `licenseDaysLabel` | `<span>` | Contextual label |
| `licenseProgress` | `<div>` | Progress bar container |
| `licenseFill` | `<div>` | Progress bar fill |
| `licenseInfo` | `<div>` | Always-visible info rows block |
| `licenseEmail` | `<span>` | Activation email |
| `licensePurchaseDate` | `<span>` | Purchase date |
| `licenseStatusValue` | `<span>` | Dynamic status value |
| `licenseForm` | `<div>` | Activation form (trial/expired only) |
| `licenseKeyInput` | `<input>` | License key entry |
| `activateBtn` | `<button>` | Submit activation |
| `profileRateLimit` | `<div>` | Rate-limit countdown |
| `licenseMsg` | `<div>` | Success / error feedback |
| `buyLink` | `<a>` | Gumroad purchase link |
| `deactivateSection` | `<div>` | Deactivate button (active only) |
| `deactivateBtn` | `<button>` | Trigger deactivation |
| `userName` | `<input>` | Profile name field |
| `userEmail` | `<input>` | Profile email field |
| `userUsage` | `<input>` | Primary usage field |
| `saveProfile` | `<button>` | Save profile form |
| `saveMsg` | `<div>` | "Saved!" confirmation |
