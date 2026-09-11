// WholesaleSquishy — cart logic (client-side demo, no backend)
const CART_KEY = 'wsq_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
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
  showToast(`Added ${item.qty} × ${item.title} to cart`);
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
  updateCartBadge();
  wireQtySteppers();

  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-product]');
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
