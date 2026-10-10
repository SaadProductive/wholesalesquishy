// WholesaleSquishy — cart logic (client-side demo, no backend)
const CART_KEY = 'wsq_cart';

function getCart() {
  let cart;
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
  // always show catalog prices (shared with the server) even if an old cart is in storage
  if (typeof WSQ !== 'undefined') {
    const total = cart.reduce((n, i) => n + (Number(i.qty) || 0), 0);
    cart.forEach(i => {
      const c = WSQ.CATALOG[i.sku];
      if (c) { i.basePrice = c.price; i.unitPrice = WSQ.tierPrice(c.price, total); i.caseSize = c.caseSize; i.title = c.title; }
    });
  }
  return cart;
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  if (typeof renderCartPage === 'function') renderCartPage();
  if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.sku === item.sku);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  if (window.wsqTrack) wsqTrack('add_to_cart', { ecommerce: { currency: wsqCurrency, value: Math.round(item.qty * item.unitPrice * 100) / 100, items: wsqItems([item]) } });
  showCartPopup(item);
}

function removeFromCart(sku) {
  const cart = getCart().filter(i => i.sku !== sku);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function setQty(sku, qty) {
  const cart = getCart();
  const item = cart.find(i => i.sku === sku);
  if (!item) return;
  item.qty = Math.max(item.caseSize, qty); // never below one case
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function cartTotals() {
  const cart = getCart();
  const pieces = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return { pieces, subtotal, count: cart.length };
}

function updateCartBadge() {
  const { pieces } = cartTotals();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = pieces;
    el.style.display = pieces > 0 ? 'flex' : 'none';
  });
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// Professional "added to cart" popup: thumbnail, qty/price, and a View Cart
// action, instead of a plain text pill. Shown on every add-to-cart click.
function showCartPopup(item) {
  let popup = document.getElementById('cart-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'cart-popup';
    document.body.appendChild(popup);
  }
  const { pieces } = cartTotals();
  const lineTotal = (item.qty * item.unitPrice).toFixed(2);
  popup.innerHTML = `
    <div class="cart-popup-inner">
      <img class="cart-popup-img" src="${item.image || ''}" alt="${item.title || ''}">
      <div class="cart-popup-info">
        <div class="cart-popup-added">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12L9 18L21 6" stroke="#3D6B40" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Added to cart
        </div>
        <div class="cart-popup-title">${item.qty} × ${item.title}</div>
        <div class="cart-popup-price">$${lineTotal}</div>
      </div>
      <button type="button" class="cart-popup-close" aria-label="Dismiss">&times;</button>
    </div>
    <div class="cart-popup-actions">
      <a href="cart.html" class="cart-popup-view">View Cart · ${pieces} pcs</a>
      <a href="checkout.html" class="cart-popup-checkout">Checkout &rarr;</a>
    </div>
  `;
  popup.querySelector('.cart-popup-close').addEventListener('click', () => {
    popup.classList.remove('show');
    clearTimeout(window._cartPopupTimer);
  });

  requestAnimationFrame(() => popup.classList.add('show'));
  clearTimeout(window._cartPopupTimer);
  window._cartPopupTimer = setTimeout(() => popup.classList.remove('show'), 4500);
}

// quantity stepper wiring: any element with data-qty-for="<sku>" wraps a
// [data-step="-1|1"] pair and an <input>
function wireQtySteppers(root = document) {
  root.querySelectorAll('[data-qty-group]').forEach(group => {
    const input = group.querySelector('input');
    const step = parseInt(group.dataset.step || '1', 10);
    group.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        let val = parseInt(input.value, 10) || step;
        val = btn.dataset.step === 'down' ? Math.max(step, val - step) : val + step;
        input.value = val;
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // drop out-of-stock items that were added before they sold out
  if (typeof WSQ !== 'undefined') {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      const kept = raw.filter(i => !(WSQ.CATALOG[i.sku] && WSQ.CATALOG[i.sku].inStock === false));
      if (kept.length !== raw.length) {
        saveCart(kept);
        showToast('An out-of-stock item was removed from your cart.');
      }
    } catch (e) {}
  }
  updateCartBadge();
  wireQtySteppers();

  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-product]');
      if (card.hasAttribute('data-out-of-stock')) { showToast('Sorry, this item is out of stock.'); return; }
      const sku = card.dataset.sku;
      const title = card.dataset.title;
      const category = card.dataset.category;
      const unitPrice = parseFloat(card.dataset.price);
      const caseSize = parseInt(card.dataset.case, 10);
      const image = card.dataset.image;
      const qtyInput = card.querySelector('input[type="number"], .qty input');
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : caseSize;
      addToCart({ sku, title, category, unitPrice, caseSize, qty, image });
    });
  });
});


// One-step checkout: send {sku, qty} to the server, then go straight to Stripe (it collects email, phone, shipping address and card).
async function wsqStartCheckout(onState) {
  const cart = getCart();
  if (!cart.length) return { ok: false, error: 'Your cart is empty.' };
  const calc = WSQ.shippingFor(cart);
  if (calc.quote) return { ok: false, error: 'Orders above ' + WSQ.money(WSQ.CONFIG.QUOTE_ABOVE) + ' ship by freight. Please request a freight quote.' };
  if (onState) onState('busy');
  try {
    if (window.wsqTrack) wsqTrack('begin_checkout', { ecommerce: { currency: wsqCurrency, value: calc.subtotal, items: wsqItems(cart) } });
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(function (i) { return { sku: i.sku, qty: i.qty }; }) })
    });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || !data.url) throw new Error((data && data.error) || 'We could not start checkout. Please try again, or email support@wholesalesquishy.com and we will complete your order manually.');
    try { sessionStorage.setItem('wsq_last_order', JSON.stringify({ items: wsqItems(cart), value: Math.round((calc.subtotal + calc.amount) * 100) / 100, shipping: calc.amount, subtotal: calc.subtotal })); } catch (e) {}
    window.location = data.url;
    return { ok: true };
  } catch (err) {
    if (onState) onState('idle');
    return { ok: false, error: (err && err.message) || 'Something went wrong. Please try again.' };
  }
}
