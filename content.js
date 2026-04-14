// DataSaver Pro — Content Script v18
// Key fix: pushStats() sends logEntries to populate background liveLog.
// GET_LOG still works for immediate popup display.

let _contextAlive = true;

function safeSend(msg, cb) {
  if (!_contextAlive) return;
  try {
    chrome.runtime.sendMessage(msg, cb || (() => { void chrome.runtime.lastError; }));
  } catch(e) {
    if (/context invalidated/i.test(String(e))) { _contextAlive = false; shutdown(); }
  }
}

function shutdown() {
  try { observer.disconnect(); } catch(_) {}
  clearInterval(_statsInterval);
  clearInterval(_badgeInterval);
  window.removeEventListener("beforeunload", pushStats);
}

// ── Settings ──────────────────────────────────────────────────

let settings = {
  enabled: true, blockImages: true, blockVideos: true,
  blockHeavy: true, blockScripts: false, blockIframes: false,
  removeBlocked: false, disabledSites: [], allowedUrls: []
};

function isSiteDisabled() {
  return (settings.disabledSites || []).includes(location.hostname);
}

function isActive() {
  return settings.enabled && !isSiteDisabled();
}

function isAllowed(url) {
  if (!url || !settings.allowedUrls || !settings.allowedUrls.length) return false;
  return settings.allowedUrls.some(allowed => url.includes(allowed));
}

// ── Tracking ─────────────────────────────────────────────────

const counts = { images:0, videos:0, heavy:0, scripts:0, iframes:0 };
const log    = []; // { kind, url, ts } — in-memory live log
const MAX_LOG = 500;

let _badgeDirty = false;
const _badgeInterval = setInterval(() => {
  if (!_badgeDirty || !_contextAlive) return;
  _badgeDirty = false;
  const total = Object.values(counts).reduce((a,b)=>a+b, 0);
  safeSend({ type:"UPDATE_BADGE", count: total });
}, 1000);

function track(kind, url) {
  const cat = kind==="image"  ? "images"
            : (kind==="video"||kind==="audio") ? "videos"
            : kind==="heavy"  ? "heavy"
            : kind==="script" ? "scripts"
            : kind==="iframe" ? "iframes" : null;
  if (cat) counts[cat]++;
  log.push({ kind, url: url||"", ts: Date.now() });
  if (log.length > MAX_LOG) log.shift();
  _badgeDirty = true;
}

// ── Placeholder ───────────────────────────────────────────────

const IMG_PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

function makeBlockedPlaceholder(w, h, label) {
  const div = document.createElement("div");
  div.setAttribute("data-ds-ph","1");
  div.style.cssText = [
    "display:flex!important","align-items:center!important","justify-content:center!important",
    "flex-direction:column!important","background:#0d0d1a!important",
    "border:1px solid #1e1e3f!important","border-radius:4px!important",
    "color:#3a3a7a!important","font-family:monospace!important","font-size:9px!important",
    `width:${w||"100%"}`, `height:${h||80}px!important`,
    "min-width:40px!important","min-height:24px!important","box-sizing:border-box!important",
    "pointer-events:none!important","user-select:none!important"
  ].join(";");
  div.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a7a" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span style="margin-top:4px">${label}</span>`;
  return div;
}

function replaceOrRemove(el, w, h, label) {
  if (settings.removeBlocked) { el.remove(); return null; }
  const ph = makeBlockedPlaceholder(w, h, label);
  el.parentNode?.insertBefore(ph, el);
  el.style.display = "none";
  return ph;
}

// ── Blocking functions ────────────────────────────────────────

function blockImages() {
  document.querySelectorAll("img:not([data-ds])").forEach(img => {
    if (isAllowed(img.src)) return;
    img.dataset.ds    = "img";
    img.dataset.dsSrc = img.src    || "";
    img.dataset.dsSs  = img.srcset || "";
    track("image", img.src);
    if (settings.removeBlocked) { img.remove(); return; }
    img.src    = IMG_PH;
    img.srcset = "";
    img.style.cssText += "background:#0d0d1a!important;opacity:0.3!important;min-width:4px!important;min-height:4px!important;";
  });
  // CSS background images
  document.querySelectorAll("*:not([data-ds-bg])").forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none" && /url\(/.test(bg)) {
      const m = bg.match(/url\(["']?([^"')]+)/);
      const bgUrl = m ? m[1] : "";
      if (isAllowed(bgUrl)) return;
      el.dataset.dsBg = el.style.backgroundImage || "__c__";
      el.style.backgroundImage = "none";
      track("image", bgUrl);
    }
  });
}

const VIDEO_HOSTS = [
  "youtube.com","youtu.be","vimeo.com","dailymotion.com",
  "twitch.tv","tiktok.com","rumble.com","facebook.com"
];

function blockVideos() {
  document.querySelectorAll("video:not([data-ds])").forEach(v => {
    const vSrc = v.src || v.currentSrc || "";
    if (isAllowed(vSrc)) return;
    v.dataset.ds = "video";
    track("video", vSrc);
    v.pause(); v.src = ""; v.load();
    v.querySelectorAll("source").forEach(s => { s.dataset.dsSrc = s.src; s.src = ""; });
    replaceOrRemove(v, v.offsetWidth||320, v.offsetHeight||180, "video blocked · datasaver");
  });
  document.querySelectorAll("audio:not([data-ds])").forEach(a => {
    const aSrc = a.src || "";
    if (isAllowed(aSrc)) return;
    a.dataset.ds = "audio";
    track("audio", aSrc);
    a.pause(); a.src = ""; a.load();
    if (settings.removeBlocked) a.remove();
  });
  document.querySelectorAll("iframe:not([data-ds])").forEach(fr => {
    const src = fr.src || "";
    if (isAllowed(src)) return;
    if (VIDEO_HOSTS.some(h => src.includes(h))) {
      fr.dataset.ds    = "video-embed";
      fr.dataset.dsSrc = src;
      track("video", src);
      fr.src = "about:blank";
      replaceOrRemove(fr, fr.offsetWidth||560, fr.offsetHeight||315, "embed blocked · datasaver");
    }
  });
}

function blockHeavy() {
  document.querySelectorAll("link:not([data-ds])").forEach(link => {
    const rel  = link.rel  || "";
    const as_  = link.getAttribute("as") || "";
    const href = link.href || "";
    const isFont = (rel==="stylesheet" && /fonts\.(googleapis|gstatic)\.com|typekit|adobe-fonts|font-awesome|bunny\.net\/fonts/.test(href))
                || (rel==="preload" && as_==="font");
    if (isFont && !isAllowed(href)) {
      link.dataset.ds    = "heavy";
      link.dataset.dsHref = href;
      link.disabled      = true;
      track("heavy", href);
    }
  });
  // Disable autoplay/preload on media
  document.querySelectorAll("video,audio").forEach(el => {
    el.autoplay = false;
    el.preload  = "none";
  });
}

const SCRIPT_RX = [
  /google-analytics\.com/,/googletagmanager\.com/,/googletagservices\.com/,
  /hotjar\.com/,/doubleclick\.net/,/connect\.facebook\.net/,/fbevents\.js/,
  /mixpanel\.com/,/segment\.com/,/amplitude\.com/,/heap\.io/,
  /fullstory\.com/,/intercom\.io/,/crisp\.chat/,
  /pagead\/js/,/adsbygoogle/,/twitter\.com\/widgets/,
  /snap\.licdn\.com/,/sc-static\.net/,/bing\.com\/bat/
];

function blockScripts() {
  document.querySelectorAll("script[src]:not([data-ds])").forEach(s => {
    const src = s.src || "";
    if (isAllowed(src)) return;
    if (!src.startsWith(location.origin) && SCRIPT_RX.some(rx => rx.test(src))) {
      s.dataset.ds = "script";
      track("script", src);
      s.type = "javascript/blocked";
    }
  });
}

function blockIframes() {
  document.querySelectorAll("iframe:not([data-ds])").forEach(fr => {
    const src = fr.src || "";
    if (!src || src === "about:blank" || VIDEO_HOSTS.some(h => src.includes(h)) || isAllowed(src)) return;
    fr.dataset.ds    = "iframe";
    fr.dataset.dsSrc = src;
    track("iframe", src);
    fr.src = "about:blank";
    replaceOrRemove(fr, fr.offsetWidth||300, fr.offsetHeight||150, "frame blocked · datasaver");
  });
}

// ── Restore ───────────────────────────────────────────────────

function restoreAll() {
  document.querySelectorAll("img[data-ds='img']").forEach(img => {
    img.src    = img.dataset.dsSrc || "";
    img.srcset = img.dataset.dsSs  || "";
    img.style.background = "";
    img.style.opacity    = "";
    delete img.dataset.ds;
  });
  document.querySelectorAll("[data-ds-bg]").forEach(el => {
    if (el.dataset.dsBg !== "__c__") el.style.backgroundImage = el.dataset.dsBg;
    delete el.dataset.dsBg;
  });
  document.querySelectorAll("[data-ds-ph]").forEach(el => el.remove());
  document.querySelectorAll("video[data-ds],audio[data-ds],iframe[data-ds='video-embed'],iframe[data-ds='iframe']").forEach(el => {
    el.style.display = "";
    if (el.dataset.dsSrc) el.src = el.dataset.dsSrc;
    delete el.dataset.ds;
  });
  document.querySelectorAll("link[data-ds='heavy']").forEach(link => {
    link.disabled = false;
    delete link.dataset.ds;
  });
  document.querySelectorAll("script[data-ds='script']").forEach(s => {
    s.type = "text/javascript";
    delete s.dataset.ds;
  });
}

// ── Apply ─────────────────────────────────────────────────────

function applySettings() {
  if (!isActive()) { restoreAll(); return; }
  if (settings.blockImages)  blockImages();
  if (settings.blockVideos)  blockVideos();
  if (settings.blockHeavy)   blockHeavy();
  if (settings.blockScripts) blockScripts();
  if (settings.blockIframes) blockIframes();
}

// ── MutationObserver ──────────────────────────────────────────

const observer = new MutationObserver(mutations => {
  if (!isActive()) return;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      const tag = node.tagName;
      if (settings.blockImages  && (tag==="IMG"    || node.querySelector?.("img")))            blockImages();
      if (settings.blockVideos  && (tag==="VIDEO"  || tag==="AUDIO" || tag==="IFRAME" ||
                                    node.querySelector?.("video,audio,iframe")))                blockVideos();
      if (settings.blockHeavy   && (tag==="LINK"   || node.querySelector?.("link")))           blockHeavy();
      if (settings.blockScripts && (tag==="SCRIPT" || node.querySelector?.("script")))         blockScripts();
      if (settings.blockIframes && (tag==="IFRAME" || node.querySelector?.("iframe")))         blockIframes();
    }
  }
});
observer.observe(document.documentElement, { childList:true, subtree:true });

// ── Stats push — NOW SENDS logEntries ─────────────────────────
// This is the fix: each pushStats call includes new log entries
// so background.js can populate the persistent liveLog.

let lastPushed   = { images:0, videos:0, heavy:0, scripts:0, iframes:0 };
let lastLogPushed = 0;  // index into log[] up to which we've sent

function pushStats() {
  const delta = {};
  let has = false;
  for (const k of Object.keys(lastPushed)) {
    const d = (counts[k]||0) - (lastPushed[k]||0);
    if (d > 0) { delta[k] = d; has = true; }
  }

  // Include any new log entries since last push
  const newEntries = log.slice(lastLogPushed);
  if (newEntries.length > 0) {
    delta.logEntries = newEntries;
    lastLogPushed = log.length;
    has = true;
  }

  if (!has) return;
  delta.host = location.hostname;
  Object.assign(lastPushed, counts);
  safeSend({ type:"PUSH_STATS", delta });
}

const _statsInterval = setInterval(pushStats, 3000);  // 3s for more responsive live log
window.addEventListener("beforeunload", pushStats);

// ── Messages ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "UPDATE_SETTINGS") {
    const wasActive = isActive();
    // Security: only accept known settings keys
    const ALLOWED_KEYS = ["enabled","blockImages","blockVideos","blockHeavy","blockScripts","blockIframes","removeBlocked","disabledSites","allowedUrls"];
    const safe = {};
    for (const k of ALLOWED_KEYS) {
      if (k in msg.settings) safe[k] = msg.settings[k];
    }
    settings = { ...settings, ...safe };
    const nowActive = isActive();
    if (wasActive && !nowActive) {
      restoreAll();
    } else if (nowActive) {
      applySettings();
    }
    sendResponse({ ok: true });
  }
  if (msg.type === "GET_LOG") {
    sendResponse({ log: [...log], counts: { ...counts } });
  }
  if (msg.type === "CLEAR_LOG") {
    log.length = 0;
    lastLogPushed = 0;
    Object.keys(counts).forEach(k => counts[k] = 0);
    Object.keys(lastPushed).forEach(k => lastPushed[k] = 0);
    safeSend({ type:"UPDATE_BADGE", count:0 });
    sendResponse({ ok:true });
  }
  return true;
});

// ── Boot ──────────────────────────────────────────────────────

try {
  chrome.storage.sync.get(
    { enabled:true, blockImages:true, blockVideos:true, blockHeavy:true,
      blockScripts:false, blockIframes:false, removeBlocked:false, disabledSites:[], allowedUrls:[] },
    s => {
      if (!_contextAlive) return;
      settings = s;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applySettings);
      } else {
        applySettings();
      }
    }
  );
} catch(e) {
  _contextAlive = false;
}
