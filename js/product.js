// WholesaleSquishy: mobile product page helpers (case chips, live total, sticky buy bar, buy now, read more, swipe).
// Runs only on single-product pages. All new elements are hidden on desktop by CSS.
(function () {
  function init() {
    var cards = document.querySelectorAll('[data-product]');
    if (cards.length !== 1) return;
    var card = cards[0];
    var addBtn = card.querySelector('[data-add-to-cart]');
    var group = card.querySelector('[data-qty-group]');
    if (!addBtn || !group || typeof WSQ === 'undefined') return;
    var input = group.querySelector('input');
    var cs = parseInt(card.dataset.case, 10) || 12;
    var base = parseFloat(card.dataset.price);
    var oos = card.hasAttribute('data-out-of-stock');
    var qtyRow = group.parentElement;
    var mq = window.matchMedia('(max-width:700px)');

    function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
    function calc() {
      var pcs = Math.max(cs, parseInt(input.value, 10) || cs);
      var unit = WSQ.tierPrice(base, pcs);
      var cases = Math.round(pcs / cs);
      return { pcs: pcs, cases: cases, unit: unit, total: Math.round(pcs * unit * 100) / 100, ship: WSQ.shippingAmount(cases) };
    }

    // ---- chips + summary + buy now ----
    var chips = document.createElement('div'); chips.className = 'pp-chips';
    [1, 2, 5, 10, 20].forEach(function (n) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'pp-chip'; b.dataset.n = n; b.textContent = n === 1 ? '1 case' : String(n);
      b.addEventListener('click', function () { input.value = n * cs; refresh(); });
      chips.appendChild(b);
    });
    var sum = document.createElement('div'); sum.className = 'pp-sum';
    var buy = document.createElement('button'); buy.type = 'button'; buy.className = 'pp-buynow'; buy.textContent = 'Checkout now · skip the cart';
    qtyRow.parentNode.insertBefore(chips, qtyRow);
    qtyRow.parentNode.insertBefore(sum, qtyRow.nextSibling);
    qtyRow.parentNode.insertBefore(buy, sum.nextSibling);
    if (oos) { chips.style.display = 'none'; sum.style.display = 'none'; buy.style.display = 'none'; }

    buy.addEventListener('click', function () {
      if (typeof getCart !== 'function' || typeof wsqStartCheckout !== 'function') { location.href = 'cart.html'; return; }
      var c = calc();
      var item = { sku: card.dataset.sku, title: card.dataset.title, category: card.dataset.category, unitPrice: base, caseSize: cs, qty: c.pcs, image: card.dataset.image };
      var cart = getCart(); var ex = cart.find(function (i) { return i.sku === item.sku; });
      if (ex) ex.qty += item.qty; else cart.push(item);
      saveCart(cart);
      if (window.wsqTrack) wsqTrack('add_to_cart', { ecommerce: { currency: wsqCurrency, value: Math.round(item.qty * item.unitPrice * 100) / 100, items: wsqItems([item]) } });
      buy.disabled = true; var old = buy.textContent; buy.textContent = 'Opening secure checkout...';
      wsqStartCheckout().then(function (r) { if (!r || !r.ok) { buy.disabled = false; buy.textContent = old; if (typeof showToast === 'function') showToast((r && r.error) || 'Checkout could not start. Try the cart.'); } });
    });

    // ---- sticky bar ----
    var bar = document.createElement('div'); bar.className = 'pp-sticky'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Quick buy');
    bar.innerHTML = '<div class="pp-sticky-t"><b></b><span></span></div><button type="button" class="pp-sticky-b"></button>';
    document.body.appendChild(bar);
    if (!oos) document.body.classList.add('pp-has-bar');
    bar.querySelector('button').addEventListener('click', function () { addBtn.click(); });

    function refresh() {
      var c = calc();
      [].forEach.call(chips.children, function (b) { b.classList.toggle('on', parseInt(b.dataset.n, 10) === c.cases); });
      sum.innerHTML = '<span>' + c.pcs + ' pcs &middot; ' + money(c.unit) + '/pc &middot; ' + c.cases + (c.cases === 1 ? ' case' : ' cases') + '</span><span>Est. shipping <b style="color:var(--ink)">' + money(c.ship) + '</b></span>';
      if (!oos) {
        addBtn.innerHTML = 'Add to cart &middot; ' + money(c.total);
        bar.querySelector('b').textContent = money(c.total);
        bar.querySelector('span').textContent = c.cases + (c.cases === 1 ? ' case' : ' cases') + ' · ' + c.pcs + ' pcs';
        bar.querySelector('button').textContent = 'Add to cart';
      }
    }
    group.addEventListener('click', function () { setTimeout(refresh, 0); });
    input.addEventListener('input', refresh); input.addEventListener('change', refresh);
    refresh();

    if (!oos && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        var r = e[0]; bar.classList.toggle('show', !r.isIntersecting && r.boundingClientRect.top < 0);
      }, { threshold: 0 }).observe(addBtn);
    }

    // ---- read more on description ----
    var desc = card.querySelector(':scope > p');
    var more = null;
    if (desc) {
      desc.classList.add('pp-desc');
      more = document.createElement('button'); more.type = 'button'; more.className = 'pp-more'; more.textContent = 'Read more ▾';
      more.addEventListener('click', function () { var o = desc.classList.toggle('open'); more.textContent = o ? 'Show less ▴' : 'Read more ▾'; });
      desc.parentNode.insertBefore(more, desc.nextSibling);
    }

    // ---- mobile ordering (price + buy box first, details later) ----
    var kids = [].slice.call(card.children);
    function role(el) {
      var t = (el.textContent || '').trim();
      if (el.classList.contains('eyebrow')) return 0;
      if (el.tagName === 'H1') return 1;
      if (el === chips) return 4; if (el === qtyRow) return 5; if (el === sum) return 6; if (el === buy) return 7;
      if (el.classList.contains('ship-pill')) return 8;
      if (el === desc) return 10; if (el === more) return 11;
      if (/^\$[0-9]/.test(t) && el.querySelector('.display')) return 3;
      if (/Case Size/.test(t)) return 12;
      if (el.querySelector('[data-cta]')) return 13;
      if (/Order terms/.test(t)) return 14;
      if (/Secure checkout/.test(t)) return 9;
      return 2;
    }
    function applyOrder() { kids.forEach(function (el) { el.style.order = mq.matches ? role(el) : ''; }); }
    applyOrder(); if (mq.addEventListener) mq.addEventListener('change', applyOrder);

    // ---- gallery: swipe on the main photo ----
    var main = document.getElementById('main-img');
    if (main) {
      main.parentNode.classList.add('pp-hero');
      var x0 = null;
      main.parentNode.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      main.parentNode.addEventListener('touchend', function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) < 40) return;
        var th = [].slice.call(document.querySelectorAll('#gallery-thumbs .thumb'));
        var i = th.findIndex(function (t) { return t.classList.contains('active'); });
        var j = dx < 0 ? Math.min(th.length - 1, i + 1) : Math.max(0, i - 1);
        if (th[j] && j !== i) th[j].click();
      }, { passive: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
