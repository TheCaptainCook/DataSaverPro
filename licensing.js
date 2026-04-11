// licensing.js - License management utilities with security features

/**
 * License Management System for DataSaver Pro
 * Handles license activation, verification, encryption, and anti-tampering
 */

class LicenseManager {
  constructor() {
    this.cacheExpiry = 3600000; // 1 hour
    this.maxVerifyAttempts = 5;
    this.lockoutTime = 300000; // 5 minutes
  }

  /**
   * Hash license key for storage (one-way hash)
   */
  async hashLicenseKey(key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify license key format
   */
  validateKeyFormat(key) {
    // Expected format: DSP-XXXX-XXXX-XXXX-XXXX
    const format = /^DSP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return format.test(key.toUpperCase());
  }

  /**
   * Calculate checksum for license key
   */
  calculateChecksum(key) {
    let sum = 0;
    for (let i = 0; i < key.length; i++) {
      sum += key.charCodeAt(i);
    }
    return (sum % 256).toString(16).padStart(2, '0');
  }

  /**
   * Verify checksum integrity
   */
  verifyChecksumIntegrity(key, checksum) {
    const calculated = this.calculateChecksum(key);
    return calculated === checksum;
  }

  /**
   * Simple XOR encryption for sensitive data
   * Note: For production, use proper encryption library like libsodium.js
   */
  encryptData(data, key) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));
    const keyBytes = encoder.encode(key);
    
    const encrypted = [];
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted.push(dataBytes[i] ^ keyBytes[i % keyBytes.length]);
    }
    
    return btoa(String.fromCharCode(...encrypted));
  }

  /**
   * Decrypt data (simple XOR)
   */
  decryptData(encrypted, key) {
    const dataBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);
    
    const decrypted = [];
    for (let i = 0; i < dataBytes.length; i++) {
      decrypted.push(dataBytes[i] ^ keyBytes[i % keyBytes.length]);
    }
    
    const text = new TextDecoder().decode(new Uint8Array(decrypted));
    return JSON.parse(text);
  }

  /**
   * Check for tampering attempts
   */
  async detectTampering() {
    try {
      // Check manifest integrity
      const manifest = await fetch(chrome.runtime.getURL('manifest.json'));
      const manifestData = await manifest.json();
      
      // Verify critical fields exist
      const requiredFields = ['manifest_version', 'name', 'permissions'];
      const allPresent = requiredFields.every(field => field in manifestData);
      
      if (!allPresent) {
        return { tampered: true, reason: 'Missing manifest fields' };
      }

      // Check for suspicious permissions
      const suspiciousPerms = ['*_access_key', 'webRequest'];
      const found = suspiciousPerms.some(perm => 
        manifestData.permissions?.includes(perm)
      );
      
      if (found) {
        return { tampered: true, reason: 'Suspicious permissions detected' };
      }

      return { tampered: false };
    } catch (error) {
      return { tampered: true, reason: 'Manifest verification failed', error };
    }
  }

  /**
   * Rate limit verification attempts
   */
  async checkRateLimit(licenseKey) {
    const key = `verify_attempts_${licenseKey}`;
    const data = await chrome.storage.local.get(key);
    const attempts = data[key] || { count: 0, resetTime: Date.now() };

    // Reset after lockout period
    if (Date.now() - attempts.resetTime > this.lockoutTime) {
      attempts.count = 0;
      attempts.resetTime = Date.now();
    }

    if (attempts.count >= this.maxVerifyAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((this.lockoutTime - (Date.now() - attempts.resetTime)) / 1000)
      };
    }

    attempts.count++;
    await chrome.storage.local.set({ [key]: attempts });

    return {
      allowed: true,
      remaining: this.maxVerifyAttempts - attempts.count,
      resetIn: 0
    };
  }

  /**
   * Get cached verification result
   */
  async getCachedVerification(licenseKey) {
    const key = `cached_verify_${licenseKey}`;
    const data = await chrome.storage.local.get(key);
    
    if (!data[key]) return null;

    const { verification, timestamp } = data[key];
    
    if (Date.now() - timestamp > this.cacheExpiry) {
      await chrome.storage.local.remove(key);
      return null;
    }

    return verification;
  }

  /**
   * Cache verification result
   */
  async cacheVerification(licenseKey, result) {
    const key = `cached_verify_${licenseKey}`;
    await chrome.storage.local.set({
      [key]: {
        verification: result,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Blacklist a license key
   */
  async blacklistKey(licenseKey, reason = 'Tampering detected') {
    const data = await chrome.storage.local.get({ blacklist: [] });
    const blacklist = data.blacklist || [];
    
    if (!blacklist.find(item => item.key === licenseKey)) {
      blacklist.push({
        key: licenseKey,
        reason,
        timestamp: Date.now()
      });
      
      await chrome.storage.local.set({ blacklist });
    }
  }

  /**
   * Check if key is blacklisted
   */
  async isBlacklisted(licenseKey) {
    const data = await chrome.storage.local.get({ blacklist: [] });
    const blacklist = data.blacklist || [];
    return blacklist.some(item => item.key === licenseKey);
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event, details) {
    const data = await chrome.storage.local.get({ securityLog: [] });
    const log = data.securityLog || [];
    
    log.unshift({
      event,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
    
    // Keep last 100 events
    if (log.length > 100) {
      log.pop();
    }
    
    await chrome.storage.local.set({ securityLog: log });
  }

  /**
   * Validate license expiration
   */
  isExpired(expiresAt) {
    return Date.now() > expiresAt;
  }

  /**
   * Get days remaining on license
   */
  getDaysRemaining(expiresAt) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.ceil((expiresAt - Date.now()) / msPerDay);
    return Math.max(0, daysLeft);
  }

  /**
   * Format license info for display
   */
  formatLicenseInfo(license) {
    const expiryDate = new Date(license.expiresAt).toLocaleDateString();
    const daysLeft = this.getDaysRemaining(license.expiresAt);
    
    return {
      status: license.status,
      plan: license.plan?.toUpperCase() || 'FREE',
      username: license.username || 'Guest',
      email: license.email || 'Not set',
      expiresAt: expiryDate,
      daysLeft: daysLeft,
      isExpired: this.isExpired(license.expiresAt),
      verified: license.verified
    };
  }
}

/**
 * Dodo Payment Integration Utilities
 */
class DodoPaymentIntegration {
  constructor() {
    this.apiUrl = 'https://api.dodo.pe';
    this.webhookTimeout = 5000;
  }

  /**
   * Verify license with Dodo servers
   */
  async verifyLicense(licenseKey, extensionId = 'datasaver-pro') {
    try {
      const response = await this.withTimeout(
        fetch(`${this.apiUrl}/verify-license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            licenseKey,
            extension: extensionId,
            timestamp: Date.now()
          })
        }),
        this.webhookTimeout
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('License verification failed:', error);
      throw new Error('Unable to verify license. Please check your connection.');
    }
  }

  /**
   * Activate license on device
   */
  async activateLicense(licenseKey, installationId) {
    try {
      const response = await this.withTimeout(
        fetch(`${this.apiUrl}/activate-license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            licenseKey,
            extension: 'datasaver-pro',
            installationId,
            timestamp: Date.now()
          })
        }),
        this.webhookTimeout
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('License activation failed:', error);
      throw error;
    }
  }

  /**
   * Revoke license
   */
  async revokeLicense(licenseKey, reason = 'User logout') {
    try {
      await fetch(`${this.apiUrl}/revoke-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          reason,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('License revocation failed:', error);
    }
  }

  /**
   * Get payment link
   */
  getPaymentLink(planType = 'pro') {
    const baseUrl = 'https://dodo.pe/datasaverpro';
    return `${baseUrl}?plan=${planType}`;
  }

  /**
   * Timeout wrapper for promises
   */
  withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      )
    ]);
  }
}

// Export for use in background.js and popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LicenseManager, DodoPaymentIntegration };
}
