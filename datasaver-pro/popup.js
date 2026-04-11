// popup.js - Enhanced with licensing and live log features

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.currentSettings = null;
    this.currentStats = null;
    this.currentLicense = null;
    this.liveLog = [];
    this.init();
  }

  async init() {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];

    // Load all data
    await Promise.all([
      this.loadSettings(),
      this.loadStats(),
      this.loadLicense(),
      this.updateLicenseBanner()
    ]);

    // Setup event listeners
    this.setupEventListeners();

    // Update UI
    this.updateUI();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ════════════════════════════════════════════════════════════════════════════

  loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
        this.currentSettings = settings;
        resolve();
      });
    });
  }

  loadStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_STATS" }, (stats) => {
        this.currentStats = stats || {};
        this.liveLog = stats.liveLog || [];
        resolve();
      });
    });
  }

  loadLicense() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_LICENSE" }, (license) => {
        this.currentLicense = license;
        resolve();
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LICENSE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async updateLicenseBanner() {
    try {
      const banner = document.getElementById("licenseBanner");
      
      // NULL SAFETY CHECK
      if (!this.currentLicense) {
        console.warn("License is null, using defaults");
        return;
      }

      if (this.currentLicense.status === "expired") {
        banner.classList.add("show");
        banner.innerHTML =
          "⚠️ Trial expired! <a href='https://dodo.pe/datasaverpro' target='_blank' style='color:#f7b900;'>Get license</a>";
        return;
      }

      if (this.currentLicense.status === "trial") {
        const daysLeft = await new Promise((r) => {
          chrome.runtime.sendMessage({ type: "GET_TRIAL_DAYS" }, (res) => {
            r(res.daysLeft || 0);
          });
        });

        if (daysLeft <= 5 && daysLeft > 0) {
          banner.classList.add("show");
          banner.innerHTML = `⏱️ ${daysLeft} days left in trial. <a href='https://dodo.pe/datasaverpro' target='_blank' style='color:#f7b900;'>Upgrade now</a>`;
        }
      }
    } catch (error) {
      console.error("Error updating license banner:", error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UI UPDATE
  // ════════════════════════════════════════════════════════════════════════════

  updateUI() {
    this.updateHeader();
    this.updateSiteBar();
    this.updateCounts();
    this.updateFooter();
    this.updateLiveLog();
  }

  updateHeader() {
    const masterToggle = document.getElementById("masterToggle");
    const statusPill = document.getElementById("statusPill");

    masterToggle.checked = this.currentSettings.enabled;
    statusPill.textContent = this.currentSettings.enabled ? "ON" : "OFF";
    statusPill.classList.toggle("on", this.currentSettings.enabled);
    statusPill.classList.toggle("off", !this.currentSettings.enabled);

    document.body.classList.toggle("off", !this.currentSettings.enabled);
  }

  updateSiteBar() {
    const host = this.currentTab?.url ? new URL(this.currentTab.url).hostname : "—";
    document.getElementById("siteHost").textContent = host;

    chrome.runtime.sendMessage({ type: "GET_SITE_DISABLED", host }, (res) => {
      const siteToggle = document.getElementById("siteToggle");
      const siteStatus = document.getElementById("siteStatus");

      siteToggle.checked = !res.disabled;
      siteStatus.textContent = res.disabled ? "Disabled on this site" : "Active on this site";
    });
  }

  updateCounts() {
    const counts = {
      images: this.currentStats.today?.images || 0,
      videos: this.currentStats.today?.videos || 0,
      heavy: this.currentStats.today?.heavy || 0,
      scripts: this.currentStats.today?.scripts || 0,
      iframes: this.currentStats.today?.iframes || 0
    };

    Object.entries(counts).forEach(([key, count]) => {
      const elem = document.getElementById(`cnt-${key}`);
      if (elem) {
        elem.textContent = count > 0 ? String(count) : "—";
        elem.classList.toggle("live", count > 0);
        elem.classList.toggle("zero", count === 0);
      }
    });
  }

  updateFooter() {
    const total = this.currentStats.today?.total || 0;
    const percentage = Math.min(95, Math.round((total / (total + 10)) * 100));

    document.getElementById("totalNum").textContent = total;
    document.getElementById("savPct").textContent = percentage + "%";
    document.getElementById("barFill").style.width = percentage + "%";
  }

  updateLiveLog() {
    const logList = document.getElementById("logList");
    const logEmpty = document.getElementById("logEmpty");
    const logTotal = document.getElementById("logTotal");

    const blockedItems = this.liveLog.filter((item) => item.blocked);

    logTotal.textContent = blockedItems.length;

    if (blockedItems.length === 0) {
      logList.innerHTML = logEmpty.outerHTML;
      return;
    }

    logList.innerHTML = blockedItems
      .slice(0, 15)
      .map(
        (item) => `
      <div class="litem" data-item-id="${item.id}">
        <div class="ldot ${item.type}"></div>
        <div class="ltype">${item.type.substring(0, 4)}</div>
        <div class="lurl" title="${item.url}">${this.truncateUrl(item.url)}</div>
        <div class="lactions">
          <button class="unbtn" data-unblock="${item.id}" title="Unblock this">✓</button>
        </div>
      </div>
    `
      )
      .join("");

    // Add unblock listeners
    logList.querySelectorAll(".unbtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.unblock;
        this.unblockItem(itemId);
      });
    });
  }

  truncateUrl(url) {
    try {
      const u = new URL(url);
      const path = u.pathname.length > 20 ? u.pathname.substring(0, 20) + "..." : u.pathname;
      return u.hostname + path;
    } catch {
      return url.substring(0, 40);
    }
  }

  unblockItem(itemId) {
    chrome.runtime.sendMessage(
      { type: "UNBLOCK_LOG_ITEM", itemId },
      () => {
        // Update local log
        const item = this.liveLog.find((i) => i.id === itemId);
        if (item) {
          item.blocked = false;
          this.updateLiveLog();
        }
      }
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════════════════════════════════════════

  setupEventListeners() {
    // Master toggle
    document.getElementById("masterToggle").addEventListener("change", (e) => {
      this.currentSettings.enabled = e.target.checked;
      this.saveSettings();
    });

    // Site toggle
    document.getElementById("siteToggle").addEventListener("change", (e) => {
      const host = this.currentTab?.url ? new URL(this.currentTab.url).hostname : null;
      if (!host) return;

      chrome.runtime.sendMessage(
        { type: "SET_SITE_DISABLED", host, disabled: !e.target.checked },
        () => {
          this.updateSiteBar();
        }
      );
    });

    // Block toggles
    ["blockImages", "blockVideos", "blockHeavy", "blockScripts", "blockIframes", "removeBlocked"].forEach((id) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.checked = this.currentSettings[id];
        elem.addEventListener("change", (e) => {
          this.currentSettings[id] = e.target.checked;
          this.saveSettings();
        });
      }
    });

    // Tabs
    document.querySelectorAll(".tbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Clear log
    document.getElementById("clearLog").addEventListener("click", () => {
      this.liveLog = [];
      this.updateLiveLog();
    });

    // Open profile
    document.getElementById("openProfile").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_PROFILE" });
    });

    // Open stats
    document.getElementById("openStats").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_STATS" });
    });
  }

  saveSettings() {
    chrome.runtime.sendMessage(
      { type: "UPDATE_SETTINGS", settings: this.currentSettings },
      () => {
        this.updateHeader();
      }
    );
  }

  switchTab(tabName) {
    document.querySelectorAll(".tbtn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    document.querySelectorAll(".tpanel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });

    if (tabName === "log") {
      this.updateLiveLog();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "UPDATE_SETTINGS" || msg.type === "TRIAL_EXPIRED") {
      location.reload();
    }
  });
});
