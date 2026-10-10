// WholesaleSquishy: analytics layer.
// - Loads Google Tag Manager (GA4, Google Ads, Meta Pixel and Bing UET all live inside GTM).
// - Pushes GA4-style ecommerce events to the dataLayer.
// - Shows a small cookie notice; consent is passed to Google tags (Consent Mode v2).
// Set the GTM container ID below. While it still contains "XXXX", nothing is loaded.
(function () {
  const GTM_ID = 'GTM-M5HRM57B';
  const CURRENCY = 'USD';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // ---------- consent (US opt-out model: on by default, honours Global Privacy Control) ----------
  const KEY = 'wsq_consent';
  function readChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function saveChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  const gpc = !!(navigator.globalPrivacyControl);
  let choice = readChoice();
  if (!choice && gpc) choice = 'denied';
  const state = (choice === 'denied') ? 'denied' : 'granted';
  gtag('consent', 'default', {
    ad_storage: state, analytics_storage: state, ad_user_data: state, ad_personalization: state,
    wait_for_update: 500
  });

  function setConsent(v) {
    saveChoice(v);
    if (window.fbq) fbq('consent', v === 'granted' ? 'grant' : 'revoke');
    gtag('consent', 'update', { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
  }

  // ---------- load GTM ----------
  if (GTM_ID.indexOf('XXXX') === -1) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(s);
  }


  // ---------- Meta Pixel (respects the same consent choice) ----------
  const META_PIXEL_ID = '1135846015541716';
  if (META_PIXEL_ID) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    if (state === 'denied') fbq('consent', 'revoke');
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }
  function metaEvent(event, ec) {
    if (!window.fbq || !ec) { if (window.fbq && event === 'generate_lead') fbq('track', 'Lead'); return; }
    const ids = (ec.items || []).map(function (i) { return i.item_id; });
    const base = { content_type: 'product', content_ids: ids, currency: ec.currency || CURRENCY, value: ec.value };
    if (event === 'view_item') fbq('track', 'ViewContent', base);
    else if (event === 'add_to_cart') fbq('track', 'AddToCart', base);
    else if (event === 'begin_checkout') fbq('track', 'InitiateCheckout', base);
    else if (event === 'purchase') fbq('track', 'Purchase', base, { eventID: ec.transaction_id });
  }

  // ---------- event helper ----------
  function money(n) { return Math.round(Number(n) * 100) / 100; }
  function toItems(cart) {
    return (cart || []).map(function (i, idx) {
      return { item_id: i.sku, item_name: i.title, item_category: i.category || '', price: money(i.unitPrice), quantity: Number(i.qty), index: idx };
    });
  }
  function track(event, params) {
    window.dataLayer.push({ ecommerce: null });            // clear previous ecommerce object
    const payload = { event: event };
    if (params && params.ecommerce) payload.ecommerce = params.ecommerce;
    else if (params) Object.keys(params).forEach(function (k) { payload[k] = params[k]; });
    window.dataLayer.push(payload);
    try { metaEvent(event, payload.ecommerce); } catch (e) {}
  }
  window.wsqTrack = track;
  window.wsqItems = toItems;
  window.wsqCurrency = CURRENCY;

  document.addEventListener('DOMContentLoaded', function () {
    // product list on the homepage
    const cards = document.querySelectorAll('[data-product]');
    if (cards.length > 1) {
      track('view_item_list', { ecommerce: { item_list_name: 'Full lineup', items: Array.prototype.map.call(cards, function (c, i) {
        return { item_id: c.dataset.sku, item_name: c.dataset.title, item_category: c.dataset.category, price: money(c.dataset.price), index: i };
      }) } });
    } else if (cards.length === 1) {
      const c = cards[0];
      track('view_item', { ecommerce: { currency: CURRENCY, value: money(c.dataset.price), items: [{ item_id: c.dataset.sku, item_name: c.dataset.title, item_category: c.dataset.category, price: money(c.dataset.price) }] } });
    }

    // email / phone clicks
    document.addEventListener('click', function (e) {
      const a = e.target.closest && e.target.closest('a[href^="mailto:"], a[href^="tel:"]');
      if (a) track(a.href.indexOf('mailto:') === 0 ? 'click_email' : 'click_phone', { link_url: a.getAttribute('href') });
    });

    // cookie notice
    if (!readChoice() && !gpc) {
      const bar = document.createElement('div');
      bar.id = 'wsq-consent';
      bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Cookie notice');
      bar.innerHTML = '<div style="font-size:13px;line-height:1.5;color:#2B2320;">We use cookies for analytics and to measure our ads. <a href="privacy.html" style="color:#D6431F;font-weight:600;">Privacy policy</a></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;"><button type="button" data-c="granted" style="flex:1;background:#F1583B;color:#fff;border:none;border-radius:999px;padding:9px 0;font-weight:700;font-size:13px;cursor:pointer;">OK</button>' +
        '<button type="button" data-c="denied" style="flex:1;background:transparent;color:#2B2320;border:1.5px solid #EADFCF;border-radius:999px;padding:9px 0;font-weight:700;font-size:13px;cursor:pointer;">Decline</button></div>';
      bar.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:340px;background:#FFFDF9;border:1px solid #EADFCF;border-radius:16px;box-shadow:0 12px 30px rgba(43,35,32,.16);padding:14px 16px;z-index:290;font-family:inherit;';
      if (window.innerWidth < 640) bar.style.cssText += 'right:16px;max-width:none;';
      bar.addEventListener('click', function (e) {
        const b = e.target.closest('button[data-c]');
        if (!b) return;
        setConsent(b.dataset.c);
        bar.remove();
      });
      document.body.appendChild(bar);
    }
  });
})();
