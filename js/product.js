// WholesaleSquishy: mobile product page layout (matches the approved design).
// Case chips, live total, buy-box card, trust tiles, often-bought-together, sticky buy bar, buy now, read more, swipe gallery.
// Runs only on single-product pages. New elements are hidden on desktop by CSS.
(function () {
  var REL = [["A3DC9DEE5C87","Hamburger Fidget Spinner","hamburger-fidget-spinner.html","/images/a3dc9dee5c87-thumb.webp","Fidget Toys"],["FR-34","Strawberry Pink Butter Squishy","product.html","/images/fr-34-thumb.webp","Fruit & Novelty"],["WY-100","Dumpling Medium Squishy, Smiley Face","dumpling-squishy-smiley-face.html","/images/wy-100-thumb.webp","Dumplings & Buns"],["NM-100","Dumpling Medium Squishy, Printed Face","dumpling-squishy-printed-face.html","/images/nm-100-thumb.webp","Dumplings & Buns"],["HYB-2861-2","Butter Stick Squishy, 4oz Mixed Colors","butter-stick-squishy-4oz-mixed.html","/images/hyb-2861-2-thumb.webp","Fruit & Novelty"],["T-YG201","Dumpling Medium Squishy, Mystery Color","dumpling-squishy-mystery-color.html","/images/t-yg201-thumb.webp","Dumplings & Buns"],["YT0033","Butter Stick Squishy, Realistic Shape","butter-stick-squishy-realistic.html","/images/yt0033-thumb.webp","Fruit & Novelty"],["T-2435","Strawberry Butter Big Squishy","strawberry-butter-big-squishy.html","/images/t-2435-thumb.webp","Fruit & Novelty"],["NM103","Jumbo Bun Dumpling Squishy","jumbo-bun-dumpling-squishy.html","/images/nm103-thumb.webp","Dumplings & Buns"],["JF-2843","Squish Cube, Fidget Sensory","squish-cube-fidget-sensory.html","/images/jf-2843-thumb.webp","Fruit & Novelty"],["NM102","Dumpling Small Squishy, Mini","dumpling-small-squishy-mini.html","/images/nm102-thumb.webp","Dumplings & Buns"],["HY07","Dumpling Medium Squishy, Collectible Food","dumpling-medium-squishy-collectible-food.html","/images/hy07-thumb.webp","Dumplings & Buns"],["YT666","Dumpling Medium Squishy, Soft Squeeze","dumpling-medium-squishy-soft-squeeze.html","/images/yt666-thumb.webp","Dumplings & Buns"],["T6611","Dumpling Medium Squishy, Kawaii","dumpling-medium-squishy-kawaii.html","/images/t6611-thumb.webp","Dumplings & Buns"],["A-200","Octopus Squishy","octopus-squishy.html","/images/a-200-thumb.webp","Fruit & Novelty"],["T2440","Chocolate Squishy","chocolate-squishy.html","/images/t2440-thumb.webp","Fruit & Novelty"],["FR-91","Salted Butter Squishy","salted-butter-squishy.html","/images/fr-91-thumb.webp","Fruit & Novelty"],["YY533","Watermelon Squishy","watermelon-squishy.html","/images/yy533-thumb.webp","Fruit & Novelty"],["YY532","Carrot Squishy","carrot-squishy.html","/images/yy532-thumb.webp","Fruit & Novelty"],["NM-105","Pineapple Squishy","pineapple-squishy.html","/images/nm-105-thumb.webp","Fruit & Novelty"],["WY-104","Banana Squishy","banana-squishy.html","/images/wy-104-thumb.webp","Fruit & Novelty"],["T6658","Goose Squishy","goose-squishy.html","/images/t6658-thumb.webp","Fruit & Novelty"]];
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
    var sku = card.dataset.sku;
    var oos = card.hasAttribute('data-out-of-stock');
    var qtyRow = group.parentElement;
    var mq = window.matchMedia('(max-width:700px)');
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
    function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
    function calc() {
      var pcs = Math.max(cs, parseInt(input.value, 10) || cs);
      var unit = WSQ.tierPrice(base, pcs);
      var cases = Math.round(pcs / cs);
      return { pcs: pcs, cases: cases, unit: unit, total: Math.round(pcs * unit * 100) / 100, ship: WSQ.shippingAmount(cases) };
    }

    // ---- buy box: heading, chips, stepper+add, summary, checkout now, secure line ----
    var box = el('div', 'pp-box');
    var head = el('div', 'pp-box-h', '<b>How many cases?</b><span>' + cs + ' pcs per case &middot; no minimum</span>');
    var chips = el('div', 'pp-chips');
    [1, 2, 5, 10, 20].forEach(function (n) {
      var b = el('button', 'pp-chip'); b.type = 'button'; b.dataset.n = n; b.textContent = n === 1 ? '1 case' : String(n);
      b.addEventListener('click', function () { input.value = n * cs; refresh(); });
      chips.appendChild(b);
    });
    var sum = el('div', 'pp-sum');
    var buy = el('button', 'pp-buynow'); buy.type = 'button'; buy.textContent = 'Checkout now · skip the cart';
    var secure = el('div', 'pp-secure', 'Secure checkout &middot; Card, Apple Pay, Google Pay');
    qtyRow.parentNode.insertBefore(box, qtyRow);
    [head, chips, qtyRow, sum, buy, secure].forEach(function (n) { box.appendChild(n); });
    if (oos) { head.style.display = chips.style.display = sum.style.display = buy.style.display = 'none'; }

    buy.addEventListener('click', function () {
      if (typeof getCart !== 'function' || typeof wsqStartCheckout !== 'function') { location.href = 'cart.html'; return; }
      var c = calc();
      var item = { sku: sku, title: card.dataset.title, category: card.dataset.category, unitPrice: base, caseSize: cs, qty: c.pcs, image: card.dataset.image };
      var cart = getCart(); var ex = cart.find(function (i) { return i.sku === sku; });
      if (ex) ex.qty += item.qty; else cart.push(item);
      saveCart(cart);
      if (window.wsqTrack) wsqTrack('add_to_cart', { ecommerce: { currency: wsqCurrency, value: Math.round(item.qty * item.unitPrice * 100) / 100, items: wsqItems([item]) } });
      buy.disabled = true; var old = buy.textContent; buy.textContent = 'Opening secure checkout...';
      wsqStartCheckout().then(function (r) { if (!r || !r.ok) { buy.disabled = false; buy.textContent = old; if (typeof showToast === 'function') showToast((r && r.error) || 'Checkout could not start. Try the cart.'); } });
    });

    // ---- stock pill under the price ----
    var stock = el('div', 'pp-stock', oos ? '<span class="pp-pill pp-pill-out">Out of stock</span>' : '<span class="pp-pill">In stock &middot; ships from the US</span>');

    // ---- trust tiles ----
    var tiles = el('div', 'pp-tiles',
      '<div><b>Ships from US</b><span>South Gate, CA</span></div><div><b>7-day delivery</b><span>Processed fast</span></div><div><b>Secure checkout</b><span>Apple Pay, Google Pay</span></div>');

    // ---- often bought together ----
    var rel = null;
    (function () {
      var me = REL.filter(function (r) { return r[0] === sku; })[0];
      var pool = REL.filter(function (r) { var c = WSQ.CATALOG[r[0]]; return r[0] !== sku && c && c.inStock !== false; });
      var same = pool.filter(function (r) { return me && r[4] === me[4]; }), other = pool.filter(function (r) { return !me || r[4] !== me[4]; });
      var pick = same.concat(other).slice(0, 6);
      if (!pick.length) return;
      rel = el('div', 'pp-rel', '<h2 class="display">Often bought together</h2>');
      var row = el('div', 'pp-rel-row');
      pick.forEach(function (r) {
        var c = WSQ.CATALOG[r[0]];
        var d = el('div', 'pp-rel-card',
          '<a href="/' + r[2] + '"><img src="' + r[3] + '" alt="' + r[1] + '" width="150" height="150" loading="lazy"></a><div class="pp-rel-b"><a href="/' + r[2] + '" class="pp-rel-t">' + r[1] + '</a><div class="pp-rel-p">' + money(c.price) + '/pc</div><button type="button" class="pp-rel-add">Add case</button></div>');
        d.querySelector('button').addEventListener('click', function () {
          var item = { sku: r[0], title: c.title, category: r[4], unitPrice: c.price, caseSize: c.caseSize, qty: c.caseSize, image: r[3].replace(/^\//, '') };
          if (typeof addToCart === 'function') addToCart(item);
        });
        row.appendChild(d);
      });
      rel.appendChild(row);
    })();

    // ---- quote block heading + specs grid ----
    var links = card.querySelector('[data-cta]') ? card.querySelector('[data-cta]').parentElement : null;
    if (links) { links.classList.add('pp-quote'); links.insertBefore(el('div', 'pp-quote-h', 'Buying for a store or route? Need an invoice?'), links.firstChild); }
    var specs = [].slice.call(card.children).filter(function (e) { return /Case Size/.test(e.textContent) && e.children.length >= 3; })[0];
    if (specs) specs.classList.add('pp-specs');

    // ---- sticky bar ----
    var bar = el('div', 'pp-sticky', '<div class="pp-sticky-t"><b></b><span></span></div><button type="button" class="pp-sticky-b"></button>');
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Quick buy');
    document.body.appendChild(bar);
    if (!oos) document.body.classList.add('pp-has-bar');
    bar.querySelector('button').addEventListener('click', function () { addBtn.click(); });

    function refresh() {
      var c = calc();
      [].forEach.call(chips.children, function (b) { b.classList.toggle('on', parseInt(b.dataset.n, 10) === c.cases); });
      sum.innerHTML = '<span>' + c.pcs + ' pcs &middot; ' + money(c.unit) + '/pc &middot; ' + c.cases + (c.cases === 1 ? ' case' : ' cases') + '</span><span>Est. shipping <b>' + money(c.ship) + '</b></span>';
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
      more = el('button', 'pp-more', 'Read more ▾'); more.type = 'button';
      more.addEventListener('click', function () { var o = desc.classList.toggle('open'); more.textContent = o ? 'Show less ▴' : 'Read more ▾'; });
      desc.parentNode.insertBefore(more, desc.nextSibling);
    }

    // ---- place new blocks, then mobile ordering ----
    var priceRow = [].slice.call(card.children).filter(function (e) { return /^\$[0-9]/.test((e.textContent || '').trim()) && e.querySelector('.display'); })[0];
    if (priceRow) priceRow.parentNode.insertBefore(stock, priceRow.nextSibling);
    box.parentNode.insertBefore(tiles, box.nextSibling);
    if (rel) box.parentNode.insertBefore(rel, tiles.nextSibling);
    var kids = [].slice.call(card.children);
    function role(e) {
      var t = (e.textContent || '').trim();
      if (e.classList.contains('eyebrow')) return 0;
      if (e.tagName === 'H1') return 1;
      if (e === priceRow) return 3; if (e === stock) return 4;
      if (e === box) return 5; if (e === tiles) return 6; if (e === rel) return 7;
      if (e === desc) return 8; if (e === more) return 9;
      if (e === specs) return 10; if (e === links) return 11;
      if (/Order terms/.test(t)) return 12;
      if (e.classList.contains('ship-pill')) return 20; // hidden on mobile
      if (/Secure checkout/.test(t) && /Reliable|Delivery/.test(t)) { e.classList.add('pp-oldtrust'); return 21; } // old trust line, hidden on mobile
      return 2;
    }
    function applyOrder() { kids.forEach(function (e) { e.style.order = mq.matches ? role(e) : ''; }); }
    applyOrder(); if (mq.addEventListener) mq.addEventListener('change', applyOrder);

    // ---- gallery: swipe carousel with dots (mobile) ----
    var main = document.getElementById('main-img');
    if (main) {
      var hero = main.parentNode, col = hero.parentNode;
      hero.classList.add('pp-hero'); col.classList.add('pp-galcol');
      var car = el('div', 'pp-car'), dots = el('div', 'pp-dots');
      col.insertBefore(car, col.firstChild); col.insertBefore(dots, car.nextSibling);
      var have = [];
      function addSlide(url, alt, contain) {
        if (have.indexOf(url) > -1) return; have.push(url);
        var s = el('div', 'pp-slide'); var im = new Image(); im.src = url; im.alt = alt || 'Product photo'; im.loading = have.length === 1 ? 'eager' : 'lazy';
        im.style.objectFit = contain ? 'contain' : 'cover'; s.appendChild(im); car.appendChild(s);
        dots.appendChild(el('span', have.length === 1 ? 'on' : ''));
      }
      addSlide(main.getAttribute('src'), main.alt, true);
      function sync() {
        [].slice.call(document.querySelectorAll('#gallery-thumbs .thumb img')).forEach(function (im, i) { if (i > 0) addSlide(im.getAttribute('src'), im.alt, false); });
      }
      sync();
      var tb = document.getElementById('gallery-thumbs');
      if (tb && window.MutationObserver) new MutationObserver(sync).observe(tb, { childList: true });
      car.addEventListener('scroll', function () {
        var s = car.firstChild; if (!s) return; var w = s.offsetWidth + 8, i = Math.round(car.scrollLeft / w);
        [].forEach.call(dots.children, function (d, k) { d.className = k === i ? 'on' : ''; });
      }, { passive: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
