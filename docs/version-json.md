# version.json

**Role:** Remote version manifest. Hosted in the repository root on the `main` branch. Fetched by every installed copy of DataSaver Pro to determine whether an update is available.

---

## Location

```
https://raw.githubusercontent.com/TheCaptainCook/DataSaverPro/main/version.json
```

This URL is stored in `background.js` as a char-code array and decoded at runtime — it does not appear as a plain string in the built artifact.

---

## Schema

```json
{
  "version": "4.0.1",
  "message": "What's new — shown in the update banner",
  "url": "https://github.com/TheCaptainCook/DataSaverPro/releases/tag/v4.0.1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | `string` | ✅ | Semantic version of the latest release (`MAJOR.MINOR.PATCH`) |
| `message` | `string` | ✅ | Short description shown in the update banner (keep under ~60 chars) |
| `url` | `string` | ✅ | URL opened when the user clicks UPDATE in the banner |

---

## How the update check works

1. On every popup open, `popup.js` sends `FORCE_UPDATE_CHECK` to `background.js`.
2. `background.js` fetches `version.json` from GitHub with `cache: "no-store"`.
3. The remote `version` is compared against `CURRENT_VERSION` (hardcoded in `background.js`) using semantic version comparison (`compareVersions(a, b)`).
4. If `remote > installed`, the result is stored in `chrome.storage.local` under `_upd`.
5. The result is returned to the popup, which shows the update banner if `_upd` is non-null.
6. The user can dismiss the banner (removes `_upd`) or click UPDATE to open the release URL.
7. The same check also runs on browser start and every 4 hours via the `dsp-update-check` alarm.

---

## Releasing an update

To trigger the update banner for all installed copies:

1. Increment `"version"` in **both** `version.json` and `manifest.json`.
2. Set a clear, concise `"message"` (e.g. `"Bug fixes and performance improvements"`).
3. Set `"url"` to the release page or direct download link.
4. Commit and push to `main`.

The next time any user opens the popup (or their browser starts), their copy will fetch the new `version.json`, detect the version bump, and show the update banner.

---

## Version comparison

`compareVersions(a, b)` splits both strings on `.`, pads shorter arrays with `0`, and compares numerically segment by segment. It returns `-1`, `0`, or `1` — the same convention as `Array.prototype.sort` comparators.

Examples:

| `a` (installed) | `b` (remote) | Result |
|---|---|---|
| `4.0.0` | `4.0.1` | `-1` → update shown |
| `4.0.1` | `4.0.1` | `0` → no update |
| `4.1.0` | `4.0.9` | `1` → no update (installed is newer) |
