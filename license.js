// license.js — DataSaver Pro License & Anti-Tamper Module
// Gumroad integration with encrypted storage and integrity checks

(function(global) {
  "use strict";

  // ── Obfuscated constants ────────────────────────────────────
  const _P = "DataSaverPro";                    // product permalink
  const _E = "https://api.gumroad.com/v2/licenses/verify";
  const _L = "https://nullbytestudio.gumroad.com/l/DataSaverPro";
  const _S = "dsp18-lic-v2";                    // salt
  const _T = 30;                                // trial days
  const _R = 7;                                 // re-verify interval (days)
  const _MAX = 2592000000;                      // 30 days in ms

  // ── Crypto helpers ──────────────────────────────────────────
  function _h(s) {
    // djb2 hash
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }

  function _encode(data) {
    // Simple XOR obfuscation for storage (not real crypto, but prevents casual inspection)
    const json = JSON.stringify(data);
    const key = _S + "x0r";
    let out = "";
    for (let i = 0; i < json.length; i++) {
      out += String.fromCharCode(json.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(out);
  }

  function _decode(encoded) {
    try {
      const raw = atob(encoded);
      const key = _S + "x0r";
      let out = "";
      for (let i = 0; i < raw.length; i++) {
        out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return JSON.parse(out);
    } catch (e) {
      return null;
    }
  }

  function _checksum(obj) {
    // Integrity hash of license data fields
    const s = _S + (obj.k || "") + (obj.s || "") + String(obj.t || 0) + String(obj.v || 0);
    return _h(s);
  }

  // ── License State ───────────────────────────────────────────
  // Stored in chrome.storage.sync as:
  //   _ld: encoded license data blob
  //   _lc: integrity checksum
  //
  // Decoded _ld contains:
  //   k: license key (or "" for trial)
  //   s: state ("trial"|"active"|"expired")
  //   t: trial/activation start timestamp
  //   v: last verification timestamp
  //   e: email from Gumroad
  //   p: purchase date from Gumroad

  async function _read() {
    return new Promise(resolve => {
      chrome.storage.sync.get({ _ld: null, _lc: null }, res => {
        if (!res._ld || res._lc === null) {
          resolve(null);
          return;
        }
        const data = _decode(res._ld);
        if (!data || _checksum(data) !== res._lc) {
          // Tampered — lock to expired
          resolve({ k: "", s: "expired", t: 0, v: 0, e: "", p: "", _tampered: true });
          return;
        }
        resolve(data);
      });
    });
  }

  async function _write(data) {
    const encoded = _encode(data);
    const check = _checksum(data);
    return new Promise(resolve => {
      chrome.storage.sync.set({ _ld: encoded, _lc: check }, resolve);
    });
  }

  // ── Initialize (first-run) ──────────────────────────────────
  async function initLicense() {
    let data = await _read();
    if (!data) {
      // First install — start trial
      data = {
        k: "",
        s: "trial",
        t: Date.now(),
        v: 0,
        e: "",
        p: ""
      };
      await _write(data);
    }
    return data;
  }

  // ── Get License Info ────────────────────────────────────────
  async function getLicenseState() {
    let data = await _read();
    if (!data) data = await initLicense();

    if (data._tampered) {
      return { state: "expired", daysLeft: 0, licensed: false, tampered: true, purchaseUrl: _L };
    }

    if (data.s === "active") {
      // Check if re-verification needed
      const daysSinceVerify = Math.floor((Date.now() - (data.v || 0)) / 86400000);
      return {
        state: "active",
        daysLeft: -1,
        licensed: true,
        email: data.e || "",
        purchaseDate: data.p || "",
        needsReverify: daysSinceVerify >= _R,
        purchaseUrl: _L
      };
    }

    if (data.s === "trial") {
      const elapsed = Math.floor((Date.now() - data.t) / 86400000);
      const remaining = Math.max(0, _T - elapsed);
      if (remaining <= 0) {
        data.s = "expired";
        await _write(data);
        return { state: "expired", daysLeft: 0, licensed: false, purchaseUrl: _L };
      }
      return { state: "trial", daysLeft: remaining, licensed: false, purchaseUrl: _L };
    }

    return { state: "expired", daysLeft: 0, licensed: false, purchaseUrl: _L };
  }

  // ── Verify with Gumroad ─────────────────────────────────────
  async function verifyWithGumroad(licenseKey) {
    try {
      const resp = await fetch(_E, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_permalink: _P,
          license_key: licenseKey,
          increment_uses_count: "true"
        })
      });

      if (!resp.ok) {
        return { valid: false, error: "Network error (HTTP " + resp.status + ")" };
      }

      const json = await resp.json();

      if (!json.success) {
        return { valid: false, error: json.message || "Invalid license key" };
      }

      const purchase = json.purchase || {};
      return {
        valid: true,
        email: purchase.email || "",
        purchaseDate: purchase.created_at || "",
        refunded: purchase.refunded || false,
        disputed: purchase.disputed || false,
        chargebacked: purchase.chargebacked || false
      };

    } catch (err) {
      return { valid: false, error: "Could not reach Gumroad servers. Check your connection." };
    }
  }

  // ── Activate License ────────────────────────────────────────
  async function activateLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== "string" || licenseKey.trim().length < 8) {
      return { success: false, error: "Please enter a valid license key." };
    }

    const key = licenseKey.trim().toUpperCase();
    const result = await verifyWithGumroad(key);

    if (!result.valid) {
      return { success: false, error: result.error };
    }

    if (result.refunded || result.disputed || result.chargebacked) {
      return { success: false, error: "This license has been refunded or disputed." };
    }

    // Activation success — store encrypted
    const data = {
      k: key,
      s: "active",
      t: Date.now(),
      v: Date.now(),
      e: result.email || "",
      p: result.purchaseDate || ""
    };
    await _write(data);

    return { success: true, email: data.e, purchaseDate: data.p };
  }

  // ── Periodic Re-verify (called by background alarm) ─────────
  async function periodicVerify() {
    const data = await _read();
    if (!data || data.s !== "active" || !data.k) return;

    const daysSince = Math.floor((Date.now() - (data.v || 0)) / 86400000);
    if (daysSince < _R) return; // not time yet

    const result = await verifyWithGumroad(data.k);
    if (result.valid && !result.refunded && !result.disputed && !result.chargebacked) {
      data.v = Date.now();
      await _write(data);
    } else {
      // License revoked/refunded — expire
      data.s = "expired";
      data.k = "";
      await _write(data);
    }
  }

  // ── Deactivate ──────────────────────────────────────────────
  async function deactivateLicense() {
    const data = {
      k: "",
      s: "expired",
      t: 0,
      v: 0,
      e: "",
      p: ""
    };
    await _write(data);
  }

  // ── Is Feature Enabled ──────────────────────────────────────
  // Quick synchronous-style check (reads cached state)
  async function isFunctional() {
    const info = await getLicenseState();
    return info.state === "active" || info.state === "trial";
  }

  // ── Export ──────────────────────────────────────────────────
  global.DSLicense = {
    init: initLicense,
    getState: getLicenseState,
    activate: activateLicense,
    verify: periodicVerify,
    deactivate: deactivateLicense,
    isFunctional: isFunctional,
    PURCHASE_URL: _L
  };

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
