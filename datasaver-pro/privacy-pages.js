// privacy-pages.js - Two-page privacy settings system with toggle labels and disabled overlays

class PrivacySettingsManager {
  constructor() {
    this.currentPage = 1; // 1 or 2
    this.privacySettings = {};
    this.isExtensionEnabled = true;
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.checkExtensionEnabled();
    this.renderPage(1);
    this.setupEventListeners();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
        this.privacySettings = settings.privacySettings || {};
        resolve();
      });
    });
  }

  async checkExtensionEnabled() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "CHECK_PLUGIN_ENABLED" }, (res) => {
        this.isExtensionEnabled = res.enabled || false;
        resolve();
      });
    });
  }

  setupEventListeners() {
    document.getElementById("nextPageBtn")?.addEventListener("click", () => {
      this.currentPage = 2;
      this.renderPage(2);
    });

    document.getElementById("prevPageBtn")?.addEventListener("click", () => {
      this.currentPage = 1;
      this.renderPage(1);
    });

    document.getElementById("pageIndicator")?.addEventListener("click", (e) => {
      const page = parseInt(e.target.getAttribute("data-page"));
      if (page) {
        this.currentPage = page;
        this.renderPage(page);
      }
    });
  }

  renderPage(page) {
    const container = document.getElementById("privacySettings");
    container.innerHTML = "";

    if (page === 1) {
      this.renderPage1(container);
    } else {
      this.renderPage2(container);
    }

    this.updatePageIndicator();
  }

  renderPage1(container) {
    const html = `
      <div class="privacy-page">
        <h2>🔒 Privacy Protection - Page 1</h2>
        <p class="page-subtitle">Control what data websites can access</p>

        <div class="privacy-settings-list">
          ${this.createPrivacySetting(
            "blockTracking",
            "📊 Block Tracking",
            "Prevent websites from tracking your browsing activity. Blocks Google Analytics, Facebook Pixel, Mixpanel, and other trackers.",
            "Disabled: Websites can track you"
          )}

          ${this.createPrivacySetting(
            "blockLocation",
            "📍 Block Location Access",
            "Prevent websites from accessing your location. Blocks geolocation, GPS, and WiFi-based location detection.",
            "Disabled: Websites can see your location"
          )}

          ${this.createPrivacySetting(
            "blockCamera",
            "📷 Block Camera Access",
            "Prevent unauthorized access to your webcam. Websites cannot use your camera without your knowledge.",
            "Disabled: Websites can access your camera"
          )}

          ${this.createPrivacySetting(
            "blockMicrophone",
            "🎤 Block Microphone",
            "Prevent websites from recording your audio. Blocks all microphone access requests.",
            "Disabled: Websites can record audio"
          )}

          ${this.createPrivacySetting(
            "blockCookies",
            "🍪 Block Third-Party Cookies",
            "Prevent third-party cookies used for tracking. First-party cookies may still be used for functionality.",
            "Disabled: Third-party cookies allowed"
          )}

          ${this.createPrivacySetting(
            "blockFingerprinting",
            "👁️ Block Fingerprinting",
            "Prevent device fingerprinting techniques. Blocks canvas fingerprinting, WebGL, and hardware detection.",
            "Disabled: Device can be fingerprinted"
          )}
        </div>

        <div class="page-nav">
          <button id="nextPageBtn" class="btn-next">Next Page → Page 2</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.attachToggleListeners("page1");
  }

  renderPage2(container) {
    const html = `
      <div class="privacy-page">
        <h2>🛡️ Advanced Privacy - Page 2</h2>
        <p class="page-subtitle">Additional security and privacy protections</p>

        <div class="privacy-settings-list">
          ${this.createPrivacySetting(
            "blockWebRTC",
            "🌐 Block WebRTC Leaks",
            "Prevent your real IP address from leaking via WebRTC. Protects against IP leak attacks.",
            "Disabled: Real IP may be exposed"
          )}

          ${this.createPrivacySetting(
            "blockBattery",
            "🔋 Block Battery Status",
            "Prevent websites from accessing battery status. Stops device identification via battery state.",
            "Disabled: Battery status visible"
          )}

          ${this.createPrivacySetting(
            "blockDeviceMemory",
            "💾 Block Device Memory Info",
            "Hide your device's RAM amount. Prevents fingerprinting based on memory.",
            "Disabled: RAM info visible"
          )}

          ${this.createPrivacySetting(
            "blockHardwareConcurrency",
            "⚙️ Block CPU Core Count",
            "Hide the number of CPU cores. Prevents hardware fingerprinting.",
            "Disabled: CPU cores visible"
          )}

          <div class="privacy-info-box">
            <div class="info-icon">ℹ️</div>
            <div class="info-content">
              <h4>What's Advanced Privacy?</h4>
              <p>Page 2 settings protect against sophisticated fingerprinting and tracking techniques used by websites to identify you across the internet.</p>
              <ul>
                <li><strong>WebRTC:</strong> Prevents IP address leaks in VPN connections</li>
                <li><strong>Battery Status:</strong> Stops device profiling</li>
                <li><strong>Device Memory:</strong> Blocks hardware-based fingerprinting</li>
                <li><strong>CPU Cores:</strong> Prevents performance-based identification</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="page-nav">
          <button id="prevPageBtn" class="btn-prev">← Page 1 Previous</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.attachToggleListeners("page2");
  }

  createPrivacySetting(key, label, description, disabledNote) {
    const isEnabled = this.privacySettings[key] !== false;
    const extensionDisabled = !this.isExtensionEnabled;

    const disabledClass = extensionDisabled ? "disabled" : "";
    const checkedAttr = isEnabled ? "checked" : "";

    return `
      <div class="privacy-setting-item ${disabledClass}">
        ${extensionDisabled ? '<div class="disabled-overlay"><span>⚠️ Extension Disabled</span></div>' : ""}
        
        <div class="setting-header">
          <label class="privacy-toggle">
            <input 
              type="checkbox" 
              class="privacy-checkbox" 
              data-key="${key}" 
              ${checkedAttr}
              ${extensionDisabled ? "disabled" : ""}
            />
            <span class="toggle-slider"></span>
          </label>
          <div class="setting-label">
            <div class="label-title">${label}</div>
            <div class="label-toggle-status">
              <span class="status-badge ${isEnabled ? "enabled" : "disabled"}">
                ${isEnabled ? "✓ ENABLED" : "✗ DISABLED"}
              </span>
            </div>
          </div>
        </div>

        <div class="setting-description">
          <p>${description}</p>
          ${!isEnabled ? `<p class="disabled-note">⚠️ ${disabledNote}</p>` : ""}
        </div>
      </div>
    `;
  }

  attachToggleListeners(page) {
    const checkboxes = document.querySelectorAll(".privacy-checkbox");

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        const key = e.target.getAttribute("data-key");
        const value = e.target.checked;

        // Update UI immediately
        this.privacySettings[key] = value;
        this.updateToggleUI(key, value);

        // Send to background
        await this.saveSettings();
      });
    });
  }

  updateToggleUI(key, value) {
    const settingItem = document.querySelector(`[data-key="${key}"]`).closest(".privacy-setting-item");
    const statusBadge = settingItem.querySelector(".status-badge");
    const disabledNote = settingItem.querySelector(".disabled-note");

    if (value) {
      statusBadge.textContent = "✓ ENABLED";
      statusBadge.classList.remove("disabled");
      statusBadge.classList.add("enabled");
      if (disabledNote) disabledNote.remove();
    } else {
      statusBadge.textContent = "✗ DISABLED";
      statusBadge.classList.remove("enabled");
      statusBadge.classList.add("disabled");
    }
  }

  async saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "UPDATE_SETTINGS",
          settings: { privacySettings: this.privacySettings }
        },
        () => resolve()
      );
    });
  }

  updatePageIndicator() {
    const indicator = document.getElementById("pageIndicator");
    if (indicator) {
      indicator.innerHTML = `
        <span class="page-dot ${this.currentPage === 1 ? "active" : ""}" data-page="1">1</span>
        <span class="page-dot ${this.currentPage === 2 ? "active" : ""}" data-page="2">2</span>
      `;

      indicator.querySelectorAll(".page-dot").forEach((dot) => {
        dot.addEventListener("click", (e) => {
          const page = parseInt(e.target.getAttribute("data-page"));
          this.currentPage = page;
          this.renderPage(page);
        });
      });
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.privacyManager = new PrivacySettingsManager();
  });
} else {
  window.privacyManager = new PrivacySettingsManager();
}
