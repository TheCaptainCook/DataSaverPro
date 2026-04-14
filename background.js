// DataSaver Pro — Background Service Worker v18
// Clean data-saver only. No privacy. All toggles wired correctly.

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT = {
  enabled:      true,
  blockImages:  true,
  blockVideos:  true,
  blockHeavy:   true,
  blockScripts: false,
  blockIframes: false,
  removeBlocked: false,
  disabledSites: [],
  allowedUrls: [],
  theme: "system"
};

const DEFAULT_STATS = {
  lifetime: { images:0, videos:0, heavy:0, scripts:0, iframes:0, total:0 },
  today:    { images:0, videos:0, heavy:0, scripts:0, iframes:0, total:0, date:"" },
  history:  [],
  installedAt: 0,
  sites: {},
  liveLog: []   // { id, type, url, host, ts }
};

// ═══════════════════════════════════════════════════════════════
// DECLARATIVE NET REQUEST — strong rule set
// Rule ID ranges:
//  1–9   images
//  10–19 video/audio/media
//  20–29 heavy content (fonts, CDNs, GIFs, large assets)
//  30–39 3rd-party scripts / analytics / ads
//  40–49 iframes / sub-frames
// ═══════════════════════════════════════════════════════════════

async function applyRules(s) {
  // Always remove all existing dynamic rules first
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);
  const addRules = [];

  const globalOn = s.enabled !== false;

  // Check if this host is in disabledSites — we can't easily
  // do per-host DNR filtering here without knowing the active tab,
  // so DNR applies globally; content.js handles per-site blocking.

  let nextAllowId = 1000;
  if (s.allowedUrls && s.allowedUrls.length > 0) {
    s.allowedUrls.forEach(urlStr => {
      addRules.push({
        id: nextAllowId++, priority: 100,
        action: { type: "allow" },
        condition: { urlFilter: urlStr }
      });
    });
  }

  if (globalOn) {

    // ── IMAGES ──────────────────────────────────────────────────
    if (s.blockImages) {
      addRules.push({
        id: 1, priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["image"] }
      });
      // WebP & AVIF via XHR (some sites lazy-load)
      addRules.push({
        id: 2, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "*.webp", resourceTypes: ["xmlhttprequest","other"] }
      });
    }

    // ── VIDEO / AUDIO / MEDIA ────────────────────────────────────
    if (s.blockVideos) {
      addRules.push({
        id: 10, priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["media","object"] }
      });
      // YouTube CDN
      addRules.push({
        id: 11, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||googlevideo.com^", resourceTypes: ["media","xmlhttprequest","other"] }
      });
      addRules.push({
        id: 12, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||youtube.com/videoplayback*", resourceTypes: ["media","xmlhttprequest"] }
      });
      // Vimeo
      addRules.push({
        id: 13, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||vimeocdn.com^", resourceTypes: ["media","other"] }
      });
      // TikTok
      addRules.push({
        id: 14, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||tiktokcdn.com^", resourceTypes: ["media","other"] }
      });
      // Twitter/X video
      addRules.push({
        id: 15, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||video.twimg.com^", resourceTypes: ["media","other"] }
      });
    }

    // ── HEAVY CONTENT ────────────────────────────────────────────
    if (s.blockHeavy) {
      // Web fonts
      addRules.push({
        id: 20, priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["font"] }
      });
      addRules.push({
        id: 21, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||fonts.googleapis.com^", resourceTypes: ["stylesheet","font"] }
      });
      addRules.push({
        id: 22, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||fonts.gstatic.com^", resourceTypes: ["font","other"] }
      });
      // Animated GIFs / Giphy
      addRules.push({
        id: 23, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||giphy.com^", resourceTypes: ["image","media","xmlhttprequest","other"] }
      });
      addRules.push({
        id: 24, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||giphycdn.com^", resourceTypes: ["image","media","other"] }
      });
      // Large CDN asset bundles (common heavy loaders)
      addRules.push({
        id: 25, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||bootstrapcdn.com^", resourceTypes: ["stylesheet","script"] }
      });
      addRules.push({
        id: 26, priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||cloudflare.com/ajax*", resourceTypes: ["script","stylesheet"] }
      });
    }

    // ── 3RD-PARTY SCRIPTS / ANALYTICS / ADS ─────────────────────
    if (s.blockScripts) {
      const scriptPatterns = [
        [30, "||google-analytics.com^"],
        [31, "||googletagmanager.com^"],
        [32, "||googletagservices.com^"],
        [33, "||hotjar.com^"],
        [34, "||doubleclick.net^"],
        [35, "||connect.facebook.net^"],
        [36, "||facebook.com/tr*"],
        [37, "||mixpanel.com^"],
        [38, "||amplitude.com^"],
        [39, "||segment.com^"],
        [40, "||heap.io^"],
        [41, "||fullstory.com^"],
        [42, "||intercom.io^"],
        [43, "||crisp.chat^"],
        [44, "||bing.com/bat*"],
        [45, "||adservice.google.com^"],
        [46, "||pagead2.googlesyndication.com^"],
        [47, "||tiktok.com/i18n/pixel*"],
        [48, "||snap.licdn.com^"],
        [49, "||sc-static.net^"]
      ];
      scriptPatterns.forEach(([id, urlFilter]) => {
        addRules.push({
          id, priority: 1,
          action: { type: "block" },
          condition: { urlFilter, resourceTypes: ["script","xmlhttprequest","image","other"] }
        });
      });
    }

    // ── IFRAMES / SUB-FRAMES ─────────────────────────────────────
    if (s.blockIframes) {
      addRules.push({
        id: 60, priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["sub_frame"] }
      });
    }
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (err) {
    console.error("[DSP] DNR update error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════

const tabCounts = {};

function updateBadge(tabId) {
  const n    = tabCounts[tabId] || 0;
  const text = n > 0 ? (n >= 1000 ? "999+" : String(n)) : "";
  const color = n > 0 ? "#4f6ef7" : "#444";
  chrome.action.setBadgeText({ text, tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color, tabId }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

async function getStats() {
  const s = await chrome.storage.local.get({ stats: DEFAULT_STATS });
  return s.stats || DEFAULT_STATS;
}

async function mergeStats(delta) {
  const stats  = await getStats();
  const today  = new Date().toISOString().slice(0, 10);

  // Roll over day
  if (stats.today.date !== today) {
    if (stats.today.date && stats.today.total > 0) {
      stats.history.unshift({ date: stats.today.date, total: stats.today.total });
      if (stats.history.length > 30) stats.history = stats.history.slice(0, 30);
    }
    stats.today = { images:0, videos:0, heavy:0, scripts:0, iframes:0, total:0, date: today };
  }

  // Merge counts
  let added = 0;
  for (const k of ["images","videos","heavy","scripts","iframes"]) {
    const n = delta[k] || 0;
    stats.lifetime[k]  = (stats.lifetime[k]  || 0) + n;
    stats.today[k]     = (stats.today[k]     || 0) + n;
    added += n;
  }
  stats.lifetime.total = (stats.lifetime.total || 0) + added;
  stats.today.total    = (stats.today.total    || 0) + added;

  // Per-site counts
  if (delta.host && added > 0) {
    stats.sites[delta.host] = (stats.sites[delta.host] || 0) + added;
    const trimmed = Object.entries(stats.sites).sort((a,b) => b[1]-a[1]).slice(0, 50);
    stats.sites = Object.fromEntries(trimmed);
  }

  // Live log — content.js sends logEntries array with each push
  if (Array.isArray(delta.logEntries) && delta.logEntries.length > 0) {
    if (!stats.liveLog) stats.liveLog = [];
    for (const e of delta.logEntries) {
      stats.liveLog.unshift({
        id:   Math.random().toString(36).slice(2),
        type: e.kind || "other",
        url:  e.url  || "",
        host: delta.host || "",
        ts:   e.ts   || Date.now()
      });
    }
    if (stats.liveLog.length > 200) stats.liveLog = stats.liveLog.slice(0, 200);
  }

  await chrome.storage.local.set({ stats });
}

// ═══════════════════════════════════════════════════════════════
// SITE HELPERS
// ═══════════════════════════════════════════════════════════════

async function getFullSettings() {
  return chrome.storage.sync.get(DEFAULT).then(s => ({ ...DEFAULT, ...s }));
}

async function getSiteDisabled(host) {
  const s = await getFullSettings();
  return (s.disabledSites || []).includes(host);
}

async function setSiteDisabled(host, disabled) {
  const s = await getFullSettings();
  let list = s.disabledSites || [];
  if (disabled) {
    if (!list.includes(host)) list.push(host);
  } else {
    list = list.filter(h => h !== host);
  }
  await chrome.storage.sync.set({ disabledSites: list });
  return list;
}

async function notifyAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, message); } catch(_) {}
  }
}

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async () => {
  // Only set defaults if fresh install (don't overwrite existing settings on update)
  const existing = await chrome.storage.sync.get({ trialStartDate: null });
  if (!existing.trialStartDate) {
    const ts = Date.now();
    // Security: store checksum alongside timestamp to detect tampering
    let h = 0;
    const salt = "dsp18-trial-v1" + String(ts);
    for (let i = 0; i < salt.length; i++) { h = ((h << 5) - h + salt.charCodeAt(i)) | 0; }
    await chrome.storage.sync.set({ ...DEFAULT, trialStartDate: ts, trialCheck: h });
  } else {
    // Update — merge defaults without overwriting user settings
    const current = await getFullSettings();
    await chrome.storage.sync.set({ ...DEFAULT, ...current });
  }
  const existingStats = await chrome.storage.local.get({ stats: null });
  if (!existingStats.stats) {
    await chrome.storage.local.set({ stats: { ...DEFAULT_STATS, installedAt: Date.now() } });
  }
  const s = await getFullSettings();
  await applyRules(s);
});

chrome.runtime.onStartup.addListener(async () => {
  const s = await getFullSettings();
  await applyRules(s);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts[tabId] = 0;
    updateBadge(tabId);
  }
});
chrome.tabs.onRemoved.addListener(tabId => { delete tabCounts[tabId]; });

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Security: only accept messages from this extension
  if (sender.id !== chrome.runtime.id) return;

  // UPDATE_SETTINGS — always merge with stored settings to avoid partial overwrites
  if (msg.type === "UPDATE_SETTINGS") {
    getFullSettings().then(async current => {
      const merged = { ...current, ...msg.settings };
      await chrome.storage.sync.set(merged);
      await applyRules(merged);
      // Notify all content scripts so they reflect the new state
      await notifyAllTabs({ type: "UPDATE_SETTINGS", settings: merged });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "GET_SETTINGS") {
    getFullSettings().then(s => sendResponse(s));
    return true;
  }

  if (msg.type === "GET_SITE_DISABLED") {
    getSiteDisabled(msg.host).then(d => sendResponse({ disabled: d }));
    return true;
  }

  if (msg.type === "SET_SITE_DISABLED") {
    setSiteDisabled(msg.host, msg.disabled).then(async list => {
      const full = await getFullSettings();
      full.disabledSites = list;
      // Notify the specific tab that toggled, then re-apply rules
      if (sender.tab) {
        try { await chrome.tabs.sendMessage(sender.tab.id, { type: "UPDATE_SETTINGS", settings: full }); }
        catch(_) {}
      }
      sendResponse({ ok: true, disabledSites: list });
    });
    return true;
  }

  if (msg.type === "UPDATE_BADGE") {
    const tabId = sender.tab?.id;
    if (tabId) { tabCounts[tabId] = msg.count; updateBadge(tabId); }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "PUSH_STATS") {
    mergeStats(msg.delta).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "GET_STATS") {
    getStats().then(s => sendResponse(s));
    return true;
  }

  if (msg.type === "RESET_STATS") {
    chrome.storage.local
      .set({ stats: { ...DEFAULT_STATS, installedAt: Date.now() } })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "OPEN_STATS") {
    chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "OPEN_PROFILE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("profile.html") });
    sendResponse({ ok: true });
    return true;
  }
});
