# Toggle-Only Mode & Disability Warning - Implementation Guide

## 🎯 Overview

This guide explains:
1. **Toggle-Only Mode** - Simplified popup with just on/off toggles
2. **Disability Warning** - Alert when extension is disabled
3. **Data Security Messaging** - Assurance text everywhere

---

## 1. Toggle-Only Mode for Popup

### What is Toggle-Only Mode?

Instead of showing all settings, show just:
- Master toggle (ON/OFF)
- Per-site toggle
- Profile button
- Minimal UI

### Enable Toggle-Only Mode

**In background.js:**
```javascript
const DEFAULT = {
  // ... other settings
  showToggleOnly: true, // Set to true for toggle-only mode
  // ... rest of settings
};
```

**In popup.html:**
```html
<!-- Toggle-Only View (Simple) -->
<div id="toggleOnlyView" style="display: none;">
  <div class="simple-toggle">
    <h2>DataSaver Pro</h2>
    <div class="big-toggle">
      <label class="tog">
        <input type="checkbox" id="masterToggleSimple" checked/>
        <span class="sl"></span>
      </label>
      <span class="toggle-label">Data Saver is ON</span>
    </div>
    
    <div class="security-message">
      ✅ Your data is safe - stored locally only
    </div>
    
    <button id="profileBtnSimple" class="btn-primary">👤 Manage License</button>
    <button id="statsBtnSimple" class="btn-secondary">📊 View Stats</button>
  </div>
</div>

<!-- Full Settings View -->
<div id="fullView">
  <!-- Existing content -->
</div>
```

**In popup.js:**
```javascript
async function initializeUI() {
  const settings = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  
  if (settings.showToggleOnly) {
    document.getElementById('fullView').style.display = 'none';
    document.getElementById('toggleOnlyView').style.display = 'block';
    initToggleOnlyMode();
  } else {
    document.getElementById('fullView').style.display = 'block';
    document.getElementById('toggleOnlyView').style.display = 'none';
    initFullMode();
  }
}

function initToggleOnlyMode() {
  // Simple toggle listeners
  document.getElementById('masterToggleSimple').addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: { enabled: e.target.checked }
    });
  });
  
  document.getElementById('profileBtnSimple').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_PROFILE" });
  });
  
  document.getElementById('statsBtnSimple').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_STATS" });
  });
}
```

---

## 2. Disability Warning System

### Warning Types

#### Warning 1: Trial Expired
When trial runs out:
```
⚠️ TRIAL EXPIRED
Your 30-day trial has ended.
License required to continue using DataSaver Pro.

[Get License] [Learn More]
```

#### Warning 2: License Expired
When license expires:
```
⚠️ LICENSE EXPIRED
Your license has expired.
Renew your subscription to continue.

[Renew License] [View Details]
```

#### Warning 3: License Verification Failed
When license can't be verified:
```
⚠️ LICENSE VERIFICATION FAILED
DataSaver Pro is temporarily disabled.

We couldn't verify your license.
This could be due to:
- No internet connection
- License expired
- License revoked

[Retry] [Get Help]
```

#### Warning 4: Feature Disabled
When specific feature is disabled:
```
⚠️ FEATURE DISABLED
Image blocking is disabled because:
License has expired

[Renew License]
```

### Implementation

**Add to popup.html:**
```html
<div id="warningBanner" style="display: none;">
  <div class="warning-box">
    <div class="warning-icon">⚠️</div>
    <div class="warning-content">
      <div class="warning-title" id="warningTitle"></div>
      <div class="warning-message" id="warningMessage"></div>
      <div class="warning-actions" id="warningActions"></div>
    </div>
  </div>
</div>
```

**Add to popup.js:**
```javascript
async function checkAndShowWarnings() {
  const license = await chrome.runtime.sendMessage({ type: "GET_LICENSE" });
  const isEnabled = await chrome.runtime.sendMessage({ type: "CHECK_PLUGIN_ENABLED" });
  
  // Check if disabled
  if (!isEnabled) {
    showWarning({
      icon: '🔴',
      title: 'Extension Disabled',
      message: license.status === 'expired' 
        ? 'Your trial or license has expired.'
        : 'Features are currently disabled.',
      actions: [
        { text: 'Get License', action: 'profile' },
        { text: 'Learn More', action: 'docs' }
      ]
    });
    return;
  }
  
  // Check trial warning
  const daysLeft = await chrome.runtime.sendMessage({ type: "GET_TRIAL_DAYS" });
  if (license.status === 'trial' && daysLeft <= 5 && daysLeft > 0) {
    showWarning({
      icon: '⏰',
      title: `${daysLeft} Days Left in Trial`,
      message: 'Your trial expires soon. Get a license to continue using DataSaver Pro.',
      actions: [
        { text: 'Get License Now', action: 'license' }
      ]
    });
  }
}

function showWarning(warning) {
  const banner = document.getElementById('warningBanner');
  document.getElementById('warningTitle').textContent = warning.title;
  document.getElementById('warningMessage').textContent = warning.message;
  
  const actionsDiv = document.getElementById('warningActions');
  actionsDiv.innerHTML = warning.actions.map(action => 
    `<button class="btn-warning" data-action="${action.action}">${action.text}</button>`
  ).join('');
  
  banner.style.display = 'block';
  
  // Add click handlers
  actionsDiv.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'profile') chrome.runtime.sendMessage({ type: "OPEN_PROFILE" });
      if (action === 'license') window.open('https://dodo.pe/datasaverpro');
      if (action === 'docs') chrome.tabs.create({ url: chrome.runtime.getURL("DATA_SECURITY_PRIVACY.md") });
    });
  });
}
```

**Add CSS:**
```css
.warning-box {
  background: linear-gradient(135deg, rgba(247,185,0,.15), rgba(247,79,110,.1));
  border: 1px solid rgba(247,185,0,.3);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-weight: 600;
  color: #f7b900;
  margin-bottom: 4px;
}

.warning-message {
  font-size: 12px;
  color: #b8b8d8;
  margin-bottom: 8px;
}

.warning-actions {
  display: flex;
  gap: 6px;
}

.btn-warning {
  padding: 6px 12px;
  background: rgba(247,185,0,.2);
  border: 1px solid rgba(247,185,0,.4);
  color: #f7b900;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: all .2s;
}

.btn-warning:hover {
  background: rgba(247,185,0,.3);
  border-color: rgba(247,185,0,.5);
}
```

---

## 3. Data Security Messaging

### Where to Add Security Assurance

#### A. Popup Header
```html
<div class="security-assurance">
  ✅ Your data is safe - Stored locally only, never uploaded
</div>
```

#### B. Profile Page
```html
<div class="info-box">
  <div class="info-icon">🔒</div>
  <div class="info-text">
    <strong>Your data is safe with you</strong>
    <p>Everything is stored locally on your device. No data is sent to the cloud.</p>
    <ul>
      <li>✅ Statistics stored locally</li>
      <li>✅ Settings never uploaded</li>
      <li>✅ License verified securely</li>
      <li>✅ No tracking enabled</li>
    </ul>
  </div>
</div>
```

#### C. Stats Page
```html
<div class="data-notice">
  <svg class="lock-icon" viewBox="0 0 24 24">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
  <div>
    <h3>Your Data is Private</h3>
    <p>All statistics on this page are stored locally on your device. Nothing is sent to any server.</p>
  </div>
</div>
```

#### D. License Activation
```html
<div class="trust-message">
  🔐 <strong>Your license is verified securely</strong>
  <p>License verification is encrypted and never stores your key in plain text.</p>
</div>
```

#### E. Privacy Settings
```html
<div class="privacy-notice">
  <h3>Enhanced Privacy</h3>
  <p>These settings control what data websites can access:</p>
  <div class="privacy-explanation">
    <div class="item">
      <strong>📍 Block Location:</strong> Websites can't see your location
    </div>
    <div class="item">
      <strong>📷 Block Camera:</strong> Nobody can use your webcam
    </div>
    <div class="item">
      <strong>🎤 Block Microphone:</strong> Nobody can record your audio
    </div>
    <div class="item">
      <strong>👁️ Block Tracking:</strong> Your browsing isn't tracked
    </div>
  </div>
  <a href="DATA_SECURITY_PRIVACY.md">Learn more about your privacy →</a>
</div>
```

### CSS for Security Messaging
```css
.security-assurance {
  background: rgba(34,217,138,.1);
  border: 1px solid rgba(34,217,138,.2);
  color: #22d98a;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 10px;
  text-align: center;
}

.info-box {
  background: var(--s2);
  border-left: 3px solid var(--accent);
  padding: 12px;
  border-radius: 6px;
  margin: 12px 0;
  display: flex;
  gap: 12px;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
}

.info-text strong {
  color: var(--txb);
  display: block;
  margin-bottom: 4px;
}

.info-text p {
  font-size: 12px;
  color: var(--txt);
  margin-bottom: 8px;
}

.info-text ul {
  list-style: none;
  font-size: 11px;
  color: var(--txt);
}

.info-text li {
  padding: 4px 0;
}

.trust-message {
  background: rgba(34,217,138,.1);
  border: 1px solid rgba(34,217,138,.2);
  padding: 12px;
  border-radius: 6px;
  color: #22d98a;
  font-size: 12px;
  margin: 12px 0;
}

.privacy-notice {
  background: var(--s2);
  padding: 12px;
  border-radius: 6px;
  margin: 12px 0;
}

.privacy-explanation {
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.privacy-explanation .item {
  font-size: 11px;
  color: var(--txt);
  padding: 4px 0;
}

.privacy-explanation strong {
  color: var(--txb);
}
```

---

## 4. Complete Implementation Checklist

- [ ] Add `showToggleOnly` setting to DEFAULT
- [ ] Create toggle-only HTML in popup.html
- [ ] Implement toggle-only JS in popup.js
- [ ] Add warning banner HTML
- [ ] Implement warning system in popup.js
- [ ] Add security assurance messages throughout UI
- [ ] Create DATA_SECURITY_PRIVACY.md page
- [ ] Create DODO_PAYMENTS_COMPLETE.md page
- [ ] Update profile page with security info
- [ ] Add privacy explanations to settings
- [ ] Test all warnings display correctly
- [ ] Verify messages appear in all states
- [ ] Test mobile responsiveness

---

## 5. Testing

### Test Scenarios

**Scenario 1: Trial Expires**
1. Set trial days to 0 in storage
2. Open popup
3. Should show "Trial Expired" warning
4. Button should link to license page

**Scenario 2: License Invalid**
1. Delete license from storage
2. Manually set status to "expired"
3. Open popup
4. Should show "License Expired" warning
5. Features should be disabled

**Scenario 3: Toggle-Only Mode**
1. Set `showToggleOnly: true`
2. Open popup
3. Should only show master toggle
4. No settings should be visible
5. Profile button should work

**Scenario 4: Security Messages**
1. Open all pages
2. Check security messages visible
3. Read messages for clarity
4. Verify links work

---

## 6. Messages to Display

Place these messages everywhere:

### Header Message
```
🔒 Your data is safe with you
All data is stored locally, never uploaded to cloud
```

### Privacy Message
```
✅ Your data stays private
- Statistics stored locally
- Settings never uploaded
- License verified securely
- No tracking enabled
```

### Security Message
```
🔐 Enhanced Privacy Protection
This extension blocks:
✓ Tracking & analytics
✓ Location access
✓ Camera access
✓ Microphone access
✓ Device fingerprinting
```

### Disability Message (When Disabled)
```
⚠️ DATASAVER PRO IS DISABLED

Your trial or license has expired.

Get a license to continue protecting your privacy:
[GET LICENSE]
```

---

**Version:** 1.0  
**Last Updated:** April 2024  
**Status:** Implementation Ready
