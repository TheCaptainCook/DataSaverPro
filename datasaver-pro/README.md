# DataSaver Pro v3.0 - Enterprise Freemium Extension

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-proprietary-red)
![Status](https://img.shields.io/badge/status-production--ready-green)

A powerful Chrome extension that blocks data-heavy content (images, videos, scripts, fonts) to save bandwidth. Now featuring a complete freemium model with licensing, trial periods, and privacy protection.

## ✨ Key Features

### 🎯 Core Blocking
- **Images** - Block PNG, JPG, GIF, WebP
- **Videos** - Block HTML5, YouTube, Vimeo, streaming services
- **Heavy Content** - Block fonts, CDN assets, tracking scripts
- **Scripts** - Block analytics, ads, and third-party widgets
- **Iframes** - Block embedded frames and external widgets
- **Smart Removal** - Replace blocked content with placeholders or remove entirely

### 💰 Freemium Model
- **30-Day Free Trial** - Full feature access
- **Trial Countdown** - Users see remaining days
- **License Activation** - Dodo Payments integration
- **License Verification** - Hourly verification with caching
- **Expired State** - Only profile page accessible
- **Revenue-Ready** - Point users to purchase link

### 👤 User Profiles
- **License Management** - View license status and expiration
- **User Account** - Save name, email, license info
- **Edit Profile** - Update user information
- **Account Logout** - Clear license and revert to trial

### 🔒 Privacy & Security
- **Block Tracking** - Prevent analytics and trackers
- **Location Protection** - Disable geolocation API
- **Camera Blocking** - Prevent webcam access
- **Microphone Blocking** - Prevent audio recording
- **Cookie Control** - Optional third-party cookie blocking
- **Fingerprinting Prevention** - Anti-device fingerprinting

### 🎨 Appearance
- **Light Theme** - Bright interface for daytime use
- **Dark Theme** - Easy on the eyes for nighttime
- **System Theme** - Follow OS preference automatically
- **Persistent Settings** - Settings sync across Chrome profile

### 📊 Analytics & Insights
- **Live Stats** - Real-time blocking statistics
- **Daily Breakdown** - Track today's saved data
- **30-Day History** - Visual chart of blocking trends
- **Per-Site Tracking** - See which sites consume most data
- **Data Savings Estimate** - Estimated MB saved based on averages
- **Lifetime Stats** - Total resources blocked

### ⚡ Advanced
- **Per-Site Toggle** - Disable blocking for specific sites
- **Live Log** - View all blocked resources in real-time
- **Unblock Items** - Right-click to allow specific resources
- **Smart Badge** - See count of blocked items in toolbar
- **Instant Updates** - Changes apply immediately to all tabs

---

## 📦 File Structure

```
datasaver-pro-v6-enhanced/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (licensing, rules)
├── popup.html                 # Main popup UI
├── popup.js                   # Popup controller
├── profile.html               # Profile & license management page
├── profile.js                 # Profile controller
├── stats.html                 # Statistics page
├── stats.js                   # Stats controller
├── content.js                 # Content script (DOM manipulation)
├── licensing.js               # License utilities & security
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── IMPLEMENTATION_GUIDE.md    # Detailed setup guide
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Installation

1. **Clone/Download** the extension files
2. **Open** `chrome://extensions/`
3. **Enable** "Developer mode" (top right)
4. **Click** "Load unpacked"
5. **Select** the `datasaver-pro-v6-enhanced` folder

### First Run

1. Extension opens profile page
2. User enters name and license key
3. Or clicks "Get License" to purchase
4. Trial starts if no license entered
5. Features fully accessible for 30 days

### Configuration

Before deployment, update these values:

**In `background.js`:**
```javascript
const DODO_API_URL = "https://api.dodo.pe"; // Your Dodo endpoint
const TRIAL_DAYS = 30; // Trial period length
const LICENSE_CHECK_INTERVAL = 3600000; // Verification interval (1 hour)
```

**In `profile.js`:**
```javascript
const TRIAL_DAYS = 30; // Must match background.js
```

---

## 📋 License System

### Trial Period
- **Duration:** 30 days from first installation
- **Features:** All premium features enabled
- **Warning:** Shows at 5 days remaining
- **Expiration:** Disables all features except profile page

### License Activation
```javascript
// User enters license key in profile page
POST /dodo.pe/datasaverpro
- User fills in name and email
- Enters license key (format: DSP-XXXX-XXXX-XXXX-XXXX)
- Extension verifies with Dodo API
- License stored securely
- Features immediately enabled
```

### License Verification
- **Frequency:** Hourly check via alarm
- **Caching:** Verified results cached for 1 hour
- **Fallback:** Uses cache if verification fails
- **Expiration:** Automatically disables at expiry date

### Storage

**License data stored in:**
```javascript
chrome.storage.local.get('license') // Encrypted
```

**Data includes:**
- License key (hashed)
- Verification status
- Expiration date
- User information
- Plan type (pro/enterprise)

---

## 🔐 Security Architecture

### License Key Validation
```javascript
// Format validation
DSP-XXXX-XXXX-XXXX-XXXX

// Checksum verification
calculateChecksum(key) // Prevents tampering

// Server-side verification
POST https://api.dodo.pe/verify-license
```

### Data Encryption
```javascript
// Sensitive data encrypted before storage
await encryptUserData(userData, licenseKey)

// Decrypted only when needed
await decryptData(encrypted, licenseKey)
```

### Anti-Tampering Detection
```javascript
// Checks for:
- Modified manifest.json
- Suspicious permissions
- Blacklisted license keys
- Brute-force attempts

// Actions on tampering:
- Revoke license
- Disable all features
- Log security event
```

### Rate Limiting
```javascript
// Max 5 verification attempts per 5 minutes
// Prevents brute-force attacks
// Lockout period resets after timeout
```

---

## 💳 Dodo Payments Integration

### Setup Steps

1. **Register at:** https://dodo.pe/developers
2. **Create Application** for "DataSaver Pro"
3. **Get API Credentials:**
   - API URL
   - API Key
   - Webhook Secret

4. **Configure Webhook:**
   - Endpoint: `https://your-domain.com/webhook`
   - Events: `license.expired`, `license.revoked`, `payment.failed`

5. **Update Extension:**
   ```javascript
   const DODO_API_URL = "https://api.dodo.pe";
   ```

### Payment Link
Users purchase licenses at:
```
https://dodo.pe/datasaverpro
```

Show this link in:
- Profile page (when no license)
- Trial expiration warning
- License banner (popup)

### License Plans

**Pro Plan** - $4.99/month
- All features
- Email support
- 1 installation

**Enterprise Plan** - $14.99/month
- All features
- Priority support
- 5 installations
- API access

---

## 🧪 Testing Checklist

### Core Functionality
- [ ] Extension loads without errors
- [ ] Popup opens and displays stats
- [ ] Profile page accessible
- [ ] Settings save and persist

### Trial System
- [ ] Trial starts on first install
- [ ] Countdown visible in profile
- [ ] Features enabled during trial
- [ ] Features disabled after expiry
- [ ] Warning shows at 5 days left

### License System
- [ ] License key activation works
- [ ] Dodo API verification succeeds
- [ ] License displays in profile
- [ ] License verified hourly
- [ ] Expired license disables features
- [ ] License revocation works

### Blocking
- [ ] Images block correctly
- [ ] Videos block correctly
- [ ] Scripts block correctly
- [ ] Per-site toggle works
- [ ] Badge updates correctly

### Privacy
- [ ] Privacy settings save
- [ ] Tracking rules apply
- [ ] Location blocking works
- [ ] Camera blocking works

### UI/UX
- [ ] Theme switching works
- [ ] Settings sync across tabs
- [ ] Live log updates
- [ ] Unblock feature works
- [ ] Responsive on mobile

---

## 📊 Usage Statistics

The extension tracks:
- **Total Resources Blocked** - Lifetime count
- **Today's Blocks** - Current day breakdown
- **Per-Type Stats** - Images, videos, scripts, etc.
- **Per-Site Stats** - Top 50 sites tracked
- **30-Day History** - Daily totals
- **Data Saved Estimate** - Based on average sizes

### Data Averaging
- Images: 150 KB
- Videos: 2 MB
- Scripts: 80 KB
- Fonts: 60 KB
- Other: 100 KB

---

## 🔧 Advanced Configuration

### Customizing Block Rules

Edit `background.js` to add/remove blocking rules:

```javascript
// Add custom tracking domain
addRules.push({
  id: 100,
  priority: 1,
  action: { type: "block" },
  condition: { urlFilter: "||mytracker.com^", ... }
});
```

### Whitelist Domains

Whitelist is per-site using the site toggle:
1. Click extension icon
2. Toggle off for specific site
3. Changes apply immediately

### Custom Privacy Rules

Add additional privacy rules in `privacySettings`:

```javascript
privacySettings: {
  blockTracking: true,
  blockLocation: true,
  blockCamera: true,
  blockMicrophone: true,
  blockFingerprinting: true,
  // Add custom:
  blockWebRTC: false,
  blockBattery: false
}
```

---

## 🐛 Troubleshooting

### License Not Verifying
1. Check internet connection
2. Verify license key format (DSP-XXXX-XXXX-XXXX-XXXX)
3. Ensure license not expired
4. Check Dodo API status

### Trial Not Starting
1. Check `chrome.storage.local` for license data
2. Verify `installedAt` timestamp
3. Check system clock accuracy

### Features Not Working
1. Verify extension enabled (ON pill in popup)
2. Check site not in disabled list
3. Verify license is active
4. Check Chrome extension permissions

### Stats Not Updating
1. Refresh stats page
2. Check content.js is loaded
3. Verify messaging between popup and background
4. Clear extension cache

---

## 📝 Changelog

### Version 3.0.0
- ✨ Added complete licensing system
- ✨ Integrated Dodo Payments
- ✨ Profile page with user management
- ✨ Privacy settings with toggles
- ✨ Theme system (light/dark/system)
- ✨ Per-item unblock in live log
- ✨ Security hardening & encryption
- 🔧 Enhanced messaging system
- 🐛 Fixed stats accumulation
- 📚 Complete documentation

### Version 2.0.0
- Initial public release
- Core blocking functionality
- Stats dashboard
- Settings management

---

## 📧 Support

For issues, questions, or feature requests:

1. **Users:** https://dodo.pe/datasaverpro/support
2. **Developers:** See IMPLEMENTATION_GUIDE.md
3. **Security Issues:** security@dodo.pe

---

## 📄 License

Proprietary Software. All rights reserved.

This extension and its source code are proprietary and confidential. Unauthorized copying, modification, distribution, or use is strictly prohibited.

---

## 🙏 Credits

**DataSaver Pro** is built with:
- Chrome Extension APIs
- Declarative Net Request
- Chrome Storage API
- Dodo Payments Platform

---

**Made with ❤️ by DataSaver Pro Team**  
**Version 3.0.0 • 2024**
