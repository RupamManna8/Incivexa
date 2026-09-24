/**
 * Incivexa SDK
 * Autonomous Incident Response & Real-Time Telemetry Agent
 * 
 * Intercepts uncaught exceptions, HTTP error responses, and custom telemetry events,
 * automatically scrubbing secrets & PII before dispatching to the Incivexa SRE Control Plane.
 */

import { scrub } from './scrub.js';
import { parseStackTrace } from './stacktrace.js';
import { getClientIp } from './ip.js';
import { Transport } from './transport.js';

// Default configuration with environment variable auto-detection
let config = {
  dsn: process.env.INCIVEXA_DSN || process.env.AIM_DSN || process.env.SRE_DSN || null,
  endpoint: process.env.INCIVEXA_ENDPOINT || process.env.AIM_ENDPOINT || process.env.SRE_ENDPOINT || null,
  key: process.env.INCIVEXA_API_KEY || process.env.INCIVEXA_KEY || process.env.AIM_API_KEY || process.env.SRE_API_KEY || null,
  projectId: process.env.INCIVEXA_PROJECT_ID || process.env.AIM_PROJECT_ID || null,
  host: process.env.INCIVEXA_HOST || process.env.AIM_HOST || 'localhost',
  port: process.env.INCIVEXA_PORT || process.env.AIM_PORT || 8080,
  protocol: 'http:',
  path: null,
  service: process.env.INCIVEXA_SERVICE_NAME || process.env.AIM_SERVICE_NAME || process.env.SERVICE_NAME || 'node-application',
  env: process.env.INCIVEXA_ENVIRONMENT || process.env.AIM_ENVIRONMENT || process.env.ENVIRONMENT || process.env.NODE_ENV || 'production',
  releaseSha: process.env.INCIVEXA_RELEASE_SHA || process.env.AIM_RELEASE_SHA || process.env.RELEASE_SHA || process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  repoUrl: process.env.INCIVEXA_REPO_URL || process.env.AIM_REPO_URL || process.env.REPO_URL || process.env.GIT_REPO_URL || null,
  branch: process.env.INCIVEXA_BRANCH || process.env.AIM_BRANCH || process.env.GIT_BRANCH || process.env.BRANCH || 'main',
  batchSize: 20,
  flushInterval: 1000,
  timeoutMs: 4000,
  beforeSend: null,
  autoCatch: false,
  debug: process.env.INCIVEXA_DEBUG === 'true' || process.env.AIM_DEBUG === 'true' || false,
  enabled: process.env.INCIVEXA_ENABLED !== 'false' && process.env.AIM_ENABLED !== 'false'
};

let queue = [];
let timer = null;
let globalHandlersInstalled = false;
const transport = new Transport(config);

/**
 * Parses standard DSN string (e.g. "http://key@localhost:8080/projectId" or "https://key@api.domain.com/projectId")
 */
export function parseDSN(dsnString) {
  if (!dsnString || typeof dsnString !== 'string') return null;

  try {
    const url = new URL(dsnString);
    const key = url.username;
    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    const projectId = url.pathname.replace(/^\/+/, '').split('/')[0];

    if (!key || !host || !projectId) {
      throw new Error('DSN must be formatted as http(s)://<apiKey>@<host>:<port>/<projectId>');
    }

    return {
      key,
      host,
      port,
      projectId,
      protocol: url.protocol,
      path: `/api/v1/projects/${projectId}/ingest`
    };
  } catch (err) {
    if (config.debug) {
      console.warn('[Incivexa] Invalid DSN structure:', err.message);
    }
    return null;
  }
}

/**
 * Initializes the Autonomous Incident Manager Telemetry Agent.
 * 
 * @param {object} options - SDK configuration options
 * @param {string} [options.dsn] - Connection DSN (http://key@host:port/projectId)
 * @param {string} [options.endpoint] - Ingestion endpoint URL
 * @param {string} [options.apiKey] - Project Ingestion API key
 * @param {string} [options.projectId] - Project ID
 * @param {string} [options.service] - Service or microservice identifier
 * @param {string} [options.environment] - Environment ("production", "staging", "development")
 * @param {string} [options.releaseSha] - Commit SHA or release identifier
 * @param {string} [options.repoUrl] - Git repository URL
 * @param {string} [options.branch] - Git branch
 * @param {number} [options.batchSize=20] - Max events to buffer before immediate flush
 * @param {number} [options.flushInterval=1000] - Interval (ms) for periodic queue flush
 * @param {Function} [options.beforeSend] - Custom transformer / filter hook
 * @param {boolean} [options.autoCatch=false] - Auto-capture uncaught exceptions & unhandled rejections
 */
export function initTelemetry(options = {}) {
  config = { ...config, ...options };

  // Normalize aliases
  if (options.apiKey) config.key = options.apiKey;
  if (options.key) config.key = options.key;
  if (options.environment) config.env = options.environment;
  if (options.serviceName) config.service = options.serviceName;
  if (options.repo_url) config.repoUrl = options.repo_url;
  if (options.release_sha) config.releaseSha = options.release_sha;

  // 1. Process explicit endpoint URL
  if (options.endpoint) {
    try {
      const url = new URL(options.endpoint);
      config.endpoint = options.endpoint;
      config.host = url.hostname;
      config.port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
      config.protocol = url.protocol;
      config.path = url.pathname;

      const match = url.pathname.match(/\/projects\/([^\/]+)\/ingest/);
      if (match) {
        config.projectId = match[1];
      }
    } catch (err) {
      if (config.debug) console.warn('[Incivexa] Invalid endpoint URL provided:', options.endpoint);
    }
  }
  // 2. Process DSN string
  else if (config.dsn) {
    const parsed = parseDSN(config.dsn);
    if (parsed) {
      config.key = parsed.key;
      config.host = parsed.host;
      config.port = parsed.port;
      config.projectId = parsed.projectId;
      config.protocol = parsed.protocol;
      config.path = parsed.path;
      config.endpoint = `${parsed.protocol}//${parsed.host}${parsed.port && parsed.port !== 80 && parsed.port !== 443 ? `:${parsed.port}` : ''}${parsed.path}`;
    }
  }

  transport.updateConfig(config);

  // Setup periodic queue flush timer
  if (timer) clearInterval(timer);
  if (config.enabled) {
    timer = setInterval(() => {
      flush().catch(() => {});
    }, config.flushInterval);
    timer.unref?.();
  }

  // Setup global process crash handlers if requested
  if (config.autoCatch && !globalHandlersInstalled) {
    setupGlobalHandlers();
  }

  if (config.debug) {
    console.log(`[Incivexa] Initialized -> Service: "${config.service}" [${config.env}]`);
    console.log(`[Incivexa] Target: ${transport.resolveTargetUrl() || 'Awaiting DSN / Endpoint'}`);
  }

  return { config: getConfig(), captureException, captureMessage, captureEvent, flush };
}

export const init = initTelemetry;

/**
 * Dispatches a raw telemetry event into the ingestion queue.
 */
export function captureEvent(payload = {}) {
  if (!config.enabled) return;

  const event = {
    trace_id: payload.trace_id || payload.traceId || 'tr_' + Math.random().toString(36).substring(2, 12),
    service: payload.service || config.service,
    env: payload.env || payload.environment || config.env,
    release_sha: payload.release_sha || payload.releaseSha || config.releaseSha,
    repo_url: payload.repo_url || payload.repoUrl || config.repoUrl,
    branch: payload.branch || config.branch,
    severity: payload.severity || 'error',
    stack: scrub(payload.stack || []),
    metrics: payload.metrics || {},
    tags: scrub(payload.tags || {}),
    timestamp: payload.timestamp || new Date().toISOString()
  };

  // Run beforeSend hook if configured
  let processed = event;
  if (typeof config.beforeSend === 'function') {
    try {
      processed = config.beforeSend(processed);
      if (!processed) return; // Dropped by user hook
    } catch (err) {
      if (config.debug) console.warn('[Incivexa] Error in beforeSend hook:', err);
    }
  }

  queue.push(processed);

  if (queue.length >= config.batchSize) {
    // Non-blocking flush on next tick
    setImmediate(() => {
      flush().catch(() => {});
    });
  }
}

/**
 * Captures an Error or Exception object, extracts stack trace and contextual tags.
 */
export function captureException(error, context = {}) {
  if (!error) return;

  const stackString = error instanceof Error ? error.stack : (typeof error === 'string' ? error : '');
  const stack = parseStackTrace(stackString);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'Error';

  captureEvent({
    severity: context.severity || 'error',
    stack,
    tags: {
      message: errorMessage,
      name: errorName,
      ...context.tags
    },
    metrics: context.metrics || {}
  });
}

/**
 * Captures a custom diagnostic or status message.
 */
export function captureMessage(message, severity = 'info', context = {}) {
  if (!message) return;

  captureEvent({
    severity,
    stack: [],
    tags: {
      message: String(message),
      ...context.tags
    },
    metrics: context.metrics || {}
  });
}

/**
 * Flushes all currently queued telemetry events to the gateway.
 */
export async function flush(timeoutMs = 5000) {
  if (queue.length === 0) return { success: true, count: 0 };

  const batch = queue.splice(0, queue.length);
  return await transport.send(batch);
}

/**
 * Express Error Handling Middleware.
 * Attach after all route definitions: `app.use(expressMiddleware())`
 */
export function expressMiddleware() {
  return (err, req, res, next) => {
    const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
    const clientIp = getClientIp(req);

    captureException(err, {
      tags: {
        http_method: req.method,
        http_path: req.originalUrl || req.url || req.path,
        http_status: String(statusCode),
        client_ip: clientIp,
        ip: clientIp,
        handler: 'expressMiddleware'
      },
      metrics: {
        statusCode,
        status_code: statusCode
      }
    });

    next(err);
  };
}

export const errorHandler = expressMiddleware;

/**
 * Express Automatic HTTP Request & Latency Monitoring Middleware.
 * Attach before all routes: `app.use(autoMonitorMiddleware({ monitorAll: true }))`
 */
export function autoMonitorMiddleware(options = { monitorAll: false, slowThresholdMs: 2000 }) {
  const { monitorAll = false, slowThresholdMs = 2000 } = options;

  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const clientIp = getClientIp(req);
      const isError = statusCode >= 400;
      const isSlow = durationMs >= slowThresholdMs;

      if (monitorAll || isError || isSlow) {
        const severity = statusCode >= 500 ? 'error' : (statusCode >= 400 ? 'warning' : 'info');

        captureEvent({
          severity,
          stack: [],
          tags: {
            message: `HTTP ${req.method} ${req.originalUrl || req.url || req.path} -> ${statusCode} (${durationMs}ms)`,
            http_method: req.method,
            http_path: req.originalUrl || req.url || req.path,
            http_status: String(statusCode),
            client_ip: clientIp,
            ip: clientIp
          },
          metrics: {
            duration_ms: durationMs,
            durationMs,
            statusCode,
            status_code: statusCode
          }
        });
      }
    });

    next();
  };
}

export const requestMiddleware = autoMonitorMiddleware;

/**
 * Installs global handlers for uncaughtException and unhandledRejection
 */
export function setupGlobalHandlers() {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  process.on('uncaughtException', (err) => {
    captureException(err, { tags: { mechanism: 'uncaughtException' } });
    flush().finally(() => {
      if (config.debug) console.error('[Incivexa] Uncaught exception captured:', err);
    });
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    captureException(error, { tags: { mechanism: 'unhandledRejection' } });
    flush().catch(() => {});
  });
}

/**
 * Gracefully closes the SDK agent and flushes any pending telemetry.
 */
export async function close() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  return await flush();
}

/**
 * Returns a copy of the active configuration
 */
export function getConfig() {
  return { ...config };
}

// Auto-flush when process is exiting
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', () => {
    flush().catch(() => {});
  });
}

// Re-export utility modules
export { scrub } from './scrub.js';
export { parseStackTrace } from './stacktrace.js';
export { getClientIp } from './ip.js';
export { Transport } from './transport.js';

// Incivexa top-level API namespace
export const Incivexa = {
  init: initTelemetry,
  initTelemetry,
  captureException,
  captureMessage,
  captureEvent,
  expressMiddleware,
  errorHandler: expressMiddleware,
  autoMonitorMiddleware,
  requestMiddleware: autoMonitorMiddleware,
  flush,
  close,
  getConfig,
  getClientIp,
  parseDSN,
  scrub,
  setupGlobalHandlers
};

export default Incivexa;

