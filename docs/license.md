# license.js

**Role:** Self-contained license verification module. Exposes the `DSLicense` namespace used by `background.js`. Handles trial initialisation, Gumroad key activation, periodic verification, and rate limiting.

---

## Namespace

```js
const DSLicense = {
  init(),           // Call once on install — starts trial if first run
  verify(),         // Re-verify stored license against Gumroad
  activate(key),    // Activate a Gumroad license key
  deactivate(),     // Remove stored license data
  getState(),       // Returns current license state object
  isFunctional(),   // Returns bool — true if trial or active
  getRateLimit()    // Returns rate-limit status for the UI
};
```

---

## License states

| State | `isFunctional()` | Blocking active | Description |
|---|---|---|---|
| `trial` | `true` | ✅ | Within 30-day trial window |
| `active` | `true` | ✅ | Valid Gumroad license |
| `expired` | `false` | ❌ | Trial ended, no valid license |

---

## `getState()` return shape

```js
{
  state: "trial" | "active" | "expired",
  daysLeft: number,       // trial days remaining (0 when active/expired)
  licensed: boolean,      // alias for isFunctional()
  email: string | null,   // set after activation
  purchaseDate: string | null,
  purchaseUrl: string     // Gumroad purchase link
}
```

---

## Trial initialisation — `init()`

Called from `background.js` `onInstalled`. Checks `chrome.storage.sync` for an existing `_ld` (license data) key. If absent (fresh install), writes a trial start timestamp:

```js
{ state: "trial", trialStart: Date.now() }
```

Trial duration is 30 days. `daysLeft` is calculated as:

```js
Math.max(0, 30 - Math.floor((Date.now() - trialStart) / 86400000))
```

---

## Activation — `activate(key)`

1. Checks the rate limiter — rejects immediately if within the cooldown window.
2. Records the attempt timestamp.
3. POSTs to the Gumroad license verification endpoint.
4. On success, writes `{ state: "active", key, email, purchaseDate }` to `chrome.storage.sync`.
5. Returns `{ success: true }` or `{ success: false, error: string, rateLimited: bool }`.

---

## Rate limiting — `getRateLimit()`

Prevents brute-force key guessing by enforcing a cooldown between activation attempts.

```js
{
  allowed: boolean,
  waitSeconds: number   // seconds until next attempt is allowed (0 if allowed)
}
```

The cooldown window and max-attempts threshold are defined as constants inside `license.js`. The rate-limit state is stored in `chrome.storage.local` (not sync) so it is per-device.

---

## Periodic verification — `verify()`

Called by the `dsp-license-verify` alarm every 6 hours. Re-POSTs the stored key to Gumroad. If the key is no longer valid (revoked, refunded), updates the stored state to `expired` and triggers `applyRules()` in `background.js` to remove all blocking rules.

---

## Storage keys

All license data is stored in `chrome.storage.sync` under `_ld`:

```js
// Trial
{ state: "trial", trialStart: 1712000000000 }

// Active
{ state: "active", key: "XXXX-XXXX-XXXX-XXXX",
  email: "user@example.com", purchaseDate: "2026-04-15T..." }

// Expired (trial ended, no key)
{ state: "expired", trialStart: 1712000000000 }
```

Rate-limit state is stored in `chrome.storage.local` under `_rl`.

---

## Security considerations

- The Gumroad API key/endpoint is not stored in plain text in the extension source.
- The module does not store the license key in any web-accessible location.
- `verify()` is called server-side so a locally cached `state: "active"` entry cannot persist indefinitely without re-validation.
- The rate limiter is client-side only — server-side validation at Gumroad provides an additional layer.
