// Profile.js - Profile & Licensing Management

class ProfileManager {
  constructor() {
    this.currentLicense = null;
    this.currentSettings = null;
    this.init();
  }

  async init() {
    this.loadTheme();
    await this.loadLicenseStatus();
    await this.loadSettings();
    this.setupEventListeners();
    this.checkFirstInstall();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // THEME MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  loadTheme() {
    chrome.storage.sync.get({ theme: "system" }, (data) => {
      const theme = data.theme;
      this.applyTheme(theme);
      this.updateThemeToggle(theme);
    });
  }

  applyTheme(theme) {
    const body = document.body;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    body.classList.remove("light", "dark");

    if (theme === "system") {
      body.classList.add(prefersDark ? "dark" : "light");
    } else {
      body.classList.add(theme);
    }

    // Update CSS variables
    const themeValue = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    localStorage.setItem("currentTheme", themeValue);
  }

  updateThemeToggle(theme) {
    const themeToggle = document.getElementById("themeToggle");
    const icon = theme === "light" ? "☀️" : "🌙";
    const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";
    themeToggle.textContent = `${icon} ${label}`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LICENSE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async loadLicenseStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_LICENSE" }, async (license) => {
        this.currentLicense = license;

        // Get trial days
        const trialDays = await new Promise((r) => {
          chrome.runtime.sendMessage({ type: "GET_TRIAL_DAYS" }, (res) => {
            r(res.daysLeft);
          });
        });

        this.updateStatusCard(license, trialDays);
        this.updateUserInfo(license);
        resolve();
      });
    });
  }

  updateStatusCard(license, daysLeft) {
    const statusCard = document.getElementById("statusCard");
    const statusBadge = document.getElementById("statusBadge");
    const statusText = document.getElementById("statusText");
    const statusDot = statusBadge.querySelector(".status-dot");
    const trialInfo = document.getElementById("trialInfo");

    statusBadge.classList.remove("trial", "expired");
    statusBadge.classList.add(license.status);

    if (license.status === "active") {
      statusText.textContent = "License Active";
      statusDot.style.background = "#22d98a";
      trialInfo.innerHTML = `
        <div class="info-card">
          <div class="info-label">Plan</div>
          <div class="info-value">${license.plan.toUpperCase()}</div>
        </div>
      `;
    } else if (license.status === "trial") {
      statusText.textContent = "Trial Active";
      statusDot.style.background = "#f7b900";
      const percentage = ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100;
      trialInfo.innerHTML = `
        <div class="trial-progress">
          <div class="trial-bar">
            <div class="trial-fill" style="width: ${percentage}%;"></div>
          </div>
          <div class="trial-text">${daysLeft} days left in your trial</div>
        </div>
      `;
    } else {
      statusText.textContent = "Trial Expired";
      statusDot.style.background = "#f74f6e";
      trialInfo.innerHTML = `
        <div class="alert alert-warning">
          Your trial has expired. Please activate a license to continue using DataSaver Pro.
        </div>
      `;
    }
  }

  updateUserInfo(license) {
    const userInfo = document.getElementById("userInfo");
    const profileForm = document.getElementById("profileForm");

    if (license.verified && license.licenseKey) {
      // Show user info
      userInfo.style.display = "grid";
      profileForm.style.display = "none";
      document.getElementById("editProfileBtn").style.display = "inline-flex";
      document.getElementById("logoutBtn").style.display = "inline-flex";

      document.getElementById("infoUsername").textContent = license.username || "—";
      document.getElementById("infoEmail").textContent = license.email || "—";
      document.getElementById("infoPlan").textContent = (license.plan || "pro").toUpperCase();

      const expiresAt = new Date(license.expiresAt).toLocaleDateString();
      document.getElementById("infoExpires").textContent = expiresAt;
    } else {
      // Show form
      userInfo.style.display = "none";
      profileForm.style.display = "block";
      document.getElementById("editProfileBtn").style.display = "none";
      document.getElementById("logoutBtn").style.display = "none";
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FORM HANDLING
  // ════════════════════════════════════════════════════════════════════════════

  async handleProfileSubmit(e) {
    e.preventDefault();

    const licenseKey = document.getElementById("licenseInput").value.trim();
    const name = document.getElementById("nameInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();

    if (!licenseKey) {
      this.showAlert("Please enter a license key", "error");
      return;
    }

    this.showAlert("Verifying license...", "warning");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    chrome.runtime.sendMessage(
      { type: "ACTIVATE_LICENSE", licenseKey },
      (result) => {
        submitBtn.disabled = false;

        if (result.success) {
          this.showAlert("License activated successfully!", "success");
          setTimeout(() => {
            location.reload();
          }, 1500);
        } else {
          this.showAlert(result.error || "Failed to activate license", "error");
        }
      }
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
        this.currentSettings = settings;
        this.renderPrivacySettings(settings.privacySettings || {});
        resolve();
      });
    });
  }

  renderPrivacySettings(privacySettings) {
    const container = document.getElementById("privacySettings");

    const settings = [
      {
        key: "blockTracking",
        name: "Block Tracking",
        desc: "Prevent trackers"
      },
      {
        key: "blockLocation",
        name: "Block Location",
        desc: "Disable geolocation"
      },
      {
        key: "blockCamera",
        name: "Block Camera",
        desc: "Prevent camera access"
      },
      {
        key: "blockMicrophone",
        name: "Block Microphone",
        desc: "Prevent microphone access"
      },
      {
        key: "blockCookies",
        name: "Block Cookies",
        desc: "Prevent cookie storage"
      },
      {
        key: "blockFingerprinting",
        name: "Block Fingerprinting",
        desc: "Prevent device fingerprinting"
      }
    ];

    container.innerHTML = settings
      .map(
        (setting) => `
      <label class="setting-toggle">
        <input type="checkbox" data-setting="${setting.key}" ${
          privacySettings[setting.key] ? "checked" : ""
        }/>
        <div class="setting-info">
          <div class="setting-name">${setting.name}</div>
          <div class="setting-desc">${setting.desc}</div>
        </div>
      </label>
    `
      )
      .join("");
  }

  async savePrivacySettings() {
    const checkboxes = document.querySelectorAll(
      "#privacySettings input[type='checkbox']"
    );
    const privacySettings = {};

    checkboxes.forEach((checkbox) => {
      privacySettings[checkbox.dataset.setting] = checkbox.checked;
    });

    const settings = { ...this.currentSettings, privacySettings };

    chrome.runtime.sendMessage(
      { type: "UPDATE_SETTINGS", settings },
      (response) => {
        if (response.ok) {
          this.showAlert("Privacy settings saved!", "success");
        }
      }
    );
  }

  async saveTheme() {
    const selectedTheme = document.querySelector(
      'input[name="theme"]:checked'
    )?.value;

    if (!selectedTheme) return;

    chrome.storage.sync.set({ theme: selectedTheme }, () => {
      this.applyTheme(selectedTheme);
      this.updateThemeToggle(selectedTheme);
      this.showAlert("Theme saved!", "success");
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════════════════════════════════════

  showAlert(message, type = "info") {
    const container = document.getElementById("alertContainer");
    const alertId = Math.random().toString(36);

    const alertHTML = `
      <div class="alert alert-${type}" id="alert-${alertId}">
        <span>${message}</span>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", alertHTML);

    setTimeout(() => {
      const alert = document.getElementById(`alert-${alertId}`);
      if (alert) alert.remove();
    }, 4000);
  }

  checkFirstInstall() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("firstInstall")) {
      this.showAlert("Welcome to DataSaver Pro! Please set up your account.", "warning");
      // Focus on license input
      setTimeout(() => {
        document.getElementById("licenseInput")?.focus();
      }, 500);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT SETUP
  // ════════════════════════════════════════════════════════════════════════════

  setupEventListeners() {
    // Theme
    document.getElementById("themeToggle").addEventListener("click", () => {
      const current = document.body.classList.contains("dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      chrome.storage.sync.set({ theme: next }, () => {
        this.applyTheme(next);
        this.updateThemeToggle(next);
      });
    });

    // Theme selector
    document.querySelectorAll('input[name="theme"]').forEach((radio) => {
      radio.addEventListener("change", () => this.saveTheme());
    });

    // Profile form
    document.getElementById("profileForm").addEventListener("submit", (e) =>
      this.handleProfileSubmit(e)
    );

    // Edit profile
    document.getElementById("editProfileBtn").addEventListener("click", () => {
      document.getElementById("userInfo").style.display = "none";
      document.getElementById("profileForm").style.display = "block";
      document.getElementById("licenseInput").focus();
    });

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
      if (confirm("Are you sure you want to logout?")) {
        chrome.storage.local.set(
          {
            license: {
              licenseKey: null,
              verified: false,
              status: "trial",
              trialStartedAt: Date.now(),
              trialDaysLeft: 30
            }
          },
          () => {
            location.reload();
          }
        );
      }
    });

    // Save privacy
    document.getElementById("savePrivacyBtn").addEventListener("click", () =>
      this.savePrivacySettings()
    );

    // Actions
    document.querySelectorAll(".btn").forEach((btn) => {
      if (btn.textContent.includes("Stats")) {
        btn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "OPEN_STATS" });
        });
      }
    });

    document.getElementById("openDocsBtn").addEventListener("click", () => {
      window.open("https://dodo.pe/datasaverpro/docs", "_blank");
    });

    document.getElementById("resetExtBtn").addEventListener("click", () => {
      if (
        confirm(
          "This will reset all data and settings. Are you sure?"
        )
      ) {
        chrome.runtime.sendMessage({ type: "RESET_STATS" }, () => {
          chrome.storage.sync.clear(() => {
            chrome.storage.local.clear(() => {
              this.showAlert("Extension reset!", "success");
              setTimeout(() => {
                location.reload();
              }, 1000);
            });
          });
        });
      }
    });
  }
}

const TRIAL_DAYS = 30;

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  new ProfileManager();
});
