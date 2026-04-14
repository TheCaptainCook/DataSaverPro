// popup.js — DataSaver Pro v18
// All three toggle bugs fixed. No privacy. Clean data-saver only.

// ─── Security: HTML entity escaper to prevent XSS ───
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Security: Trial integrity checksum ───
const TRIAL_SALT = "dsp18-trial-v1";
function trialChecksum(ts) {
  // Simple hash: not cryptographic, but prevents casual tampering
  let h = 0;
  const s = TRIAL_SALT + String(ts);
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return h;
}

class PopupManager {
  constructor() {
    this.tab      = null;
    this.settings = {};
    this.stats    = {};
    this.tabLog   = [];
    this.tabCounts = {};
    this.init();
  }

  async init() {
    try {
      const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
      this.tab = tabs[0];

      this.initTheme();
      this.setupTabs();

      await Promise.all([
        this.loadSettings(),
        this.loadStats(),
        this.loadTabLog()
      ]);

      this.bindEvents();
      this.renderOptions();
      this.renderLog();
      this.renderFooter();
      this.renderTrial();
      this.applyGlobalState();   // reflects master toggle + site toggle in UI
    } catch(err) {
      console.error("[DSP18] init:", err);
    }
  }

  // ─── THEME ──────────────────────────────────────────────────────────────

  initTheme() {
    chrome.storage.sync.get({ theme:"system" }, res => {
      this.applyTheme(res.theme || "system");
      this.setThemeIcon(res.theme || "system");
    });
    document.getElementById("themeToggle").addEventListener("click", () => {
      chrome.storage.sync.get({ theme:"system" }, res => {
        const next = { system:"dark", dark:"light", light:"system" }[res.theme||"system"];
        chrome.storage.sync.set({ theme:next });
        this.applyTheme(next);
        this.setThemeIcon(next);
      });
    });
  }

  applyTheme(t) {
    const h = document.documentElement;
    if      (t==="light")  h.setAttribute("data-theme","light");
    else if (t==="dark")   h.removeAttribute("data-theme");
    else {
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? h.removeAttribute("data-theme")
        : h.setAttribute("data-theme","light");
    }
  }

  setThemeIcon(t) {
    document.getElementById("themeIconMoon").style.display   = t==="dark"   ? "" : "none";
    document.getElementById("themeIconSun").style.display    = t==="light"  ? "" : "none";
    document.getElementById("themeIconSystem").style.display = t==="system" ? "" : "none";
  }

  // ─── LOAD DATA ──────────────────────────────────────────────────────────

  loadSettings() {
    return new Promise(r => {
      try {
        chrome.runtime.sendMessage({ type:"GET_SETTINGS" }, s => {
          this.settings = s || {};
          r();
        });
      } catch(_) { r(); }
    });
  }

  loadStats() {
    return new Promise(r => {
      chrome.storage.local.get({ stats:{ lifetime:{}, today:{}, liveLog:[] } }, res => {
        this.stats = res.stats || {};
        r();
      });
    });
  }

  // Pull live data directly from the active tab's content script
  loadTabLog() {
    return new Promise(r => {
      if (!this.tab?.id) { r(); return; }
      try {
        chrome.tabs.sendMessage(this.tab.id, { type:"GET_LOG" }, res => {
          if (chrome.runtime.lastError || !res) { r(); return; }
          this.tabLog    = res.log    || [];
          this.tabCounts = res.counts || {};
          r();
        });
      } catch(_) { r(); }
    });
  }

  // ─── TAB NAVIGATION ─────────────────────────────────────────────────────

  setupTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const name = tab.dataset.tab;
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.querySelector(`.tab-panel[data-tab="${name}"]`)?.classList.add("active");
        if (name === "log") this.refreshLog();
      });
    });
  }

  // ─── GLOBAL STATE (master toggle + site toggle effects on UI) ────────────

  applyGlobalState() {
    const globalOn = this.settings.enabled !== false;
    const siteOn   = !this.isSiteDisabled();

    // Master pill
    const pill = document.getElementById("masterPill");
    pill.textContent = globalOn ? "ON" : "OFF";
    pill.classList.toggle("off", !globalOn);

    // Global-off banner
    document.getElementById("globalOffBanner").classList.toggle("show", !globalOn);

    // Site toggle checkbox
    document.getElementById("siteEnabled").checked = siteOn;

    // Site row: dim if global is off
    document.getElementById("siteRow").classList.toggle("disabled-state", !globalOn);

    // Options list: dim ALL rows if global is off OR if site is disabled
    const optsList = document.getElementById("optsList");
    const optsDisabled = !globalOn || !siteOn;
    optsList.classList.toggle("opts-disabled", optsDisabled);
  }

  isSiteDisabled() {
    if (!this.tab?.url) return false;
    try {
      const host = new URL(this.tab.url).hostname;
      return (this.settings.disabledSites || []).includes(host);
    } catch(_) { return false; }
  }

  // ─── SETTINGS SAVE HELPERS ──────────────────────────────────────────────

  saveSetting(key, value) {
    this.settings[key] = value;
    chrome.runtime.sendMessage({ type:"UPDATE_SETTINGS", settings:{ [key]:value } });
  }

  // ─── OPTIONS TAB ────────────────────────────────────────────────────────

  renderOptions() {
    const s = this.settings;
    const setChk = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };
    setChk("blockImages",   s.blockImages  !== false);
    setChk("blockVideos",   s.blockVideos  !== false);
    setChk("blockHeavy",    s.blockHeavy   !== false);
    setChk("blockScripts",  s.blockScripts === true);
    setChk("blockIframes",  s.blockIframes === true);
    setChk("removeBlocked", s.removeBlocked === true);

    this.renderCounters();
  }

  renderCounters() {
    const c  = this.tabCounts;
    const td = this.stats.today || {};

    const map = {
      "cnt-images":  c.images  ?? td.images  ?? null,
      "cnt-videos":  c.videos  ?? td.videos  ?? null,
      "cnt-heavy":   c.heavy   ?? td.heavy   ?? null,
      "cnt-scripts": c.scripts ?? td.scripts ?? null,
      "cnt-iframes": c.iframes ?? td.iframes ?? null
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (val === null || val === undefined) {
        el.textContent = "—"; el.classList.remove("lit");
      } else {
        el.textContent = val;
        el.classList.toggle("lit", val > 0);
      }
    }
  }

  // ─── LIVE LOG ────────────────────────────────────────────────────────────

  async refreshLog() {
    const icon = document.getElementById("refreshIcon");
    icon?.classList.add("spinning");
    await this.loadTabLog();
    this.renderLog();
    this.renderCounters();
    setTimeout(() => icon?.classList.remove("spinning"), 500);
  }

  renderLog() {
    const container = document.getElementById("logList");
    if (!container) return;

    const count = this.tabLog?.length || 0;
    const pill  = document.getElementById("logPill");
    if (pill) { pill.textContent = count; pill.classList.toggle("show", count > 0); }

    // Update page counter in footer too
    const pageTotal = Object.values(this.tabCounts).reduce((a,b) => a+b, 0);
    const pageNumEl = document.getElementById("pageNum");
    if (pageNumEl) pageNumEl.textContent = pageTotal || count;

    if (count === 0) {
      container.innerHTML = `
        <div class="log-empty">
          <div class="log-empty-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p>No blocked requests yet</p>
          <small>Browse a page with DataSaver enabled to see blocked items</small>
        </div>`;
      return;
    }

    const clsMap = { image:"lb-image", video:"lb-video", audio:"lb-audio",
                     heavy:"lb-heavy", script:"lb-script", iframe:"lb-iframe" };

    // Show newest first
    const rows = [...this.tabLog].reverse().slice(0, 100);

    container.innerHTML = rows.map(item => {
      const kind  = escapeHtml(item.kind || "other");
      const cls   = clsMap[item.kind] || "lb-script";
      const raw   = escapeHtml(item.url || "");
      const short = escapeHtml((item.url || "").replace(/^https?:\/\//, "").substring(0, 52));
      const ago   = escapeHtml(this.timeAgo(item.ts));
      
      const isAllowed = (this.settings.allowedUrls || []).includes(item.url || "");
      const btn = isAllowed 
        ? `<button class="log-allow" disabled>ALLOWED</button>` 
        : `<button class="log-allow" data-url="${raw}">ALLOW</button>`;
        
      return `
        <div class="log-item">
          <span class="log-badge ${cls}">${kind.toUpperCase()}</span>
          <span class="log-url" title="${raw}">${short || "(no url)"}</span>
          <span class="log-ts">${ago}</span>
          ${(item.url) ? btn : ""}
        </div>`;
    }).join("");
  }

  timeAgo(ts) {
    if (!ts) return "";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5)  return "now";
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    return `${Math.floor(s/3600)}h`;
  }

  // ─── FOOTER ─────────────────────────────────────────────────────────────

  renderFooter() {
    const lt    = this.stats?.lifetime || {};
    const today = this.stats?.today    || {};

    const pageTotal = Object.values(this.tabCounts).reduce((a,b)=>a+b, 0);
    document.getElementById("pageNum").textContent = pageTotal || (today.total || 0);

    const lifeTotal = lt.total || 0;
    const pct = lifeTotal > 0 ? Math.min(Math.round((lifeTotal / (lifeTotal + 50)) * 100), 99) : 0;
    document.getElementById("progressFill").style.width = pct + "%";
    document.getElementById("progressPct").textContent  = pct + "%";
  }

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────

  bindEvents() {

    // ── MASTER TOGGLE (ON / OFF entire extension) ──
    document.getElementById("masterPill").addEventListener("click", () => {
      const wasOn = this.settings.enabled !== false;
      const nowOn = !wasOn;
      this.settings.enabled = nowOn;

      // Save and push full settings so background.js can clear/set all DNR rules
      chrome.runtime.sendMessage({ type:"UPDATE_SETTINGS", settings:{ enabled: nowOn } });

      this.applyGlobalState();
    });

    // ── SITE TOGGLE (disable/enable for this hostname only) ──
    document.getElementById("siteEnabled").addEventListener("change", e => {
      if (!this.tab?.url) return;
      const disabled = !e.target.checked;
      let host;
      try { host = new URL(this.tab.url).hostname; } catch(_) { return; }

      chrome.runtime.sendMessage({ type:"SET_SITE_DISABLED", host, disabled }, () => {
        // Re-load settings so disabledSites is up to date
        this.loadSettings().then(() => this.applyGlobalState());
      });
    });

    // ── OPTIONS TOGGLES ──
    const bind = (id, key) => {
      document.getElementById(id)?.addEventListener("change", e => {
        this.saveSetting(key, e.target.checked);
      });
    };
    bind("blockImages",   "blockImages");
    bind("blockVideos",   "blockVideos");
    bind("blockHeavy",    "blockHeavy");
    bind("blockScripts",  "blockScripts");
    bind("blockIframes",  "blockIframes");
    bind("removeBlocked", "removeBlocked");

    // ── LOG REFRESH ──
    document.getElementById("logRefresh").addEventListener("click", () => this.refreshLog());

    // ── LOG ALLOW ──
    document.getElementById("logList")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("log-allow") && e.target.dataset.url) {
        const urlToAllow = e.target.dataset.url;
        // Security: validate URL format before allowing
        try {
          const parsed = new URL(urlToAllow);
          if (!parsed.protocol.startsWith("http")) return; // only allow http/https
        } catch(_) { return; } // reject malformed URLs
        if (urlToAllow.length > 2048) return; // reject excessively long URLs

        let list = this.settings.allowedUrls || [];
        if (list.length >= 200) { alert("Allowlist full (max 200)."); return; } // cap list size
        if (!list.includes(urlToAllow)) {
          list.push(urlToAllow);
          this.saveSetting("allowedUrls", list);
          e.target.textContent = "ALLOWED";
          e.target.disabled = true;
          chrome.tabs.reload(this.tab.id);
        }
      }
    });

    // ── STATS BUTTON ──
    document.getElementById("statsBtn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type:"OPEN_STATS" });
      window.close();
    });

    // ── PROFILE BUTTON ──
    document.getElementById("profileBtn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type:"OPEN_PROFILE" });
      window.close();
    });
  }

  // ─── TRIAL COUNTDOWN ─────────────────────────────────────────────────────────────

  renderTrial() {
    chrome.storage.sync.get({ trialStartDate: null, trialCheck: null }, (res) => {
      let startDate = res.trialStartDate;
      const storedCheck = res.trialCheck;

      // Security: verify integrity of trial timestamp
      if (!startDate || trialChecksum(startDate) !== storedCheck) {
        // Tampered or first run — reset trial
        startDate = Date.now();
        chrome.storage.sync.set({
          trialStartDate: startDate,
          trialCheck: trialChecksum(startDate)
        });
      }

      const elapsed = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, 30 - elapsed);
      const pct = Math.round((remaining / 30) * 100);

      const daysEl = document.getElementById("trialDaysPopup");
      const fillEl = document.getElementById("trialFillPopup");
      if (!daysEl || !fillEl) return;

      daysEl.textContent = remaining;
      fillEl.style.width = pct + "%";

      if (remaining <= 0) {
        daysEl.className = "trial-bar-days expired";
        daysEl.parentElement.innerHTML = `<span class="trial-bar-days expired">${remaining}</span> days — trial expired`;
      } else if (remaining <= 7) {
        daysEl.className = "trial-bar-days warning";
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { window.pm = new PopupManager(); });
} else {
  window.pm = new PopupManager();
}
