// DataSaver Pro — Enhanced Background Service Worker v5
// Features: Licensing system, trial period, privacy settings, theme support

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const TRIAL_DAYS = 30;
const LICENSE_CHECK_INTERVAL = 3600000; // 1 hour
const DODO_API_URL = "https://api.dodo.pe"; // Replace with actual endpoint

const DEFAULT = {
  enabled: true,
  blockImages: true,
  blockVideos: true,
  blockHeavy: true,
  blockScripts: false,
  blockIframes: false,
  removeBlocked: false,
  disabledSites: [],
  // NEW: Theme & Privacy
  theme: "system",
  showToggleOnly: true, // NEW: Toggle-only mode for popup
  privacySettings: {
    blockTracking: true,
    blockLocation: true,
    blockCamera: true,
    blockMicrophone: true,
    blockCookies: false,
    blockFingerprinting: true,
    blockWebRTC: true, // NEW: WebRTC leak prevention
    blockBattery: true, // NEW: Battery status API blocking
    blockDeviceMemory: true, // NEW: Device memory blocking
    blockHardwareConcurrency: true // NEW: CPU cores blocking
  }
};

const DEFAULT_STATS = {
  lifetime: { images: 0, videos: 0, heavy: 0, scripts: 0, iframes: 0, total: 0 },
  today: { images: 0, videos: 0, heavy: 0, scripts: 0, iframes: 0, total: 0, date: "" },
  history: [],
  installedAt: 0,
  sites: {},
  liveLog: [] // Per-item tracking for unblock feature
};

const DEFAULT_LICENSE = {
  licenseKey: null,
  verified: false,
  verifiedAt: 0,
  expiresAt: 0,
  trialStartedAt: 0,
  trialDaysLeft: TRIAL_DAYS,
  status: "trial", // trial | active | expired
  username: null,
  email: null,
  plan: "free" // free | pro | enterprise
};

// ══════════════════════════════════════════════════════════════════════════════
// LICENSE & TRIAL MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

async function getLicense() {
  try {
    const data = await chrome.storage.local.get({ license: DEFAULT_LICENSE });
    return data.license || DEFAULT_LICENSE;
  } catch (error) {
    console.error('Error getting license:', error);
    return DEFAULT_LICENSE;
  }
}

async function getTrialDaysLeft() {
  try {
    const lic = await getLicense();
    
    // NULL SAFETY CHECK
    if (!lic) return 0;
    
    if (lic.status === "active" && lic.licenseKey) return -1; // unlimited
    
    if (lic.status === "trial" && lic.trialStartedAt) {
      const daysPassed = Math.floor((Date.now() - lic.trialStartedAt) / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, TRIAL_DAYS - daysPassed);
      return daysLeft;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating trial days:', error);
    return 0;
  }
}

async function verifyLicense(licenseKey) {
  try {
    const response = await fetch(`${DODO_API_URL}/verify-license`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, extension: "datasaver-pro" })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.valid ? data : null;
  } catch (error) {
    console.error("License verification error:", error);
    return null;
  }
}

async function activateLicense(licenseKey) {
  const result = await verifyLicense(licenseKey);
  if (!result) return { success: false, error: "Invalid license key" };
  
  const lic = await getLicense();
  lic.licenseKey = licenseKey;
  lic.verified = true;
  lic.verifiedAt = Date.now();
  lic.expiresAt = result.expiresAt || Date.now() + (365 * 24 * 60 * 60 * 1000);
  lic.status = "active";
  lic.plan = result.plan || "pro";
  lic.username = result.username;
  lic.email = result.email;
  
  await chrome.storage.local.set({ license: lic });
  await notifyAllTabs({ type: "LICENSE_ACTIVATED", license: lic });
  return { success: true, license: lic };
}

async function initTrial() {
  const lic = await getLicense();
  if (!lic.trialStartedAt) {
    lic.trialStartedAt = Date.now();
    lic.status = "trial";
    lic.trialDaysLeft = TRIAL_DAYS;
    await chrome.storage.local.set({ license: lic });
  }
}

async function checkLicenseStatus() {
  const lic = await getLicense();
  const daysLeft = await getTrialDaysLeft();
  
  // Update trial status
  if (lic.status === "trial" && daysLeft === 0) {
    lic.status = "expired";
    await chrome.storage.local.set({ license: lic });
    await notifyAllTabs({ type: "TRIAL_EXPIRED" });
  }
  
  // Verify active license periodically
  if (lic.status === "active" && lic.licenseKey) {
    const lastVerified = lic.verifiedAt || 0;
    if (Date.now() - lastVerified > LICENSE_CHECK_INTERVAL) {
      const result = await verifyLicense(lic.licenseKey);
      if (!result) {
        lic.verified = false;
        await chrome.storage.local.set({ license: lic });
      }
    }
  }
  
  return lic;
}

async function isPluginEnabled() {
  const lic = await checkLicenseStatus();
  
  if (lic.status === "active") return true;
  if (lic.status === "trial") {
    const daysLeft = await getTrialDaysLeft();
    return daysLeft > 0;
  }
  
  return false; // expired
}

// ══════════════════════════════════════════════════════════════════════════════
// DECLARATIVE NET REQUEST RULES
// ══════════════════════════════════════════════════════════════════════════════

async function applyRules(s) {
  const enabled = await isPluginEnabled();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);
  const addRules = [];

  if (enabled && s.enabled) {
    if (s.blockImages) {
      addRules.push({
        id: 1,
        priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["image"] }
      });
    }
    
    if (s.blockVideos) {
      addRules.push({
        id: 2,
        priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["media", "object"] }
      });
      addRules.push({
        id: 3,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||googlevideo.com^", resourceTypes: ["media", "xmlhttprequest", "other"] }
      });
      addRules.push({
        id: 4,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||vimeocdn.com^", resourceTypes: ["media", "other"] }
      });
    }
    
    if (s.blockHeavy) {
      addRules.push({
        id: 5,
        priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["font"] }
      });
      addRules.push({
        id: 6,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||giphy.com^", resourceTypes: ["image", "media", "xmlhttprequest"] }
      });
    }
    
    if (s.blockScripts) {
      addRules.push({
        id: 7,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||google-analytics.com^", resourceTypes: ["script", "xmlhttprequest"] }
      });
      addRules.push({
        id: 8,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||googletagmanager.com^", resourceTypes: ["script"] }
      });
      addRules.push({
        id: 9,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||hotjar.com^", resourceTypes: ["script", "xmlhttprequest"] }
      });
      addRules.push({
        id: 10,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||doubleclick.net^", resourceTypes: ["script", "xmlhttprequest", "image"] }
      });
      addRules.push({
        id: 11,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||connect.facebook.net^", resourceTypes: ["script"] }
      });
    }
    
    if (s.blockIframes) {
      addRules.push({
        id: 12,
        priority: 1,
        action: { type: "block" },
        condition: { resourceTypes: ["sub_frame"] }
      });
    }
    
    // Privacy Rules
    if (s.privacySettings.blockTracking) {
      addRules.push({
        id: 50,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||amplitude.com^", resourceTypes: ["script", "xmlhttprequest"] }
      });
      addRules.push({
        id: 51,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: "||mixpanel.com^", resourceTypes: ["script", "xmlhttprequest"] }
      });
    }
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (error) {
    console.error("Error updating rules:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BADGE & UI
// ══════════════════════════════════════════════════════════════════════════════

const tabCounts = {};

function updateBadge(tabId) {
  const count = tabCounts[tabId] || 0;
  const text = count > 0 ? (count >= 1000 ? "999+" : String(count)) : "";
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: count > 0 ? "#4f6ef7" : "#333", tabId });
}

// ══════════════════════════════════════════════════════════════════════════════
// STATS MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

async function getStats() {
  const s = await chrome.storage.local.get({ stats: DEFAULT_STATS });
  return s.stats;
}

async function mergeStats(delta) {
  const stats = await getStats();
  const dateKey = new Date().toISOString().slice(0, 10);

  if (stats.today.date !== dateKey) {
    if (stats.today.date && stats.today.total > 0) {
      stats.history.unshift({ date: stats.today.date, total: stats.today.total });
      if (stats.history.length > 30) stats.history = stats.history.slice(0, 30);
    }
    stats.today = { images: 0, videos: 0, heavy: 0, scripts: 0, iframes: 0, total: 0, date: dateKey };
  }

  const keys = ["images", "videos", "heavy", "scripts", "iframes"];
  let t = 0;
  for (const key of keys) {
    const n = delta[key] || 0;
    stats.lifetime[key] = (stats.lifetime[key] || 0) + n;
    stats.today[key] = (stats.today[key] || 0) + n;
    t += n;
  }
  stats.lifetime.total = (stats.lifetime.total || 0) + t;
  stats.today.total = (stats.today.total || 0) + t;

  if (delta.host && t > 0) {
    stats.sites[delta.host] = (stats.sites[delta.host] || 0) + t;
    const trimmed = Object.entries(stats.sites).sort((a, b) => b[1] - a[1]).slice(0, 50);
    stats.sites = Object.fromEntries(trimmed);
  }

  // Live log entry
  if (delta.type && delta.url) {
    if (!stats.liveLog) stats.liveLog = [];
    stats.liveLog.unshift({
      id: Math.random().toString(36),
      type: delta.type,
      url: delta.url,
      host: delta.host,
      timestamp: Date.now(),
      blocked: true
    });
    if (stats.liveLog.length > 100) stats.liveLog = stats.liveLog.slice(0, 100);
  }

  await chrome.storage.local.set({ stats });
}

async function unblockLogItem(itemId) {
  const stats = await getStats();
  const index = stats.liveLog.findIndex(item => item.id === itemId);
  if (index !== -1) {
    stats.liveLog[index].blocked = false;
    // TODO: Add URL to whitelist
    await chrome.storage.local.set({ stats });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGING
// ══════════════════════════════════════════════════════════════════════════════

async function notifyAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (_) { }
  }
}

async function getSiteDisabled(host) {
  const s = await chrome.storage.sync.get(DEFAULT);
  return (s.disabledSites || []).includes(host);
}

async function setSiteDisabled(host, disabled) {
  const s = await chrome.storage.sync.get(DEFAULT);
  let list = s.disabledSites || [];
  if (disabled) {
    if (!list.includes(host)) list.push(host);
  } else {
    list = list.filter(h => h !== host);
  }
  await chrome.storage.sync.set({ disabledSites: list });
  return list;
}

// ══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.set(DEFAULT);
  
  const existing = await chrome.storage.local.get({ license: null, stats: null });
  
  if (!existing.license) {
    await chrome.storage.local.set({ license: DEFAULT_LICENSE });
    await initTrial();
  }
  
  if (!existing.stats) {
    await chrome.storage.local.set({ stats: { ...DEFAULT_STATS, installedAt: Date.now() } });
  }
  
  const s = await chrome.storage.sync.get(DEFAULT);
  await applyRules(s);
  
  // Open profile page on first install
  chrome.tabs.create({ url: chrome.runtime.getURL("profile.html?firstInstall=true") });
});

chrome.runtime.onStartup.addListener(async () => {
  const s = await chrome.storage.sync.get(DEFAULT);
  await checkLicenseStatus();
  await applyRules(s);
});

chrome.alarms.create("checkLicense", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkLicense") {
    await checkLicenseStatus();
  }
});

// Clear badge when tab loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts[tabId] = 0;
    updateBadge(tabId);
  }
});
chrome.tabs.onRemoved.addListener(tabId => {
  delete tabCounts[tabId];
});

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING
// ══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // SETTINGS
  if (msg.type === "UPDATE_SETTINGS") {
    chrome.storage.sync.set(msg.settings).then(async () => {
      await applyRules(msg.settings);
      await notifyAllTabs({ type: "UPDATE_SETTINGS", settings: msg.settings });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "GET_SETTINGS") {
    chrome.storage.sync.get(DEFAULT).then(s => sendResponse(s));
    return true;
  }

  // LICENSING
  if (msg.type === "GET_LICENSE") {
    getLicense().then(lic => sendResponse(lic));
    return true;
  }

  if (msg.type === "ACTIVATE_LICENSE") {
    activateLicense(msg.licenseKey).then(result => sendResponse(result));
    return true;
  }

  if (msg.type === "GET_TRIAL_DAYS") {
    getTrialDaysLeft().then(days => sendResponse({ daysLeft: days }));
    return true;
  }

  if (msg.type === "CHECK_PLUGIN_ENABLED") {
    isPluginEnabled().then(enabled => sendResponse({ enabled }));
    return true;
  }

  // SITE-SPECIFIC
  if (msg.type === "GET_SITE_DISABLED") {
    getSiteDisabled(msg.host).then(d => sendResponse({ disabled: d }));
    return true;
  }

  if (msg.type === "SET_SITE_DISABLED") {
    setSiteDisabled(msg.host, msg.disabled).then(async (list) => {
      const s = await chrome.storage.sync.get(DEFAULT);
      s.disabledSites = list;
      if (sender.tab) {
        try {
          await chrome.tabs.sendMessage(sender.tab.id, { type: "UPDATE_SETTINGS", settings: s });
        } catch (_) { }
      }
      sendResponse({ ok: true, disabledSites: list });
    });
    return true;
  }

  // BADGE & STATS
  if (msg.type === "UPDATE_BADGE") {
    const tabId = sender.tab && sender.tab.id;
    if (tabId) {
      tabCounts[tabId] = msg.count;
      updateBadge(tabId);
    }
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
    chrome.storage.local.set({ stats: { ...DEFAULT_STATS, installedAt: Date.now() } })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  // LIVE LOG
  if (msg.type === "UNBLOCK_LOG_ITEM") {
    unblockLogItem(msg.itemId).then(() => sendResponse({ ok: true }));
    return true;
  }

  // NAVIGATION
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
