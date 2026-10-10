// Request for quote (large orders). Emails you a full summary + one-click "create Stripe invoice" links,
// and sends the buyer a confirmation with an estimate.
// Env: GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO (same as contact form), ADMIN_LINK_SECRET (any long random string you invent).
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const WSQ = require('../js/pricing.js');
const { b64, sign } = require('../lib/sign.js');

const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const noNl = (v) => /[\r\n]/.test(v);
const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = process.env.SITE_URL || 'https://wholesalesquishy.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website) { res.status(200).json({ ok: true }); return; }

  const f = {
    business: clean(b.business, 150), name: clean(b.name, 120), email: clean(b.email, 200), phone: clean(b.phone, 40),
    a1: clean(b.a1, 150), a2: clean(b.a2, 100), city: clean(b.city, 80), state: clean(b.state, 40), zip: clean(b.zip, 12),
    notes: clean(b.notes, 3000), payment: clean(b.payment, 60), resale: !!b.resale
  };
  if (!f.name || !f.email || !f.a1 || !f.city || !f.state || !f.zip) { res.status(400).json({ error: 'Please fill in name, email and the full shipping address.' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || [f.email, f.name, f.business, f.a1, f.city, f.state, f.zip, f.payment].some(noNl)) { res.status(400).json({ error: 'Please check your details.' }); return; }

  let items, calc;
  try { items = WSQ.trustedCart(b.items); calc = WSQ.shippingFor(items); }
  catch (e) { res.status(400).json({ error: e.message }); return; }

  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD, to = process.env.CONTACT_TO || user;
  if (!user || !pass || !to) { res.status(500).json({ error: 'Quote form is not configured.' }); return; }

  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  const lines = items.map((i) => ({ sku: i.sku, title: i.title, qty: i.qty, cases: Math.ceil(i.qty / i.caseSize), unit: i.unitPrice, total: Math.round(i.qty * i.unitPrice * 100) / 100 }));
  const shipTxt = calc.mode === 'free' ? 'FREE (orders $5,000+)' : calc.mode === 'quote' ? 'Freight quoted separately' : WSQ.money(calc.amount);
  const est = calc.mode === 'quote' ? WSQ.money(calc.subtotal) + ' + freight' : WSQ.money(calc.subtotal + calc.amount);
  const rows = lines.map((l) => `<tr><td style="padding:5px 8px;border-bottom:1px solid #eee;">${esc(l.title)}<br><small>${esc(l.sku)}</small></td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;">${l.cases} case(s) / ${l.qty} pcs</td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;">${WSQ.money(l.unit)}/pc</td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;">${WSQ.money(l.total)}</td></tr>`).join('');

  let links = '';
  const secret = process.env.ADMIN_LINK_SECRET;
  if (secret) {
    const d = b64({ id, f, items: items.map((i) => ({ sku: i.sku, qty: i.qty })), exp: Date.now() + 14 * 864e5 });
    const u = (m) => `${SITE}/api/invoice?d=${d}&mode=${m}&sig=${sign(secret, d, m)}`;
    links = `<p style="margin:18px 0 6px 0;"><a href="${u('send')}" style="background:#F1583B;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">Create &amp; email Stripe invoice</a>
      &nbsp; <a href="${u('draft')}" style="padding:10px 16px;border:1px solid #999;border-radius:8px;text-decoration:none;color:#222;">Create draft only</a></p>
      <p style="font-size:12px;color:#777;">Links work for 14 days. ${calc.mode === 'quote' ? 'This order needs freight: the invoice is created as a draft without shipping, add freight in Stripe before sending.' : 'The invoice includes volume pricing and shipping as shown, due in 14 days, payable by card or bank transfer.'}</p>`;
  }
  const addr = [f.a1, f.a2, `${f.city}, ${f.state} ${f.zip}`].filter(Boolean).map(esc).join('<br>');
  const ownerHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#222;">
    <h2 style="margin:0 0 8px 0;">New quote request #${id}</h2>
    <p><b>${esc(f.business || '(no business name)')}</b><br>${esc(f.name)} &middot; <a href="mailto:${esc(f.email)}">${esc(f.email)}</a> &middot; ${esc(f.phone || 'no phone')}</p>
    <p><b>Ship to</b><br>${addr}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
    <p style="margin:10px 0;">Subtotal ${WSQ.money(calc.subtotal)} &middot; Shipping: ${esc(shipTxt)} &middot; <b>Estimate ${esc(est)}</b></p>
    <p><b>Payment preference:</b> ${esc(f.payment || 'not specified')}<br><b>Resale certificate:</b> ${f.resale ? 'buyer has one (ask for a copy)' : 'no / not mentioned'}</p>
    <p><b>Notes:</b><br>${esc(f.notes || '-').replace(/\n/g, '<br>')}</p>${links}
    <p style="font-size:12px;color:#777;">Reply to this email to answer the buyer directly.</p></div>`;
  const buyerHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#2B2320;">
    <h2>We received your quote request, ${esc(f.name.split(' ')[0])}</h2>
    <p>Reference <b>#${id}</b>. We will reply within 1 business day with your quote and an invoice you can pay by card or bank transfer.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
    <p>Subtotal ${WSQ.money(calc.subtotal)} &middot; Shipping: ${esc(shipTxt)}<br><b>Estimated total: ${esc(est)}</b></p>
    <p style="color:#6b5f57;font-size:13px;">This is an estimate based on current volume pricing. Questions? Reply to this email.<br>Wholesale Squishy &middot; 12508 Center St, Suite 5, South Gate, CA 90280</p></div>`;

  try {
    const tx = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await tx.sendMail({ from: `"Wholesale Squishy site" <${user}>`, to, replyTo: `"${f.name.replace(/"/g, '')}" <${f.email}>`, subject: `[Quote #${id}] ${f.business || f.name} - ${est}`, html: ownerHtml });
    try { await tx.sendMail({ from: `"Wholesale Squishy" <${user}>`, to: f.email, replyTo: process.env.SUPPORT_EMAIL || 'support@wholesalesquishy.com', subject: `We received your quote request #${id}`, html: buyerHtml }); } catch (e) { console.error('RFQ buyer copy failed:', e && e.message); }
    res.status(200).json({ ok: true, id, estimate: est });
  } catch (err) {
    console.error('RFQ mail failed:', err && err.message);
    res.status(500).json({ error: 'Could not send right now.' });
  }
};
