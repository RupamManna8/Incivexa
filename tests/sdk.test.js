import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Incivexa, {
  initTelemetry,
  captureException,
  captureMessage,
  captureEvent,
  parseDSN,
  scrub,
  parseStackTrace,
  getClientIp,
  autoMonitorMiddleware,
  expressMiddleware,
  getConfig
} from '../src/index.js';

describe('Incivexa SDK', () => {
  beforeEach(() => {
    Incivexa.init({
      dsn: 'http://testkey@localhost:8080/64f01234567890abcdef1234',
      service: 'unit-test-app',
      environment: 'test',
      enabled: true
    });
  });

  describe('DSN Parsing', () => {
    it('should parse standard HTTP DSN correctly', () => {
      const dsn = 'http://aim_live_12345@gateway.internal:8080/project_abc_999';
      const parsed = parseDSN(dsn);

      assert.equal(parsed.key, 'aim_live_12345');
      assert.equal(parsed.host, 'gateway.internal');
      assert.equal(parsed.port, 8080);
      assert.equal(parsed.projectId, 'project_abc_999');
      assert.equal(parsed.protocol, 'http:');
      assert.equal(parsed.path, '/api/v1/projects/project_abc_999/ingest');
    });

    it('should parse HTTPS DSN with default port 443', () => {
      const dsn = 'https://aim_live_secure_key@sre.enterprise.io/project_sec_01';
      const parsed = parseDSN(dsn);

      assert.equal(parsed.key, 'aim_live_secure_key');
      assert.equal(parsed.host, 'sre.enterprise.io');
      assert.equal(parsed.port, 443);
      assert.equal(parsed.projectId, 'project_sec_01');
      assert.equal(parsed.protocol, 'https:');
    });

    it('should return null on invalid DSN strings', () => {
      assert.equal(parseDSN(''), null);
      assert.equal(parseDSN('invalid-string'), null);
      assert.equal(parseDSN('http://missing-key-and-project/'), null);
    });
  });

  describe('PII & Secrets Scrubbing', () => {
    it('should mask passwords, tokens, API keys, and authorization headers', () => {
      const payload = {
        password: 'superSecretPassword123',
        apiKey: 'sk_live_99182390123',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.token',
        user: {
          sessionToken: 'sess_99124',
          creditCard: '4111-2222-3333-4444',
          email: 'customer@company.com'
        },
        safeData: 'public payload value'
      };

      const cleaned = scrub(payload);

      assert.equal(cleaned.password, '[REDACTED_SECRET]');
      assert.equal(cleaned.apiKey, '[REDACTED_SECRET]');
      assert.equal(cleaned.authorization, '[REDACTED_SECRET]');
      assert.equal(cleaned.user.sessionToken, '[REDACTED_SECRET]');
      assert.equal(cleaned.user.creditCard, '[REDACTED_SECRET]');
      assert.equal(cleaned.user.email, '[REDACTED_EMAIL]');
      assert.equal(cleaned.safeData, 'public payload value');
    });

    it('should mask emails, phone numbers, and JWTs in raw strings', () => {
      const text = 'Contact alice@example.com at +1-555-123-4567 with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const cleaned = scrub(text);

      assert.match(cleaned, /\[REDACTED_EMAIL\]/);
      assert.match(cleaned, /\[REDACTED_PHONE\]/);
      assert.match(cleaned, /\[REDACTED_JWT\]/);
      assert.doesNotMatch(cleaned, /alice@example\.com/);
    });
  });

  describe('Stack Trace Parsing', () => {
    it('should parse V8 stack trace lines into structured frames with normalized paths', () => {
      const stack = `Error: Payment gateway timeout
    at processOrder (D:\\Projects\\app\\services\\order.js:42:15)
    at async handleCheckout (D:\\Projects\\app\\controllers\\checkout.js:105:22)
    at Layer.handle [as handle_request] (/var/task/node_modules/express/lib/router/layer.js:95:5)`;

      const frames = parseStackTrace(stack);

      assert.equal(frames.length, 3);
      assert.equal(frames[0].function, 'processOrder');
      assert.equal(frames[0].file, 'D:/Projects/app/services/order.js');
      assert.equal(frames[0].line, 42);
      assert.equal(frames[0].column, 15);

      assert.equal(frames[1].function, 'handleCheckout');
      assert.equal(frames[1].file, 'D:/Projects/app/controllers/checkout.js');
      assert.equal(frames[1].line, 105);
      assert.equal(frames[1].column, 22);
    });

    it('should handle empty or invalid stack gracefully', () => {
      assert.deepEqual(parseStackTrace(''), []);
      assert.deepEqual(parseStackTrace(null), []);
    });
  });

  describe('Client IP Extraction', () => {
    it('should prioritize X-Forwarded-For first client entry', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178'
        }
      };
      assert.equal(getClientIp(req), '203.0.113.195');
    });

    it('should extract cf-connecting-ip for Cloudflare edge traffic', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '198.51.100.42'
        }
      };
      assert.equal(getClientIp(req), '198.51.100.42');
    });

    it('should clean IPv6-mapped IPv4 socket addresses', () => {
      const req = {
        socket: {
          remoteAddress: '::ffff:192.0.2.1'
        }
      };
      assert.equal(getClientIp(req), '192.0.2.1');
    });
  });

  describe('Telemetry Capture APIs', () => {
    it('should capture exceptions without throwing', () => {
      const err = new TypeError("Cannot read property 'id' of undefined");
      assert.doesNotThrow(() => {
        captureException(err, {
          tags: { route: '/api/v1/checkout', userId: 'usr_42' },
          metrics: { duration_ms: 120 }
        });
      });
    });

    it('should capture custom messages with severity', () => {
      assert.doesNotThrow(() => {
        captureMessage('Cache connection failed, using local memory fallback', 'warning', {
          tags: { cluster: 'redis-primary' }
        });
      });
    });

    it('should capture raw telemetry events', () => {
      assert.doesNotThrow(() => {
        captureEvent({
          severity: 'info',
          tags: {
            http_method: 'GET',
            http_path: '/health',
            http_status: '200'
          },
          metrics: { duration_ms: 12 }
        });
      });
    });
  });

  describe('Express Middleware Integration', () => {
    it('should intercept errors in expressMiddleware and pass through to next(err)', (t, done) => {
      const middleware = expressMiddleware();
      const testError = new Error('Database transaction deadlocked');
      const req = { method: 'POST', originalUrl: '/api/v1/transfer', headers: {} };
      const res = { statusCode: 500 };

      middleware(testError, req, res, (err) => {
        assert.equal(err, testError);
        done();
      });
    });

    it('should monitor request lifecycle in autoMonitorMiddleware', (t, done) => {
      const middleware = autoMonitorMiddleware({ monitorAll: true });
      let finishCallback = null;

      const req = {
        method: 'GET',
        originalUrl: '/api/v1/products',
        headers: { 'x-real-ip': '103.21.244.2' }
      };

      const res = {
        statusCode: 200,
        on: (event, cb) => {
          if (event === 'finish') finishCallback = cb;
        }
      };

      middleware(req, res, () => {
        assert.ok(typeof finishCallback === 'function');
        finishCallback();
        done();
      });
    });
  });

  describe('Incivexa Export Namespace', () => {
    it('should expose all core telemetry and middleware methods', () => {
      assert.equal(typeof Incivexa.init, 'function');
      assert.equal(typeof Incivexa.captureException, 'function');
      assert.equal(typeof Incivexa.captureMessage, 'function');
      assert.equal(typeof Incivexa.captureEvent, 'function');
      assert.equal(typeof Incivexa.expressMiddleware, 'function');
      assert.equal(typeof Incivexa.errorHandler, 'function');
      assert.equal(typeof Incivexa.autoMonitorMiddleware, 'function');
      assert.equal(typeof Incivexa.requestMiddleware, 'function');
      assert.equal(typeof Incivexa.flush, 'function');
      assert.equal(typeof Incivexa.close, 'function');
      assert.equal(typeof Incivexa.getConfig, 'function');
      assert.equal(typeof Incivexa.getClientIp, 'function');
      assert.equal(typeof Incivexa.parseDSN, 'function');
      assert.equal(typeof Incivexa.scrub, 'function');
    });
  });
});

