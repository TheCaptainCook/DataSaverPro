// DataSaver Pro — Content Script v4
// Runs at document_start. No inline scripts. All logic here.

// ── Context-invalidation guard ────────────────────────
// When the extension is reloaded/updated while a tab is open the content
// script's chrome.runtime context is torn down. Any call to chrome.runtime
// after that throws "Extension context invalidated". We detect this and
// shut down all timers + the MutationObserver so the error never fires again.
let _contextAlive = true;

function safeSend(msg, cb) {
  if (!_contextAlive) return;
  try {
    chrome.runtime.sendMessage(msg, cb || (() => { void chrome.runtime.lastError; }));
  } catch (e) {
    if (/context invalidated/i.test(String(e))) {
      _contextAlive = false;
      shutdown();
    }
  }
}

function shutdown() {
  try { observer.disconnect(); } catch(_) {}
  clearInterval(_statsInterval);
  clearInterval(_badgeInterval);
  window.removeEventListener("beforeunload", pushStats);
}
// ─────────────────────────────────────────────────────

let settings = {
  enabled: true, blockImages: true, blockVideos: true,
  blockHeavy: true, blockScripts: false, blockIframes: false,
  removeBlocked: false, disabledSites: []
};

// ── Tracking ──────────────────────────────────────────
const counts = { images:0, videos:0, heavy:0, scripts:0, iframes:0 };
const log    = [];
const MAX_LOG = 300;

// Badge updates are batched — fire at most once per second
let _badgeDirty = false;
const _badgeInterval = setInterval(() => {
  if (!_badgeDirty || !_contextAlive) return;
  _badgeDirty = false;
  const total = Object.values(counts).reduce((a,b) => a+b, 0);
  safeSend({ type:"UPDATE_BADGE", count: total });
}, 1000);

function track(kind, url) {
  const cat = kind === "image"  ? "images"
            : (kind === "video" || kind === "audio") ? "videos"
            : kind === "heavy"  ? "heavy"
            : kind === "script" ? "scripts"
            : kind === "iframe" ? "iframes" : null;
  if (cat) counts[cat]++;
  log.push({ kind, url: url || "", ts: Date.now() });
  if (log.length > MAX_LOG) log.shift();
  _badgeDirty = true;
}

// ── Is this site disabled per-page? ──────────────────
function isSiteDisabled() {
  return (settings.disabledSites || []).includes(location.hostname);
}

function isActive() {
  return settings.enabled && !isSiteDisabled();
}

// ── Placeholder vs remove ─────────────────────────────
function replaceOrRemove(original, w, h, label) {
  if (settings.removeBlocked) {
    original.remove();
    return null;
  }
  const div = document.createElement("div");
  div.setAttribute("data-ds-ph", "1");
  div.style.cssText = [
    "display:flex!important","align-items:center!important","justify-content:center!important",
    "flex-direction:column!important","background:#0d0d1a!important",
    "border:1px solid #1e1e3f!important","border-radius:4px!important",
    "color:#2a2a6a!important","font-family:monospace!important","font-size:9px!important",
    `width:${w||320}px!important`,`height:${h||120}px!important`,
    "min-width:60px!important","min-height:30px!important","gap:5px!important",
    "box-sizing:border-box!important"
  ].join(";");
  div.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2a2a6a" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span>${label}</span>`;
  original.parentNode && original.parentNode.insertBefore(div, original);
  original.style.display = "none";
  return div;
}

const IMG_PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

// ── Block Images ──────────────────────────────────────
function blockImages() {
  document.querySelectorAll("img:not([data-ds])").forEach(img => {
    img.dataset.ds = "img";
    img.dataset.dsSrc    = img.src    || "";
    img.dataset.dsSrcset = img.srcset || "";
    track("image", img.src);
    if (settings.removeBlocked) { img.remove(); return; }
    img.src    = IMG_PH;
    img.srcset = "";
    img.style.cssText += "background:#0d0d1a!important;opacity:0.25!important;min-width:4px!important;min-height:4px!important;";
  });

  // Block CSS background images
  document.querySelectorAll("*:not([data-ds-bg])").forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none" && /url\(/.test(bg)) {
      el.dataset.dsBg = el.style.backgroundImage || "__computed__";
      el.style.backgroundImage = "none";
      const urlMatch = bg.match(/url\(["']?([^"')]+)/);
      track("image", urlMatch ? urlMatch[1] : "");
    }
  });
}

// ── Block Videos ─────────────────────────────────────
const VIDEO_HOSTS = ["youtube.com","youtu.be","vimeo.com","dailymotion.com","twitch.tv","tiktok.com","rumble.com","facebook.com/video"];

function blockVideos() {
  document.querySelectorAll("video:not([data-ds])").forEach(v => {
    v.dataset.ds = "video";
    track("video", v.src || v.currentSrc || "");
    v.pause(); v.src = ""; v.load();
    v.querySelectorAll("source").forEach(s => { s.dataset.dsSrc = s.src; s.src = ""; });
    replaceOrRemove(v, v.offsetWidth || 320, v.offsetHeight || 180, "Video blocked · DataSaver");
  });

  document.querySelectorAll("audio:not([data-ds])").forEach(a => {
    a.dataset.ds = "audio";
    track("audio", a.src || "");
    a.pause(); a.src = ""; a.load();
    if (settings.removeBlocked) a.remove();
  });

  document.querySelectorAll("iframe:not([data-ds])").forEach(fr => {
    const src = fr.src || "";
    if (VIDEO_HOSTS.some(h => src.includes(h))) {
      fr.dataset.ds    = "video-embed";
      fr.dataset.dsSrc = src;
      track("video", src);
      fr.src = "about:blank";
      replaceOrRemove(fr, fr.offsetWidth || 560, fr.offsetHeight || 315, "Embed blocked · DataSaver");
    }
  });
}

// ── Block Heavy ───────────────────────────────────────
function blockHeavy() {
  // Disable font stylesheets — use disabled attr, NOT blanking href (avoids preload warning)
  document.querySelectorAll('link:not([data-ds])').forEach(link => {
    const rel  = link.rel  || "";
    const as_  = link.getAttribute("as") || "";
    const href = link.href || "";
    const isFontSheet = rel === "stylesheet" && /fonts\.(googleapis|gstatic)\.com|typekit|adobe-fonts|font-awesome/.test(href);
    const isFontPreload = rel === "preload" && as_ === "font";
    if (isFontSheet || isFontPreload) {
      link.dataset.ds = "heavy";
      link.dataset.dsHref = href;
      link.disabled = true;          // use .disabled instead of blanking href
      track("heavy", href);
    }
  });

  document.querySelectorAll("video,audio").forEach(el => {
    el.autoplay = false;
    el.preload  = "none";
  });
}

// ── Block Scripts ─────────────────────────────────────
const SCRIPT_RX = [
  /google-analytics\.com/, /googletagmanager\.com/, /hotjar\.com/,
  /doubleclick\.net/, /connect\.facebook\.net/, /fbevents\.js/,
  /mixpanel\.com/, /segment\.com/, /amplitude\.com/, /heap\.io/,
  /pagead\/js/, /adsbygoogle/, /twitter\.com\/widgets/
];

function blockScripts() {
  document.querySelectorAll("script[src]:not([data-ds])").forEach(s => {
    const src = s.src || "";
    const ext = !src.startsWith(location.origin);
    if (ext && SCRIPT_RX.some(rx => rx.test(src))) {
      s.dataset.ds = "script";
      track("script", src);
      // Scripts can't be un-executed; mark and block future ones via observer
      s.type = "javascript/blocked";
    }
  });
}

// ── Block Iframes ─────────────────────────────────────
function blockIframes() {
  document.querySelectorAll("iframe:not([data-ds])").forEach(fr => {
    const src = fr.src || "";
    if (!src || src === "about:blank" || VIDEO_HOSTS.some(h => src.includes(h))) return;
    fr.dataset.ds    = "iframe";
    fr.dataset.dsSrc = src;
    track("iframe", src);
    fr.src = "about:blank";
    replaceOrRemove(fr, fr.offsetWidth || 300, fr.offsetHeight || 150, "Frame blocked · DataSaver");
  });
}

// ── Restore all ───────────────────────────────────────
function restoreAll() {
  document.querySelectorAll("img[data-ds='img']").forEach(img => {
    img.src    = img.dataset.dsSrc    || "";
    img.srcset = img.dataset.dsSrcset || "";
    img.style.background = "";
    img.style.opacity    = "";
    img.style.display    = "";
    delete img.dataset.ds;
  });
  document.querySelectorAll("[data-ds-bg]").forEach(el => {
    if (el.dataset.dsBg !== "__computed__") el.style.backgroundImage = el.dataset.dsBg;
    delete el.dataset.dsBg;
  });
  document.querySelectorAll("[data-ds-ph]").forEach(el => el.remove());
  document.querySelectorAll("[data-ds='video-embed'],[data-ds='video'],[data-ds='audio'],[data-ds='iframe']").forEach(el => {
    el.style.display = "";
    if (el.dataset.dsSrc) el.src = el.dataset.dsSrc;
    delete el.dataset.ds;
  });
  document.querySelectorAll("link[data-ds='heavy']").forEach(link => {
    link.disabled = false;
    delete link.dataset.ds;
  });
}

// ── Apply based on current settings ──────────────────
function applySettings() {
  if (!isActive()) { restoreAll(); return; }
  if (settings.blockImages)  blockImages();
  if (settings.blockVideos)  blockVideos();
  if (settings.blockHeavy)   blockHeavy();
  if (settings.blockScripts) blockScripts();
  if (settings.blockIframes) blockIframes();
}

// ── MutationObserver ──────────────────────────────────
const observer = new MutationObserver(mutations => {
  if (!isActive()) return;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      const tag = node.tagName;
      if (settings.blockImages  && (tag==="IMG"    || node.querySelector?.("img")))              blockImages();
      if (settings.blockVideos  && (tag==="VIDEO"  || tag==="AUDIO" || tag==="IFRAME" || node.querySelector?.("video,audio,iframe"))) blockVideos();
      if (settings.blockHeavy   && (tag==="LINK"   || node.querySelector?.("link")))              blockHeavy();
      if (settings.blockScripts && (tag==="SCRIPT" || node.querySelector?.("script")))            blockScripts();
      if (settings.blockIframes && (tag==="IFRAME" || node.querySelector?.("iframe")))            blockIframes();
    }
  }
});
observer.observe(document.documentElement, { childList:true, subtree:true });

// ── Stats push ────────────────────────────────────────
let lastPushed = { images:0, videos:0, heavy:0, scripts:0, iframes:0 };

function pushStats() {
  const delta = {};
  let has = false;
  for (const k of Object.keys(lastPushed)) {
    const d = (counts[k]||0) - (lastPushed[k]||0);
    if (d > 0) { delta[k] = d; has = true; }
  }
  if (!has) return;
  delta.host = location.hostname;
  Object.assign(lastPushed, counts);
  safeSend({ type:"PUSH_STATS", delta });
}
const _statsInterval = setInterval(pushStats, 5000);
window.addEventListener("beforeunload", pushStats);

// ── Messages ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "UPDATE_SETTINGS") {
    settings = msg.settings;
    applySettings();
    sendResponse({ ok: true });
  }
  if (msg.type === "GET_LOG") {
    sendResponse({ log: [...log], counts: { ...counts } });
  }
  if (msg.type === "CLEAR_LOG") {
    log.length = 0;
    Object.keys(counts).forEach(k => counts[k] = 0);
    safeSend({ type:"UPDATE_BADGE", count: 0 });
    sendResponse({ ok: true });
  }
  return true;
});

// ── Boot ──────────────────────────────────────────────
try {
  chrome.storage.sync.get(
    { enabled:true, blockImages:true, blockVideos:true, blockHeavy:true,
      blockScripts:false, blockIframes:false, removeBlocked:false, disabledSites:[] },
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
