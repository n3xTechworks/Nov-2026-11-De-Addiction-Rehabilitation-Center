/* Harborlight Recovery Centre: shared behaviour for every page.
   Theme + direction (persisted; first applied by the inline <head> script), Home dropdown, mobile menu,
   toast(), modals, tabs, filter chips, quote carousel, gallery lightbox, footer year, reveal, motion.
   Public API: window.Harborlight = { toast, openModal, closeModal, programs, fmtPrice, esc }.  */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY_THEME = 'harborlight-theme';
  var KEY_DIR = 'harborlight-dir';
  root.classList.add('js');

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Theme + direction ---------- */
  function syncLabels() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var rtl = root.getAttribute('dir') === 'rtl';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('aria-pressed', String(dark));
      b.title = dark ? 'Light theme' : 'Dark theme';
    });
    document.querySelectorAll('[data-dir-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', rtl ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
      b.setAttribute('aria-pressed', String(rtl));
      b.title = rtl ? 'Left-to-right layout' : 'Right-to-left layout';
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-toggle], [data-dir-toggle]');
    if (!t) return;
    if (t.hasAttribute('data-theme-toggle')) {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store(KEY_THEME, next);
    } else {
      var dir = root.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
      root.setAttribute('dir', dir);
      store(KEY_DIR, dir);
    }
    syncLabels();
  });
  syncLabels();

  /* ---------- Dropdowns: Home submenu (.has-sub) and avatar menu (.dropdown) ---------- */
  document.querySelectorAll('.has-sub, .dropdown').forEach(function (li) {
    var btn = li.querySelector('[aria-controls]');
    if (!btn) return;
    function set(open) { li.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); }
    btn.addEventListener('click', function () { set(!li.classList.contains('open')); });
    if (li.classList.contains('has-sub') && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      li.addEventListener('mouseenter', function () { set(true); });
      li.addEventListener('mouseleave', function () { set(false); });
    }
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) set(false); });
    document.addEventListener('click', function (e) { if (!li.contains(e.target)) set(false); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && li.classList.contains('open')) { set(false); btn.focus(); }
      if (e.key === 'ArrowDown' && e.target === btn) { e.preventDefault(); set(true); var a = li.querySelector('a, button:not([aria-controls])'); if (a) a.focus(); }
    });
  });

  /* ---------- Mobile menu (nav links only; controls stay in the header bar) ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var panel = document.querySelector('[data-mobile-menu]');
  var header = document.getElementById('siteHeader');
  function setMenu(open) {
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.hidden = !open;
  }
  if (toggle && panel) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setMenu(false); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) setMenu(false); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    var mq = window.matchMedia('(min-width: 1200px)');
    var onMq = function (m) { if (m.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* ---------- Header height for anchor offsets ---------- */
  function syncHeader() {
    if (!header) return;
    root.style.setProperty('--header-h', Math.round(header.getBoundingClientRect().height) + 'px');
  }
  syncHeader();
  window.addEventListener('resize', syncHeader);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeader);

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var target = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', a.getAttribute('href'));
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  if (location.hash) {
    window.addEventListener('load', function () {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) { syncHeader(); t.scrollIntoView({ block: 'start' }); }
    });
  }

  /* ---------- Toast ---------- */
  var region = null;
  var ICONS = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>'
  };
  /* toast('Session booked') or toast('Could not save', 'error' | 'info' | 'ok') */
  function toast(message, type, ms) {
    type = type || 'ok';
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'ok' ? '' : ' toast--' + type);
    el.innerHTML = (ICONS[type] || ICONS.ok) + '<span class="toast-text">' + esc(message) + '</span><button class="toast-x" type="button" aria-label="Dismiss"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    region.appendChild(el);
    var done = function () { el.classList.add('is-leaving'); setTimeout(function () { el.remove(); }, 260); };
    el.querySelector('.toast-x').addEventListener('click', done);
    setTimeout(done, ms || 3800);
    return el;
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toast]');
    if (t && !t.disabled) toast(t.getAttribute('data-toast'), t.getAttribute('data-toast-type') || 'ok');
  });

  /* ---------- Modal (focus trap, Esc, backdrop, return focus) ---------- */
  var openStack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function openModal(id, opener) {
    var m = typeof id === 'string' ? document.getElementById(id) : id;
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('modal-open');
    openStack.push({ el: m, opener: opener || document.activeElement });
    var dlg = m.querySelector('.modal-dialog');
    var first = dlg && (dlg.querySelector('[data-autofocus]') || dlg.querySelector(FOCUSABLE));
    (first || dlg).focus();
    m.dispatchEvent(new CustomEvent('modal:open', { bubbles: true }));
  }
  function closeModal(id) {
    var m = id ? (typeof id === 'string' ? document.getElementById(id) : id) : (openStack.length ? openStack[openStack.length - 1].el : null);
    if (!m || m.hidden) return;
    m.hidden = true;
    var idx = openStack.map(function (o) { return o.el; }).indexOf(m);
    var rec = idx > -1 ? openStack.splice(idx, 1)[0] : null;
    if (!openStack.length) document.body.classList.remove('modal-open');
    if (rec && rec.opener && rec.opener.focus) rec.opener.focus();
    m.dispatchEvent(new CustomEvent('modal:close', { bubbles: true }));
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-modal-open]');
    if (o) { e.preventDefault(); openModal(o.getAttribute('data-modal-open'), o); return; }
    var c = e.target.closest('[data-modal-close]');
    if (c) { var m = c.closest('.modal'); if (m) closeModal(m); }
  });
  document.addEventListener('keydown', function (e) {
    if (!openStack.length) return;
    var top = openStack[openStack.length - 1].el;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(top); return; }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(top.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === top.querySelector('.modal-dialog'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Tabs: <div data-tabs> with .tab[role=tab][aria-controls] and .tab-panel[role=tabpanel] ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      wrap.dispatchEvent(new CustomEvent('tabs:change', { detail: { id: tab.id || tab.getAttribute('aria-controls') }, bubbles: true }));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    if (cur) select(cur);
  });

  /* ---------- Filter chips: <div class="chips" data-filter-group="#grid"> with .chip[data-filter="all|key"];
     items in the target carry data-group="key" (space-separated allowed). Updates [data-filter-count] if present. ---------- */
  document.querySelectorAll('[data-filter-group]').forEach(function (bar) {
    var grid = document.querySelector(bar.getAttribute('data-filter-group'));
    if (!grid) return;
    var count = document.querySelector(bar.getAttribute('data-filter-count') || '[data-filter-count]');
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      var key = chip.getAttribute('data-filter');
      bar.querySelectorAll('[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      Array.prototype.forEach.call(grid.children, function (item) {
        var groups = (item.getAttribute('data-group') || '').split(/\s+/);
        var on = key === 'all' || groups.indexOf(key) > -1;
        item.hidden = !on;
        if (on) shown++;
      });
      if (count) count.textContent = count.getAttribute('data-template') ? count.getAttribute('data-template').replace('{n}', shown) : 'Showing ' + shown;
      grid.dispatchEvent(new CustomEvent('filter:change', { detail: { key: key, shown: shown }, bubbles: true }));
    });
  });

  function fmtPrice(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

  /* ---------- Quote carousel: [data-carousel] > .quote-track > .quote-slide; [data-carousel-prev|next]; [data-carousel-dots] ----------
     One slide visible; others are visibility:hidden + inert. Buttons, dots and ArrowLeft/ArrowRight (when the carousel has focus) work. */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var slides = Array.prototype.slice.call(car.querySelectorAll('.quote-slide'));
    if (!slides.length) return;
    var dotsWrap = car.querySelector('[data-carousel-dots]');
    var live = car.querySelector('[data-carousel-live]');
    var dots = [], cur = 0;
    if (dotsWrap) {
      slides.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'quote-dot';
        b.setAttribute('aria-label', 'Show story ' + (i + 1) + ' of ' + slides.length);
        b.addEventListener('click', function () { show(i); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === cur;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
        s.setAttribute('aria-label', (k + 1) + ' of ' + slides.length);
      });
      dots.forEach(function (d, k) { if (k === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      if (live) live.textContent = 'Story ' + (cur + 1) + ' of ' + slides.length;
    }
    var prev = car.querySelector('[data-carousel-prev]'), next = car.querySelector('[data-carousel-next]');
    if (prev) prev.addEventListener('click', function () { show(cur - 1); });
    if (next) next.addEventListener('click', function () { show(cur + 1); });
    car.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest('input, textarea, select')) return;
      e.preventDefault();
      var rtl = root.getAttribute('dir') === 'rtl';
      var fwd = (e.key === 'ArrowRight') !== rtl;
      show(cur + (fwd ? 1 : -1));
    });
    show(0);
  });

  /* ---------- Lightbox: <div data-lightbox> with <a href="images/x-1600.webp" data-caption="…"><img …></a> items ---------- */
  var lb = null, lbItems = [], lbIdx = 0, lbOpener = null;
  function lbShow(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    var a = lbItems[lbIdx], img = a.querySelector('img');
    lb.querySelector('img').src = a.getAttribute('href');
    lb.querySelector('img').alt = img ? img.alt : '';
    lb.querySelector('figcaption').textContent = a.getAttribute('data-caption') || (img ? img.alt : '');
  }
  function lbClose() { if (!lb || lb.hidden) return; lb.hidden = true; document.body.classList.remove('modal-open'); if (lbOpener) lbOpener.focus(); }
  function lbBuild() {
    lb = document.createElement('div');
    lb.className = 'lightbox'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
    lb.innerHTML = '<figure><img src="" alt="" width="1600" height="1067"><figcaption></figcaption></figure>' +
      '<button class="lightbox-btn lightbox-close" type="button" aria-label="Close photo viewer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous photo">' + arrow.replace('<svg', '<svg class="flip"') + '</button>' +
      '<button class="lightbox-btn lightbox-next" type="button" aria-label="Next photo">' + arrow.replace('<svg', '<svg class="flip" style="transform:scaleX(-1)"') + '</button>';
    document.body.appendChild(lb);
    lb.querySelector('.lightbox-close').addEventListener('click', lbClose);
    lb.querySelector('.lightbox-prev').addEventListener('click', function () { lbShow(lbIdx - 1); });
    lb.querySelector('.lightbox-next').addEventListener('click', function () { lbShow(lbIdx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
      if (e.key === 'Tab') { var f = lb.querySelectorAll('button'); if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lightbox] a[href]');
    if (!a) return;
    e.preventDefault();
    if (!lb) lbBuild();
    lbItems = Array.prototype.slice.call(a.closest('[data-lightbox]').querySelectorAll('a[href]'));
    lbOpener = a;
    lbShow(lbItems.indexOf(a));
    lb.hidden = false;
    document.body.classList.add('modal-open');
    lb.querySelector('.lightbox-close').focus();
  });

  window.Harborlight = {
    toast: toast, openModal: openModal, closeModal: closeModal, fmtPrice: fmtPrice, esc: esc,
    programs: window.HARBORLIGHT_PROGRAMS || []
  };

  /* ---------- Footer year, opt-in reveal ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();

/* ---------- Motion system: scroll reveal, staggered cards, count-up stats, header shadow ---------- */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Automated tools (screenshots, QA) get the final, static layout
  var automated = navigator.webdriver === true;

  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.querySelectorAll('.card-media img').forEach(function (img) {
    var done = function () { if (img.parentElement) img.parentElement.classList.add('is-loaded'); };
    if (img.complete) done(); else img.addEventListener('load', done, { once: true });
  });

  if (reduce || automated || !('IntersectionObserver' in window)) return;
  root.classList.add('motion');

  var SELECTORS = [
    'main .intro', 'main .intro-row', 'main .card', 'main .panel', 'main .testimonial',
    'main .timeline > li', 'main .roman-list > li', 'main .steps > li', 'main .faq-item', 'main .split > *',
    'main .cta-band', 'main .chips', 'main .filter-bar', 'main .table-wrap',
    'main .gallery', 'main .article-body > *', 'main .program-row', 'main .story-grid > *', 'main .airy', 'main .milestones > li', 'main .quotes', 'main .how-steps > li'
  ];
  var vh = window.innerHeight;
  var els = [];
  document.querySelectorAll(SELECTORS.join(',')).forEach(function (el) {
    if (el.closest('[data-reveal]') || el.closest('.hero, .page-hero, .modal, dialog, .quote-track, .lightbox')) return;
    // content already on screen at load stays put (no flash)
    if (el.getBoundingClientRect().top < vh * 0.92) return;
    el.setAttribute('data-reveal', '');
    els.push(el);
  });
  // stagger siblings in the same parent
  var counts = new Map();
  els.forEach(function (el) {
    var p = el.parentElement, i = counts.get(p) || 0;
    counts.set(p, i + 1);
    el.style.setProperty('--rd', Math.min(i, 5) * 80 + 'ms');
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      t.classList.add('in');
      io.unobserve(t);
      // hand control back to normal hover styles once revealed
      setTimeout(function () { t.removeAttribute('data-reveal'); t.classList.remove('in'); t.style.removeProperty('--rd'); }, 1000);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  els.forEach(function (el) { io.observe(el); });
  // safety: never leave content hidden
  window.addEventListener('load', function () { setTimeout(function () { els.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); }); }, 1200); });

  // Count-up for numeric stats (keeps prefixes/suffixes like ₹, %, +, /5)
  var nums = document.querySelectorAll('.stats strong, .milestones strong, [data-count]');
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      var el = en.target, txt = el.textContent.trim();
      var m = txt.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var raw = m[2], target = parseFloat(raw.replace(/,/g, ''));
      if (!isFinite(target) || target === 0) return;
      var dec = (raw.split('.')[1] || '').length, grouped = raw.indexOf(',') !== -1;
      var start = performance.now(), dur = 1100;
      var fmt = function (v) {
        var s = v.toFixed(dec);
        if (grouped) s = Number(s).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        return m[1] + s + m[3];
      };
      (function tick(now) {
        var t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * e);
        if (t < 1) requestAnimationFrame(tick); else el.textContent = txt;
      })(start);
    });
  }, { threshold: 0.6 });
  nums.forEach(function (n) { cio.observe(n); });

  // Re-play a soft fade when filter chips change a grid
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip, [data-filter]');
    if (!chip) return;
    document.querySelectorAll('.cards').forEach(function (g) {
      g.classList.remove('is-filtering'); void g.offsetWidth; g.classList.add('is-filtering');
      clearTimeout(g._ft); g._ft = setTimeout(function () { g.classList.remove('is-filtering'); }, 600);
    });
  });
})();
