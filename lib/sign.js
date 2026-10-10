// Signed links: the RFQ email contains "create invoice" links that only we can generate.
const crypto = require('crypto');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (secret, d, mode) => crypto.createHmac('sha256', secret).update(d + '.' + mode).digest('base64url');
function verify(secret, d, mode, sig) {
  if (!secret || !d || !mode || !sig) return null;
  const good = sign(secret, d, mode);
  const a = Buffer.from(good), b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(d, 'base64url').toString()); return p && p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
module.exports = { b64, sign, verify };
