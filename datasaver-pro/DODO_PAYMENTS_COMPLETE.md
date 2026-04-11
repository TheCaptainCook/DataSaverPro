# Dodo Payments Integration - DataSaver Pro

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Account Setup](#account-setup)
3. [API Integration](#api-integration)
4. [License Plans](#license-plans)
5. [Payment Flow](#payment-flow)
6. [Webhook Handling](#webhook-handling)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is Dodo Payments?

Dodo is a complete payment and licensing platform that handles:
- License key generation and validation
- Payment processing
- License management
- Webhook notifications
- License verification

### Why Dodo for DataSaver Pro?

- ✅ Simple integration with Chrome extensions
- ✅ Secure license key management
- ✅ Automatic verification and caching
- ✅ Webhook support for real-time updates
- ✅ Multi-plan support (Free, Pro, Enterprise)

---

## Account Setup

### Step 1: Register Developer Account

1. Go to **https://dodo.pe/developers**
2. Sign up with your email
3. Verify your email address
4. Create a new application

### Step 2: Create DataSaver Pro Application

1. Click "New Application"
2. Fill in details:
   - **App Name:** DataSaver Pro
   - **App Type:** Chrome Extension
   - **Category:** Productivity
3. Accept terms and create

### Step 3: Get API Credentials

After creating the app, you'll receive:
- **API Key** - Used to authenticate API requests
- **API Secret** - Keep this secure!
- **Webhook Secret** - For verifying webhook authenticity
- **Base URL** - https://api.dodo.pe

**SAVE THESE SECURELY!** Never share your API Secret or Webhook Secret.

### Step 4: Configure Webhook Endpoint

1. In Dodo dashboard, go to "Webhooks"
2. Add webhook endpoint: `https://your-domain.com/webhook/dodo`
3. Select events to subscribe to:
   - license.created
   - license.activated
   - license.revoked
   - license.expired
   - payment.success
   - payment.failed
4. Save webhook secret

---

## API Integration

### Authentication

All API requests require the following header:

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Base URL

```
https://api.dodo.pe/v1
```

---

## License Plans

### Free Plan (Trial)
- **Duration:** 30 days
- **Features:** All features
- **Cost:** Free
- **Installations:** Unlimited trial devices

### Pro Plan
- **Duration:** Monthly subscription
- **Cost:** $4.99/month (or $49.99/year)
- **Features:** All features
- **Installations:** 1 device
- **Support:** Email support
- **Billing:** Recurring

### Enterprise Plan
- **Duration:** Monthly subscription
- **Cost:** $14.99/month (or $149.99/year)
- **Features:** All features
- **Installations:** 5 devices
- **Support:** Priority email & chat
- **API Access:** Custom integration
- **Billing:** Recurring

---

## Payment Flow

### User Purchase Journey

```
1. Trial Expires (30 days)
   ↓
2. User Sees "Get License" Button
   ↓
3. Click "Get License" → Opens Dodo Payment Page
   ↓
4. User Selects Plan (Pro or Enterprise)
   ↓
5. User Enters Payment Info
   ↓
6. Dodo Processes Payment
   ↓
7. License Key Generated
   ↓
8. Webhook Sent to Extension (payment.success)
   ↓
9. User Receives License Key
   ↓
10. User Enters Key in Profile
    ↓
11. Extension Verifies with Dodo
    ↓
12. Features Unlocked ✓
```

### License Key Format

```
DSP-XXXX-XXXX-XXXX-XXXX

Where XXXX = Random alphanumeric characters
```

### License Key Verification

The extension verifies licenses:
- On first activation
- Hourly during use (with caching)
- Before enabling paid features

---

## API Endpoints

### 1. Generate Payment Link

**Creates a payment session**

```http
POST /payment/create-session
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "planType": "pro",
  "billingCycle": "monthly",
  "email": "user@example.com",
  "returnUrl": "https://yoursite.com/success"
}
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "paymentUrl": "https://pay.dodo.pe/pay/session_abc123",
  "expiresAt": 1704070800000
}
```

### 2. Verify License Key

**Checks if a license key is valid**

```http
POST /verify-license
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "extension": "datasaver-pro"
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "username": "John Doe",
  "email": "john@example.com",
  "plan": "pro",
  "expiresAt": 1735689600000,
  "installationLimit": 1,
  "installationCount": 1
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Invalid license key",
  "errorCode": "INVALID_LICENSE"
}
```

### 3. Activate License

**Registers a license on a device**

```http
POST /activate-license
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "extension": "datasaver-pro",
  "installationId": "chrome-ext-device-id",
  "deviceName": "My Chrome Browser"
}
```

**Response:**
```json
{
  "activated": true,
  "installationId": "chrome-ext-device-id",
  "activatedAt": 1704067200000,
  "expiresAt": 1735689600000
}
```

### 4. Revoke License

**Removes a license from a device**

```http
POST /revoke-license
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "installationId": "chrome-ext-device-id",
  "reason": "User logout"
}
```

**Response:**
```json
{
  "revoked": true,
  "revokedAt": 1704067200000
}
```

### 5. Get License Status

**Gets current license information**

```http
GET /license-status/DSP-XXXX-XXXX-XXXX-XXXX
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "status": "active",
  "plan": "pro",
  "username": "John Doe",
  "email": "john@example.com",
  "expiresAt": 1735689600000,
  "daysRemaining": 365,
  "installations": [
    {
      "installationId": "chrome-ext-12345",
      "deviceName": "My Chrome",
      "activatedAt": 1704067200000
    }
  ]
}
```

---

## Webhook Handling

### Webhook Events

Your extension can subscribe to these events:

#### License Created
```json
{
  "event": "license.created",
  "timestamp": 1704067200000,
  "data": {
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "username": "John Doe",
    "email": "john@example.com",
    "plan": "pro"
  }
}
```

#### Payment Success
```json
{
  "event": "payment.success",
  "timestamp": 1704067200000,
  "data": {
    "transactionId": "txn_123456",
    "amount": 4.99,
    "currency": "USD",
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "email": "john@example.com",
    "plan": "pro"
  }
}
```

#### License Expired
```json
{
  "event": "license.expired",
  "timestamp": 1704067200000,
  "data": {
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "username": "John Doe",
    "email": "john@example.com"
  }
}
```

### Verifying Webhook Authenticity

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}
```

---

## Implementation in DataSaver Pro

### Licensing System Flow

```javascript
// In background.js

async function activateLicense(licenseKey) {
  // 1. Verify format
  if (!licenseKey.match(/^DSP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
    return { success: false, error: "Invalid format" };
  }
  
  // 2. Call Dodo API
  const response = await fetch('https://api.dodo.pe/v1/verify-license', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      licenseKey,
      extension: 'datasaver-pro'
    })
  });
  
  // 3. Handle response
  if (!response.ok) {
    return { success: false, error: "Verification failed" };
  }
  
  const result = await response.json();
  
  if (!result.valid) {
    return { success: false, error: result.error };
  }
  
  // 4. Store license
  const license = {
    licenseKey,
    verified: true,
    status: "active",
    username: result.username,
    email: result.email,
    plan: result.plan,
    expiresAt: result.expiresAt,
    verifiedAt: Date.now()
  };
  
  await chrome.storage.local.set({ license });
  
  return { success: true, license };
}
```

### Periodic Verification

```javascript
// Verify license every hour
chrome.alarms.create('verifyLicense', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'verifyLicense') {
    const license = await getLicense();
    
    if (license.licenseKey) {
      // Verify with Dodo
      const isValid = await verifyLicense(license.licenseKey);
      
      if (!isValid) {
        // Disable features
        license.verified = false;
        await chrome.storage.local.set({ license });
      }
    }
  }
});
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_LICENSE` | Key format wrong | Check key format: DSP-XXXX-XXXX-XXXX-XXXX |
| `EXPIRED_LICENSE` | License expired | User needs to renew subscription |
| `LIMIT_EXCEEDED` | Too many installations | User needs to revoke on another device |
| `NETWORK_ERROR` | No internet | Use cached verification, retry later |
| `UNAUTHORIZED` | Wrong API key | Check API key in background.js |

### Handling Offline

When network is unavailable:

```javascript
// Use cached verification
const cachedLicense = await getCachedLicense();
if (cachedLicense && cachedLicense.verifiedAt > Date.now() - 3600000) {
  // Cache is less than 1 hour old, use it
  return cachedLicense;
}

// Otherwise disable features
return { verified: false };
```

---

## Testing

### Test License Keys

For testing purposes, Dodo provides test keys:

- **Valid:** `DSP-TEST-1234-5678-9ABC`
- **Expired:** `DSP-TEST-XXXX-XXXX-XXXX`
- **Invalid:** `DSP-INVALID-1234-5678-9ABC`

### Testing API Integration

```bash
# Test verify endpoint
curl -X POST https://api.dodo.pe/v1/verify-license \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "DSP-TEST-1234-5678-9ABC",
    "extension": "datasaver-pro"
  }'

# Test payment link
curl -X POST https://api.dodo.pe/v1/payment/create-session \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "pro",
    "billingCycle": "monthly",
    "email": "test@example.com",
    "returnUrl": "https://yoursite.com"
  }'
```

---

## Troubleshooting

### Issue: "Cannot reach Dodo API"

**Solution:**
1. Check internet connection
2. Verify API URL: `https://api.dodo.pe/v1`
3. Check API key is correct
4. Check firewall/proxy not blocking

### Issue: "License verification keeps failing"

**Solution:**
1. Verify license key format
2. Check license hasn't expired
3. Check installation limit not exceeded
4. Try different network/VPN

### Issue: "Payment link doesn't work"

**Solution:**
1. Check redirect URL is correct
2. Verify email format
3. Check API key permissions
4. Contact Dodo support

### Issue: "Webhook not receiving events"

**Solution:**
1. Check webhook endpoint is accessible
2. Verify webhook secret is correct
3. Check webhook URL in Dodo dashboard
4. Check server logs for errors

---

## Support

### Contact Dodo Support

- **Email:** support@dodo.pe
- **Website:** https://dodo.pe
- **Documentation:** https://docs.dodo.pe
- **Status:** https://status.dodo.pe

### DataSaver Pro Support

- **License Issues:** support@dodo.pe
- **Extension Issues:** See extension documentation
- **API Integration:** See this guide

---

## Security Best Practices

### API Key Management

- ✅ Store API key in server-side environment variables
- ✅ Never commit API key to version control
- ✅ Rotate API key regularly
- ✅ Use separate keys for development/production

### License Verification

- ✅ Cache verification results (1 hour max)
- ✅ Use HTTPS only
- ✅ Verify webhook signatures
- ✅ Handle network errors gracefully

### Data Handling

- ✅ Encrypt sensitive data in storage
- ✅ Don't log license keys
- ✅ Use secure storage APIs
- ✅ Clear data on logout

---

## Quick Reference

### Payment Link
```
https://dodo.pe/datasaverpro?plan=pro
https://dodo.pe/datasaverpro?plan=enterprise
```

### API Endpoints Summary
```
POST /verify-license     - Check if license is valid
POST /activate-license   - Register on device
POST /revoke-license     - Unregister from device
GET  /license-status/:key - Get license details
POST /payment/create-session - Create payment link
```

### Environment Variables
```
DODO_API_KEY=your_api_key_here
DODO_API_SECRET=your_secret_here
DODO_WEBHOOK_SECRET=your_webhook_secret
```

---

## Changelog

- **v1.0** - Initial Dodo integration
- **v1.1** - Added webhook support
- **v1.2** - Added offline verification caching
- **v1.3** - Added enhanced error handling

---

**Last Updated:** April 2024  
**Version:** 1.3  
**Status:** Production Ready

For the latest documentation, visit: https://docs.dodo.pe
