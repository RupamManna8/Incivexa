/**
 * Incivexa SDK TypeScript Definitions
 * Autonomous Incident Response Platform
 */

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
}

export interface EventMetrics {
  duration_ms?: number;
  durationMs?: number;
  statusCode?: number;
  status_code?: number;
  memoryUsageMb?: number;
  cpuUsagePercent?: number;
  [key: string]: any;
}

export interface EventTags {
  message?: string;
  name?: string;
  http_method?: string;
  http_path?: string;
  http_status?: string;
  client_ip?: string;
  ip?: string;
  handler?: string;
  scenario?: string;
  [key: string]: any;
}

export interface TelemetryEvent {
  trace_id?: string;
  service?: string;
  env?: string;
  release_sha?: string;
  repo_url?: string | null;
  branch?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  stack?: StackFrame[];
  metrics?: EventMetrics;
  tags?: EventTags;
  timestamp?: string;
}

export interface EventContext {
  severity?: 'info' | 'warning' | 'error' | 'critical';
  tags?: EventTags;
  metrics?: EventMetrics;
}

export interface SdkOptions {
  /** Connection DSN (http(s)://<apiKey>@<host>:<port>/<projectId>) */
  dsn?: string;
  /** Full Ingestion endpoint URL */
  endpoint?: string;
  /** Project Ingestion API key */
  apiKey?: string;
  /** Legacy alias for apiKey */
  key?: string;
  /** Project ID identifier */
  projectId?: string;
  /** Hostname of gateway (default: "localhost") */
  host?: string;
  /** Port of gateway (default: 8080) */
  port?: number;
  /** Protocol ("http:" or "https:") */
  protocol?: string;
  /** Name of service/microservice (default: "node-application") */
  service?: string;
  /** Alias for service */
  serviceName?: string;
  /** Environment ("production" | "staging" | "development") */
  environment?: string;
  /** Alias for environment */
  env?: string;
  /** Release / Commit SHA */
  releaseSha?: string;
  /** Alias for releaseSha */
  release_sha?: string;
  /** Git repository URL */
  repoUrl?: string;
  /** Alias for repoUrl */
  repo_url?: string;
  /** Git branch */
  branch?: string;
  /** Maximum events before immediate dispatch (default: 20) */
  batchSize?: number;
  /** Periodic queue flush interval in ms (default: 1000) */
  flushInterval?: number;
  /** Network timeout in ms (default: 4000) */
  timeoutMs?: number;
  /** Custom transformer or filter hook before send */
  beforeSend?: (event: TelemetryEvent) => TelemetryEvent | null | undefined;
  /** Automatically install global uncaught exception handlers */
  autoCatch?: boolean;
  /** Enable debug logging to stdout */
  debug?: boolean;
  /** Enable/disable telemetry collection */
  enabled?: boolean;
}

export interface AutoMonitorOptions {
  /** Capture all incoming HTTP requests including 2xx/3xx (default: false) */
  monitorAll?: boolean;
  /** Threshold in milliseconds to flag requests as slow warnings (default: 2000) */
  slowThresholdMs?: number;
}

export interface ParsedDSN {
  key: string;
  host: string;
  port: number;
  projectId: string;
  protocol: string;
  path: string;
}

export interface TransportResult {
  success: boolean;
  count?: number;
  status?: number;
  error?: string;
}

/**
 * Initializes the Incivexa Telemetry Agent
 */
export function initTelemetry(options?: SdkOptions): {
  config: SdkOptions;
  captureException: typeof captureException;
  captureMessage: typeof captureMessage;
  captureEvent: typeof captureEvent;
  flush: typeof flush;
};

/** Alias for initTelemetry */
export function init(options?: SdkOptions): ReturnType<typeof initTelemetry>;

/**
 * Dispatches a raw telemetry event into the ingestion queue
 */
export function captureEvent(payload: TelemetryEvent): void;

/**
 * Captures an Error or Exception object, extracts stack trace and contextual tags
 */
export function captureException(error: Error | any, context?: EventContext): void;

/**
 * Captures a custom diagnostic or status message
 */
export function captureMessage(
  message: string,
  severity?: 'info' | 'warning' | 'error' | 'critical',
  context?: EventContext
): void;

/**
 * Flushes all currently queued telemetry events to the gateway
 */
export function flush(timeoutMs?: number): Promise<TransportResult>;

/**
 * Express Error Handling Middleware. Attach after all routes.
 */
export function expressMiddleware(): (err: any, req: any, res: any, next: any) => void;

/** Alias for expressMiddleware */
export const errorHandler: typeof expressMiddleware;

/**
 * Express Automatic HTTP Request & Latency Monitoring Middleware. Attach before routes.
 */
export function autoMonitorMiddleware(options?: AutoMonitorOptions): (req: any, res: any, next: any) => void;

/** Alias for autoMonitorMiddleware */
export const requestMiddleware: typeof autoMonitorMiddleware;

/**
 * Installs global handlers for uncaughtException and unhandledRejection
 */
export function setupGlobalHandlers(): void;

/**
 * Gracefully closes the SDK agent and flushes any pending telemetry
 */
export function close(): Promise<TransportResult>;

/**
 * Returns a copy of the active configuration
 */
export function getConfig(): SdkOptions;

/**
 * Utility to reliably extract requester client IP address across reverse proxies and CDNs
 */
export function getClientIp(req: any): string;

/**
 * Parses standard DSN string (http(s)://<apiKey>@<host>:<port>/<projectId>)
 */
export function parseDSN(dsnString: string): ParsedDSN | null;

/**
 * Recursively scrubs secrets and PII from a target object or primitive
 */
export function scrub(data: any, options?: { denyList?: string[] }): any;

/**
 * Parses an Error stack trace string into structured frames
 */
export function parseStackTrace(stackString: string): StackFrame[];

export declare const Incivexa: {
  init: typeof initTelemetry;
  initTelemetry: typeof initTelemetry;
  captureException: typeof captureException;
  captureMessage: typeof captureMessage;
  captureEvent: typeof captureEvent;
  expressMiddleware: typeof expressMiddleware;
  errorHandler: typeof expressMiddleware;
  autoMonitorMiddleware: typeof autoMonitorMiddleware;
  requestMiddleware: typeof autoMonitorMiddleware;
  flush: typeof flush;
  close: typeof close;
  getConfig: typeof getConfig;
  getClientIp: typeof getClientIp;
  parseDSN: typeof parseDSN;
  scrub: typeof scrub;
  setupGlobalHandlers: typeof setupGlobalHandlers;
};

export default Incivexa;
