# Dodo Payments API Integration - DataSaver Pro

## 🔗 API Endpoints

### Base URL
```
https://api.dodo.pe/v1
```

### Authentication
All requests must include API key in headers:
```bash
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

---

## 📋 License Management Endpoints

### 1. Verify License Key

**Request:**
```http
POST /verify-license
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "extension": "datasaver-pro",
  "timestamp": 1704067200000
}
```

**Response (Success):**
```json
{
  "valid": true,
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "username": "John Doe",
  "email": "john@example.com",
  "plan": "pro",
  "status": "active",
  "expiresAt": 1735689600000,
  "issuedAt": 1704067200000,
  "installationLimit": 1,
  "installationCount": 1
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Invalid license key",
  "errorCode": "INVALID_LICENSE",
  "timestamp": 1704067200000
}
```

**Error Codes:**
- `INVALID_LICENSE` - License key format invalid
- `EXPIRED_LICENSE` - License has expired
- `REVOKED_LICENSE` - License was revoked
- `THROTTLED` - Too many requests
- `UNAUTHORIZED` - Invalid API key

---

### 2. Activate License

**Request:**
```http
POST /activate-license
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "extension": "datasaver-pro",
  "installationId": "chrome-ext-12345",
  "deviceName": "My Chrome",
  "timestamp": 1704067200000
}
```

**Response (Success):**
```json
{
  "activated": true,
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "installationId": "chrome-ext-12345",
  "activatedAt": 1704067200000,
  "expiresAt": 1735689600000,
  "verificationToken": "token_abc123xyz",
  "verificationExpires": 1704070800000
}
```

**Response (Failure):**
```json
{
  "activated": false,
  "error": "Installation limit exceeded",
  "errorCode": "LIMIT_EXCEEDED",
  "currentInstallations": 1,
  "limit": 1
}
```

---

### 3. Deactivate/Revoke License

**Request:**
```http
POST /revoke-license
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "installationId": "chrome-ext-12345",
  "reason": "User logout",
  "timestamp": 1704067200000
}
```

**Response:**
```json
{
  "revoked": true,
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "revokedAt": 1704067200000
}
```

---

### 4. Check License Status

**Request:**
```http
GET /license-status/{licenseKey}
Authorization: Bearer {API_KEY}
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

## 👤 User Account Endpoints

### 5. Get User Profile

**Request:**
```http
GET /user/profile
Authorization: Bearer {API_KEY}
```

**Response:**
```json
{
  "userId": "user_123456",
  "username": "John Doe",
  "email": "john@example.com",
  "createdAt": 1672531200000,
  "plan": "pro",
  "activeSeats": 1,
  "totalLicenses": 1,
  "subscriptionStatus": "active",
  "nextBillingDate": 1707168000000,
  "paymentMethod": {
    "type": "card",
    "last4": "4242"
  }
}
```

---

### 6. Update User Profile

**Request:**
```http
PUT /user/profile
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "username": "John Doe",
  "email": "new-email@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

## 💳 Payment Endpoints

### 7. Create Payment Session

**Request:**
```http
POST /payment/create-session
Content-Type: application/json

{
  "planType": "pro",
  "billingCycle": "monthly",
  "email": "user@example.com",
  "returnUrl": "https://datasaverpro.com/success"
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

---

### 8. Get Payment Status

**Request:**
```http
GET /payment/session/{sessionId}
Authorization: Bearer {API_KEY}
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "status": "completed",
  "amount": 4.99,
  "currency": "USD",
  "plan": "pro",
  "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
  "createdAt": 1704067200000,
  "completedAt": 1704067500000
}
```

---

## 🔔 Webhook Events

### Webhook Configuration
```json
{
  "url": "https://your-server.com/webhook/dodo",
  "secret": "webhook_secret_key_here",
  "events": [
    "license.created",
    "license.activated",
    "license.revoked",
    "license.expired",
    "payment.success",
    "payment.failed",
    "subscription.upgraded",
    "subscription.downgraded",
    "subscription.cancelled"
  ]
}
```

### Webhook Headers
```
X-Webhook-Signature: sha256=signature_here
X-Webhook-Timestamp: 1704067200000
X-Webhook-ID: webhook_123456
```

### Verify Webhook Signature
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
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

### License Created Event
```json
{
  "event": "license.created",
  "timestamp": 1704067200000,
  "data": {
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "username": "John Doe",
    "email": "john@example.com",
    "plan": "pro",
    "expiresAt": 1735689600000
  }
}
```

### License Activated Event
```json
{
  "event": "license.activated",
  "timestamp": 1704067200000,
  "data": {
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "installationId": "chrome-ext-12345",
    "deviceName": "My Chrome"
  }
}
```

### License Revoked Event
```json
{
  "event": "license.revoked",
  "timestamp": 1704067200000,
  "data": {
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "reason": "User logout",
    "revokedBy": "user"
  }
}
```

### License Expired Event
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

### Payment Success Event
```json
{
  "event": "payment.success",
  "timestamp": 1704067200000,
  "data": {
    "transactionId": "txn_123456",
    "amount": 4.99,
    "currency": "USD",
    "licenseKey": "DSP-XXXX-XXXX-XXXX-XXXX",
    "email": "john@example.com"
  }
}
```

---

## 🔐 Security Considerations

### Rate Limiting
```
GET requests: 100 per minute per API key
POST requests: 30 per minute per API key
Burst limit: 10 requests per second
```

### Headers for Security
```
X-API-Version: v1
X-Client-ID: datasaver-pro
X-Request-ID: unique-request-id
```

### SSL/TLS
- All endpoints require HTTPS
- TLS 1.2 or higher
- Valid certificate required

### Data Encryption
```
POST /encrypt-data
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "data": "sensitive_data_here",
  "algorithm": "AES-256-GCM"
}
```

---

## 📊 Analytics Endpoints

### 9. Get License Analytics

**Request:**
```http
GET /analytics/licenses
Authorization: Bearer {API_KEY}
?period=30days&granularity=daily
```

**Response:**
```json
{
  "period": "30days",
  "data": [
    {
      "date": "2024-01-01",
      "active_licenses": 450,
      "new_licenses": 20,
      "revoked_licenses": 5,
      "expired_licenses": 2
    }
  ],
  "summary": {
    "total_active": 450,
    "total_new": 20,
    "churn_rate": 0.015
  }
}
```

### 10. Get Revenue Analytics

**Request:**
```http
GET /analytics/revenue
Authorization: Bearer {API_KEY}
?period=30days&currency=USD
```

**Response:**
```json
{
  "period": "30days",
  "currency": "USD",
  "total_revenue": 12500.00,
  "transaction_count": 2500,
  "average_transaction": 5.00,
  "by_plan": {
    "pro": 10000.00,
    "enterprise": 2500.00
  }
}
```

---

## ❌ Error Handling

### Standard Error Response
```json
{
  "error": true,
  "errorCode": "API_ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": 1704067200000,
  "requestId": "req_123456"
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INVALID_REQUEST` | Missing or invalid parameters | Check request format |
| `INVALID_API_KEY` | API key not valid | Verify credentials |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `NOT_FOUND` | Resource doesn't exist | Check ID |
| `PERMISSION_DENIED` | Not authorized | Check permissions |
| `SERVER_ERROR` | Internal server error | Retry later |
| `SERVICE_UNAVAILABLE` | Service is down | Check status page |

---

## 🔄 Implementation in Extension

### Example: Verify License

```javascript
async function verifyLicense(licenseKey) {
  try {
    const response = await fetch('https://api.dodo.pe/v1/verify-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        licenseKey,
        extension: 'datasaver-pro',
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.valid) {
      return {
        success: true,
        license: {
          key: data.licenseKey,
          username: data.username,
          plan: data.plan,
          expiresAt: data.expiresAt
        }
      };
    } else {
      return {
        success: false,
        error: data.error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 📚 Testing API

### cURL Examples

**Verify License:**
```bash
curl -X POST https://api.dodo.pe/v1/verify-license \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "DSP-TEST-1234-5678-9ABC",
    "extension": "datasaver-pro"
  }'
```

**Get License Status:**
```bash
curl -X GET https://api.dodo.pe/v1/license-status/DSP-TEST-1234-5678-9ABC \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Revoke License:**
```bash
curl -X POST https://api.dodo.pe/v1/revoke-license \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "DSP-TEST-1234-5678-9ABC",
    "reason": "User logout"
  }'
```

---

## 🆘 Support

For API support:
- Email: api-support@dodo.pe
- Docs: https://docs.dodo.pe
- Status: https://status.dodo.pe

---

**API Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production Ready
