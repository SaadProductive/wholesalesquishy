// Owner-only (signed link from the RFQ email): creates a Stripe invoice for the quote.
// mode=send  -> finalize and email the invoice to the buyer;  mode=draft -> leave as draft to review in Stripe.
// Env: STRIPE_SECRET_KEY, ADMIN_LINK_SECRET
const Stripe = require('stripe');
const WSQ = require('../js/pricing.js');
const { verify } = require('../lib/sign.js');

const page = (res, code, title, body) => {
  res.status(code).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#222;line-height:1.6"><h2>${title}</h2>${body}`);
};

module.exports = async (req, res) => {
  const q = req.query || {};
  const mode = q.mode === 'draft' ? 'draft' : 'send';
  const p = verify(process.env.ADMIN_LINK_SECRET, q.d, q.mode, q.sig);
  if (!p) { page(res, 403, 'Link not valid', '<p>This link is invalid or expired (links last 14 days). Use the Stripe dashboard to create the invoice manually.</p>'); return; }
  if (!process.env.STRIPE_SECRET_KEY) { page(res, 500, 'Not configured', '<p>STRIPE_SECRET_KEY is missing.</p>'); return; }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const f = p.f, items = WSQ.trustedCart(p.items), calc = WSQ.shippingFor(items);
    const doSend = mode === 'send' && calc.mode !== 'quote';
    const key = (s) => `rfq-${p.id}-${s}`;

    // already created? (double click / second device)
    const found = await stripe.invoices.search({ query: `metadata['rfq']:'${p.id}'`, limit: 1 }).catch(() => ({ data: [] }));
    if (found.data.length) {
      const e = found.data[0];
      page(res, 200, 'Invoice already exists', `<p>Invoice <b>${e.number || e.id}</b> (${e.status}) was already created for quote #${p.id}.</p><p><a href="https://dashboard.stripe.com/invoices/${e.id}">Open in Stripe</a></p>`);
      return;
    }

    const address = { line1: f.a1, line2: f.a2 || undefined, city: f.city, state: f.state, postal_code: f.zip, country: 'US' };
    const existing = await stripe.customers.list({ email: f.email, limit: 1 });
    const customer = existing.data[0] || await stripe.customers.create({ name: f.business || f.name, email: f.email, phone: f.phone || undefined, address, shipping: { name: f.business || f.name, phone: f.phone || undefined, address } }, { idempotencyKey: key('cust') });
    if (existing.data[0]) await stripe.customers.update(customer.id, { shipping: { name: f.business || f.name, phone: f.phone || undefined, address } });

    const base = { customer: customer.id, collection_method: 'send_invoice', days_until_due: 14, auto_advance: false, pending_invoice_items_behavior: 'exclude',
      description: `Quote #${p.id}`, metadata: { source: 'rfq', rfq: p.id } };
    let inv;
    try { inv = await stripe.invoices.create({ ...base, payment_settings: { payment_method_types: ['card', 'us_bank_account'] } }, { idempotencyKey: key('inv') }); }
    catch (e) { inv = await stripe.invoices.create(base, { idempotencyKey: key('inv2') }); }   // account has no bank-transfer method enabled: use dashboard defaults

    let n = 0;
    for (const it of items) {
      await stripe.invoiceItems.create({ customer: customer.id, invoice: inv.id, currency: 'usd', quantity: it.qty, unit_amount: Math.round(it.unitPrice * 100),
        description: `${it.title} (${Math.ceil(it.qty / it.caseSize)} case${it.qty / it.caseSize === 1 ? '' : 's'})`, metadata: { sku: it.sku, source: 'rfq' } }, { idempotencyKey: key('it' + (n++)) });
    }
    if (calc.mode === 'paid' && calc.amount > 0) {
      await stripe.invoiceItems.create({ customer: customer.id, invoice: inv.id, currency: 'usd', amount: Math.round(calc.amount * 100), description: 'Shipping', metadata: { type: 'shipping', source: 'rfq' } }, { idempotencyKey: key('ship') });
    }

    if (doSend) {
      const fin = await stripe.invoices.finalizeInvoice(inv.id);
      await stripe.invoices.sendInvoice(inv.id);
      page(res, 200, 'Invoice sent', `<p>Invoice <b>${fin.number || fin.id}</b> for <b>${WSQ.money(fin.total / 100)}</b> was emailed to ${f.email}.</p><p><a href="${fin.hosted_invoice_url}">View the invoice the buyer sees</a> &middot; <a href="https://dashboard.stripe.com/invoices/${inv.id}">Open in Stripe</a></p><p>When it is paid, the order appears in your Orders and Warehouse sheets automatically.</p>`);
    } else {
      page(res, 200, 'Draft invoice created', `<p>A draft invoice for quote #${p.id} was created${calc.mode === 'quote' ? ' (freight not included: add it before sending)' : ''}.</p><p><a href="https://dashboard.stripe.com/invoices/${inv.id}">Open it in Stripe to review and send</a></p>`);
    }
  } catch (err) {
    console.error('Invoice create failed:', err && err.message);
    page(res, 500, 'Could not create the invoice', `<p>${String(err && err.message || 'Unknown error').replace(/</g, '&lt;')}</p><p>Create it manually in the Stripe dashboard.</p>`);
  }
};
