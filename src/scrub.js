/**
 * PII & Secrets Scrubbing Engine
 * Recursively masks sensitive fields, high-entropy tokens, passwords, and PII.
 */

const DEFAULT_DENY_LIST = [
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'passwd',
  'secret',
  'token',
  'key',
  'apikey',
  'access_token',
  'private_key',
  'client_secret',
  'session',
  'credit_card',
  'card_number',
  'cvv',
  'cvc',
  'ssn'
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9-_=]+\.eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9_\-\.=]+/gi;

/**
 * Checks if a key matches any denied sensitive pattern
 */
export function isSensitiveKey(key, customDenyList = []) {
  if (typeof key !== 'string') return false;
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const denylist = [...DEFAULT_DENY_LIST, ...customDenyList];
  return denylist.some(deny => normalized.includes(deny.toLowerCase().replace(/[^a-z0-9]/g, '')));
}

/**
 * Mask PII from a string value
 */
export function maskString(str) {
  if (typeof str !== 'string') return str;
  let masked = str;
  masked = masked.replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]');
  masked = masked.replace(JWT_REGEX, '[REDACTED_JWT]');
  masked = masked.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
  masked = masked.replace(PHONE_REGEX, '[REDACTED_PHONE]');
  masked = masked.replace(CARD_REGEX, '[REDACTED_CARD]');
  return masked;
}

/**
 * Recursively scrubs secrets and PII from a target object or primitive
 */
export function scrub(data, options = {}, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return '[REDACTED_MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  const customDeny = options.denyList || [];

  if (Array.isArray(data)) {
    return data.map(item => scrub(item, options, depth + 1, maxDepth));
  }

  if (typeof data === 'object') {
    const scrubbed = {};
    for (const [key, val] of Object.entries(data)) {
      if (isSensitiveKey(key, customDeny)) {
        scrubbed[key] = '[REDACTED_SECRET]';
      } else {
        scrubbed[key] = scrub(val, options, depth + 1, maxDepth);
      }
    }
    return scrubbed;
  }

  if (typeof data === 'string') {
    return maskString(data);
  }

  return data;
}

export default scrub;
