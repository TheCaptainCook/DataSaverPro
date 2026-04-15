# DataSaver Pro

> Block images, video, fonts, scripts and iframes to slash mobile data usage and speed up browsing — with real-time blocking stats, a live request log, and a per-site on/off switch.

[![Version](https://img.shields.io/badge/version-4.0.1-4f6ef7?style=flat-square)](https://github.com/TheCaptainCook/DataSaverPro/releases)
[![Manifest](https://img.shields.io/badge/manifest-v3-22d98a?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-Proprietary-f74f6e?style=flat-square)](./LICENSE)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [License & Trial](#license--trial)
- [Releasing Updates](#releasing-updates)
- [Contributing](#contributing)
- [Changelog](#changelog)

---

## Features

| Module | What it blocks |
|---|---|
| **Images** | PNG, JPG, GIF, WebP, AVIF — including lazy-loaded XHR images |
| **Video / Audio** | `<video>`, `<audio>`, YouTube, Vimeo, TikTok, Twitter/X CDNs |
| **Heavy Content** | Web fonts, Google Fonts, Giphy, Bootstrap CDN, Cloudflare AJAX bundles |
| **Scripts** | Google Analytics, GTM, Hotjar, Facebook Pixel, Mixpanel, Amplitude and 10+ more |
| **Iframes** | All sub-frames (`<iframe>`, embedded content) |
| **Remove Blocked** | Collapses blocked elements in the DOM to reclaim layout space |

**Additional highlights:**

- Master ON/OFF toggle — pause all blocking with one click
- Per-site disable — exempt any hostname without touching global settings
- Live request log — see exactly what was blocked on the current page
- Lifetime stats with per-site breakdowns
- Update banner — notified automatically when a new version is pushed to GitHub
- Dark / light / system theme
- Rate-limited Gumroad license activation with 30-day free trial

---

## Installation

### From source (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the root folder of this repo.
5. The DataSaver Pro icon appears in your toolbar.

### From a release ZIP

1. Go to [Releases](https://github.com/TheCaptainCook/DataSaverPro/releases) and download the latest `.zip`.
2. Unzip the archive.
3. Follow steps 2–5 above.

> **Note:** Chrome Web Store distribution requires a signed `.crx`. The steps above install an unsigned local build for development and testing.

---

## How It Works

DataSaver Pro uses Chrome's **Declarative Net Request (DNR)** API to intercept and block network requests before they consume bandwidth. Rules are applied in the browser's network layer — no content script overhead on the critical path.

```
User toggles a setting
        │
        ▼
popup.js → UPDATE_SETTINGS message
        │
        ▼
background.js: merges settings, calls applyRules()
        │
        ▼
chrome.declarativeNetRequest.updateDynamicRules()
        │
        ▼
Active tab reloads (350 ms debounce)
```

### Rule priority table

| Priority | Purpose |
|---|---|
| 100 | Per-URL allow (allowlist) |
| 50 | Per-site allow (disabled sites) |
| 1 | Block rules (images, video, fonts, scripts, iframes) |

Higher priority wins. Disabled-site allow rules (priority 50) always beat block rules (priority 1), so toggling a site off fully exempts it from every active module.

---

## File Structure

```
datasaver-pro/
├── manifest.json        # Extension manifest (MV3)
├── background.js        # Service worker: DNR rules, stats, license, update checker
├── content.js           # Content script: DOM cleanup, live request log
├── popup.html           # Popup UI markup + styles
├── popup.js             # Popup controller (PopupManager class)
├── stats.html           # Full stats page
├── stats.js             # Stats page controller
├── profile.html         # Profile & license management page
├── profile.js           # Profile page controller
├── license.js           # License verification module (DSLicense)
├── version.json         # Current version + update message (fetched by clients)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── docs/                # Developer documentation
│   ├── background.md
│   ├── popup.md
│   ├── content.md
│   ├── license.md
│   ├── stats.md
│   ├── profile.md
│   └── version-json.md
└── README.md
```

---

## Configuration

Default settings (applied on first install):

```json
{
  "enabled": true,
  "blockImages": true,
  "blockVideos": true,
  "blockHeavy": true,
  "blockScripts": false,
  "blockIframes": false,
  "removeBlocked": false,
  "disabledSites": [],
  "allowedUrls": [],
  "theme": "system"
}
```

Settings are stored in `chrome.storage.sync` so they roam across devices signed into the same Chrome profile.

---

## License & Trial

DataSaver Pro ships with a **30-day free trial**. After the trial period the extension pauses blocking and shows an activation prompt. Users purchase a license key via [Gumroad](https://nullbytestudio.gumroad.com/l/DataSaverPro) and enter it in the popup or profile page.

- Activation is rate-limited to prevent brute-force key guessing.
- License verification runs periodically (every 6 hours) via a Chrome alarm.
- All license logic lives in `license.js` (`DSLicense` namespace).

See [`docs/license.md`](docs/license.md) for the full verification flow.

---

## Releasing Updates

To push an update that users see immediately:

1. Bump the `"version"` field in `manifest.json`.
2. Edit `version.json` in the repo root:

```json
{
  "version": "4.1.0",
  "message": "What's new in this release",
  "url": "https://github.com/TheCaptainCook/DataSaverPro/releases/tag/v4.1.0"
}
```

3. Commit and push to the `main` branch.

The extension fetches `version.json` from GitHub raw content on every popup open and every browser start. If the remote version is newer than the installed version, an update banner appears automatically.

> The GitHub raw URL is stored as a character-code array in `background.js` and decoded at runtime — it is not exposed as a plain string.

---

## Contributing

This is a proprietary extension. External contributions are not accepted. If you have found a bug or have a feature request, please open an issue on GitHub.

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for the full release history.
