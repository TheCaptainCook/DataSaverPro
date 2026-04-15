// profile.js — DataSaver Pro Profile & License Management

// ── Theme ─────────────────────────────────────────────────────
function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) return;

  chrome.storage.sync.get({ theme: "system" }, (result) => {
    const theme = result.theme || "system";
    applyTheme(theme);
    updateThemeIcon(theme);
  });

  themeToggle.addEventListener("click", () => {
    chrome.storage.sync.get({ theme: "system" }, (result) => {
      const cur = result.theme || "system";
      const next = { system: "dark", dark: "light", light: "system" }[cur];
      chrome.storage.sync.set({ theme: next });
      applyTheme(next);
      updateThemeIcon(next);
    });
  });
}

function applyTheme(theme) {
  const html = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (theme === "light") html.setAttribute("data-theme", "light");
  else if (theme === "dark") html.removeAttribute("data-theme");
  else {
    if (prefersDark) html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", "light");
  }
}

function updateThemeIcon(theme) {
  const moon   = document.getElementById("themeIconMoon");
  const sun    = document.getElementById("themeIconSun");
  const system = document.getElementById("themeIconSystem");
  if (!moon || !sun || !system) return;
  moon.style.display   = theme === "dark"   ? "" : "none";
  sun.style.display    = theme === "light"  ? "" : "none";
  system.style.display = theme === "system" ? "" : "none";
}

// ── License ───────────────────────────────────────────────────

function loadLicense() {
  chrome.runtime.sendMessage({ type: "GET_LICENSE_STATE" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      info = { state: "expired", daysLeft: 0, licensed: false };
    }

    const planEl     = document.getElementById("licensePlan");
    const badgeEl    = document.getElementById("licenseBadge");
    const daysEl     = document.getElementById("licenseDays");
    const daysLabel  = document.getElementById("licenseDaysLabel");
    const progressEl = document.getElementById("licenseProgress");
    const fillEl     = document.getElementById("licenseFill");
    const infoEl     = document.getElementById("licenseInfo");
    const formEl     = document.getElementById("licenseForm");
    const deactEl    = document.getElementById("deactivateSection");

    // ── licenseInfo always visible — Status row reflects current state ──
    infoEl.style.display = "block";
    const statusValEl = document.getElementById("licenseStatusValue");

    if (info.state === "active") {
      // ── Licensed ──
      planEl.textContent = "Licensed";
      badgeEl.textContent = "ACTIVE";
      badgeEl.className = "license-badge";
      daysEl.textContent = "∞";
      daysEl.style.color = "var(--green)";
      daysLabel.textContent = "lifetime access";
      progressEl.style.display = "none";

      document.getElementById("licenseEmail").textContent = info.email || "—";
      const purchDate = info.purchaseDate
        ? new Date(info.purchaseDate).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
        : "—";
      document.getElementById("licensePurchaseDate").textContent = purchDate;
      if (statusValEl) { statusValEl.textContent = "✓ Active"; statusValEl.style.color = "var(--green)"; }

      formEl.style.display = "none";
      deactEl.style.display = "block";

    } else if (info.state === "trial") {
      // ── Trial ──
      const remaining = info.daysLeft || 0;
      const pct = Math.round((remaining / 30) * 100);

      planEl.textContent = "Free Trial";
      badgeEl.className = "license-badge trial-badge";
      daysEl.textContent = remaining;
      daysEl.style.color = "";
      daysLabel.textContent = "days remaining in your free trial";
      progressEl.style.display = "block";
      fillEl.style.width = pct + "%";

      document.getElementById("licenseEmail").textContent = "—";
      document.getElementById("licensePurchaseDate").textContent = "—";
      if (statusValEl) { statusValEl.textContent = "Trial (" + remaining + "d left)"; statusValEl.style.color = remaining <= 7 ? "var(--yellow)" : "var(--accent)"; }

      if (remaining <= 0) {
        badgeEl.textContent = "EXPIRED";
        badgeEl.className = "license-badge expired";
        daysEl.style.color = "var(--red)";
        if (statusValEl) { statusValEl.textContent = "⚠ Expired"; statusValEl.style.color = "var(--red)"; }
      } else if (remaining <= 7) {
        badgeEl.textContent = remaining + " DAYS LEFT";
        badgeEl.style.background = "rgba(247,185,0,0.14)";
        badgeEl.style.borderColor = "rgba(247,185,0,0.35)";
        badgeEl.style.color = "var(--yellow)";
      } else {
        badgeEl.textContent = "TRIAL";
      }

      formEl.style.display = "block";
      deactEl.style.display = "none";

    } else {
      // ── Expired ──
      planEl.textContent = "Expired";
      badgeEl.textContent = "EXPIRED";
      badgeEl.className = "license-badge expired";
      daysEl.textContent = "0";
      daysEl.style.color = "var(--red)";
      daysLabel.textContent = "your trial has ended — activate to continue";
      progressEl.style.display = "block";
      fillEl.style.width = "0%";

      document.getElementById("licenseEmail").textContent = "—";
      document.getElementById("licensePurchaseDate").textContent = "—";
      if (statusValEl) { statusValEl.textContent = "⚠ Expired"; statusValEl.style.color = "var(--red)"; }

      formEl.style.display = "block";
      deactEl.style.display = "none";
    }

    // Set purchase URL
    const buyLink = document.getElementById("buyLink");
    if (buyLink && info.purchaseUrl) {
      buyLink.href = info.purchaseUrl;
    }
  });
}

// ── Rate Limit Display ────────────────────────────────────────

function updateProfileRateLimit() {
  chrome.runtime.sendMessage({ type: "GET_RATE_LIMIT" }, (rl) => {
    const el = document.getElementById("profileRateLimit");
    const btn = document.getElementById("activateBtn");
    if (!el || !btn) return;

    if (!rl || rl.allowed) {
      el.classList.remove("show");
      btn.disabled = false;
      return;
    }

    const mins = Math.floor(rl.waitSeconds / 60);
    const secs = rl.waitSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    el.textContent = `⏳ Too many attempts — wait ${timeStr}`;
    el.classList.add("show");
    btn.disabled = true;

    // Auto-refresh the countdown
    setTimeout(updateProfileRateLimit, 1000);
  });
}

// ── Activate License ──────────────────────────────────────────

function activateLicense() {
  const btn = document.getElementById("activateBtn");
  const msgEl = document.getElementById("licenseMsg");
  const input = document.getElementById("licenseKeyInput");
  const key = input.value.trim();

  if (!key) {
    msgEl.className = "license-msg error";
    msgEl.textContent = "Please enter a license key.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "VERIFYING...";
  msgEl.className = "license-msg";
  msgEl.textContent = "";

  chrome.runtime.sendMessage({ type: "ACTIVATE_LICENSE", key }, (result) => {
    if (chrome.runtime.lastError) {
      msgEl.className = "license-msg error";
      msgEl.textContent = "Connection error. Please try again.";
      btn.textContent = "ACTIVATE LICENSE";
      btn.disabled = false;
      return;
    }

    if (result && result.success) {
      msgEl.className = "license-msg success";
      msgEl.textContent = "✓ License activated successfully!";
      btn.textContent = "ACTIVATED ✓";

      // Refresh the UI after a brief delay
      setTimeout(() => {
        loadLicense();
      }, 1500);

    } else {
      msgEl.className = "license-msg error";
      msgEl.textContent = (result && result.error) || "Activation failed.";
      btn.textContent = "ACTIVATE LICENSE";
      btn.disabled = false;

      // Check if rate limited
      if (result && result.rateLimited) {
        updateProfileRateLimit();
      }
    }
  });
}

// ── Deactivate License ────────────────────────────────────────

function deactivateLicense() {
  if (!confirm("Are you sure you want to deactivate your license? You'll need to re-enter your key to reactivate.")) {
    return;
  }

  chrome.runtime.sendMessage({ type: "DEACTIVATE_LICENSE" }, () => {
    loadLicense();
  });
}

// ── Profile ───────────────────────────────────────────────────

function loadProfile() {
  chrome.storage.sync.get({ profile: {} }, (res) => {
    const p = res.profile || {};
    if (p.name)  document.getElementById("userName").value  = p.name;
    if (p.email) document.getElementById("userEmail").value = p.email;
    if (p.usage) document.getElementById("userUsage").value = p.usage;
  });
}

function saveProfile() {
  // Security: sanitize & limit input lengths
  const name  = document.getElementById("userName").value.trim().substring(0, 100);
  const email = document.getElementById("userEmail").value.trim().substring(0, 150);
  const usage = document.getElementById("userUsage").value.trim().substring(0, 200);

  // Basic email format validation if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  const profile = { name, email, usage };
  chrome.storage.sync.set({ profile }, () => {
    const msg = document.getElementById("saveMsg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 3000);
  });
}

// ── Init ──────────────────────────────────────────────────────
initTheme();
loadLicense();
loadProfile();
updateProfileRateLimit();

document.getElementById("saveProfile").addEventListener("click", saveProfile);
document.getElementById("activateBtn").addEventListener("click", activateLicense);
document.getElementById("licenseKeyInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") activateLicense();
});
document.getElementById("deactivateBtn").addEventListener("click", deactivateLicense);
