// DataSaver Pro — Background Service Worker v18
// Clean data-saver only. No privacy. All toggles wired correctly.
// License-gated with Gumroad integration.

// Import license module
importScripts("license.js");

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
  // License gate: if license is not functional, clear all rules
  let licensed = false;
  try {
    licensed = await DSLicense.isFunctional();
  } catch(_) {}

  // Always remove all existing dynamic rules first
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);
  const addRules = [];

  if (!licensed) {
    // Extension not licensed — remove all blocking rules
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
    } catch (err) {
      console.error("[DSP] DNR clear error:", err);
    }
    // Set badge to indicate expired
    chrome.action.setBadgeText({ text: "!" }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ color: "#f74f6e" }).catch(() => {});
    return;
  }

  const globalOn = s.enabled !== false;

  // ── Per-site allow rules for disabled sites (IDs 800–898, priority 50) ──
  // Priority 50 beats block rules (1) so these sites get fully exempted.
  const SITE_ALLOW_BASE = 800;
  const ALL_RESOURCE_TYPES = [
    "image","media","font","script","sub_frame",
    "object","xmlhttprequest","stylesheet","other","websocket","ping"
  ];
  if (globalOn && s.disabledSites && s.disabledSites.length > 0) {
    s.disabledSites.slice(0, 99).forEach((host, idx) => {
      if (!host) return;
      const bare = host.replace(/^www\./, "");
      addRules.push({
        id: SITE_ALLOW_BASE + idx,
        priority: 50,
        action: { type: "allow" },
        condition: { initiatorDomains: [bare], resourceTypes: ALL_RESOURCE_TYPES }
      });
    });
  }

  // ── Per-URL allow rules (IDs 1000+, priority 100) ──
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
// LICENSE ALARM — periodic re-verification
// ═══════════════════════════════════════════════════════════════

const LICENSE_ALARM = "dsp-license-verify";
const UPDATE_ALARM = "dsp-update-check";

function setupLicenseAlarm() {
  chrome.alarms.create(LICENSE_ALARM, { periodInMinutes: 360 });
  // Check for updates every 12 hours
  chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: 240 }); // every 4 hours
}

// ═══════════════════════════════════════════════════════════════
// UPDATE CHECKER — obfuscated GitHub URL
// ═══════════════════════════════════════════════════════════════

// Obfuscated repo URL — decoded at runtime only
const _uc = [104,116,116,112,115,58,47,47,114,97,119,46,103,105,116,104,117,98,117,115,101,114,99,111,110,116,101,110,116,46,99,111,109,47,84,104,101,67,97,112,116,97,105,110,67,111,111,107,47,68,97,116,97,83,97,118,101,114,80,114,111,47,109,97,105,110,47,118,101,114,115,105,111,110,46,106,115,111,110];
function _decU() { return _uc.map(c => String.fromCharCode(c)).join(""); }

const CURRENT_VERSION = "4.0.0";

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

async function checkForUpdate() {
  try {
    const resp = await fetch(_decU(), { cache: "no-store" });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.version && compareVersions(CURRENT_VERSION, data.version) < 0) {
      // Newer version available
      await chrome.storage.local.set({
        _upd: {
          version: data.version,
          message: data.message || "",
          url: data.url || "",
          ts: Date.now()
        }
      });
    } else {
      // Up to date — clear any stale update notice
      await chrome.storage.local.remove("_upd");
    }
  } catch(_) {
    // Silent fail — network issues shouldn't affect extension
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === LICENSE_ALARM) {
    try {
      await DSLicense.verify();
      const functional = await DSLicense.isFunctional();
      if (!functional) {
        const s = await getFullSettings();
        await applyRules(s);
        await notifyAllTabs({ type: "LICENSE_EXPIRED" });
      }
    } catch(e) {
      console.error("[DSP] License alarm error:", e);
    }
  }
  if (alarm.name === UPDATE_ALARM) {
    await checkForUpdate();
  }
});

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async () => {
  // Initialize license system (starts trial if first install)
  try {
    await DSLicense.init();
  } catch(e) {
    console.error("[DSP] License init error:", e);
  }

  // Set up periodic license verification alarm
  setupLicenseAlarm();

  // Only set defaults if fresh install (don't overwrite existing settings on update)
  const existing = await chrome.storage.sync.get({ _ld: null });
  if (!existing._ld) {
    // Fresh install — set defaults (trial is handled by DSLicense.init())
    await chrome.storage.sync.set(DEFAULT);
  } else {
    // Update — merge defaults without overwriting user settings
    const current = await getFullSettings();
    await chrome.storage.sync.set({ ...DEFAULT, ...current });
  }

  const existingStats = await chrome.storage.local.get({ stats: null });
  if (!existingStats.stats) {
    await chrome.storage.local.set({ stats: { ...DEFAULT_STATS, installedAt: Date.now() } });
  }

  // Clean up old trial storage keys from previous versions
  chrome.storage.sync.remove(["trialStartDate", "trialCheck"]).catch(() => {});

  const s = await getFullSettings();
  await applyRules(s);

  // Immediate update check so banner can appear right away
  checkForUpdate().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  // Re-establish alarm on browser restart
  setupLicenseAlarm();

  const s = await getFullSettings();
  await applyRules(s);

  // Immediate update check on browser start
  checkForUpdate().catch(() => {});
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

  // ── LICENSE MESSAGES ──────────────────────────────────────────

  if (msg.type === "GET_LICENSE_STATE") {
    DSLicense.getState().then(state => sendResponse(state)).catch(() => {
      sendResponse({ state: "expired", daysLeft: 0, licensed: false });
    });
    return true;
  }

  if (msg.type === "ACTIVATE_LICENSE") {
    DSLicense.activate(msg.key).then(async result => {
      if (result.success) {
        // Re-apply rules now that license is active
        const s = await getFullSettings();
        await applyRules(s);
      }
      sendResponse(result);
    }).catch(e => {
      sendResponse({ success: false, error: "Activation failed: " + e.message });
    });
    return true;
  }

  if (msg.type === "DEACTIVATE_LICENSE") {
    DSLicense.deactivate().then(async () => {
      // Clear rules since no longer licensed
      const s = await getFullSettings();
      await applyRules(s);
      sendResponse({ ok: true });
    }).catch(() => {
      sendResponse({ ok: false });
    });
    return true;
  }

  if (msg.type === "GET_RATE_LIMIT") {
    sendResponse(DSLicense.getRateLimit());
    return true;
  }

  // ── SETTINGS MESSAGES ─────────────────────────────────────────

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
      await applyRules(full);
      // Notify all tabs so content scripts update
      await notifyAllTabs({ type: "UPDATE_SETTINGS", settings: full });
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

  if (msg.type === "CHECK_UPDATE") {
    chrome.storage.local.get({ _upd: null }, res => {
      sendResponse(res._upd || null);
    });
    return true;
  }

  // Live fetch from GitHub then return the result — used by popup on open
  if (msg.type === "FORCE_UPDATE_CHECK") {
    checkForUpdate().then(() => {
      chrome.storage.local.get({ _upd: null }, res => {
        sendResponse(res._upd || null);
      });
    }).catch(() => sendResponse(null));
    return true;
  }

  if (msg.type === "DISMISS_UPDATE") {
    chrome.storage.local.remove("_upd").then(() => sendResponse({ ok: true }));
    return true;
  }
});
