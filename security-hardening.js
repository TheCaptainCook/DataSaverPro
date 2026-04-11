// security-hardening.js - Advanced anti-tampering and code protection

/**
 * ANTI-TAMPERING SYSTEM
 * Detects and prevents unauthorized code modification
 */

class SecurityHardening {
  constructor() {
    this.checksums = {};
    this.encryptionKey = null;
    this.tamperLog = [];
    this.maxTamperAttempts = 3;
  }

  /**
   * Initialize security on extension startup
   */
  async initialize() {
    await this.checkIntegrity();
    await this.setupMonitoring();
    await this.initializeEncryption();
  }

  /**
   * Verify manifest.json hasn't been tampered with
   */
  async checkManifestIntegrity() {
    try {
      const response = await fetch(chrome.runtime.getURL('manifest.json'));
      const manifest = await response.json();

      // Verify critical fields
      const requiredFields = {
        manifest_version: 3,
        name: 'DataSaver Pro',
        permissions: ['storage', 'tabs', 'declarativeNetRequest']
      };

      for (const [field, expectedValue] of Object.entries(requiredFields)) {
        if (field === 'permissions') {
          // Check if required permissions exist
          const hasPerms = expectedValue.every(perm => 
            manifest[field]?.includes(perm)
          );
          if (!hasPerms) {
            return { valid: false, reason: 'Missing required permissions' };
          }
        } else {
          if (manifest[field] !== expectedValue) {
            return { valid: false, reason: `Invalid ${field}` };
          }
        }
      }

      // Check for suspicious additions
      const suspiciousPerms = [
        'webRequest',
        'webRequestBlocking',
        '*_access',
        'unlimited'
      ];

      const hasSuspicious = suspiciousPerms.some(perm =>
        manifest.permissions?.includes(perm)
      );

      if (hasSuspicious) {
        return { valid: false, reason: 'Suspicious permissions detected' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Manifest verification failed', error };
    }
  }

  /**
   * Check storage integrity
   */
  async checkStorageIntegrity() {
    const data = await chrome.storage.local.get(null);

    // Verify license data hasn't been modified
    if (data.license) {
      const license = data.license;

      // Check for suspicious modifications
      if (!this.isValidLicenseObject(license)) {
        return { valid: false, reason: 'Invalid license data structure' };
      }

      // Verify timestamps are logical
      if (license.verifiedAt > Date.now()) {
        return { valid: false, reason: 'Future timestamp detected' };
      }

      if (license.trialStartedAt > Date.now()) {
        return { valid: false, reason: 'Invalid trial start date' };
      }
    }

    // Verify stats structure
    if (data.stats) {
      if (!this.isValidStatsObject(data.stats)) {
        return { valid: false, reason: 'Invalid stats data structure' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate license object structure
   */
  isValidLicenseObject(license) {
    const required = [
      'licenseKey',
      'verified',
      'verifiedAt',
      'expiresAt',
      'status'
    ];

    const hasAll = required.every(field => field in license);
    if (!hasAll) return false;

    // Type checking
    if (typeof license.verified !== 'boolean') return false;
    if (typeof license.verifiedAt !== 'number') return false;
    if (typeof license.expiresAt !== 'number') return false;
    if (!['trial', 'active', 'expired'].includes(license.status)) return false;

    return true;
  }

  /**
   * Validate stats object structure
   */
  isValidStatsObject(stats) {
    if (!stats.lifetime || !stats.today) return false;
    if (typeof stats.lifetime.total !== 'number') return false;
    if (typeof stats.today.total !== 'number') return false;
    if (!Array.isArray(stats.history)) return false;
    if (!Array.isArray(stats.liveLog)) return false;

    return true;
  }

  /**
   * Monitor for suspicious patterns
   */
  async setupMonitoring() {
    // Monitor storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.checkStorageChanges(changes, areaName);
    });

    // Periodic integrity check
    chrome.alarms.create('integrityCheck', { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'integrityCheck') {
        this.checkIntegrity();
      }
    });
  }

  /**
   * Check for suspicious storage modifications
   */
  async checkStorageChanges(changes, areaName) {
    for (const [key, change] of Object.entries(changes)) {
      // Detect sudden changes in license status
      if (key === 'license') {
        const oldLicense = change.oldValue;
        const newLicense = change.newValue;

        if (oldLicense && newLicense) {
          // Check for license key manipulation
          if (oldLicense.licenseKey !== newLicense.licenseKey) {
            await this.logSecurityEvent('LICENSE_KEY_CHANGED', {
              oldKey: oldLicense.licenseKey?.substring(0, 5) + '...',
              newKey: newLicense.licenseKey?.substring(0, 5) + '...',
              timestamp: Date.now()
            });
          }

          // Check for status manipulation
          if (oldLicense.status === 'expired' && newLicense.status === 'active') {
            await this.logSecurityEvent('SUSPICIOUS_STATUS_CHANGE', {
              from: oldLicense.status,
              to: newLicense.status,
              timestamp: Date.now()
            });
          }

          // Check for expiresAt manipulation (extending license)
          if (newLicense.expiresAt > oldLicense.expiresAt + 86400000) {
            // More than 1 day difference
            await this.logSecurityEvent('LICENSE_EXPIRY_EXTENDED', {
              oldExpiry: new Date(oldLicense.expiresAt),
              newExpiry: new Date(newLicense.expiresAt),
              timestamp: Date.now()
            });
          }
        }
      }

      // Detect stats manipulation (sudden increases)
      if (key === 'stats') {
        const oldStats = change.oldValue;
        const newStats = change.newValue;

        if (oldStats && newStats) {
          const oldTotal = oldStats.lifetime?.total || 0;
          const newTotal = newStats.lifetime?.total || 0;
          const increase = newTotal - oldTotal;

          // Detect unrealistic jumps (1000+ in single request)
          if (increase > 1000) {
            await this.logSecurityEvent('UNREALISTIC_STATS_INCREASE', {
              increase,
              oldTotal,
              newTotal,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }

  /**
   * Run full integrity check
   */
  async checkIntegrity() {
    const checks = await Promise.all([
      this.checkManifestIntegrity(),
      this.checkStorageIntegrity(),
      this.verifyContentScriptLoaded(),
      this.checkBackgroundServiceWorker()
    ]);

    const tampered = checks.some(result => !result.valid);

    if (tampered) {
      await this.handleTampering(checks);
    }

    return { tampered, checks };
  }

  /**
   * Verify content script is loaded
   */
  async verifyContentScriptLoaded() {
    try {
      const tabs = await chrome.tabs.query({});
      let loadedCount = 0;

      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'VERIFY_CONTENT_SCRIPT'
          });
          loadedCount++;
        } catch (_) {
          // Expected for non-web pages
        }
      }

      return {
        valid: tabs.length === 0 || loadedCount > 0,
        reason: loadedCount > 0 ? 'OK' : 'Content script not loaded'
      };
    } catch (error) {
      return { valid: false, reason: 'Verification failed', error };
    }
  }

  /**
   * Check background service worker health
   */
  async checkBackgroundServiceWorker() {
    try {
      // Send test message to background
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Background worker not responding'));
        }, 5000);

        chrome.runtime.sendMessage(
          { type: 'HEALTH_CHECK' },
          () => {
            clearTimeout(timeout);
            resolve(true);
          }
        );
      });

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Background worker unhealthy' };
    }
  }

  /**
   * Handle tampering detection
   */
  async handleTampering(failedChecks) {
    // Increment tamper attempts
    const data = await chrome.storage.local.get({ tamperAttempts: 0 });
    const attempts = (data.tamperAttempts || 0) + 1;

    await chrome.storage.local.set({ tamperAttempts: attempts });
    await this.logSecurityEvent('TAMPER_DETECTED', {
      attempts,
      failedChecks: failedChecks.filter(c => !c.valid),
      timestamp: Date.now()
    });

    // After 3 attempts, disable extension
    if (attempts >= this.maxTamperAttempts) {
      await this.disableExtension();
    }
  }

  /**
   * Disable extension due to tampering
   */
  async disableExtension() {
    // Clear all settings
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();

    // Revoke any active licenses
    const data = await chrome.storage.local.get({ license: null });
    if (data.license?.licenseKey) {
      // Attempt to revoke with API
      try {
        await fetch('https://api.dodo.pe/revoke-license', {
          method: 'POST',
          body: JSON.stringify({
            licenseKey: data.license.licenseKey,
            reason: 'Tampering detected'
          })
        });
      } catch (error) {
        console.error('Failed to revoke license:', error);
      }
    }

    // Log tamper event
    await this.logSecurityEvent('EXTENSION_DISABLED', {
      reason: 'Tampering detected',
      timestamp: Date.now()
    });

    // Show tamper message
    alert(
      'DataSaver Pro has been disabled due to unauthorized modifications. ' +
      'Please reinstall from the Chrome Web Store.'
    );

    // Unload extension
    chrome.management.setEnabled(chrome.runtime.id, false);
  }

  /**
   * Initialize encryption for sensitive data
   */
  async initializeEncryption() {
    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      this.encryptionKey = key;
      return true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data with AES-GCM
   */
  async encryptSensitiveData(data) {
    if (!this.encryptionKey) return null;

    try {
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const dataBuffer = encoder.encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        dataBuffer
      );

      return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encrypted) {
    if (!this.encryptionKey) return null;

    try {
      const iv = new Uint8Array(encrypted.iv);
      const dataBuffer = new Uint8Array(encrypted.data);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        dataBuffer
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event, details) {
    const entry = {
      event,
      details,
      timestamp: Date.now(),
      url: chrome.runtime.getURL('')
    };

    const data = await chrome.storage.local.get({ securityLog: [] });
    const log = data.securityLog || [];

    log.unshift(entry);

    // Keep last 50 events
    if (log.length > 50) {
      log.pop();
    }

    await chrome.storage.local.set({ securityLog: log });

    // Send to server if critical
    if (['TAMPER_DETECTED', 'LICENSE_KEY_CHANGED'].includes(event)) {
      this.reportSecurityEvent(entry);
    }
  }

  /**
   * Report critical security events to server
   */
  async reportSecurityEvent(event) {
    try {
      await fetch('https://api.dodo.pe/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionId: chrome.runtime.id,
          event: event.event,
          timestamp: event.timestamp
        })
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }

  /**
   * Get security audit log
   */
  async getSecurityLog() {
    const data = await chrome.storage.local.get({ securityLog: [] });
    return data.securityLog || [];
  }

  /**
   * Clear security log
   */
  async clearSecurityLog() {
    await chrome.storage.local.set({ securityLog: [] });
  }

  /**
   * Validate obfuscation integrity
   */
  validateObfuscation() {
    // Check if critical functions are obfuscated
    const criticalFunctions = [
      'verifyLicense',
      'activateLicense',
      'checkLicenseStatus'
    ];

    for (const func of criticalFunctions) {
      if (window[func]?.toString().includes(func)) {
        // Function name visible - may not be obfuscated
        console.warn(`Warning: ${func} may not be properly obfuscated`);
      }
    }
  }
}

// Initialize security on load
if (typeof chrome !== 'undefined') {
  const security = new SecurityHardening();
  chrome.runtime.onInstalled.addListener(() => {
    security.initialize();
  });

  chrome.runtime.onStartup.addListener(() => {
    security.initialize();
  });

  // Handle health check message
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'HEALTH_CHECK') {
      sendResponse({ ok: true });
      return true;
    }
  });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityHardening };
}
