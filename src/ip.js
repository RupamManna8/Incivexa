/**
 * Requester Client IP Address Resolver
 * Reliably extracts client IP from Express, Fastify, Raw Node HTTP, Cloudflare, AWS ALB, Nginx, and Sockets.
 */

export function getClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Express req.ip (when app.set('trust proxy', true) is enabled)
  if (req.ip && typeof req.ip === 'string') {
    return cleanIp(req.ip);
  }

  // 2. Custom headers: X-Forwarded-For (client, proxy1, proxy2)
  const headers = req.headers || {};
  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    const first = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
    if (first && first.trim()) return cleanIp(first.trim());
  }

  // 3. CDN and Reverse Proxy Headers
  const proxyHeaders = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx / Traefik
    'true-client-ip',        // Akamai / Cloudflare Enterprise
    'x-client-ip',           // Apache / General
    'x-cluster-client-ip',   // Rackspace / LB
    'fastly-client-ip'       // Fastly CDN
  ];

  for (const h of proxyHeaders) {
    if (headers[h] && typeof headers[h] === 'string') {
      return cleanIp(headers[h]);
    }
  }

  // 4. Socket and connection fallback
  const socketAddress = req.socket?.remoteAddress || req.connection?.remoteAddress || req.info?.remoteAddress;
  if (socketAddress) {
    return cleanIp(socketAddress);
  }

  return '127.0.0.1';
}

function cleanIp(ip) {
  if (!ip) return '127.0.0.1';
  // Strip IPv6-mapped IPv4 prefix (e.g., ::ffff:192.168.1.1)
  let clean = ip.replace(/^::ffff:/, '').trim();
  if (clean === '::1' || clean === 'localhost') return '127.0.0.1';
  return clean;
}

export default getClientIp;
