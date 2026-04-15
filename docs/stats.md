# stats.html / stats.js

**Role:** Full-page stats dashboard. Opened as a new tab via the Stats button in the popup or the `OPEN_STATS` background message.

---

## Layout

The stats page is a standalone full-browser-tab page (not constrained to 380 × 570 px like the popup). It displays:

- **Lifetime totals** — cumulative counts for each blocked resource type since install.
- **Today's totals** — counts since midnight local time, reset daily.
- **Per-type breakdown** — images, video, heavy, scripts, iframes.
- **Top sites** — ranked list of hostnames with the most blocked requests.
- **History chart** — daily blocked totals for the last 30 days.
- **Reset button** — clears all stats after confirmation.

---

## Data flow

```
stats.js
  └── chrome.runtime.sendMessage({ type: "GET_STATS" })
        └── background.js returns stats object from chrome.storage.local
```

The page does not poll — it loads stats once on `DOMContentLoaded`. A manual refresh button re-fires `GET_STATS`.

---

## Stats object shape

```js
{
  lifetime: {
    images:  number,
    videos:  number,
    heavy:   number,
    scripts: number,
    iframes: number,
    total:   number
  },
  today: {
    images, videos, heavy, scripts, iframes, total,
    date: "YYYY-MM-DD"   // ISO date string; resets when date changes
  },
  history: [
    { date: "YYYY-MM-DD", total: number },
    // ... up to 30 entries, newest first
  ],
  installedAt: number,   // Unix timestamp (ms)
  sites: {
    "example.com": number,   // blocked count
    // ... up to 50 entries, sorted by count descending
  },
  liveLog: [
    { id, type, url, host, ts },
    // ... up to 200 entries, newest first
  ]
}
```

---

## Daily rollover

Handled in `background.js` `mergeStats()`. When a new stat delta arrives and `stats.today.date` does not match the current ISO date:

1. The current `today` record (if non-zero) is prepended to `history`.
2. `history` is trimmed to 30 entries.
3. A fresh `today` record is created for the new date.

This means the rollover happens lazily on the first blocked request of a new day, not at midnight exactly. The stats page reflects whatever is in storage at the time it loads.

---

## Reset

Clicking Reset sends `RESET_STATS` to the background, which replaces the entire stats object with `DEFAULT_STATS` (preserving `installedAt`). The page re-renders immediately after the response.
