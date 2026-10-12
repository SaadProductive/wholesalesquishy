// Stripe webhook -> Google Sheets order log.
// Fires on checkout.session.completed and appends one row per paid order.
// No extra npm packages: the Google service-account JWT is signed with node:crypto.
//
// Vercel env vars needed (see SETUP-ORDER-SHEET.md):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   GOOGLE_SHEET_ID (admin sheet), WAREHOUSE_SHEET_ID (warehouse sheet), and EITHER
//     FREE:  SHEETS_SCRIPT_URL + SHEETS_SCRIPT_TOKEN (Apps Script web app, apps-script/order-receiver.gs, no Google Cloud)
//     OR:    GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (Google Cloud service account)
const crypto = require('crypto');
const Stripe = require('stripe');

const WSQ = require('../js/pricing.js');

const SITE = process.env.SITE_URL || 'https://wholesalesquishy.com';
const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'];
const STATUSES = ['New', 'Confirmed', 'Packing', 'Shipped', 'Delivered', 'On hold', 'Out of stock'];
const STATUS_COLORS = { 'New': [1, 0.95, 0.7], 'Confirmed': [0.8, 0.9, 1], 'Packing': [1, 0.85, 0.7], 'Shipped': [0.75, 0.93, 0.78], 'Delivered': [0.6, 0.85, 0.65], 'On hold': [0.9, 0.9, 0.9], 'Out of stock': [1, 0.78, 0.78] };

// One row per product line. Admin sheet = everything (money, payment). Warehouse sheet = no prices/payment.
const SHEETS = {
  admin: {
    env: 'GOOGLE_SHEET_ID', keyCol: 1, statusCol: 'Status',
    headers: ['Order date (UTC)', 'Order ID', 'Name', 'Email', 'Phone', 'Ship to', 'Address 1', 'Address 2', 'City', 'State', 'ZIP', 'Country',
      'Product', 'SKU', 'Image', 'Cases', 'Pieces', 'Price / pc', 'Line total', 'Order subtotal', 'Shipping', 'Order total', 'Payment method', 'Payment status',
      'Status', 'Tracking #', 'Notes'],
    widths: [135, 110, 140, 190, 110, 140, 170, 90, 100, 60, 70, 60, 260, 90, 110, 60, 70, 80, 90, 95, 80, 95, 140, 100, 110, 140, 200],
    row: (o, l) => [o.date, o.shortId, o.name, o.email, o.phone, o.shipName, o.a1, o.a2, o.city, o.state, o.zip, o.country,
      l.title, l.sku, l.image, l.cases, l.pieces, l.unit, l.total, o.subtotal, o.shipping, o.orderTotal, o.method, o.payStatus, 'New', '', '']
  },
  warehouse: {
    env: 'WAREHOUSE_SHEET_ID', keyCol: 1, statusCol: 'Status',
    headers: ['Order ID', 'Order date', 'Ship to', 'Address 1', 'Address 2', 'City', 'State', 'ZIP', 'Phone',
      'Product', 'SKU', 'Image', 'Cases', 'Pieces', 'Status', 'Carrier', 'Tracking #', 'Notes', 'Buyer emailed'],
    widths: [110, 95, 150, 180, 90, 100, 60, 70, 110, 260, 90, 110, 60, 70, 110, 100, 150, 200, 130],
    row: (o, l) => [o.shortId, o.date.slice(0, 10), o.shipName, o.a1, o.a2, o.city, o.state, o.zip, o.phone,
      l.title, l.sku, l.image, l.cases, l.pieces, 'New', '', '', '', '']
  }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function googleAccessToken() {
  if (process.env.SHEETS_SCRIPT_URL) return null; // free mode: orders go through the Apps Script web app instead of a Google Cloud service account
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const sig = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(key);
  const jwt = `${header}.${claim}.${b64url(sig)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google auth failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function sheets(id, path, token, opts = {}) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Sheets API error: ' + JSON.stringify(j));
  return j;
}

// first run: header row, frozen header, widths, tall rows for images, status dropdown + colours
async function setupSheet(id, cfg, token, sheetId, tab) {
  const col = cfg.headers.indexOf(cfg.statusCol);
  const range = (c0, c1) => ({ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: c0, endColumnIndex: c1 });
  const requests = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.17, green: 0.14, blue: 0.13 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)' } },
    { repeatCell: { range: range(0, cfg.headers.length), cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 1000 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
    { setDataValidation: { range: range(col, col + 1), rule: { condition: { type: 'ONE_OF_LIST', values: STATUSES.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false } } },
    ...(cfg.headers.indexOf('Carrier') >= 0 ? [{ setDataValidation: { range: range(cfg.headers.indexOf('Carrier'), cfg.headers.indexOf('Carrier') + 1), rule: { condition: { type: 'ONE_OF_LIST', values: CARRIERS.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false } } }] : []),
    { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: cfg.headers.length } } } }
  ];
  cfg.widths.forEach((w, i) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: 'pixelSize' } }));
  STATUSES.forEach((st, i) => {
    const c = STATUS_COLORS[st];
    requests.push({ addConditionalFormatRule: { index: i, rule: { ranges: [range(col, col + 1)],
      booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: st }] }, format: { backgroundColor: { red: c[0], green: c[1], blue: c[2] } } } } } });
  });
  await sheets(id, ':batchUpdate', token, { method: 'POST', body: JSON.stringify({ requests }) });
  await sheets(id, `/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`, token, { method: 'PUT', body: JSON.stringify({ values: [cfg.headers] }) });
}

const hex = (c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

// FREE mode: hand the rows to the Apps Script web app (apps-script/order-receiver.gs), which runs as the sheet owner.
async function appendViaScript(cfg, order, lines) {
  const statusColors = {};
  STATUSES.forEach((st) => { statusColors[st] = hex(STATUS_COLORS[st]); });
  const r = await fetch(process.env.SHEETS_SCRIPT_URL, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: process.env.SHEETS_SCRIPT_TOKEN, sheetId: process.env[cfg.env], orderId: order.shortId,
      headers: cfg.headers, widths: cfg.widths, statusCol: cfg.statusCol, statuses: STATUSES, statusColors, carriers: CARRIERS,
      rows: lines.map((l) => cfg.row(order, l)) })
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Sheets script bad response: ' + txt.slice(0, 200)); }
  if (!j.ok) throw new Error('Sheets script error: ' + j.error);
  return j.result;
}

async function appendTo(cfg, order, lines, token) {
  const id = process.env[cfg.env];
  if (!id) return 'skipped (no ' + cfg.env + ')';
  if (process.env.SHEETS_SCRIPT_URL) return appendViaScript(cfg, order, lines);
  const meta = await sheets(id, '?fields=sheets.properties', token);
  const sh = meta.sheets[0].properties;
  const tab = sh.title;
  const existing = await sheets(id, `/values/${encodeURIComponent(tab)}!A:B`, token);
  const rows = existing.values || [];
  if (rows.length === 0 || !rows[0][0]) await setupSheet(id, cfg, token, sh.sheetId, tab);
  else if (rows.some((r) => r[cfg.keyCol - 1] === order.shortId || r[cfg.keyCol] === order.shortId)) return 'duplicate';
  const values = lines.map((l) => cfg.row(order, l));
  await sheets(id, `/values/${encodeURIComponent(tab)}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, token, {
    method: 'POST', body: JSON.stringify({ values })
  });
  return 'logged';
}


// ---------- order confirmation email to the buyer (Gmail SMTP; same env vars as the contact form) ----------
const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function emailConfirmation(order, lines) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !order.email) return 'skipped';
  const nodemailer = require('nodemailer');
  const support = process.env.SUPPORT_EMAIL || 'support@wholesalesquishy.com';
  const real = lines.filter((l) => l.sku);
  const rowsHtml = real.map((l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EADFCF;">${esc(l.title)}<br><span style="color:#6b5f57;font-size:13px;">${esc(l.cases)} case${l.cases === 1 ? '' : 's'} &middot; ${esc(l.pieces)} pcs</span></td><td style="padding:8px 0;border-bottom:1px solid #EADFCF;text-align:right;white-space:nowrap;">$${esc(l.total)}</td></tr>`).join('');
  const addr = [order.shipName, order.a1, order.a2, `${order.city}, ${order.state} ${order.zip}`].filter(Boolean).map(esc).join('<br>');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2B2320;">
  <h2 style="margin:0 0 6px 0;">Thank you for your order${order.name ? ', ' + esc(order.name.split(' ')[0]) : ''}!</h2>
  <p style="margin:0 0 16px 0;color:#6b5f57;">Order <b>#${esc(order.shortId)}</b> is confirmed and being processed immediately. Delivery within 5 working days for most US addresses (up to 8 to distant states). We will email your tracking number as soon as it ships.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">${rowsHtml}
    <tr><td style="padding:8px 0;color:#6b5f57;">Subtotal</td><td style="text-align:right;">$${esc(order.subtotal)}</td></tr>
    <tr><td style="padding:4px 0;color:#6b5f57;">Shipping</td><td style="text-align:right;">${Number(order.shipping) === 0 ? 'FREE' : '$' + esc(order.shipping)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;">Total paid</td><td style="text-align:right;font-weight:bold;">$${esc(order.orderTotal)}</td></tr>
  </table>
  <p style="margin:18px 0 4px 0;font-weight:bold;">Shipping to</p><p style="margin:0;color:#6b5f57;line-height:1.5;">${addr}</p>
  <p style="margin:18px 0 0 0;color:#6b5f57;">Questions? Reply to this email or write to <a href="mailto:${esc(support)}">${esc(support)}</a>. Stripe also emails your payment receipt separately.</p>
  <p style="margin:18px 0 0 0;color:#6b5f57;font-size:13px;">Wholesale Squishy &middot; 12508 Center St, Suite 5, South Gate, CA 90280</p></div>`;
  const text = `Thank you for your order! Order #${order.shortId} is confirmed and being processed immediately.\n` +
    real.map((l) => `- ${l.title}: ${l.cases} case(s), ${l.pieces} pcs, $${l.total}`).join('\n') +
    `\nSubtotal $${order.subtotal} | Shipping $${order.shipping} | Total $${order.orderTotal}\n` +
    `Delivery within 5 working days for most US addresses. We will email tracking when it ships.\nQuestions: ${support}`;
  const tx = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await tx.sendMail({ from: `"Wholesale Squishy" <${user}>`, to: order.email, bcc: process.env.CONTACT_TO || undefined, replyTo: support,
    subject: `Order #${order.shortId} confirmed - Wholesale Squishy`, text, html });
  return 'sent';
}

async function logOrder(session, stripe) {
  const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price.product', 'payment_intent.payment_method'] });
  const token = await googleAccessToken();

  const cd = full.customer_details || {};
  const ship = full.shipping_details || (full.collected_information && full.collected_information.shipping_details) || {};
  const a = ship.address || cd.address || {};
  const usd = (c) => (Number(c || 0) / 100).toFixed(2);
  const pm = full.payment_intent && full.payment_intent.payment_method;
  let method = pm && pm.type ? pm.type : '';
  if (pm && pm.card) method = `${pm.card.brand} ****${pm.card.last4}`;

  const order = {
    date: new Date(full.created * 1000).toISOString().replace('T', ' ').slice(0, 19),
    shortId: full.id.slice(-8).toUpperCase(),
    name: cd.name || '', email: cd.email || '', phone: cd.phone || '',
    shipName: ship.name || cd.name || '', a1: a.line1 || '', a2: a.line2 || '', city: a.city || '', state: a.state || '', zip: a.postal_code || '', country: a.country || '',
    subtotal: usd(full.amount_subtotal), shipping: usd(full.total_details && full.total_details.amount_shipping), orderTotal: usd(full.amount_total),
    method, payStatus: full.payment_status
  };

  const lines = ((full.line_items && full.line_items.data) || []).map((li) => {
    const prod = li.price && li.price.product && typeof li.price.product === 'object' ? li.price.product : {};
    let sku = (prod.metadata && prod.metadata.sku) || '';
    if (!sku) { // fallback: match by product title
      const hit = Object.keys(WSQ.CATALOG).find((k) => (li.description || '').indexOf(WSQ.CATALOG[k].title.replace(/, \d+pc case$/, '')) === 0);
      sku = hit || '';
    }
    const cat = WSQ.CATALOG[sku] || {};
    const pieces = li.quantity;
    return {
      sku, title: (cat.title || li.description || '').replace(/, \d+pc case$/, ''),
      image: sku ? `=IMAGE("${SITE}/images/sheet/${sku.toLowerCase()}.jpg",1)` : '',
      pieces, cases: cat.caseSize ? Math.ceil(pieces / cat.caseSize) : '',
      unit: usd(li.price && li.price.unit_amount), total: usd(li.amount_total)
    };
  });
  if (lines.length === 0) lines.push({ sku: '', title: '(no items found)', image: '', pieces: '', cases: '', unit: '', total: '' });

  return finish(order, lines, token);
}

async function finish(order, lines, token) {
  const out = {};
  for (const k of Object.keys(SHEETS)) out[k] = await appendTo(SHEETS[k], order, lines, token);
  // email only for a NEW order (not a Stripe redelivery), and never let an email problem make Stripe retry the sheet logging
  if (out.admin !== 'duplicate') {
    try { out.email = await emailConfirmation(order, lines); } catch (e) { console.error('Confirmation email failed:', e && e.message); out.email = 'failed'; }
  }
  return out;
}

// Invoice orders (created from an RFQ): when a Stripe invoice is paid, log it exactly like a checkout order.
async function logInvoice(inv, stripe) {
  const token = await googleAccessToken();
  const usd = (c) => (Number(c || 0) / 100).toFixed(2);
  const sh = inv.customer_shipping || {}, a = sh.address || inv.customer_address || {};
  const all = (inv.lines && inv.lines.data) || [];
  const shipLine = all.find((l) => l.metadata && l.metadata.type === 'shipping');
  const lines = all.filter((l) => !(l.metadata && l.metadata.type === 'shipping')).map((li) => {
    const sku = (li.metadata && li.metadata.sku) || '';
    const cat = WSQ.CATALOG[sku] || {};
    const pieces = li.quantity;
    return { sku, title: (cat.title || li.description || '').replace(/, \d+pc case$/, ''),
      image: sku ? `=IMAGE("${SITE}/images/sheet/${sku.toLowerCase()}.jpg",1)` : '',
      pieces, cases: cat.caseSize ? Math.ceil(pieces / cat.caseSize) : '', unit: usd(li.amount / Math.max(1, li.quantity)), total: usd(li.amount) };
  });
  const order = {
    date: new Date(inv.created * 1000).toISOString().replace('T', ' ').slice(0, 19),
    shortId: inv.id.slice(-8).toUpperCase(),
    name: inv.customer_name || '', email: inv.customer_email || '', phone: inv.customer_phone || '',
    shipName: sh.name || inv.customer_name || '', a1: a.line1 || '', a2: a.line2 || '', city: a.city || '', state: a.state || '', zip: a.postal_code || '', country: a.country || '',
    subtotal: usd(inv.subtotal - (shipLine ? shipLine.amount : 0)), shipping: usd(shipLine ? shipLine.amount : 0), orderTotal: usd(inv.amount_paid || inv.total),
    method: 'invoice', payStatus: 'paid'
  };
  if (!lines.length) lines.push({ sku: '', title: '(invoice ' + inv.number + ')', image: '', pieces: '', cases: '', unit: '', total: usd(inv.total) });
  return finish(order, lines, token);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) { res.status(500).send('Webhook not configured'); return; }

  const stripe = new Stripe(stripeKey);
  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
  } catch (err) {
    res.status(400).send('Webhook signature check failed');
    return;
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    try {
      const result = await logOrder(event.data.object, stripe);
      res.status(200).json({ received: true, result });
    } catch (err) {
      // non-2xx makes Stripe retry for up to 3 days, so a temporary Google error never loses an order
      console.error('Order log failed:', err && err.message);
      res.status(500).send('Order log failed');
    }
    return;
  }
  if (event.type === 'invoice.paid') {
    try {
      const inv = event.data.object;
      if (!inv.metadata || inv.metadata.source !== 'rfq') { res.status(200).json({ received: true, ignored: 'non-rfq invoice' }); return; }
      const result = await logInvoice(inv, stripe);
      res.status(200).json({ received: true, result });
    } catch (err) {
      console.error('Invoice log failed:', err && err.message);
      res.status(500).send('Invoice log failed');
    }
    return;
  }
  res.status(200).json({ received: true, ignored: event.type });
};

module.exports.config = { api: { bodyParser: false } };
