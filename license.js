// license.js — DataSaver Pro License & Anti-Tamper Module
// Gumroad integration with encrypted storage, integrity checks, and rate limiting

(function(_g) {
  "use strict";

  // ── Obfuscated constants ────────────────────────────────────
  const _P = "DataSaverPro";                                // product permalink
  const _E = "https://api.gumroad.com/v2/licenses/verify";   // verify endpoint
  const _L = "https://nullbytestudio.gumroad.com/l/DataSaverPro"; // purchase url
  const _S = "dsp18-lic-v3";                                // salt
  const _T = 30;                                            // trial days
  const _R = 7;                                             // re-verify interval (days)
  const _V = "4.0.0";                                       // extension version (bound to checksum)

  // ── Rate Limiter ────────────────────────────────────────────
  // Exponential backoff: 1min → 2min → 4min → 8min → 16min → 30min max
  const _RL_BASE   = 60000;    // 1 minute in ms
  const _RL_MAX    = 1800000;  // 30 minutes in ms
  const _RL_FACTOR = 2;        // doubling factor

  let _rlAttempts  = 0;        // consecutive failed attempts
  let _rlLockedUntil = 0;      // timestamp when cooldown expires

  function _rlCheck() {
    // Returns { allowed: bool, waitSeconds: number }
    const now = Date.now();
    if (_rlLockedUntil > now) {
      return { allowed: false, waitSeconds: Math.ceil((_rlLockedUntil - now) / 1000) };
    }
    return { allowed: true, waitSeconds: 0 };
  }

  function _rlFail() {
    _rlAttempts++;
    const delay = Math.min(_RL_BASE * Math.pow(_RL_FACTOR, _rlAttempts - 1), _RL_MAX);
    _rlLockedUntil = Date.now() + delay;
    // Persist rate limit state so popup reloads can't bypass it
    try {
      chrome.storage.local.set({
        _rl: { a: _rlAttempts, u: _rlLockedUntil }
      });
    } catch(_) {}
  }

  function _rlSuccess() {
    _rlAttempts = 0;
    _rlLockedUntil = 0;
    try {
      chrome.storage.local.remove("_rl");
    } catch(_) {}
  }

  async function _rlRestore() {
    // Restore rate limit state from storage on module load
    return new Promise(resolve => {
      try {
        chrome.storage.local.get({ _rl: null }, res => {
          if (res._rl && typeof res._rl === "object") {
            _rlAttempts = res._rl.a || 0;
            _rlLockedUntil = res._rl.u || 0;
          }
          resolve();
        });
      } catch(_) { resolve(); }
    });
  }

  // ── Crypto helpers ──────────────────────────────────────────
  function _h(s) {
    // djb2 hash — fast, non-cryptographic
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }

  function _deriveKey() {
    // Derive a longer XOR key from salt + version + extension id
    const extId = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) || "fallback";
    const base = _S + _V + extId + "x0rK3y";
    let key = "";
    for (let i = 0; i < 64; i++) {
      key += String.fromCharCode(((base.charCodeAt(i % base.length) * 7 + i * 13) % 94) + 33);
    }
    return key;
  }

  function _encode(data) {
    const json = JSON.stringify(data);
    const key = _deriveKey();
    let out = "";
    for (let i = 0; i < json.length; i++) {
      out += String.fromCharCode(json.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(out);
  }

  function _decode(encoded) {
    try {
      const raw = atob(encoded);
      const key = _deriveKey();
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
    // Integrity hash — covers all fields + version + salt
    const s = _S + _V
      + (obj.k || "") + (obj.s || "")
      + String(obj.t || 0) + String(obj.v || 0)
      + (obj.e || "") + (obj.p || "")
      + String(obj.n || 0);
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
  //   n: nonce (random number for unique checksums)

  async function _read() {
    return new Promise(resolve => {
      chrome.storage.sync.get({ _ld: null, _lc: null }, res => {
        if (!res._ld || res._lc === null || res._lc === undefined) {
          resolve(null);
          return;
        }
        const data = _decode(res._ld);
        if (!data || _checksum(data) !== res._lc) {
          // Tampered — lock to expired
          resolve({ k: "", s: "expired", t: 0, v: 0, e: "", p: "", n: 0, _tampered: true });
          return;
        }
        resolve(data);
      });
    });
  }

  async function _write(data) {
    // Assign a random nonce to each write for checksum uniqueness
    data.n = Math.floor(Math.random() * 2147483647);
    const encoded = _encode(data);
    const check = _checksum(data);
    return new Promise(resolve => {
      chrome.storage.sync.set({ _ld: encoded, _lc: check }, () => {
        // Also mirror trial start in local storage for cross-validation
        if (data.t) {
          chrome.storage.local.set({ _lt: data.t });
        }
        resolve();
      });
    });
  }

  // ── Cross-storage validation ────────────────────────────────
  async function _validateCrossStorage(data) {
    // Trial start must exist in local storage too (prevents sync-wipe reset)
    if (data.s === "trial" && data.t) {
      return new Promise(resolve => {
        chrome.storage.local.get({ _lt: null }, res => {
          if (res._lt && Math.abs(res._lt - data.t) > 60000) {
            // Mismatch > 1 minute — possible tampering
            resolve(false);
          } else if (!res._lt) {
            // First time: store it
            chrome.storage.local.set({ _lt: data.t });
            resolve(true);
          } else {
            resolve(true);
          }
        });
      });
    }
    return true;
  }

  // ── Initialize (first-run) ──────────────────────────────────
  async function initLicense() {
    await _rlRestore(); // restore rate limiter state

    let data = await _read();

    if (data && data._tampered) {
      // Tampered state — force expired
      const expData = { k: "", s: "expired", t: 0, v: 0, e: "", p: "", n: 0 };
      await _write(expData);
      return expData;
    }

    if (!data) {
      // Check if there's a trial timestamp in local storage (reinstall detection)
      const localTs = await new Promise(r => {
        chrome.storage.local.get({ _lt: null }, res => r(res._lt));
      });

      data = {
        k: "",
        s: "trial",
        t: localTs || Date.now(),
        v: 0,
        e: "",
        p: ""
      };
      await _write(data);
    } else {
      // Validate cross-storage
      const valid = await _validateCrossStorage(data);
      if (!valid) {
        data.s = "expired";
        data.k = "";
        await _write(data);
      }
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
    // Rate limit check
    const rl = _rlCheck();
    if (!rl.allowed) {
      const mins = Math.floor(rl.waitSeconds / 60);
      const secs = rl.waitSeconds % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      return {
        success: false,
        rateLimited: true,
        waitSeconds: rl.waitSeconds,
        error: `Too many attempts. Please wait ${timeStr} before trying again.`
      };
    }

    if (!licenseKey || typeof licenseKey !== "string" || licenseKey.trim().length < 8) {
      _rlFail();
      return { success: false, error: "Please enter a valid license key." };
    }

    const key = licenseKey.trim().toUpperCase();
    const result = await verifyWithGumroad(key);

    if (!result.valid) {
      _rlFail();
      return { success: false, error: result.error };
    }

    if (result.refunded || result.disputed || result.chargebacked) {
      _rlFail();
      return { success: false, error: "This license has been refunded or disputed." };
    }

    // Activation success — clear rate limiter, store encrypted
    _rlSuccess();

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
  async function isFunctional() {
    const info = await getLicenseState();
    return info.state === "active" || info.state === "trial";
  }

  // ── Rate Limit Status (for UI) ──────────────────────────────
  function getRateLimitStatus() {
    return _rlCheck();
  }

  // ── Export (frozen to prevent runtime patching) ──────────────
  const _api = {
    init: initLicense,
    getState: getLicenseState,
    activate: activateLicense,
    verify: periodicVerify,
    deactivate: deactivateLicense,
    isFunctional: isFunctional,
    getRateLimit: getRateLimitStatus,
    PURCHASE_URL: _L
  };

  // Freeze the API object — prevents DSLicense.isFunctional = () => true
  if (typeof Object.freeze === "function") {
    Object.freeze(_api);
  }

  _g.DSLicense = _api;

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
