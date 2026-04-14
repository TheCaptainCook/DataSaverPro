// profile.js — DataSaver Pro Profile & Trial

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

// ── Security: Trial checksum ──────────────────────────────────
const TRIAL_SALT = "dsp18-trial-v1";
function trialChecksum(ts) {
  let h = 0;
  const s = TRIAL_SALT + String(ts);
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return h;
}

// ── Trial ─────────────────────────────────────────────────────
function loadTrial() {
  chrome.storage.sync.get({ trialStartDate: null, trialCheck: null }, (res) => {
    let startDate = res.trialStartDate;
    const storedCheck = res.trialCheck;

    // Security: verify integrity
    if (!startDate || trialChecksum(startDate) !== storedCheck) {
      startDate = Date.now();
      chrome.storage.sync.set({
        trialStartDate: startDate,
        trialCheck: trialChecksum(startDate)
      });
    }

    const elapsed = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, 30 - elapsed);
    const pct = Math.round((remaining / 30) * 100);

    document.getElementById("trialDays").textContent = remaining;
    document.getElementById("trialFill").style.width = pct + "%";

    const badge = document.getElementById("trialBadge");
    if (remaining <= 0) {
      badge.textContent = "EXPIRED";
      badge.classList.add("expired");
      document.getElementById("trialDays").style.color = "var(--red)";
    } else if (remaining <= 7) {
      badge.textContent = remaining + " DAYS LEFT";
      badge.style.background = "rgba(247,185,0,0.14)";
      badge.style.borderColor = "rgba(247,185,0,0.35)";
      badge.style.color = "var(--yellow)";
    } else {
      badge.textContent = "ACTIVE";
    }
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
loadTrial();
loadProfile();
document.getElementById("saveProfile").addEventListener("click", saveProfile);
