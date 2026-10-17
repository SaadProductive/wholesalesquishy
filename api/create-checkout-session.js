const Stripe = require('stripe');
const WSQ = require('../js/pricing.js');

// Prices, minimum order and shipping are recomputed here from the shared catalog.
// The browser only sends { sku, qty }, so a buyer cannot change a price or shipping fee.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(500).json({ error: 'Stripe is not configured on the server yet.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const items = WSQ.trustedCart(body.items);
    const calc = WSQ.shippingFor(items);

    if (calc.belowMin) {
      res.status(400).json({ error: `Minimum order is ${WSQ.money(WSQ.CONFIG.MIN_ORDER)}. Add ${WSQ.money(calc.toMin)} more to check out.` });
      return;
    }
    if (calc.quote) {
      res.status(400).json({ error: 'Orders above ' + WSQ.money(WSQ.CONFIG.QUOTE_ABOVE) + ' ship by freight. Please request a freight quote and we will send an invoice.' });
      return;
    }

    const stripe = new Stripe(stripeKey);

    const line_items = items.map((item) => ({
      quantity: item.qty,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.unitPrice * 100),
        product_data: {
          name: item.title.slice(0, 250),
          metadata: { sku: item.sku }
        }
      }
    }));

    // compact SKU list for the order log (Stripe metadata values max 500 chars)
    const skuSummary = items.map((i) => `${i.sku} x${i.qty}`).join('; ').slice(0, 480);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: Math.round(calc.amount * 100), currency: 'usd' },
          display_name: calc.label,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 7 }
          }
        }
      }],
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      metadata: { skus: skuSummary, boxes: String(calc.boxes), pieces: String(calc.pieces) },
      payment_intent_data: { metadata: { skus: skuSummary } },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart.html`
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: (err && err.message) || 'Something went wrong creating checkout.' });
  }
};
