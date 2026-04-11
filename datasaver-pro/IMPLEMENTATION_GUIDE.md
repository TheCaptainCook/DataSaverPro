# DataSaver Pro v3.0 - Freemium Extension Implementation Guide

## 📋 Overview

This is a complete overhaul of the DataSaver Pro extension with enterprise-grade features:
- **30-day free trial** with countdown
- **Dodo Payments integration** for license verification
- **Profile management** with user authentication
- **Privacy settings** (location, camera, microphone, tracking blocking)
- **Theme system** (light, dark, system)
- **Live log** with per-item unblock feature
- **Security hardening** against code tampering

---

## 🚀 Implementation Roadmap

### Phase 1: Core Setup
1. Replace manifest.json with the enhanced version
2. Update background.js with licensing logic
3. Add profile.html and profile.js
4. Update popup.html and popup.js

### Phase 2: Dodo Integration
1. Sign up at https://dodo.pe/developers
2. Get API credentials and webhook URL
3. Implement license verification endpoint
4. Test payment flow

### Phase 3: Security Hardening
1. Implement code obfuscation
2. Add license key validation checksums
3. Encrypt sensitive data in storage
4. Add anti-tampering checks

### Phase 4: Testing & Deployment
1. Test trial countdown
2. Verify license activation
3. Test profile functionality
4. Check privacy settings

---

## 🔐 Security Features

### 1. License Key Verification
```javascript
// Implemented in background.js
async verifyLicense(licenseKey) {
  // Validates against Dodo servers
  // Caches verification for rate limiting
  // Auto-revokes on tampering detection
}
```

**Security Measures:**
- License keys are hashed before storage
- Verification tokens expire after 1 hour
- Failed attempts are logged and rate-limited
- Encrypted storage using Chrome's storage APIs

### 2. Anti-Tampering Detection
The extension checks for:
- Modified background.js
- Altered manifest.json
- Suspicious storage modifications
- Blacklisted license keys

To implement code-level protection:

```javascript
// Add to background.js startup
async function validateIntegrity() {
  const manifest = await fetch(chrome.runtime.getURL('manifest.json'));
  const manifestText = await manifest.text();
  const hash = await hashString(manifestText);
  const storedHash = await getStoredManifestHash();
  
  if (hash !== storedHash) {
    // License revoked - disable plugin
    await disableAllFeatures();
  }
}
```

### 3. Data Encryption
For sensitive user data:

```javascript
// Use TweetNaCl.js or similar for encryption
async function encryptUserData(userData, licenseKey) {
  const encrypted = nacl.box(userData, publicKey);
  return Base64.encode(encrypted);
}
```

---

## 🔗 Dodo Payments Integration

### Required Endpoints

#### 1. License Verification
```
POST /verify-license
Headers: { "Content-Type": "application/json" }
Body: {
  licenseKey: string,
  extension: "datasaver-pro"
}
Response: {
  valid: boolean,
  username: string,
  email: string,
  plan: "pro" | "enterprise",
  expiresAt: timestamp
}
```

#### 2. License Activation
```
POST /activate-license
Body: {
  licenseKey: string,
  extension: "datasaver-pro",
  installationId: string
}
Response: {
  activated: boolean,
  expiresAt: timestamp
}
```

#### 3. License Revocation
```
POST /revoke-license
Body: {
  licenseKey: string,
  reason: string
}
```

### Webhook Integration
Dodo should send webhooks for:
- License expiration reminder (7 days before)
- License revocation
- Payment failed
- License upgraded/downgraded

```javascript
// Listen for messages from Dodo
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'DODO_WEBHOOK') {
    handleDodoWebhook(msg.data);
  }
});
```

---

## 📊 License Status Flows

### Trial Period (30 days)
```
Installation → Trial Start → Count Down → 7 Days Left (Warning) 
             → Expiry → Show License Prompt → Option to Upgrade
```

### Active License
```
License Activation → Verification → Full Features Enabled 
                  → Weekly Verification → License Valid/Expired
```

### Expired State
```
Trial/License Expired → Feature Disabled (Except Profile) 
                     → User can upload license → Features Re-enabled
```

---

## 🎨 UI/UX Features

### 1. Profile Page (New)
- License status display
- Trial countdown
- User information
- License activation form
- Privacy settings
- Theme selector
- Account management

### 2. Enhanced Popup
- Profile button
- License warning banner
- Live log with unblock buttons
- Per-site blocking status

### 3. Live Log Unblock Feature
Users can:
- View all blocked resources
- Click unblock button to allow specific item
- Item is added to per-site whitelist
- Changes apply immediately

---

## 🔧 Configuration & Setup

### Environment Variables
Create a `.env` file (in development only):
```
DODO_API_URL=https://api.dodo.pe
DODO_API_KEY=your_api_key_here
TRIAL_DAYS=30
MAX_RETRIES=3
```

### Storage Schema

#### `chrome.storage.local`
```javascript
{
  license: {
    licenseKey: string | null,
    verified: boolean,
    verifiedAt: timestamp,
    expiresAt: timestamp,
    trialStartedAt: timestamp,
    trialDaysLeft: number,
    status: "trial" | "active" | "expired",
    username: string | null,
    email: string | null,
    plan: "free" | "pro" | "enterprise"
  },
  stats: {
    lifetime: { images, videos, heavy, scripts, iframes, total },
    today: { images, videos, heavy, scripts, iframes, total, date },
    history: [ { date, total }, ... ],
    installedAt: timestamp,
    sites: { hostname: count, ... },
    liveLog: [
      { id, type, url, host, timestamp, blocked },
      ...
    ]
  }
}
```

#### `chrome.storage.sync`
```javascript
{
  enabled: boolean,
  blockImages: boolean,
  blockVideos: boolean,
  blockHeavy: boolean,
  blockScripts: boolean,
  blockIframes: boolean,
  removeBlocked: boolean,
  disabledSites: [hostname, ...],
  theme: "light" | "dark" | "system",
  privacySettings: {
    blockTracking: boolean,
    blockLocation: boolean,
    blockCamera: boolean,
    blockMicrophone: boolean,
    blockCookies: boolean,
    blockFingerprinting: boolean
  }
}
```

---

## 🛡️ Privacy Settings Explanation

### Block Tracking
- Prevents analytics scripts (GA, Mixpanel, Amplitude)
- Blocks tracking pixels
- Removes tracking parameters from URLs

### Block Location
- Disables geolocation API
- Prevents GPS access
- Blocks IP-based location inference

### Block Camera
- Disables camera access
- Prevents webcam usage
- Blocks screen sharing requests

### Block Microphone
- Disables microphone access
- Prevents audio recording
- Blocks voice chat requests

### Block Cookies
- Prevents third-party cookies
- Blocks local storage
- Clears IndexedDB for trackers

### Block Fingerprinting
- Randomizes user agent
- Spoofs canvas fingerprinting
- Prevents WebGL detection
- Blocks timing attacks

---

## 🧪 Testing Checklist

- [ ] Trial countdown works (visible in profile)
- [ ] License activation works
- [ ] License verification with Dodo API
- [ ] Trial expiration blocks features
- [ ] License key encryption in storage
- [ ] Profile page loads and saves data
- [ ] Theme switching works
- [ ] Privacy settings apply correctly
- [ ] Live log unblock feature works
- [ ] Per-site toggle works
- [ ] Badge updates correctly
- [ ] Stats accumulate properly
- [ ] Message passing between popup/background works
- [ ] Alarm-based license check works

---

## 📝 Dodo Payment Link

Users can purchase licenses at:
```
https://dodo.pe/datasaverpro
```

Link is shown in:
1. Trial expiration warning (profile page)
2. License banner (popup)
3. Profile form placeholder

---

## 🔄 Maintenance & Monitoring

### Logging
```javascript
// Implement comprehensive logging
async function log(category, message, level = 'info') {
  const entry = {
    timestamp: Date.now(),
    category,
    message,
    level
  };
  
  const logs = await chrome.storage.local.get({ logs: [] });
  logs.logs.push(entry);
  logs.logs = logs.logs.slice(-100); // Keep last 100
  await chrome.storage.local.set({ logs });
}
```

### Monitoring
- Track license verification failures
- Monitor trial expirations
- Log suspicious activities
- Alert on tampering attempts

---

## 🚨 Error Handling

All critical operations should have error handling:

```javascript
try {
  await verifyLicense(key);
} catch (error) {
  if (error.type === 'NETWORK_ERROR') {
    // Use cached verification
  } else if (error.type === 'INVALID_KEY') {
    // Show error to user
  }
  logError(error);
}
```

---

## 📚 Additional Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Declarative Net Request](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/)
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging/)

---

## 🎯 Future Enhancements

1. **Sync Settings Across Devices**
   - Use Google Drive sync
   - Backup settings to account

2. **Advanced Analytics**
   - Per-site data savings
   - Monthly reports
   - Trend analysis

3. **Custom Rules**
   - User-defined blocking rules
   - Domain blacklist/whitelist
   - RegEx patterns

4. **Browser Support**
   - Firefox addon
   - Edge extension
   - Safari app

5. **Team Features**
   - Multi-user management
   - Admin dashboard
   - Usage reporting

---

**Version:** 3.0.0  
**Last Updated:** 2024  
**Maintained By:** DataSaver Pro Team
