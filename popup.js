// popup.js — DataSaver Pro v18
// License-gated with Gumroad integration. Rate-limited activation.

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

class PopupManager {
  constructor() {
    this.tab      = null;
    this.settings = {};
    this.stats    = {};
    this.tabLog   = [];
    this.tabCounts = {};
    this.licenseState = null;
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
        this.loadTabLog(),
        this.loadLicenseState()
      ]);

      this.bindEvents();
      this.renderOptions();
      this.renderLog();
      this.renderFooter();
      this.renderLicense();
      this.applyGlobalState();
      this.checkForUpdate();
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

  loadLicenseState() {
    return new Promise(r => {
      try {
        chrome.runtime.sendMessage({ type:"GET_LICENSE_STATE" }, state => {
          this.licenseState = state || { state: "expired", daysLeft: 0, licensed: false };
          r();
        });
      } catch(_) {
        this.licenseState = { state: "expired", daysLeft: 0, licensed: false };
        r();
      }
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
    // Debounced reload — decoupled from sendMessage callback so it fires
    // even if the MV3 service worker sleeps before the callback runs
    this._scheduleReload();
  }

  _scheduleReload() {
    if (this._reloadTimer) clearTimeout(this._reloadTimer);
    this._reloadTimer = setTimeout(() => {
      this.reloadActiveTab();
      this._reloadTimer = null;
    }, 350);
  }

  reloadActiveTab() {
    if (this.tab?.id) {
      chrome.tabs.reload(this.tab.id).catch(() => {});
    }
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

  // ─── LICENSE RENDERING ──────────────────────────────────────────────────

  renderLicense() {
    const info = this.licenseState;
    if (!info) return;

    const bar = document.getElementById("licenseBar");
    const textEl = document.getElementById("licenseBarText");
    const daysEl = document.getElementById("licenseDays");
    const fillEl = document.getElementById("licenseFill");
    const rightEl = document.getElementById("licenseBarRight");
    const overlay = document.getElementById("expiredOverlay");

    // Remove all state classes
    bar.classList.remove("trial", "active", "expired");

    if (info.state === "active") {
      // ── Licensed ──
      bar.classList.add("active");
      textEl.innerHTML = `<span style="color:var(--green);font-weight:800;">✓ Licensed</span>`;
      rightEl.innerHTML = `<span class="license-bar-badge licensed">ACTIVE</span>`;
      overlay.classList.remove("show");

    } else if (info.state === "trial") {
      // ── Trial ──
      bar.classList.add("trial");
      const days = info.daysLeft || 0;
      const pct = Math.round((days / 30) * 100);
      const cls = days <= 7 ? "warning" : "";
      textEl.innerHTML = `Free Trial: <span class="license-bar-days ${cls}" id="licenseDays">${days}</span> days left`;
      rightEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="license-bar-track"><div class="license-bar-fill" style="width:${pct}%"></div></div>
          <button class="license-activate-link" id="trialActivateLink">Activate</button>
        </div>`;
      overlay.classList.remove("show");

      // Bind the inline activate link
      document.getElementById("trialActivateLink")?.addEventListener("click", () => {
        this.showLicenseModal();
      });

    } else {
      // ── Expired ──
      bar.classList.add("expired");
      textEl.innerHTML = `<span class="license-bar-days expired">⚠ License Expired</span>`;
      rightEl.innerHTML = `<span class="license-bar-badge expired-badge">EXPIRED</span>`;

      // Show non-blocking expired notice strip (does NOT cover tab content)
      overlay.classList.add("show");

      // Bar click still opens modal for convenience
      bar.style.cursor = "pointer";
      bar.onclick = () => this.showLicenseModal();
    }
  }

  // ─── LICENSE MODAL ──────────────────────────────────────────────────────

  showLicenseModal() {
    const modal = document.getElementById("licenseModal");
    modal.classList.add("show");
    document.getElementById("lmKeyInput").value = "";
    document.getElementById("lmMsg").className = "lm-msg";
    document.getElementById("lmMsg").textContent = "";
    document.getElementById("lmActivateBtn").disabled = false;
    
    // Check rate limit
    this.updateRateLimitDisplay();
  }

  hideLicenseModal() {
    document.getElementById("licenseModal").classList.remove("show");
  }

  updateRateLimitDisplay() {
    chrome.runtime.sendMessage({ type: "GET_RATE_LIMIT" }, rl => {
      const el = document.getElementById("lmRateLimit");
      const btn = document.getElementById("lmActivateBtn");
      if (!rl || rl.allowed) {
        el.classList.remove("show");
        btn.disabled = false;
        return;
      }
      const mins = Math.floor(rl.waitSeconds / 60);
      const secs = rl.waitSeconds % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      el.textContent = `⏳ Rate limited — wait ${timeStr} before next attempt`;
      el.classList.add("show");
      btn.disabled = true;

      // Auto-refresh countdown
      setTimeout(() => this.updateRateLimitDisplay(), 1000);
    });
  }

  async activateLicenseKey() {
    const btn = document.getElementById("lmActivateBtn");
    const msgEl = document.getElementById("lmMsg");
    const input = document.getElementById("lmKeyInput");
    const key = input.value.trim();

    if (!key) {
      msgEl.className = "lm-msg error";
      msgEl.textContent = "Please enter a license key.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "VERIFYING...";
    msgEl.className = "lm-msg";
    msgEl.textContent = "";

    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "ACTIVATE_LICENSE", key }, res => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        });
      });

      if (result.success) {
        msgEl.className = "lm-msg success";
        msgEl.textContent = "✓ License activated successfully!";
        btn.textContent = "ACTIVATED ✓";

        // Refresh license state and UI
        setTimeout(async () => {
          await this.loadLicenseState();
          this.renderLicense();
          this.hideLicenseModal();
        }, 1500);

      } else {
        msgEl.className = "lm-msg error";
        msgEl.textContent = result.error || "Activation failed.";
        btn.textContent = "ACTIVATE";
        btn.disabled = false;

        // If rate limited, show the cooldown
        if (result.rateLimited) {
          this.updateRateLimitDisplay();
        }
      }
    } catch(e) {
      msgEl.className = "lm-msg error";
      msgEl.textContent = "Connection error. Please try again.";
      btn.textContent = "ACTIVATE";
      btn.disabled = false;
    }
  }

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────

  bindEvents() {

    // ── MASTER TOGGLE (ON / OFF entire extension) ──
    document.getElementById("masterPill").addEventListener("click", () => {
      const wasOn = this.settings.enabled !== false;
      const nowOn = !wasOn;
      this.settings.enabled = nowOn;

      chrome.runtime.sendMessage({ type:"UPDATE_SETTINGS", settings:{ enabled: nowOn } }, () => {
        this.reloadActiveTab();
      });

      this.applyGlobalState();
    });

    // ── SITE TOGGLE (disable/enable for this hostname only) ──
    document.getElementById("siteEnabled").addEventListener("change", e => {
      if (!this.tab?.url) return;
      const disabled = !e.target.checked;
      let host;
      try { host = new URL(this.tab.url).hostname; } catch(_) { return; }

      chrome.runtime.sendMessage({ type:"SET_SITE_DISABLED", host, disabled }, () => {
        this.loadSettings().then(() => {
          this.applyGlobalState();
          this.reloadActiveTab();
        });
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

    // ── LICENSE MODAL ──
    document.getElementById("lmClose").addEventListener("click", () => this.hideLicenseModal());
    document.getElementById("lmActivateBtn").addEventListener("click", () => this.activateLicenseKey());
    document.getElementById("lmKeyInput").addEventListener("keydown", e => {
      if (e.key === "Enter") this.activateLicenseKey();
    });

    // Set purchase URL on buy link
    const purchaseUrl = this.licenseState?.purchaseUrl || "https://nullbytestudio.gumroad.com/l/DataSaverPro";
    document.getElementById("lmBuyLink").href = purchaseUrl;

    // ── EXPIRED OVERLAY BUTTONS ──
    document.getElementById("expActivateBtn")?.addEventListener("click", () => {
      this.showLicenseModal();
    });
    document.getElementById("expBuyBtn")?.addEventListener("click", () => {
      window.open(purchaseUrl, "_blank");
    });

    // ── UPDATE BANNER ──
    document.getElementById("updateDismiss")?.addEventListener("click", () => {
      document.getElementById("updateBanner").classList.remove("show");
      chrome.runtime.sendMessage({ type: "DISMISS_UPDATE" });
    });
    document.getElementById("updateBtn")?.addEventListener("click", () => {
      const url = document.getElementById("updateBtn").dataset.url;
      if (url) window.open(url, "_blank");
      else window.open("https://github.com/TheCaptainCook/DataSaverPro/releases", "_blank");
    });
  }

  // ─── UPDATE BANNER ────────────────────────────────────────────────────────────────────

  checkForUpdate() {
    // FORCE_UPDATE_CHECK does a live fetch from GitHub then returns the result,
    // so the banner appears immediately if a new version is available.
    chrome.runtime.sendMessage({ type: "FORCE_UPDATE_CHECK" }, update => {
      if (chrome.runtime.lastError || !update) return;
      const banner = document.getElementById("updateBanner");
      const textEl = document.getElementById("updateText");
      const verEl  = document.getElementById("updateVer");
      const btn    = document.getElementById("updateBtn");

      textEl.textContent = update.message || "New version available!";
      verEl.textContent  = "v" + update.version;
      if (update.url) btn.dataset.url = update.url;
      banner.classList.add("show");
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { window.pm = new PopupManager(); });
} else {
  window.pm = new PopupManager();
}
