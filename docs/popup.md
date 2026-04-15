# popup.html / popup.js

**Role:** The main extension UI — a 380 × 570 px panel rendered when the user clicks the toolbar icon. Managed entirely by the `PopupManager` class in `popup.js`.

---

## Layout structure

```
┌─────────────────────────────────────┐
│ HEADER  (logo · master ON/OFF · theme) │
├─────────────────────────────────────┤
│ GLOBAL OFF BANNER  (conditional)    │
├─────────────────────────────────────┤
│ UPDATE BANNER      (conditional)    │
├─────────────────────────────────────┤
│ LICENSE BAR        (always visible) │
├─────────────────────────────────────┤
│ SITE ROW           (this site toggle)│
├─────────────────────────────────────┤
│ EXPIRED NOTICE STRIP (conditional)  │
├─────────────────────────────────────┤
│ TABS  [ OPTIONS ]  [ LIVE LOG ]     │
├─────────────────────────────────────┤
│                                     │
│  Tab panel content (scrollable)     │
│                                     │
├─────────────────────────────────────┤
│ FOOTER  (page count · progress bar) │
└─────────────────────────────────────┘
```

---

## PopupManager lifecycle

```
constructor()
  └── init()
        ├── chrome.tabs.query()          — get active tab
        ├── initTheme()                  — apply saved theme
        ├── setupTabs()                  — wire tab buttons
        ├── Promise.all([
        │     loadSettings(),
        │     loadStats(),
        │     loadTabLog(),
        │     loadLicenseState()
        │   ])
        ├── bindEvents()                 — attach all listeners
        ├── renderOptions()              — populate toggles + counters
        ├── renderLog()                  — populate live log
        ├── renderFooter()              — totals + progress bar
        ├── renderLicense()             — license bar + expired strip
        ├── applyGlobalState()          — master/site toggle visual state
        └── checkForUpdate()            — FORCE_UPDATE_CHECK → banner
```

---

## Key methods

### `applyGlobalState()`

Reads `this.settings.enabled` and `isSiteDisabled()` to update:

- Master pill text (`ON` / `OFF`) and colour class
- Global-off banner visibility
- Site toggle checkbox state
- `siteRow` opacity/pointer-events (`disabled-state` class)
- `optsList` opacity/pointer-events (`opts-disabled` class) — applied when global is off **or** site is disabled

### `saveSetting(key, value)`

```js
saveSetting(key, value) {
  this.settings[key] = value;
  chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", settings: { [key]: value } });
  this._scheduleReload();   // debounced 350 ms
}
```

Decouples the tab reload from the message callback so it fires even if the MV3 service worker sleeps before responding.

### `renderLicense()`

Maps `licenseState.state` → UI state:

| State | License bar class | Expired strip | Modal on bar click |
|---|---|---|---|
| `active` | `active` | hidden | no |
| `trial` | `trial` | hidden | no |
| `expired` | `expired` | **shown** | yes |

The expired notice strip is a non-blocking flex row above the tab panels — it does **not** cover or disable tab content.

### `checkForUpdate()`

Sends `FORCE_UPDATE_CHECK` to the background (which triggers a live GitHub fetch). If a newer version exists, populates and shows `#updateBanner`.

---

## DOM element reference

| ID | Element | Purpose |
|---|---|---|
| `masterPill` | `<button>` | Global ON/OFF toggle |
| `themeToggle` | `<button>` | Cycles system → dark → light |
| `globalOffBanner` | `<div>` | Shown when extension is globally disabled |
| `updateBanner` | `<div>` | Shown when a GitHub update is available |
| `updateText` | `<span>` | Update message text |
| `updateVer` | `<span>` | New version string |
| `updateBtn` | `<button>` | Opens release URL |
| `updateDismiss` | `<button>` | Hides banner, removes `_upd` from storage |
| `licenseBar` | `<div>` | Always-visible license status bar |
| `licenseBarText` | `<span>` | Trial days / Licensed / Expired text |
| `licenseBarRight` | `<div>` | Progress track or status badge |
| `siteEnabled` | `<input[checkbox]>` | Per-site disable toggle |
| `siteRow` | `<div>` | Wrapper — dimmed when global is off |
| `expiredOverlay` | `<div>` | Non-blocking expired notice strip |
| `expActivateBtn` | `<button>` | Opens license modal from expired strip |
| `expBuyBtn` | `<button>` | Opens Gumroad purchase page |
| `optsList` | `<div>` | Wraps all option rows — dimmed when disabled |
| `blockImages` | `<input[checkbox]>` | Images module toggle |
| `blockVideos` | `<input[checkbox]>` | Video module toggle |
| `blockHeavy` | `<input[checkbox]>` | Heavy content module toggle |
| `blockScripts` | `<input[checkbox]>` | Scripts module toggle |
| `blockIframes` | `<input[checkbox]>` | Iframes module toggle |
| `removeBlocked` | `<input[checkbox]>` | Remove blocked elements toggle |
| `cnt-images` … `cnt-iframes` | `<span>` | Per-module blocked counters |
| `logList` | `<div>` | Live log scroll container |
| `logRefresh` | `<button>` | Re-fetches log from content script |
| `logPill` | `<span>` | Log item count badge |
| `pageNum` | `<span>` | Blocked count for current page |
| `progressFill` | `<div>` | Lifetime progress bar fill |
| `progressPct` | `<span>` | Lifetime percentage label |
| `statsBtn` | `<button>` | Opens stats.html |
| `profileBtn` | `<button>` | Opens profile.html |
| `licenseModal` | `<div>` | License activation modal overlay |
| `lmKeyInput` | `<input>` | License key text field |
| `lmActivateBtn` | `<button>` | Submits key for activation |
| `lmMsg` | `<div>` | Success / error feedback |
| `lmRateLimit` | `<div>` | Rate-limit countdown (conditional) |
| `lmClose` | `<button>` | Closes license modal |
| `lmBuyLink` | `<a>` | Gumroad purchase link |

---

## CSS design tokens

Defined on `:root` (dark mode defaults) and overridden by `[data-theme="light"]`:

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#07090f` | `#f4f5fb` | Page background |
| `--s1` | `#0d1020` | `#ffffff` | Surface 1 (header, tabs) |
| `--s2` | `#121528` | `#eef0f8` | Surface 2 (hover states) |
| `--s3` | `#181c30` | `#e4e6f2` | Surface 3 (progress tracks) |
| `--accent` | `#4f6ef7` | same | Primary accent / active |
| `--green` | `#22d98a` | same | Licensed / success |
| `--red` | `#f74f6e` | same | Expired / error |
| `--yellow` | `#f7b900` | same | Trial warning |
| `--txt` | `#8890b8` | `#555880` | Body text |
| `--txb` | `#dde0ff` | `#111230` | Bold / heading text |
| `--mono` | `'Courier New'` | same | Monospace labels |

---

## Security notes

- All user-supplied values rendered into HTML are passed through `escapeHtml()`.
- `log-allow` button validates URLs with `new URL()`, rejects non-`http(s)` protocols, and caps length at 2048 characters.
- Allowlist is capped at 200 entries.
