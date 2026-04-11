# Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `datasaver-pro-v6-enhanced` folder
5. ✅ Extension installed!

### Step 2: Test Features
1. Click extension icon (top right)
2. You should see:
   - Status toggle (ON/OFF)
   - Options tab with block settings
   - Live log tab
   - Footer with Profile & Stats buttons

### Step 3: Open Profile
1. Click **👤 Profile** button in popup
2. You should see:
   - Trial status (23 days left, for example)
   - License input form
   - Privacy settings
   - Theme selector

### Step 4: Try License Activation
1. Click "Edit Profile" (if already activated)
2. Enter a test license key: `DSP-TEST-1234-5678-9ABC`
3. Click **Save & Activate**
4. (In production, this verifies with Dodo API)

---

## 🔑 Key Files to Know

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration |
| `background.js` | Main logic (licensing, rules) |
| `popup.html/js` | Main popup interface |
| `profile.html/js` | User profile & license page |
| `licensing.js` | License utilities |
| `stats.html/js` | Statistics dashboard |

---

## 🛠️ Configuration Before Deployment

### 1. Update Dodo API URL
**File:** `background.js`
```javascript
Line ~13:
const DODO_API_URL = "https://api.dodo.pe"; // ← Change this
```

### 2. Set Trial Days
**File:** `background.js`
```javascript
Line ~14:
const TRIAL_DAYS = 30; // ← Adjust if needed
```

Also update in `profile.js`:
```javascript
Line ~434:
const TRIAL_DAYS = 30; // ← Keep in sync
```

### 3. Configure License Verification
**File:** `background.js`
```javascript
Line ~15:
const LICENSE_CHECK_INTERVAL = 3600000; // 1 hour
```

---

## 🧪 Testing Guide

### Test Trial System
```
1. Install extension
2. Don't enter license key
3. Check profile page → "Trial Active"
4. Calendar should show ~30 days
5. After 30 days → "Trial Expired" message
```

### Test License Activation
```
1. In profile page, enter license
2. Click "Save & Activate"
3. Verify shows success/error
4. Check background.js console for API response
5. License info should display
```

### Test Privacy Settings
```
1. Go to Profile page
2. Toggle "Block Tracking"
3. Go to popup, refresh
4. Setting should persist
5. Check background.js → rules updated
```

### Test Theme
```
1. Profile page → Theme selector
2. Choose "Dark", "Light", or "System"
3. Page should update immediately
4. Refresh page → setting persists
5. Test on popup too
```

### Test Live Log
```
1. Open a website with images/videos
2. Click popup → Live Log tab
3. Should see blocked items
4. Click ✓ to unblock item
5. Item marked as "unblocked"
```

---

## 🐛 Debugging Tips

### Enable Console Logging
**File:** `background.js`

Add at top:
```javascript
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[DataSaver]', ...args);
}
```

Then use:
```javascript
log('License status:', license);
log('Trial days left:', daysLeft);
```

### Check Storage
In Chrome console (`chrome://extensions` → inspect background):
```javascript
chrome.storage.local.get(null, (data) => {
  console.log('Local storage:', data);
});

chrome.storage.sync.get(null, (data) => {
  console.log('Sync storage:', data);
});
```

### Monitor Messages
Add to background.js:
```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log('Message received:', msg.type, msg);
  // ... rest of handler
});
```

### Check Network Requests
**For Dodo API calls:**
1. Open `chrome://extensions/`
2. Find extension → click "background.html"
3. Open DevTools → Network tab
4. Attempt license activation
5. See POST request to Dodo API

---

## 📦 Deploying to Chrome Web Store

### Pre-Submission Checklist
- [ ] Update version in `manifest.json`
- [ ] Remove DEBUG logging
- [ ] Test all features locally
- [ ] Security review completed
- [ ] Privacy policy written
- [ ] Support email configured

### Minification (Recommended)
```bash
# Minify JS files
npx terser popup.js -o popup.min.js -c -m

# Update manifest.json to reference .min.js files
```

### Package for Upload
```bash
# Create ZIP for submission
zip -r datasaver-pro-v3.0.zip datasaver-pro-v6-enhanced/
```

### Submit to Web Store
1. Go to [Chrome Web Store Developer](https://chrome.google.com/webstore/devconsole/)
2. Click "New item"
3. Upload ZIP file
4. Fill in store listing
5. Submit for review

---

## 🆘 Common Issues & Solutions

### Issue: License verification fails
**Solution:**
1. Check internet connection
2. Verify DODO_API_URL is correct
3. Check API credentials
4. Look at Network tab for response

### Issue: Trial not counting down
**Solution:**
1. Check `trialStartedAt` timestamp
2. Verify system clock is correct
3. Force reload extension
4. Clear storage and reinstall

### Issue: Settings not persisting
**Solution:**
1. Check Chrome profile is synced
2. Verify `chrome.storage.sync` permissions
3. Check for quota exceeded (10MB limit)
4. Try `chrome.storage.local` as fallback

### Issue: Profile page won't load
**Solution:**
1. Check profile.html and profile.js exist
2. Verify in manifest.json `web_accessible_resources`
3. Check browser console for errors
4. Try incognito mode

### Issue: Blocking doesn't work
**Solution:**
1. Verify master toggle is ON
2. Check declarativeNetRequest rules applied
3. Site might be in disabled list → enable
4. Try a different website

---

## 📞 Support & Resources

- **Chrome Docs:** https://developer.chrome.com/docs/extensions/
- **Manifest V3:** https://developer.chrome.com/docs/extensions/develop/migrate/mv2-migration/
- **Storage API:** https://developer.chrome.com/docs/extensions/reference/storage/
- **Messaging:** https://developer.chrome.com/docs/extensions/develop/concepts/messaging/

---

## 🎯 Next Steps

1. **Local Testing** → Load unpacked and test features
2. **Dodo Integration** → Set up API credentials
3. **Security Review** → Audit code for vulnerabilities
4. **Deployment** → Submit to Web Store or distribute manually
5. **Monitoring** → Track license activations and usage

---

**Ready to launch? Start with Step 1 above!** 🚀

For detailed information, see:
- `README.md` - Full feature documentation
- `IMPLEMENTATION_GUIDE.md` - Technical deep dive
- `FEATURES_SUMMARY.md` - What's implemented
