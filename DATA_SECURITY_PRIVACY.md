# DataSaver Pro - Data Security & Privacy Documentation

## 🔒 Your Data is Completely Safe - LOCAL ONLY

### ⭐ KEY PROMISE: YOUR DATA NEVER LEAVES YOUR COMPUTER

This is the most important thing to understand about DataSaver Pro:

> **ALL your data stays on YOUR device. NOTHING is sent to the cloud or any server, EXCEPT:**
> - License verification (secure, encrypted, minimal data)
> - Payment information (through Dodo Payments, industry-standard security)

---

## 📊 What Data We Store

### Locally Stored Data (On Your Computer)

All of this data stays ONLY on your device:

#### 1. **Browsing Statistics**
- Number of images blocked
- Number of videos blocked
- Number of scripts blocked
- etc.

✅ **Stored:** Your device only  
✅ **Never sent:** Anywhere else  
✅ **Visible to:** Only you  

#### 2. **Website List**
- Top sites you visit (for stats)
- History of blocked items per site

✅ **Stored:** Your device only  
✅ **Never sent:** Anywhere else  
✅ **Use:** Statistics only  

#### 3. **Settings & Preferences**
- Toggle settings (on/off)
- Which sites you disabled blocking on
- Theme preference (light/dark)
- Privacy settings choices

✅ **Stored:** Your device only (synced with Chrome profile)  
✅ **Never sent:** To any external server  
✅ **Chrome sync:** Encrypted by Google  

#### 4. **License Information**
- License key (hashed, not plaintext)
- License status
- Your username (if provided)
- Expiration date

✅ **Stored:** Your device only  
✅ **Encrypted:** Using AES-256  
✅ **Sent only for:** License verification  

---

## 🌐 What Data is Sent (Minimal & Secure)

### Only These Things Leave Your Device:

#### 1. **License Verification** (Encrypted)
When you enter a license key, we send:
- License key (hashed)
- Extension ID
- Installation ID

✅ **Why:** To verify it's a valid license  
✅ **How:** HTTPS encrypted  
✅ **Who:** Only Dodo Payments  
✅ **Frequency:** Hourly (cached)  

#### 2. **Payment Information** (Industry-Standard)
When purchasing a license:
- Email address
- Payment method
- Plan selection

✅ **Why:** To process payment  
✅ **How:** Industry-standard encryption  
✅ **Who:** Dodo Payments (PCI compliant)  
✅ **Never stored locally:** In plaintext  

#### 3. **Nothing Else**
- ✅ NOT your browsing history
- ✅ NOT websites you visit
- ✅ NOT your personal data
- ✅ NOT your device ID
- ✅ NOT your location
- ✅ NOT your IP (except for payment processing)

---

## 🔐 Security Features

### Encryption

**Data at Rest (Stored):**
- License information: **AES-256-GCM** encryption
- Settings: Chrome's **built-in encryption**
- Stats: **Local storage only**

**Data in Transit (Sent):**
- All API calls: **HTTPS TLS 1.2+**
- License verification: **Encrypted payload**
- Payment: **PCI-DSS compliant**

### Authentication

**License Verification:**
- Uses **API keys** (not user credentials)
- **Checksum validation** prevents tampering
- **Rate limiting** prevents brute force
- **Blacklist system** for compromised keys

**API Access:**
- **Bearer token** authentication
- **HTTPS only** (no HTTP allowed)
- **Timeout protection** (auto-disconnect)
- **Error handling** (no data leakage)

### Storage Security

**Chrome Storage API:**
- ✅ Encrypted by browser
- ✅ Protected by OS security
- ✅ User-specific storage
- ✅ No third-party access

**Local Storage:**
- ✅ Isolated per profile
- ✅ Not accessible to other extensions
- ✅ Protected by browser sandbox
- ✅ Cleared on extension uninstall

---

## 🛡️ Advanced Privacy Features

### 1. Block Tracking
Prevents websites from tracking you:
- ✅ Google Analytics blocked
- ✅ Facebook Pixel blocked
- ✅ Mixpanel blocked
- ✅ Hotjar blocked
- ✅ Other trackers blocked

### 2. Block Location Access
Prevents apps from knowing your location:
- ✅ Geolocation API disabled
- ✅ GPS access blocked
- ✅ IP-based location prevented
- ✅ WiFi location lookup blocked

### 3. Block Camera Access
Prevents unauthorized camera use:
- ✅ Camera API blocked
- ✅ Requests denied silently
- ✅ Permission popup prevented
- ✅ WebRTC leak prevention

### 4. Block Microphone Access
Prevents unauthorized audio recording:
- ✅ Microphone API blocked
- ✅ Audio input disabled
- ✅ WebRTC audio blocked
- ✅ Requests denied silently

### 5. Block Device Info
Prevents fingerprinting:
- ✅ Device memory hidden
- ✅ CPU cores hidden
- ✅ User agent randomized
- ✅ Canvas fingerprinting blocked
- ✅ WebGL blocked

### 6. Block Cookies (Optional)
Prevents tracking via cookies:
- ✅ Third-party cookies blocked
- ✅ First-party cookies can be allowed
- ✅ Cookie storage protected
- ✅ Old cookies cleared

### 7. Block WebRTC Leaks
Prevents IP leakage:
- ✅ WebRTC disabled
- ✅ IP binding protected
- ✅ NAT traversal blocked
- ✅ Real IP never exposed

### 8. Block Battery Status
Prevents battery info disclosure:
- ✅ Battery API disabled
- ✅ Charging status hidden
- ✅ Device capabilities hidden
- ✅ Profile identification blocked

### 9. Block Hardware Info
Prevents hardware fingerprinting:
- ✅ CPU cores hidden
- ✅ Device memory hidden
- ✅ Screen resolution hidden
- ✅ Color space hidden

### 10. Block Fingerprinting
Comprehensive anti-fingerprinting:
- ✅ Canvas fingerprinting blocked
- ✅ Audio context blocked
- ✅ WebGL fingerprinting blocked
- ✅ Font enumeration blocked
- ✅ Plugin detection blocked

---

## 📋 What We DON'T Collect

### We Never:
- ❌ Collect browsing history
- ❌ Collect visited websites
- ❌ Collect personal information
- ❌ Collect device identifiers
- ❌ Collect location data
- ❌ Collect device hardware specs
- ❌ Collect user credentials
- ❌ Sell data to third parties
- ❌ Share data with advertisers
- ❌ Use data for targeting
- ❌ Track user behavior
- ❌ Create user profiles

### We Only Collect (Locally):
- ✅ Total blocked count
- ✅ Daily statistics
- ✅ Per-site breakdown
- ✅ User settings
- ✅ License information

---

## ☁️ Cloud Upload - NONE

### Zero Cloud Sync
Your data stays on your device:
- ✅ Statistics never uploaded
- ✅ Website list never uploaded
- ✅ Settings stay local
- ✅ No cloud backup
- ✅ No cloud sync

### Chrome Sync
Chrome may sync your settings IF you enable it:
- ✅ Chrome encryption (Google's security)
- ✅ Optional feature
- ✅ You control it
- ✅ Settings only (not stats)

---

## 🔄 Data Deletion

### How to Delete Your Data

**Delete Stats:**
1. Open extension → Stats page
2. Click "Reset Stats"
3. Confirms: "Reset all data?"
4. All statistics cleared immediately

**Delete License:**
1. Open extension → Profile page
2. Click "Logout"
3. License removed from device
4. Trial resets

**Delete All:**
1. Uninstall extension
2. All data deleted automatically
3. Nothing left on device
4. No cloud copies

### What Gets Deleted:
- ✅ All statistics
- ✅ All settings
- ✅ License information
- ✅ Cache data
- ✅ Browser history (Chrome's responsibility)

---

## 🚨 No Warnings = Good Sign

### When Extension is Disabled:
- ❌ No warning badge shown
- ✅ Clear, silent disabling
- ✅ No notifications spam
- ✅ Clean, respectful UX

### Warning System:
- ⚠️ Shows when features are actually disabled
- ⚠️ Notifies before blocking applies
- ⚠️ Clear reason provided
- ⚠️ Easy to re-enable

---

## 🔍 Transparency Report

### What We Track:
```
✅ Blocked items (local only)
✅ User settings (local only)
✅ License status (encrypted)
```

### What We Don't Track:
```
❌ Your identity
❌ Your behavior
❌ Your location
❌ Your devices
❌ Your habits
❌ Your relationships
❌ Your interests
```

### How You Know:
1. **Open Source Available:** Code is reviewable
2. **No Analytics:** No tracking code included
3. **Local Only:** All data stays local
4. **Transparent Privacy:** This page says it all

---

## 📞 Privacy Concerns?

### Contact Us:
- **Email:** privacy@dodo.pe
- **Response Time:** 24-48 hours
- **Data Subject Rights:** All honored
- **EU GDPR:** Full compliance
- **US Privacy Laws:** Full compliance

### Request:
- ✅ Access your data
- ✅ Delete your data
- ✅ Verify no sharing
- ✅ Verify no tracking

---

## ✅ Certifications & Compliance

### Security Standards:
- ✅ **HTTPS/TLS:** All communications encrypted
- ✅ **AES-256:** Sensitive data encrypted
- ✅ **Chrome Security:** Sandbox + isolation
- ✅ **API Security:** Rate limiting + validation

### Privacy Standards:
- ✅ **GDPR:** Full compliance
- ✅ **CCPA:** Full compliance
- ✅ **PIPEDA:** Full compliance
- ✅ **LGPD:** Full compliance

### Audit:
- ✅ Code reviewed for security
- ✅ Privacy assessed
- ✅ No trackers found
- ✅ No data exfiltration

---

## 🎯 Summary

### The Bottom Line:

**DataSaver Pro is designed with privacy-first principles:**

1. **All data is local** - Never leaves your device
2. **Encrypted storage** - Even local data is encrypted
3. **Minimal transmission** - Only license verification
4. **No tracking** - No analytics, no telemetry
5. **No ads** - No tracking required
6. **No ads tech** - No data selling
7. **User control** - You control everything
8. **Transparent** - This document explains it all

---

## 🔐 Your Privacy is Protected

### We Promise:
> Your data is yours. Your privacy is protected. Your settings stay local. Your peace of mind is guaranteed.

---

**Last Updated:** April 2024  
**Version:** 1.0  
**Status:** Current

For more information, see our full Privacy Policy.
