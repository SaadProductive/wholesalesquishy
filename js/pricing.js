// WholesaleSquishy: single source of truth for catalog prices, minimum order
// and shipping rules. Loaded by the browser (cart/checkout pages) AND required
// by the Vercel API functions, so the price a buyer sees is the price the
// server charges. Edit the numbers in CONFIG and the CATALOG only here.
(function (root) {
  const CONFIG = {
    MIN_ORDER: 150,            // minimum order value (merchandise subtotal after volume pricing), USD
    // Shipping is charged near real cost. Fitted from 5 real orders (2 to 5 cases, CA/TX/AL/FL):
    // real cost ~ $9.30 + $2.35 per case. We charge a little above that so shipping never loses money.
    SHIP_BASE: 12,             // flat part per order
    SHIP_PER_BOX: 2.5,         // per case ("box") in the order
    SHIP_CAP: 400,             // never charge more than this for parcel/economy shipping
    FREE_SHIPPING_FROM: 5000,  // free standard shipping from this subtotal ...
    QUOTE_ABOVE: 15000,        // ... up to and including this; above it freight is quoted separately
    // volume pricing: price per piece = base price x ratio, chosen by TOTAL pieces in the cart
    TIERS: [
      { minPcs: 1000, ratio: 0.8646 },
      { minPcs: 500,  ratio: 0.8708 },
      { minPcs: 250,  ratio: 0.8800 },
      { minPcs: 100,  ratio: 0.9015 },
      { minPcs: 50,   ratio: 0.9385 },
      { minPcs: 0,    ratio: 1 }
    ],
    MAX_QTY_PER_LINE: 50000
  };

  // SKU -> server-trusted price per piece and case size (matches the product pages)
  const CATALOG = {
    'FR-34':      { title: 'Strawberry Pink Butter Squishy, 12pc case',        price: 2.31,  caseSize: 12 },
    'WY-100':     { title: 'Dumpling Medium Squishy, Smiley Face, 12pc case',  price: 3.08,  caseSize: 12 },
    'NM-100':     { title: 'Dumpling Medium Squishy, Printed Face, 12pc case', price: 3.08,  caseSize: 12 },
    'HYB-2861-2': { title: 'Butter Stick Squishy, 4oz Mixed Colors, 12pc case', price: 3.08, caseSize: 12, inStock: false }, // OUT OF STOCK: remove inStock:false when restocked
    'T-YG201':    { title: 'Dumpling Medium Squishy, Mystery Color, 12pc case', price: 3.85, caseSize: 12 },
    'YT0033':     { title: 'Butter Stick Squishy, Realistic Shape, 12pc case', price: 6.15,  caseSize: 12 },
    'T-2435':     { title: 'Strawberry Butter Big Squishy, 12pc case',         price: 6.15,  caseSize: 12 },
    'NM103':      { title: 'Jumbo Bun Dumpling Squishy, 6pc case',             price: 18.46, caseSize: 6 }
  };

  const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const r2 = (n) => Math.round(n * 100) / 100;

  // price per piece for a SKU's base price at a given total piece count
  function tierPrice(base, totalPieces) {
    const t = CONFIG.TIERS.find((x) => totalPieces >= x.minPcs);
    return r2(base * t.ratio);
  }
  // next tier above the current piece count (or null)
  function nextTier(totalPieces) {
    const above = CONFIG.TIERS.filter((x) => x.minPcs > totalPieces).sort((a, b) => a.minPcs - b.minPcs)[0];
    return above ? { minPcs: above.minPcs, ratio: above.ratio, pcsToGo: above.minPcs - totalPieces } : null;
  }
  function shippingAmount(boxes) {
    return Math.min(CONFIG.SHIP_CAP, r2(CONFIG.SHIP_BASE + CONFIG.SHIP_PER_BOX * boxes));
  }

  // items: [{ sku, qty, unitPrice, caseSize }]  (unitPrice here is already the tier price)
  function summarize(items) {
    let subtotal = 0, pieces = 0, boxes = 0;
    items.forEach((i) => {
      const unit = Number(i.unitPrice), qty = Number(i.qty), cs = Number(i.caseSize) || 1;
      subtotal += unit * qty;
      pieces += qty;
      boxes += Math.ceil(qty / cs);
    });
    return { subtotal: r2(subtotal), pieces, boxes };
  }

  // Full shipping/MOP decision for a cart.
  function shippingFor(items) {
    const { subtotal, pieces, boxes } = summarize(items);
    const c = CONFIG;
    const out = { subtotal, pieces, boxes, minOrder: c.MIN_ORDER, belowMin: subtotal < c.MIN_ORDER,
                  amount: 0, mode: 'paid', label: 'Standard ground shipping', toFree: 0, toMin: 0, quote: false };
    if (out.belowMin) out.toMin = r2(c.MIN_ORDER - subtotal);

    if (subtotal > c.QUOTE_ABOVE) {
      out.mode = 'quote'; out.quote = true; out.label = 'Freight quoted separately';
    } else if (subtotal >= c.FREE_SHIPPING_FROM) {
      out.mode = 'free'; out.label = 'Free standard shipping';
    } else {
      out.amount = shippingAmount(boxes);
      out.toFree = r2(c.FREE_SHIPPING_FROM - subtotal);
    }
    return out;
  }

  // Server-side: rebuild a trusted cart from client-sent {sku, qty}; throws Error with a
  // buyer-readable message when anything is wrong.
  function trustedCart(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error('Cart is empty.');
    const merged = {};
    rawItems.forEach((r) => {
      const cat = CATALOG[r && r.sku];
      if (!cat) throw new Error('Unknown product in cart: ' + String(r && r.sku).slice(0, 40));
      if (cat.inStock === false) throw new Error(cat.title.replace(/, 12pc case| case/, '') + ' is currently out of stock. Please remove it from your cart.');
      const qty = parseInt(r.qty, 10);
      if (!Number.isFinite(qty) || qty < cat.caseSize || qty % cat.caseSize !== 0 || qty > CONFIG.MAX_QTY_PER_LINE) {
        throw new Error('Quantity for ' + r.sku + ' must be a multiple of ' + cat.caseSize + ' pieces.');
      }
      merged[r.sku] = (merged[r.sku] || 0) + qty;
    });
    const total = Object.keys(merged).reduce((n, k) => n + merged[k], 0);
    return Object.keys(merged).map((sku) => ({
      sku, qty: merged[sku], title: CATALOG[sku].title,
      unitPrice: tierPrice(CATALOG[sku].price, total), caseSize: CATALOG[sku].caseSize
    }));
  }

  const api = { CONFIG, CATALOG, money, summarize, shippingFor, shippingAmount, tierPrice, nextTier, trustedCart };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WSQ = api;
})(typeof window !== 'undefined' ? window : globalThis);
