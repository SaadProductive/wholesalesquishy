// WholesaleSquishy: site search (desktop + mobile). Loaded on first tap of the search icon.
// Every search is sent to GA4 via the dataLayer: search, select_search_result, search_no_results.
(function () {
  if (window.wsqSearch) return;
  var P = [["A3DC9DEE5C87","Hamburger Fidget Spinner","Fidget Toys",3.85,"/images/a3dc9dee5c87-thumb.webp","/hamburger-fidget-spinner.html",0,"fidget spinner sensory desk toy squishy toy",12],["FR-34","Strawberry Pink Butter Squishy","Fruit & Novelty",2.31,"/images/fr-34-thumb.webp","/product.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["WY-100","Dumpling Medium Squishy, Smiley Face","Dumplings & Buns",3.08,"/images/wy-100-thumb.webp","/dumpling-squishy-smiley-face.html",1,"dumpling bun bao mochi food kawaii squishy toy",12],["NM-100","Dumpling Medium Squishy, Printed Face","Dumplings & Buns",3.08,"/images/nm-100-thumb.webp","/dumpling-squishy-printed-face.html",0,"dumpling bun bao mochi food kawaii squishy toy",12],["HYB-2861-2","Butter Stick Squishy, 4oz Mixed Colors","Fruit & Novelty",3.08,"/images/hyb-2861-2-thumb.webp","/butter-stick-squishy-4oz-mixed.html",1,"fruit food novelty animal stress squeeze squishy toy",12],["T-YG201","Dumpling Medium Squishy, Mystery Color","Dumplings & Buns",3.85,"/images/t-yg201-thumb.webp","/dumpling-squishy-mystery-color.html",0,"dumpling bun bao mochi food kawaii squishy toy",12],["YT0033","Butter Stick Squishy, Realistic Shape","Fruit & Novelty",6.15,"/images/yt0033-thumb.webp","/butter-stick-squishy-realistic.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["T-2435","Strawberry Butter Big Squishy","Fruit & Novelty",6.15,"/images/t-2435-thumb.webp","/strawberry-butter-big-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["NM103","Jumbo Bun Dumpling Squishy, 6pc case","Dumplings & Buns",18.46,"/images/nm103-thumb.webp","/jumbo-bun-dumpling-squishy.html",0,"dumpling bun bao mochi food kawaii squishy toy",6],["JF-2843","Squish Cube, Fidget Sensory","Fruit & Novelty",2.31,"/images/jf-2843-thumb.webp","/squish-cube-fidget-sensory.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["NM102","Dumpling Small Squishy, Mini, 24pc case","Dumplings & Buns",1.93,"/images/nm102-thumb.webp","/dumpling-small-squishy-mini.html",0,"dumpling bun bao mochi food kawaii squishy toy",24],["HY07","Dumpling Medium Squishy, Collectible Food","Dumplings & Buns",2.31,"/images/hy07-thumb.webp","/dumpling-medium-squishy-collectible-food.html",0,"dumpling bun bao mochi food kawaii squishy toy",12],["YT666","Dumpling Medium Squishy, Soft Squeeze","Dumplings & Buns",2.31,"/images/yt666-thumb.webp","/dumpling-medium-squishy-soft-squeeze.html",0,"dumpling bun bao mochi food kawaii squishy toy",12],["T6611","Dumpling Medium Squishy, Kawaii","Dumplings & Buns",3.85,"/images/t6611-thumb.webp","/dumpling-medium-squishy-kawaii.html",0,"dumpling bun bao mochi food kawaii squishy toy",12],["A-200","Octopus Squishy, 24pc case","Fruit & Novelty",3.08,"/images/a-200-thumb.webp","/octopus-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",24],["T2440","Chocolate Squishy","Fruit & Novelty",3.08,"/images/t2440-thumb.webp","/chocolate-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["FR-91","Salted Butter Squishy","Fruit & Novelty",6.16,"/images/fr-91-thumb.webp","/salted-butter-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",12],["YY533","Watermelon Squishy, 6pc case","Fruit & Novelty",5.39,"/images/yy533-thumb.webp","/watermelon-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",6],["YY532","Carrot Squishy, 6pc case","Fruit & Novelty",12.32,"/images/yy532-thumb.webp","/carrot-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",6],["NM-105","Pineapple Squishy, 6pc case","Fruit & Novelty",12.32,"/images/nm-105-thumb.webp","/pineapple-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",6],["WY-104","Banana Squishy, 6pc case","Fruit & Novelty",12.32,"/images/wy-104-thumb.webp","/banana-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",6],["T6658","Goose Squishy, 6pc case","Fruit & Novelty",12.32,"/images/t6658-thumb.webp","/goose-squishy.html",0,"fruit food novelty animal stress squeeze squishy toy",6]];
  var PAGES = [["Wholesale pricing & catalog (PDF)","/catalog.html","catalog pdf price list pricing wholesale tiers discount"],["Request a bulk quote / invoice","/rfq.html","quote rfq invoice bulk large order pallet freight net terms"],["Shipping & delivery","/shipping.html","shipping delivery freight cost free shipping tracking ship time"],["Returns & refunds","/returns.html","return refund exchange damaged policy"],["FAQ","/faq.html","faq questions minimum order moq payment"],["Product safety","/safety.html","safety cpc cpsia certificate lead test compliance"],["About us","/about.html","about company who south gate california"],["Contact us","/contact.html","contact email support help phone"],["Cart","/cart.html","cart checkout order"]];
  var CSS = '.wsq-s{position:fixed;inset:0;z-index:10000;background:rgba(43,35,32,.55);display:none;align-items:flex-start;justify-content:center;padding:0}.wsq-s.open{display:flex}'
  + '.wsq-sb{background:#FFFDF9;width:100%;max-width:640px;max-height:100%;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)}'
  + '@media(min-width:700px){.wsq-s{padding:9vh 16px 0}.wsq-sb{border-radius:18px;max-height:78vh}}'
  + '.wsq-sh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #EADFCF}'
  + '.wsq-sh input{flex:1;min-width:0;height:48px;font:600 16px "Plus Jakarta Sans",system-ui,sans-serif;border:2px solid #EADFCF;border-radius:12px;padding:0 14px;background:#fff;color:#2B2320;outline:0}'
  + '.wsq-sh input:focus{border-color:#F1583B}'
  + '.wsq-x{width:44px;height:44px;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#2B2320}'
  + '.wsq-sr{overflow:auto;-webkit-overflow-scrolling:touch;padding:6px 0 14px}'
  + '.wsq-sr a{display:flex;align-items:center;gap:12px;padding:8px 14px;min-height:56px;text-decoration:none;color:#2B2320}'
  + '.wsq-sr a:hover,.wsq-sr a.sel{background:#FCDCD2}'
  + '.wsq-sr img{width:48px;height:48px;border-radius:10px;object-fit:cover;background:#fff;border:1px solid #EADFCF;flex:none}'
  + '.wsq-t{font:700 15px "Plus Jakarta Sans",system-ui,sans-serif;line-height:1.25}.wsq-m{font:500 13px "Plus Jakarta Sans",system-ui,sans-serif;color:#6B5E56}'
  + '.wsq-h{font:800 11px "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6B5E56;padding:10px 14px 2px}'
  + '.wsq-oos{color:#D6431F;font-weight:700}.wsq-e{padding:18px 16px;font:500 15px "Plus Jakarta Sans",system-ui,sans-serif;color:#2B2320}'
  + '.wsq-e a{display:inline;padding:0;min-height:0;color:#D6431F;font-weight:700;text-decoration:underline}.wsq-e a:hover{background:none}'
  + '.wsq-chips{display:flex;flex-wrap:wrap;gap:8px;padding:8px 14px}.wsq-chips button{border:1px solid #EADFCF;background:#fff;border-radius:999px;padding:0 14px;min-height:40px;font:600 14px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;color:#2B2320}'
  + '.nav-search{width:44px;height:44px;border:0 !important;outline:0;box-shadow:none;background:none;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'wsq-s'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Search products');
  box.innerHTML = '<div class="wsq-sb"><div class="wsq-sh"><input type="search" id="wsq-q" placeholder="Search squishies, dumplings, fidget..." autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search"><button class="wsq-x" type="button" aria-label="Close search">&times;</button></div><div class="wsq-sr" id="wsq-r"></div></div>';
  document.body.appendChild(box);
  var q = box.querySelector('#wsq-q'), r = box.querySelector('#wsq-r'), lastSent = '', timer = null, current = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9$.\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function stem(w) { return w.length > 3 ? w.replace(/(es|s)$/, '') : w; }
  function score(hay, toks) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (hay.title.indexOf(t) === 0 || hay.title.indexOf(' ' + t) > -1) s += 10;
      else if (hay.title.indexOf(t) > -1) s += 6;
      else if (hay.all.indexOf(t) > -1) s += 3;
      else return 0;
    }
    return s;
  }
  var prods = P.map(function (p) { var title = norm(p[1]); return { p: p, title: title.split(' ').map(stem).join(' '), all: norm(p[1] + ' ' + p[2] + ' ' + p[0] + ' ' + p[7]).split(' ').map(stem).join(' ') }; });
  var pgs = PAGES.map(function (p) { var title = norm(p[0]); return { p: p, title: title.split(' ').map(stem).join(' '), all: norm(p[0] + ' ' + p[2]).split(' ').map(stem).join(' ') }; });

  function search(text) {
    var toks = norm(text).split(' ').filter(Boolean).map(stem);
    if (!toks.length) return { items: [], pages: [] };
    var a = [], b = [];
    prods.forEach(function (x) { var s = score(x, toks); if (s) a.push([s - (x.p[6] ? 1 : 0), x.p]); });
    pgs.forEach(function (x) { var s = score(x, toks); if (s) b.push([s, x.p]); });
    function srt(l) { return l.sort(function (m, n) { return n[0] - m[0]; }).map(function (z) { return z[1]; }); }
    return { items: srt(a), pages: srt(b) };
  }
  function track(ev, data) { try { if (window.wsqTrack) window.wsqTrack(ev, data); else { window.dataLayer = window.dataLayer || []; var o = { event: ev }; for (var k in data) o[k] = data[k]; window.dataLayer.push(o); } } catch (e) {} }
  function sendSearch(text, n) {
    var t = norm(text);
    if (t.length < 2 || t === lastSent) return;
    lastSent = t;
    track('search', { search_term: t, results_count: n });
    if (!n) track('search_no_results', { search_term: t });
  }
  function chips() {
    return '<div class="wsq-h">Popular</div><div class="wsq-chips">' + ['dumpling', 'butter', 'fruit', 'fidget', 'mystery', 'jumbo', 'shipping', 'catalog'].map(function (c) { return '<button type="button" data-q="' + c + '">' + c + '</button>'; }).join('') + '</div>';
  }
  function render() {
    var text = q.value, res = search(text);
    current = [];
    if (!norm(text)) { r.innerHTML = chips(); return res; }
    var h = '';
    if (res.items.length) {
      h += '<div class="wsq-h">Products</div>';
      res.items.slice(0, 8).forEach(function (p) {
        h += '<a href="' + p[5] + '" data-sku="' + esc(p[0]) + '" data-name="' + esc(p[1]) + '"><img src="' + p[4] + '" alt="" width="48" height="48" loading="lazy"><span><span class="wsq-t">' + esc(p[1]) + '</span><br><span class="wsq-m">' + esc(p[2]) + ' &middot; case of ' + p[8] + ' &middot; from $' + p[3].toFixed(2) + '/pc' + (p[6] ? ' &middot; <span class="wsq-oos">Out of stock</span>' : '') + '</span></span></a>';
      });
    }
    if (res.pages.length) {
      h += '<div class="wsq-h">Pages</div>';
      res.pages.slice(0, 4).forEach(function (p) { h += '<a href="' + p[1] + '" data-name="' + esc(p[0]) + '"><span class="wsq-t">' + esc(p[0]) + '</span></a>'; });
    }
    if (!res.items.length && !res.pages.length) {
      h += '<div class="wsq-e">No match for &ldquo;' + esc(text.trim()) + '&rdquo;. Looking for something we don&rsquo;t list? <a href="/rfq.html">Request a custom quote</a> or <a href="/#bestsellers">browse all styles</a>.</div>' + chips();
    }
    r.innerHTML = h;
    current = [].slice.call(r.querySelectorAll('a'));
    return res;
  }
  function onInput() {
    var res = render();
    clearTimeout(timer);
    timer = setTimeout(function () { sendSearch(q.value, res.items.length + res.pages.length); }, 900);
  }
  q.addEventListener('input', onInput);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var res = render(); sendSearch(q.value, res.items.length + res.pages.length); if (current[0]) { e.preventDefault(); current[0].click(); } }
    if (e.key === 'ArrowDown' && current.length) { e.preventDefault(); current[0].focus(); }
  });
  r.addEventListener('keydown', function (e) {
    var i = current.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < current.length - 1) { e.preventDefault(); current[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) current[i - 1].focus(); else q.focus(); }
  });
  r.addEventListener('click', function (e) {
    var c = e.target.closest('button[data-q]');
    if (c) { q.value = c.getAttribute('data-q'); onInput(); q.focus(); return; }
    var a = e.target.closest('a');
    if (a) { var res = search(q.value); sendSearch(q.value, res.items.length + res.pages.length); track('select_search_result', { search_term: norm(q.value), result_name: a.getAttribute('data-name') || '', result_sku: a.getAttribute('data-sku') || '', link_url: a.getAttribute('href') }); }
  });
  function close() { box.classList.remove('open'); document.body.style.overflow = ''; }
  function open() { box.classList.add('open'); document.body.style.overflow = 'hidden'; render(); setTimeout(function () { q.focus(); }, 30); }
  box.querySelector('.wsq-x').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
    else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); open(); }
  });
  window.wsqSearch = { open: open, close: close };
})();
