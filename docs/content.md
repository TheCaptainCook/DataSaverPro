# content.js

**Role:** Content script — runs at `document_start` on every page. Handles DOM-level cleanup of blocked elements and maintains the per-tab live request log that the popup reads.

---

## Injection

Declared in `manifest.json`:

```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content.js"],
  "run_at": "document_start"
}]
```

`run_at: document_start` ensures the script is injected before any page HTML is parsed, so it can observe and clean up blocked elements as they are inserted rather than after the fact.

---

## Responsibilities

### 1. DOM cleanup (`removeBlocked` mode)

When `settings.removeBlocked === true`, the script uses a `MutationObserver` to watch for newly inserted nodes. Any element that wraps a blocked resource (a broken `<img>`, an empty `<video>`, a blocked `<iframe>`) is collapsed by setting `display: none` and zero dimensions. This reclaims layout space that would otherwise show as blank gaps.

### 2. Live request log

Content scripts can observe network activity indirectly via browser events. The script tracks which resource types were attempted on the current page and maintains a local log array:

```js
// Each log entry
{ kind: "image" | "video" | "audio" | "heavy" | "script" | "iframe",
  url:  string,
  ts:   number  // Date.now()
}
```

The log is capped at 500 entries to prevent unbounded memory growth.

### 3. Stat reporting

Periodically (and on `beforeunload`) the script pushes a stats delta to the background via `PUSH_STATS`:

```js
chrome.runtime.sendMessage({
  type: "PUSH_STATS",
  delta: {
    images, videos, heavy, scripts, iframes,
    host: location.hostname,
    logEntries: [...]
  }
});
```

The background merges this into lifetime and daily totals.

### 4. Badge updates

After each batch of blocked requests, the script sends `UPDATE_BADGE` with the current page total so the background can update the toolbar badge for this tab.

---

## Message API

| `msg.type` | Direction | Response |
|---|---|---|
| `GET_LOG` | popup → content | `{ log: [...], counts: { images, videos, … } }` |
| `UPDATE_SETTINGS` | background → content | Re-reads settings, updates observer behaviour |
| `LICENSE_EXPIRED` | background → content | Stops DOM cleanup, clears local log |

---

## Settings awareness

The content script re-evaluates its behaviour whenever it receives `UPDATE_SETTINGS` from the background. If `removeBlocked` is toggled off, the `MutationObserver` is disconnected and any inline styles previously applied are removed.

Per-site disabled state is handled at the DNR layer (background), not in the content script — the content script does not need to check `disabledSites` itself.

---

## Notes

- The content script does not perform any network requests.
- It does not inject any UI into pages.
- It stores no data in `localStorage` or `sessionStorage`.
- Communication is one-way from content to background (fire-and-forget `sendMessage`), except for `GET_LOG` which is requested by the popup.
