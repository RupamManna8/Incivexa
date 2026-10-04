/**
 * Resilient Asynchronous Telemetry Transport
 * Supports HTTP & HTTPS, automatic failover, non-blocking batch dispatch, and timeout guards.
 */

import http from 'http';
import https from 'https';

export class Transport {
  constructor(config = {}) {
    this.config = config;
  }

  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Sends a batch of events to the backend ingestion gateway.
   * Guaranteed never to throw unhandled exceptions or crash host processes.
   */
  async send(events) {
    if (!events || events.length === 0) return { success: true, count: 0 };

    const targetUrl = this.resolveTargetUrl();
    if (!targetUrl) {
      return { success: false, error: 'No ingestion endpoint or DSN configured' };
    }

    const payload = JSON.stringify(events);
    const timeoutMs = this.config.timeoutMs || 4000;

    // 1. Preferred modern fetch transport (Node 18+)
    if (typeof globalThis.fetch === 'function') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'incivexa-sdk-v1.0.0' 
        };

        if (this.config.key) {
          headers['Authorization'] = `Bearer ${this.config.key}`;
        }

        const res = await globalThis.fetch(targetUrl, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '');
          console.warn(`[Incivexa] Ingestion notice (HTTP ${res.status}): ${bodyText.slice(0, 120)}`);
          return { success: false, status: res.status, error: bodyText };
        }

        return { success: true, count: events.length };
      } catch (err) {
        if (this.config.debug) {
          console.warn('[Incivexa] Ingestion dispatch notice:', err.message);
        }
        return { success: false, error: err.message };
      }
    }

    // 2. Native http/https fallback for older Node environments
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(targetUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          timeout: timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'incivexa-sdk-v1.0.0',
            ...(this.config.key ? { 'Authorization': `Bearer ${this.config.key}` } : {})
          }
        };

        const req = client.request(options, (res) => {
          res.resume(); // discard response stream to prevent memory leak
          res.on('end', () => {
            resolve({ success: res.statusCode < 400, status: res.statusCode });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Request timeout' });
        });

        req.on('error', (err) => {
          if (this.config.debug) {
            console.warn('[Incivexa] Native request notice:', err.message);
          }
          resolve({ success: false, error: err.message });
        });

        req.write(payload);
        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  }

  resolveTargetUrl() {
    if (this.config.endpoint) {
      return this.config.endpoint;
    }

    if (this.config.host && this.config.projectId) {
      const proto = this.config.protocol || (this.config.port === 443 ? 'https:' : 'http:');
      const portPart = this.config.port && this.config.port !== 80 && this.config.port !== 443
        ? `:${this.config.port}`
        : '';
      return `${proto}//${this.config.host}${portPart}/api/v1/projects/${this.config.projectId}/ingest`;
    }

    return null;
  }
}

export default Transport;
