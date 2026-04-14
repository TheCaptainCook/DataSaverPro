# 🛡️ DataSaver Pro

**DataSaver Pro** is a high-performance, secure Chrome extension designed to drastically reduce data consumption and accelerate browsing speeds by intelligently blocking heavy web assets.

![License](https://img.shields.io/badge/License-Gumroad-blue.svg)
![Version](https://img.shields.io/badge/Version-4.0.0-green.svg)
![GitHub](https://img.shields.io/badge/GitHub-TheCaptainCook-black.svg)

---

## 🚀 Key Features

- **Granular Blocking**: Selective blocking of images, videos, heavy scripts, and iframes.
- **Dynamic Net Request (DNR)**: Utilizes the latest Chrome Manifest V3 APIs for efficient, low-latency filtering.
- **Real-Time Live Log**: Monitor what's being blocked instantly through the popup UI.
- **Gumroad Licensing**: Secure license verification with 30-day automatic trials and anti-tamper protections.
- **Theme Support**: Seamless transitions between Light, Dark, and System modes.
- **Site-Specific Toggles**: Disable blocking on trusted sites with a single click.

---

## 🏗️ Technical Architecture

DataSaver Pro is built for efficiency and security. It follows a modular design split into background service workers, content scripts, and a secure licensing module.

### 1. Background Service Worker (`background.js`)
The core orchestrator of the extension. It manages global state, statistics, and handles high-level Chrome APIs.

| Function | Description |
| :--- | :--- |
| `applyRules(settings)` | Dynamically updates Chrome's `declarativeNetRequest` rules based on user preferences. |
| `updateBadge(tabId)` | Updates the extension badge with the count of blocked items on the active tab. |
| `getStats()` / `mergeStats(delta)` | Manages persistent usage statistics and live log history in `chrome.storage.local`. |
| `getFullSettings()` | Retrieves and merges user settings with default configurations. |
| `setSiteDisabled(host, disabled)` | Manages the exclusion list for specific domains. |
| `notifyAllTabs(message)` | Broadcasts setting changes to all active content scripts for real-time UI updates. |

### 2. License & Anti-Tamper Module (`license.js`)
A fortified module responsible for handling Gumroad license verification and protecting the trial state.

| Function | Description |
| :--- | :--- |
| `initLicense()` | Initializes the license state and starts the 30-day trial for new users. |
| `getLicenseState()` | Checks the current status (Trial, Active, or Expired) and verifies data integrity. |
| `activateLicense(key)` | Validates a Gumroad license key against the remote API and stores it securely. |
| `periodicVerify()` | Automatically re-verifies active licenses every 7 days to prevent fraudulent use. |
| `_checksum(obj)` | Internal utility to detect manual tampering of the license storage blob. |
| `_encode()` / `_decode()` | XOR-based obfuscation to protect stored license data from casual inspection. |

### 3. Content Script (`content.js`)
The "front-line" of the extension, responsible for DOM-level blocking and placeholder management.

| Function | Description |
| :--- | :--- |
| `track(kind, url)` | Records a blocked event and triggers UI/badge updates. |
| `replaceOrRemove(el, ...)` | Replaces blocked elements (videos/iframes) with lightweight placeholders or removes them entirely. |
| `blockImages()` | Primary logic for stopping `<img>` tags and CSS background images. |
| `blockVideos()` / `blockHeavy()` | specialized logic for stopping media playback and heavy font/asset loading. |
| `restoreAll()` | Reverses all DOM changes when the extension or site-blocking is turned off. |
| `pushStats()` | Periodically syncs local tracking data with the background service worker. |

### 4. Popup Manager (`popup.js`)
Handles the extension's interactive popup UI, master toggle, and live log display.

| Function | Description |
| :--- | :--- |
| `init()` | Bootstraps the popup, loads settings/stats, and binds UI events. |
| `applyGlobalState()` | Updates the UI (pills, banners, checkboxes) based on the global enabled/disabled states. |
| `renderLog()` | Dynamically generates the list of blocked requests for the current tab. |
| `saveSetting(key, val)` | Updates a specific setting and syncs it with the background worker. |
| `renderTrial()` | Calculates and displays the remaining days in the 30-day trial period. |

### 5. Stats Dashboard (`stats.js`)
Manages the comprehensive statistics visualization page with charts and site-level breakdown.

| Function | Description |
| :--- | :--- |
| `renderStats(stats)` | Populates the dashboard with lifetime totals, today's activity, and historical charts. |
| `initTheme()` | Manages the Light/Dark/System theme switching specifically for the stats page. |
| `load()` | Fetches the latest statistics from the background worker via messages. |
| `fmt(n)` | Formats large numbers into human-readable strings (e.g., "1.2K", "3.5M"). |

### 6. User Profile (`profile.js`)
Handles user information storage and trial integrity checks.

| Function | Description |
| :--- | :--- |
| `loadProfile()` / `saveProfile()` | Manages user metadata (name, email, usage) with sanitization and validation. |
| `loadTrial()` | Logic for calculating trial expiration and displaying the status badge. |
| `trialChecksum(ts)` | Security helper to prevent manual expiration date manipulation. |

---

## 📡 GitHub Hosting & Versioning

### How to Host on GitHub
To show your code on GitHub and enable versioning:
1. **Repository**: Create a new repository at `https://github.com/TheCaptainCook/DataSaverPro`.
2. **Push Code**:
   ```bash
   git init
   git add .
   git commit -m "Initial Release v4.0.0"
   git remote add origin https://github.com/TheCaptainCook/DataSaverPro.git
   git push -u origin main
   ```
3. **Releases**: Use GitHub Releases to tag your versions (e.g., `v4.0.0`).

### Implementing the Version Check
To enable the **Version Checking** feature, you need to add the following logic to your `background.js`. This allows the extension to notify users when a new version is available on GitHub.

#### 1. Add this function to `background.js`:
```javascript
async function checkUpdate() {
  const VERSION_URL = "https://raw.githubusercontent.com/TheCaptainCook/DataSaverPro/main/version.json";
  try {
    const resp = await fetch(VERSION_URL);
    const data = await resp.json();
    const current = chrome.runtime.getManifest().version;
    
    if (data.version !== current) {
      console.log(`[DSP] Update available: ${data.version}`);
      await chrome.storage.local.set({ updateAvailable: data.version });
    }
  } catch (err) {
    console.error("[DSP] Update check failed:", err);
  }
}
```

#### 2. Trigger the check on startup:
Add this inside your `chrome.runtime.onInstalled` or `chrome.runtime.onStartup` listeners:
```javascript
chrome.alarms.create("checkUpdate", { periodInMinutes: 1440 }); // Check daily
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "checkUpdate") checkUpdate();
});
checkUpdate(); // Run immediately on start
```

---

## 🛠️ Installation

### Developer Mode
1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the extension folder.

---

## 🔒 Security & Privacy

DataSaver Pro is built with a **Privacy-First** approach:
- **No External Tracking**: All statistics are stored locally on your device.
- **Encrypted Storage**: Sensitive data (like license info) is obfuscated and checksum-verified.
- **Manifest V3**: Adheres to the latest security standards required by the Chrome Web Store.

---

## 📄 License
This project is licensed via **Gumroad**. Unauthorized redistribution of the source code is prohibited.

© 2026 TheCaptainCook. All rights reserved.
