# ⚡ Incivexa Telemetry SDK (`incivexa`)

> **Autonomous Incident Response & Real-Time Telemetry Agent for Node.js, Express & Distributed Cloud Microservices**  
> Lightweight, zero-dependency, non-blocking telemetry emitter and error monitoring agent with automatic PII/secrets redaction, tail latency tracking, normalized V8 stack trace extraction, and automated AST root-cause analysis correlation.

[![npm version](https://img.shields.io/npm/v/incivexa.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/incivexa)
[![npm downloads](https://img.shields.io/npm/dm/incivexa.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/incivexa)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript%20ready-blue?style=flat-square)](./src/index.d.ts)
[![Platform Monorepo](https://img.shields.io/badge/Platform-Autonomous--Incident--Manager-purple?style=flat-square)](https://github.com/RupamManna8/Autonomous-Incedent-Manager)

---

## 📑 Table of Contents

- [1. Overview & Architecture](#1-overview--architecture)
- [2. Key Features & Guarantees](#2-key-features--guarantees)
- [3. Installation](#3-installation)
- [4. Quickstart Guide](#4-quickstart-guide)
  - [Option A: Express.js Full Instrumentation (Recommended)](#option-a-expressjs-full-instrumentation-recommended)
  - [Option B: Standalone Node.js Application / Worker](#option-b-standalone-nodejs-application--worker)
  - [Option C: CommonJS (`require`) Support](#option-c-commonjs-require-support)
  - [Option D: TypeScript Integration](#option-d-typescript-integration)
- [5. Configuration Reference](#5-configuration-reference)
  - [Configuration Options](#configuration-options)
  - [Environment Variables](#environment-variables)
  - [DSN Structure](#dsn-structure)
- [6. Automated PII & Secrets Scrubbing](#6-automated-pii--secrets-scrubbing)
- [7. Complete SDK API Reference](#7-complete-sdk-api-reference)
- [8. Development, Testing & Verification](#8-development-testing--verification)
- [9. Repository & Ecosystem Links](#9-repository--ecosystem-links)

---

## 1. Overview & Architecture

The **Incivexa SDK** (`incivexa`) is the client-side telemetry probe for the **[Autonomous Incident Response Platform](https://github.com/RupamManna8/Autonomous-Incedent-Manager)**. Embedded into cloud microservices, it intercepts uncaught exceptions, unhandled Promise rejections, HTTP errors, request durations, and contextual diagnostic tags.

All telemetry is scrubbed in-memory for credentials and PII, buffered without blocking the main event loop, and dispatched to the platform ingestion gateway in high-velocity batches.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT APPLICATION (SDK)                                │
│                                                                                        │
│   Incoming Requests ──► [ autoMonitorMiddleware ] ──► Routes & Handlers                 │
│                                 │                              │                       │
│                                 │ (latency, status, client IP) │ (exceptions)          │
│                                 ▼                              ▼                       │
│                       [ In-Memory Scrubbing & Redaction Engine ]                       │
│                                       │                                                │
│                                       ▼                                                │
│                       [ Non-Blocking Batch Transport ]                                 │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ Telemetry Event Stream (<5ms p99)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         AUTONOMOUS INCIDENT RESPONSE PLATFORM                          │
│                                                                                        │
│  ┌───────────────────────────────┐           ┌──────────────────────────────────────┐  │
│  │   Platform Backend & Gateway  │           │   Frontend Observability Console     │  │
│  │   • Token-bucket rate limit   │           │   • Real-time Traffic & P95/P99      │  │
│  │   • SHA-256 API Key auth      │           │   • State-level India Geo Ingress    │  │
│  │   • Serverless Kafka buffer   │──────────►│   • Live Incident Triage Cockpit     │  │
│  │   • Alert storm deduplication │           │   • AST Call Graph & Blast Radius    │  │
│  └──────────────┬────────────────┘           │   • One-Click Patch Approval         │  │
│                 │                            └──────────────────────────────────────┘  │
│                 ▼                                                                      │
│  ┌───────────────────────────────┐           ┌──────────────────────────────────────┐  │
│  │   Incident Detector Model     │           │   Codebase Intelligence Engine       │  │
│  │   • MiniLM-L6-v2 Embeddings   │           │   • AST Symbol & Execution Mapping   │  │
│  │   • Multi-feature classifier  │──────────►│   • BAAI/BGE-M3 Code Embeddings      │  │
│  │   • Risk Scoring (LOW->CRIT)  │           │   • Qwen3-Coder Reasoning Agent      │  │
│  └───────────────────────────────┘           │   • Automated Patch Synthesis (Diff) │  │
│                                              └──────────────────┬───────────────────┘  │
│                                                                 │                      │
│                                                                 ▼                      │
│                                              ┌──────────────────────────────────────┐  │
│                                              │   Isolated Sandbox Runner            │  │
│                                              │   • Ephemeral Docker container       │  │
│                                              │   • Automated regression validation  │  │
│                                              │   • Zero-defect verified PR output   │  │
│                                              └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Features & Guarantees

- **⚡ Zero Runtime Dependencies:** Built strictly on Node.js core modules (`http`, `https`, `os`, `crypto`). Keeps your application bundle lean and avoids supply-chain vulnerabilities.
- **🚀 30-Second Setup:** Initialize with a standard connection DSN or environment variables.
- **🛡️ Built-in PII & Secrets Redactor:** Automatically masks passwords, JWTs, bearer tokens, credit cards, emails, and API keys directly in client memory before network dispatch.
- **⚡ Non-Blocking & Asynchronous:** Batches events in memory and flushes periodically off the critical application path. Zero impact on server response latency.
- **🌐 Express Auto-Monitoring:** One-line middleware for request duration, HTTP response status codes, and intelligent client IP extraction (supporting Cloudflare, AWS ALB, Nginx, and Docker networks).
- **🔍 Normalized V8 Stack Parser:** Automatically parses raw stack traces into structured frames with normalized relative file paths, function symbols, and line/column numbers for AST code intelligence.
- **🛡️ Fail-Safe Guarantee:** Telemetry transport never crashes the host application, throws uncaught exceptions, or bubbles unhandled rejection errors.
- **📦 Dual Distribution:** Native ESM (`import Incivexa from 'incivexa'`), CommonJS (`const Incivexa = require('incivexa')`), and bundled TypeScript definitions (`index.d.ts`).

---

## 3. Installation

Install the published package from npm:

```bash
# Using npm
npm install incivexa

# Using yarn
yarn add incivexa

# Using pnpm
pnpm add incivexa
```

For development inside the monorepo workspace, `incivexa` is linked automatically via npm workspaces.

---

## 4. Quickstart Guide

### Option A: Express.js Full Instrumentation (Recommended)

Instrumenting an Express application takes under 1 minute with two middleware functions:

```javascript
import express from 'express';
import Incivexa from 'incivexa';

const app = express();

// 1. Initialize Incivexa Telemetry Agent
Incivexa.init({
  // Use DSN or explicit endpoint + apiKey
  dsn: process.env.INCIVEXA_DSN || 'http://aim_live_your_key@localhost:8080/YOUR_PROJECT_ID',
  service: 'payment-microservice',
  environment: 'production',
  releaseSha: process.env.GIT_COMMIT || 'f3a9b4c',
  repoUrl: 'https://github.com/my-org/payment-microservice',
  branch: 'main'
});

// 2. Request & Latency Monitor (Mount BEFORE all routes)
// Automatically records request duration, HTTP status, and client IP
app.use(Incivexa.autoMonitorMiddleware({ monitorAll: true }));

app.use(express.json());

// 3. Application Routes
app.get('/api/orders/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'processed' });
});

app.post('/api/checkout', async (req, res, next) => {
  try {
    if (!req.body.paymentMethod) {
      throw new Error('Payment method is required');
    }
    res.json({ success: true });
  } catch (err) {
    // Manually capture with custom tags/metrics if needed
    Incivexa.captureException(err, {
      tags: { cartId: req.body.cartId },
      metrics: { duration_ms: 120 }
    });
    next(err);
  }
});

// 4. Unhandled Error Middleware (Mount AFTER all routes)
// Captures stack traces, error messages, and HTTP 5xx responses
app.use(Incivexa.expressMiddleware());

app.listen(3000, () => {
  console.log('Payment service listening on port 3000');
});
```

---

### Option B: Standalone Node.js Application / Worker

For background workers, cron jobs, Kafka consumers, or CLI tools:

```javascript
import Incivexa, { init, captureException, captureMessage, flush } from 'incivexa';

// Initialize agent
init({
  endpoint: 'http://localhost:8080/api/v1/projects/YOUR_PROJECT_ID/ingest',
  apiKey: 'aim_live_a1b2c3d4e5f6',
  service: 'worker-queue',
  environment: 'production',
  autoCatch: true // Automatically catch uncaughtException & unhandledRejection
});

// Capture caught exceptions
try {
  await processBatchJob();
} catch (err) {
  captureException(err, {
    tags: { batchId: 'BATCH_1029', stage: 'transformation' },
    metrics: { recordsFailed: 12 }
  });
}

// Capture informational diagnostics
captureMessage('Worker scaled up to 8 threads', 'info', {
  tags: { queueSize: 450 }
});

// Ensure all events are flushed before exiting process
await flush();
```

---

### Option C: CommonJS (`require`) Support

```javascript
const Incivexa = require('incivexa');

Incivexa.init({
  dsn: process.env.INCIVEXA_DSN,
  service: 'legacy-billing-service',
  environment: 'production'
});

// Attach Express error handler
app.use(Incivexa.expressMiddleware());
```

---

### Option D: TypeScript Integration

Full TypeScript definitions are included out of the box (`src/index.d.ts`):

```typescript
import Incivexa, { 
  init, 
  captureException, 
  TelemetryEvent, 
  SdkOptions, 
  StackFrame 
} from 'incivexa';

const options: SdkOptions = {
  dsn: 'http://aim_live_key@localhost:8080/proj_123',
  service: 'user-service',
  environment: 'production',
  batchSize: 25,
  flushInterval: 1500,
  beforeSend(event: TelemetryEvent): TelemetryEvent | null {
    // Drop health check probe events
    if (event.tags?.http_path === '/healthz') return null;
    return event;
  }
};

Incivexa.init(options);
```

---

## 5. Configuration Reference

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `dsn` | `string` | `null` | Connection DSN string (`http(s)://<apiKey>@<host>:<port>/<projectId>`). |
| `endpoint` | `string` | `null` | Full ingestion gateway URL (`http://localhost:8080/api/v1/projects/:id/ingest`). |
| `apiKey` / `key` | `string` | `null` | Project Ingestion Bearer API key (`aim_live_...`). |
| `projectId` | `string` | `null` | Project unique identifier. |
| `service` | `string` | `"node-application"` | Service identifier used by the Incident Detector and Investigation Engine. |
| `environment` / `env` | `string` | `"production"` | Target deployment environment (`"production"`, `"staging"`, `"development"`). |
| `releaseSha` | `string` | `"unknown"` | Git commit SHA or release identifier for AST code correlation. |
| `repoUrl` | `string` | `null` | Git repository URL for codebase AST indexing and patch generation. |
| `branch` | `string` | `"main"` | Default Git branch monitored for incidents. |
| `batchSize` | `number` | `20` | Maximum number of buffered events before triggering an immediate background flush. |
| `flushInterval` | `number` | `1000` | Milliseconds interval for periodic background transmission. |
| `timeoutMs` | `number` | `4000` | HTTP request timeout for ingestion dispatch. |
| `autoCatch` | `boolean` | `false` | Automatically registers listeners for `uncaughtException` and `unhandledRejection`. |
| `beforeSend` | `function` | `null` | Synchronous hook `(event) => event \| null` to mutate, enrich, or discard events. |
| `debug` | `boolean` | `false` | When `true`, outputs Incivexa diagnostic logs to stdout. |
| `enabled` | `boolean` | `true` | Master kill-switch. When `false`, all event capture is completely disabled. |

---

### Environment Variables

The SDK automatically detects standard environment variables if not passed explicitly in `init()`:

| Environment Variable | Equivalent Option | Description |
| :--- | :--- | :--- |
| `INCIVEXA_DSN` / `AIM_DSN` | `dsn` | Standard connection DSN string |
| `INCIVEXA_ENDPOINT` / `AIM_ENDPOINT` | `endpoint` | Ingestion gateway URL |
| `INCIVEXA_API_KEY` / `AIM_API_KEY` | `apiKey` | Project Ingestion API key |
| `INCIVEXA_PROJECT_ID` / `AIM_PROJECT_ID` | `projectId` | Project ID |
| `INCIVEXA_SERVICE_NAME` / `SERVICE_NAME` | `service` | Service name |
| `INCIVEXA_ENVIRONMENT` / `NODE_ENV` | `environment` | Execution environment |
| `INCIVEXA_RELEASE_SHA` / `GIT_COMMIT` | `releaseSha` | Git commit SHA |
| `INCIVEXA_REPO_URL` / `REPO_URL` | `repoUrl` | Git repository URL |
| `INCIVEXA_BRANCH` / `GIT_BRANCH` | `branch` | Git branch name |
| `INCIVEXA_DEBUG` / `AIM_DEBUG` | `debug` | Enable debug logs (`"true"`) |
| `INCIVEXA_ENABLED` | `enabled` | Disable SDK if `"false"` |

---

### DSN Structure

The DSN (Data Source Name) encapsulates the protocol, authentication key, gateway host, port, and project ID into a single URI:

```
http://aim_live_a1b2c3d4e5f6@localhost:8080/64f01234567890abcdef1234
│      └──────────┬─────────┘ └──────┬─────┘ └───────────┬──────────┘
protocol       API Key          Host & Port          Project ID
```

When parsed, the SDK automatically resolves the target ingestion path to `/api/v1/projects/:projectId/ingest`.

---

## 6. Automated PII & Secrets Scrubbing

The Incivexa SDK includes a built-in, zero-dependency sanitizer (`src/scrub.js`) that runs over all stack frames, metadata tags, and metric contexts before any event enters the transmission buffer:

```javascript
Incivexa.captureException(new Error('Authentication failed'), {
  tags: {
    password: 'SuperSecretPassword123!',    // -> "[REDACTED_SECRET]"
    authorization: 'Bearer eyJhbGciOi...',  // -> "[REDACTED_SECRET]"
    userEmail: 'engineer@corp.com',         // -> "[REDACTED_EMAIL]"
    creditCard: '4111-2222-3333-4444',      // -> "[REDACTED_CARD]"
    jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5c...'// -> "[REDACTED_SECRET]"
  }
});
```

### Redaction Rules
1. **Key-Based Redaction:** Automatically masks keys matching `/password/i`, `/token/i`, `/secret/i`, `/auth/i`, `/key/i`, `/credential/i`, `/cookie/i`.
2. **Regex Value Redaction:**
   - **Bearer Tokens / JWTs:** Masked as `[REDACTED_SECRET]`.
   - **Credit Card Numbers (13-19 digits):** Masked as `[REDACTED_CARD]`.
   - **Email Addresses:** Masked as `[REDACTED_EMAIL]`.
   - **Phone Numbers:** Masked as `[REDACTED_PHONE]`.
3. **Safe Recursion:** Protects against circular object references and deep object trees up to 8 levels.

---

## 7. Complete SDK API Reference

### `Incivexa.init(options)` / `initTelemetry(options)`
Initializes the SDK configuration, configures HTTP/HTTPS transport, and starts the background flush timer. Returns the initialized configuration and core methods.

### `Incivexa.autoMonitorMiddleware(options)` / `requestMiddleware`
Express middleware that attaches to the response lifecycle.
- **`options.monitorAll`** (`boolean`, default: `false`): When `true`, records every HTTP request. When `false`, only records HTTP `>= 400` errors and slow requests.
- **`options.slowThresholdMs`** (`number`, default: `2000`): Duration in ms to classify a request as slow.
- Extracts the real client IP using `getClientIp(req)` supporting `cf-connecting-ip`, `x-forwarded-for`, and socket addresses.

### `Incivexa.expressMiddleware()` / `errorHandler`
Express error-handling middleware (`(err, req, res, next)`).
- Captures stack traces with V8 normalized frames.
- Maps HTTP status codes, method, route path, and client IP.
- Seamlessly re-forwards the error to downstream application handlers via `next(err)`.

### `Incivexa.captureException(error, context)`
Captures any JavaScript `Error` or string exception.
- `error` (`Error | string`): The caught exception.
- `context.tags` (`object`): Key-value contextual metadata.
- `context.metrics` (`object`): Numerical telemetry metrics (e.g. `duration_ms`).
- `context.severity` (`string`): `"critical"`, `"error"`, `"warning"`, `"info"`.

### `Incivexa.captureMessage(message, severity, context)`
Captures diagnostic, lifecycle, or state-change messages without an Error object.

### `Incivexa.captureEvent(payload)`
Dispatches a pre-formatted telemetry event directly into the batch queue.

### `Incivexa.flush(timeoutMs)`
Manually flushes all currently buffered telemetry events to the gateway immediately. Useful before serverless function exits or graceful process termination.

### `Incivexa.close()`
Stops the background flush interval timer and completes any in-flight transmissions.

### `Incivexa.setupGlobalHandlers()`
Attaches listeners for `process.on('uncaughtException')` and `process.on('unhandledRejection')` to catch unexpected crashes.

### `Incivexa.getClientIp(req)`
Extracts and normalizes client IP across CDN edge headers (`cf-connecting-ip`), AWS ALB / Nginx headers (`x-forwarded-for`), and cleans IPv6-mapped IPv4 representations (`::ffff:127.0.0.1` -> `127.0.0.1`).

### `Incivexa.parseDSN(dsnString)`
Parses a DSN string into `{ key, host, port, projectId, protocol, path }`.

---

## 8. Development, Testing & Verification

### Run Automated SDK Tests
The SDK includes a comprehensive test suite covering DSN parsing, PII scrubbing, stack trace normalization, client IP resolution, middleware handlers, and batch queuing:

```bash
# Run SDK unit tests
npm test
```

---

## 9. Repository & Ecosystem Links

- **Frontend Console:** [RupamManna8/Incivexa-Frontend](https://github.com/RupamManna8/Incivexa-Frontend)
- **Platform Backend & Gateway:** [RupamManna8/Incivexa-Backend](https://github.com/RupamManna8/Incivexa-Backend)
- **Incident Detector ML Model:** [RupamManna8/Incident-Detector-Model](https://github.com/RupamManna8/Incident-Detector-Model)
- **Codebase Intelligence & Investigation Engine:** [RupamManna8/Incivexa-codebase-intelligence](https://github.com/RupamManna8/Incivexa-codebase-intelligence)
- **Isolated Sandbox Runner:** [RupamManna8/Node-Sandbox](https://github.com/RupamManna8/Node-Sandbox)
- **Incivexa Telemetry SDK:** [RupamManna8/incivexa](https://github.com/RupamManna8/incivexa)
- **Platform Monorepo:** [Autonomous-Incedent-Manager](https://github.com/RupamManna8/Autonomous-Incedent-Manager)
- **SDK Package on npm:** [npmjs.com/package/incivexa](https://www.npmjs.com/package/incivexa)
- **Issue Tracker & Bug Reports:** [GitHub Issues](https://github.com/RupamManna8/incivexa/issues)

---

<p align="center">
  <b>Built by <a href="https://github.com/RupamManna8">Rupam Manna</a> for Enterprise Cloud Reliability & Automated SRE Resilience</b><br>
  Released under the <a href="./LICENSE">MIT License</a>.
</p>
