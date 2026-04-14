const $ = id => document.getElementById(id);
const fmt = n => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n);

// Security: HTML entity escaper to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ══════════════════════════════════════════════════════════════════════════
// THEME TOGGLE INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════

function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  
  if (!themeToggle) return;
  
  // Get saved theme
  chrome.storage.sync.get({ theme: "system" }, (result) => {
    const theme = result.theme || "system";
    applyTheme(theme);
    updateThemeIcon(theme);
  });

  // Theme toggle click
  themeToggle.addEventListener("click", () => {
    chrome.storage.sync.get({ theme: "system" }, (result) => {
      const currentTheme = result.theme || "system";
      let newTheme = "system";
      
      if (currentTheme === "system") newTheme = "dark";
      else if (currentTheme === "dark") newTheme = "light";
      else if (currentTheme === "light") newTheme = "system";

      chrome.storage.sync.set({ theme: newTheme });
      applyTheme(newTheme);
      updateThemeIcon(newTheme);
    });
  });
}

function applyTheme(theme) {
  const html = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (theme === "light") {
    html.setAttribute("data-theme", "light");
  } else if (theme === "dark") {
    html.removeAttribute("data-theme");
  } else {
    // System
    if (prefersDark) {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", "light");
    }
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

// ══════════════════════════════════════════════════════════════════════════

function renderStats(s) {
  const lt = s.lifetime || {};
  const td = s.today    || {};

  // Installed since
  if (s.installedAt) {
    const d = new Date(s.installedAt);
    $("installedSince").textContent = "Active since " + d.toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"});
  }

  // Hero
  $("ltTotal").textContent   = fmt(lt.total || 0);
  $("todayTotal").textContent = fmt(td.total || 0);
  $("siteCount").textContent  = fmt(Object.keys(s.sites || {}).length);
  $("todayDate").textContent  = td.date || new Date().toISOString().slice(0,10);

  // Lifetime breakdown
  $("ltImages").textContent  = fmt(lt.images  || 0);
  $("ltVideos").textContent  = fmt(lt.videos  || 0);
  $("ltHeavy").textContent   = fmt(lt.heavy   || 0);
  $("ltScripts").textContent = fmt(lt.scripts || 0);
  $("ltIframes").textContent = fmt(lt.iframes || 0);

  // Savings estimate (MB)
  const imgMB   = ((lt.images  || 0) * 0.15).toFixed(1);
  const vidMB   = ((lt.videos  || 0) * 2.0).toFixed(1);
  const otherMB = (((lt.heavy||0)*0.06) + ((lt.scripts||0)*0.08) + ((lt.iframes||0)*0.05)).toFixed(1);
  const totalMB = (parseFloat(imgMB) + parseFloat(vidMB) + parseFloat(otherMB));
  $("savMB").textContent      = totalMB >= 1000 ? (totalMB/1000).toFixed(2)+" GB" : totalMB.toFixed(1)+" MB";
  $("savImgMB").textContent   = imgMB;
  $("savVidMB").textContent   = vidMB;
  $("savOtherMB").textContent = otherMB;

  // Today breakdown bars
  const cats = [
    { key:"images",  label:"Images",  icon:"🖼", color:"var(--accent)" },
    { key:"videos",  label:"Videos",  icon:"🎬", color:"var(--red)" },
    { key:"heavy",   label:"Heavy",   icon:"📦", color:"var(--yellow)" },
    { key:"scripts", label:"Scripts", icon:"⚙️", color:"var(--purple)" },
    { key:"iframes", label:"Iframes", icon:"⬜", color:"var(--teal)" },
  ];
  const maxTd = Math.max(1, ...cats.map(c => td[c.key] || 0));
  $("todayRows").innerHTML = cats.map(c => {
    const val = td[c.key] || 0;
    const pct = Math.round((val / maxTd) * 100);
    return `
      <div class="trow">
        <div class="trow-icon">${c.icon}</div>
        <div class="trow-label">${c.label}</div>
        <div class="trow-track"><div class="trow-fill" style="width:${pct}%;background:${c.color};"></div></div>
        <div class="trow-num">${fmt(val)}</div>
      </div>`;
  }).join("");

  // 30-day bar chart
  const hist = s.history || [];
  if (hist.length === 0) {
    $("barChart").innerHTML = '<div class="empty-state" style="width:100%;">No history yet — data appears after the first full day</div>';
  } else {
    const maxH = Math.max(1, ...hist.map(h => h.total));
    $("barChart").innerHTML = hist.slice(0, 30).map(h => {
      const pct = Math.round((h.total / maxH) * 100);
      const safeDate = escapeHtml(h.date || "");
      const shortDate = escapeHtml(h.date ? h.date.slice(5) : "");
      return `
        <div class="bc-col">
          <div class="bc-bar" style="height:${pct}%;" data-tip="${safeDate}: ${fmt(h.total)} blocked"></div>
          <div class="bc-label">${shortDate}</div>
        </div>`;
    }).join("");
  }

  // Top sites
  const sites = Object.entries(s.sites || {}).sort((a,b) => b[1]-a[1]).slice(0, 10);
  if (sites.length === 0) {
    $("sitesList").innerHTML = '<div class="empty-state">No site data yet — keep browsing!</div>';
  } else {
    const maxS = sites[0][1];
    $("sitesList").innerHTML = sites.map(([host, count], i) => `
      <div class="site-row">
        <div class="site-rank">${i+1}</div>
        <div class="site-name">${escapeHtml(host)}</div>
        <div class="site-track"><div class="site-fill" style="width:${Math.round((count/maxS)*100)}%"></div></div>
        <div class="site-num">${fmt(count)}</div>
      </div>
    `).join("");
  }
}

function load() {
  chrome.runtime.sendMessage({ type:"GET_STATS" }, stats => {
    $("loading").style.display    = "none";
    $("mainPage").style.display   = "block";
    renderStats(stats || {});
  });
}

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all lifetime stats? This cannot be undone.")) return;
  chrome.runtime.sendMessage({ type:"RESET_STATS" }, () => load());
});

initTheme();
load();
// Auto-refresh every 10s
setInterval(load, 10000);