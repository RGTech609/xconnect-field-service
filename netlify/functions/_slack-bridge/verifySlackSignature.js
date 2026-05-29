import crypto from 'node:crypto';

const FIVE_MINUTES_SECONDS = 60 * 5;

/**
 * Verify a Slack request signature.
 * Pass the *raw* request body (string), not the parsed one.
 * Returns true when the signature is valid and the timestamp is fresh.
 */
export function verifySlackSignature({ signingSecret, timestamp, signature, rawBody, now = Date.now }) {
  if (!signingSecret || !timestamp || !signature || rawBody == null) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const skewSeconds = Math.abs(Math.floor(now() / 1000) - ts);
  if (skewSeconds > FIVE_MINUTES_SECONDS) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
