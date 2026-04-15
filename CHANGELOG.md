# Changelog

All notable changes to DataSaver Pro are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Version numbers follow [Semantic Versioning](https://semver.org/).

---

## [4.0.1] — 2026-04-15

### Fixed

- **Update banner** — banner now appears immediately when a new version is pushed to GitHub. Previously the banner only showed after a 12-hour alarm fired. The popup now triggers a live fetch from GitHub on every open (`FORCE_UPDATE_CHECK`), and `checkForUpdate()` also runs on `onInstalled` and `onStartup`.
- **Feature toggle page refresh** — active tab now reliably reloads after toggling any module. The previous implementation called `reloadActiveTab()` inside a `sendMessage` callback which was silently dropped when the MV3 service worker slept mid-chain. Replaced with a 350 ms debounced `setTimeout` that runs independently of the message round-trip.
- **Site disable switch** — toggling a site off now actually stops all blocking for that hostname. The `applyRules()` function was saving `disabledSites` to storage but never reading it when building DNR rules — blocks applied globally regardless of the per-site setting. Fixed by adding high-priority allow rules (priority 50, rule IDs 800–898) for each host in `disabledSites`, using `initiatorDomains` to exempt the site from every active module.
- **Expired overlay blocks active tabs** — the full-screen lock overlay that appeared on license expiry covered the OPTIONS and LIVE LOG panels entirely, making the extension appear broken before the user had a chance to purchase. Replaced with a compact non-blocking notice strip that sits above the content area. Tab panels remain fully visible and interactive at all times.
- **Profile page hides "Active" status before purchase** — the license info block (containing the Status row) was hidden on trial and expired states, so the profile page showed no status indicator until after activation. The block is now always visible with the Status value reflecting the current state dynamically: `✓ Active`, `Trial (N days left)`, or `⚠ Expired`.

### Changed

- Update check alarm interval reduced from 720 minutes (12 hours) to 240 minutes (4 hours).
- Extension version bumped to `4.0.1` in `manifest.json`.

---

## [4.0.0] — 2026-04-14

### Added

- Gumroad license integration with 30-day free trial.
- Rate-limited license activation (prevents brute-force key guessing).
- Periodic license re-verification via Chrome alarm (every 6 hours).
- Expired license overlay with purchase and activate prompts.
- Profile page (`profile.html`) for license management and user details.
- Update banner — fetches `version.json` from GitHub and notifies users of new releases.
- Obfuscated GitHub update URL (char-code array, decoded at runtime).
- Per-URL allowlist (up to 200 entries) accessible from the live log.
- Live request log with type badges, timestamps, and allow buttons.
- Log pill counter on the LIVE LOG tab button.
- Dark / light / system theme toggle with persistence.
- Badge showing blocked-request count per tab.

### Changed

- Migrated from Manifest V2 to **Manifest V3**.
- All network blocking now uses `declarativeNetRequest` (DNR) instead of `webRequest`.
- Settings stored in `chrome.storage.sync` (cross-device roaming).
- Stats stored in `chrome.storage.local`.

### Removed

- Privacy-mode features (scope reduced to data-saving only).

---

## [3.x] — Legacy

Earlier versions used Manifest V2 and `webRequest`-based blocking. Those builds are no longer supported.
