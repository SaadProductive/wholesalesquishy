const Stripe = require('stripe');

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

    const stripe = new Stripe(stripeKey);

    try {
          const { items, shipping } = req.body || {};
          if (!Array.isArray(items) || items.length === 0) {
                  res.status(400).json({ error: 'Cart is empty.' });
                  return;
          }

      const line_items = items.map((item) => ({
              quantity: item.qty,
              price_data: {
                        currency: 'usd',
                        unit_amount: Math.round(Number(item.unitPrice) * 100),
                        product_data: { name: String(item.title || 'Item').slice(0, 250) },
              },
      }));

      if (shipping && Number(shipping.amount) > 0) {
              line_items.push({
                        quantity: 1,
                        price_data: {
                                    currency: 'usd',
                                    unit_amount: Math.round(Number(shipping.amount) * 100),
                                    product_data: { name: String(shipping.label || 'Shipping').slice(0, 250) },
                        },
              });
      }

      const origin = req.headers.origin || `https://${req.headers.host}`;

      const session = await stripe.checkout.sessions.create({
              mode: 'payment',
              line_items,
              success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${origin}/cart.html`,
              shipping_address_collection: { allowed_countries: ['US'] },
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
          res.status(500).json({ error: (err && err.message) || 'Something went wrong creating checkout.' });
    }
};
