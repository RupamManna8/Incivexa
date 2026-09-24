# incivexa

> **Incivexa Telemetry & Incident Intelligence SDK for Node.js & Express**  
> Lightweight, zero-dependency, non-blocking telemetry emitter and error monitoring agent with automatic PII/secrets redaction, tail latency tracking, and root-cause analysis correlation.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/incivexa)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript%20ready-blue)](https://www.typescriptlang.org/)

---

## ⚡ Features

- **🚀 30-Second Setup:** Initialize with a single line using standard DSN or Environment Variables.
- **🛡️ Built-in PII & Secrets Redactor:** Automatically masks passwords, JWTs, bearer tokens, credit cards, emails, and API keys before transmission.
- **⚡ Non-Blocking & Asynchronous:** Batches events in memory and transmits off the critical application path. Zero impact on server response latency.
- **🌐 Express Auto-Monitoring:** One-line middleware for request duration, HTTP response status codes, and client IP extraction.
- **🔍 Deep Stack Trace Parser:** Automatically maps error stack traces to normalized file paths, line numbers, and function names for AST root-cause analysis.
- **🛡️ Fail-Safe Guarantee:** Telemetry transport never crashes the host application or bubbles unhandled rejection errors.
- **📦 Dual Distribution:** Native ESM (`import Incivexa from 'incivexa'`) and CommonJS (`const Incivexa = require('incivexa')`) with bundled TypeScript definitions (`index.d.ts`).

---

## 📦 Installation

```bash
npm install incivexa
# or
yarn add incivexa
# or
pnpm add incivexa
```

---

## 🚀 Quickstart

### 1. Basic Node.js Initialization

```javascript
import Incivexa, { init, captureException, captureMessage } from 'incivexa';

// Initialize with your Project DSN or Gateway Endpoint
Incivexa.init({
  dsn: 'http://aim_live_your_key@localhost:8080/64f01234567890abcdef1234',
  service: 'payment-service',
  environment: 'production'
});

// Capture caught exceptions
try {
  throw new Error('Payment gateway timeout');
} catch (err) {
  Incivexa.captureException(err, {
    tags: { orderId: 'ORD-9921', paymentMethod: 'credit_card' },
    metrics: { duration_ms: 320 }
  });
}

// Capture custom diagnostic messages
Incivexa.captureMessage('Database connection pool scaled up to 20 connections', 'info');
```

---

### 2. Express.js Integration

```javascript
import express from 'express';
import Incivexa, { 
  init, 
  autoMonitorMiddleware, 
  expressMiddleware, 
  captureException 
} from 'incivexa';

const app = express();

// 1. Initialize Incivexa
Incivexa.init({
  dsn: process.env.INCIVEXA_DSN || process.env.AIM_DSN,
  service: 'order-api',
  environment: 'production'
});

// 2. Attach Request Monitor BEFORE all routes (tracks latency, HTTP status, and client IP)
app.use(Incivexa.autoMonitorMiddleware({ monitorAll: true }));

app.use(express.json());

// 3. Application Routes
app.get('/api/orders/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'processed' });
});

app.post('/api/checkout', (req, res) => {
  if (!req.body.address) {
    throw new Error("Cannot read property 'zipCode' of undefined");
  }
  res.status(200).json({ success: true });
});

// 4. Attach Error Handler AFTER all routes
app.use(Incivexa.expressMiddleware());

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### 3. CommonJS Usage

```javascript
const Incivexa = require('incivexa');

Incivexa.init({
  dsn: process.env.INCIVEXA_DSN,
  service: 'legacy-api'
});
```

---

## ⚙️ Configuration Options

You can pass configuration directly to `init(options)` or set environment variables:

| Option | Environment Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dsn` | `INCIVEXA_DSN` / `AIM_DSN` | `string` | `null` | Connection DSN (`http(s)://<apiKey>@<host>:<port>/<projectId>`) |
| `endpoint` | `INCIVEXA_ENDPOINT` / `AIM_ENDPOINT` | `string` | `null` | Full ingestion gateway URL |
| `apiKey` | `INCIVEXA_API_KEY` / `AIM_API_KEY` | `string` | `null` | Project Ingestion Bearer API key |
| `service` | `INCIVEXA_SERVICE_NAME` / `SERVICE_NAME` | `string` | `"node-application"` | Service identifier for incident classification |
| `environment`| `INCIVEXA_ENVIRONMENT` / `NODE_ENV` | `string` | `"production"` | Target deployment environment |
| `releaseSha` | `INCIVEXA_RELEASE_SHA` / `GIT_COMMIT` | `string` | `"unknown"` | Commit SHA or deployment release version |
| `repoUrl` | `INCIVEXA_REPO_URL` / `REPO_URL` | `string` | `null` | Git repository URL for AST code investigation |
| `branch` | `INCIVEXA_BRANCH` / `GIT_BRANCH` | `string` | `"main"` | Default Git branch |
| `batchSize` | - | `number` | `20` | Maximum events buffered before immediate flush |
| `flushInterval`| - | `number` | `1000` | Timer interval in ms for periodic background transmission |
| `timeoutMs` | - | `number` | `4000` | HTTP request timeout for ingestion dispatch |
| `autoCatch` | - | `boolean`| `false` | Automatically catch `uncaughtException` & `unhandledRejection` |
| `beforeSend` | - | `function`| `null` | Custom hook to mutate, enrich, or drop events |
| `debug` | `INCIVEXA_DEBUG` | `boolean`| `false` | Output Incivexa diagnostic logs to stdout |

---

## 🔒 Automated PII & Secrets Scrubbing

The SDK automatically sanitizes sensitive fields before transmission:

```javascript
Incivexa.captureException(err, {
  tags: {
    password: 'superSecretPassword',    // -> "[REDACTED_SECRET]"
    authorization: 'Bearer eyJhbG...',   // -> "[REDACTED_SECRET]"
    userEmail: 'alice@company.com',     // -> "[REDACTED_EMAIL]"
    creditCard: '4111-2222-3333-4444'   // -> "[REDACTED_CARD]"
  }
});
```

---

## 🛠️ TypeScript Support

Full TypeScript definitions are included out-of-the-box:

```typescript
import Incivexa, { 
  init, 
  captureException, 
  TelemetryEvent, 
  SdkOptions 
} from 'incivexa';

const options: SdkOptions = {
  dsn: 'http://key@localhost:8080/projectId',
  service: 'auth-service',
  environment: 'production',
  beforeSend(event: TelemetryEvent) {
    if (event.tags?.ignore) return null; // Drop event
    return event;
  }
};

Incivexa.init(options);
```

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

---

## 📄 License

MIT © [Incivexa Team](https://github.com/Autonomous-Incident-Manager)

