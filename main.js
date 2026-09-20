/* =========================================================
   Aurelian Estates - shared script (loaded on every page)
   Website designed by TheWebVue
   Each feature checks that its markup exists, so this one
   file works on all five pages.
========================================================= */
(() => {
  'use strict';

  /* ---------- Helpers ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Image fallback (if a photo URL fails to load) ---------- */
  const FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#183760"/><stop offset="1" stop-color="#0A1A33"/></linearGradient></defs>' +
    '<rect width="800" height="600" fill="url(#g)"/>' +
    '<g fill="none" stroke="#C5A059" stroke-width="3" stroke-linejoin="round" opacity=".75">' +
    '<path d="M240 420V300h70v120M320 420V220h80v200M410 420V320h60v100M480 420V260h70v160M200 420h380"/></g></svg>'
  );
  $$('img').forEach(img => {
    const swap = () => { if (img.dataset.fb) return; img.dataset.fb = '1'; img.src = FALLBACK; };
    img.addEventListener('error', swap);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) swap();
  });

  /* ---------- Sticky header + banner parallax (one rAF-throttled scroll handler) ---------- */
  const header = $('#header');
  const hero = $('.hero, .page-hero');
  const heroMedia = $('.hero-media');
  const heroContent = $('.hero-content');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 40);

    if (!reduceMotion && hero && heroMedia && heroContent) {
      const h = hero.offsetHeight;
      if (y <= h) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.4).toFixed(1) + 'px,0)';
        heroContent.style.transform = 'translate3d(0,' + (y * 0.15).toFixed(1) + 'px,0)';
        heroContent.style.opacity = Math.max(0, 1 - y / (h * 0.75)).toFixed(3);
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $('#nav-toggle');
  const menu = $('#nav-menu');
  const backdrop = $('#nav-backdrop');

  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    backdrop.classList.toggle('is-visible', open);
    document.body.classList.toggle('no-scroll', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  backdrop.addEventListener('click', () => setMenu(false));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  window.addEventListener('pageshow', () => setMenu(false));   // reset if the browser restores the page via Back

  /* ---------- Scroll-reveal ---------- */
  const revealEls = $$('.reveal');
  if (reduceMotion || !hasIO) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        el.classList.add('is-visible');

        // Once the entrance finishes, drop the reveal classes so the element's
        // own hover transitions (cards, buttons) work without interference.
        const cleanup = e => {
          if (e.target !== el || e.propertyName !== 'opacity') return;
          el.classList.remove('reveal', 'reveal-left', 'reveal-right', 'is-visible');
          el.style.removeProperty('--d');
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => revealIO.observe(el));
  }

  /* ---------- Animated stat counters (Profile page) ---------- */
  const counters = $$('[data-count]');
  const statsBlock = $('#stats');

  function runCounter(el) {
    const target = Number(el.dataset.count);
    const duration = 2200;
    let start = null;
    const step = ts => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);            // easeOutQuart
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (!reduceMotion && hasIO && statsBlock) {
    counters.forEach(c => { c.textContent = '0'; });
    const statsIO = new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) {
        counters.forEach(runCounter);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    statsIO.observe(statsBlock);
  }

  /* ---------- Project filter (Projects page) ---------- */
  const chips = $$('.chip');
  if (chips.length) {
    const cards = $$('.projects-grid [data-status]');
    const count = $('#result-count');

    chips.forEach(chip => chip.addEventListener('click', () => {
      const wanted = chip.dataset.filter;
      let shown = 0;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));

      cards.forEach(card => {
        const match = wanted === 'all' || card.dataset.status === wanted;
        const wasHidden = card.hidden;
        card.hidden = !match;
        if (match) {
          shown++;
          if (wasHidden && !reduceMotion) {
            card.classList.add('pop');
            card.addEventListener('animationend', () => card.classList.remove('pop'), { once: true });
          }
        }
      });
      count.textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's');
    }));
  }

  /* ---------- Gallery lightbox (Gallery page) ---------- */
  const lb = $('#lightbox');
  const shots = $$('.gallery-item');
  if (lb && shots.length) {
    const lbImg = $('#lb-img');
    const lbCap = $('#lb-cap');
    const lbCount = $('#lb-count');
    const lbClose = $('#lb-close');
    const lbPrev = $('#lb-prev');
    const lbNext = $('#lb-next');
    let current = 0;
    let lastFocus = null;

    const showShot = i => {
      current = (i + shots.length) % shots.length;
      const item = shots[current];
      lbImg.classList.add('is-loading');
      delete lbImg.dataset.fb;
      lbImg.src = item.dataset.full;
      lbImg.alt = item.dataset.caption;
      lbCap.textContent = item.dataset.caption;
      lbCount.textContent = (current + 1) + ' / ' + shots.length;
      new Image().src = shots[(current + 1) % shots.length].dataset.full;   // preload next
    };
    lbImg.addEventListener('load', () => lbImg.classList.remove('is-loading'));
    lbImg.addEventListener('error', () => {
      if (lbImg.dataset.fb) return;
      lbImg.dataset.fb = '1';
      lbImg.src = FALLBACK;
    });

    const openLightbox = i => {
      lastFocus = document.activeElement;
      showShot(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      lbClose.focus();
    };
    const closeLightbox = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocus) lastFocus.focus();
    };

    shots.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => showShot(current - 1));
    lbNext.addEventListener('click', () => showShot(current + 1));
    $('#lb-stage').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeLightbox();      // click on the dark backdrop
    });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showShot(current - 1);
      else if (e.key === 'ArrowRight') showShot(current + 1);
      else if (e.key === 'Tab') {                              // keep focus inside the dialog
        const first = lbClose, last = lbNext;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    let touchX = null;                                         // swipe on touch devices
    lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showShot(current + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }

  /* ---------- Enquiry form (Contact page) ---------- */
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const form = $('#enquiry-form');

  if (form) {
    const success = $('#form-success');
    const submitBtn = $('#submit-btn');
    const submitLabel = $('.btn-label', submitBtn);
    const projectSelect = $('#f-project');

    // "View Details" links arrive as contact.html?project=Name, so pre-select that project
    const wanted = new URLSearchParams(window.location.search).get('project');
    if (wanted) projectSelect.value = wanted;

    const rules = {
      name:    v => v.trim().length >= 2 || 'Enter your full name.',
      email:   v => emailRe.test(v.trim()) || 'Enter a valid email address, like name@example.com.',
      phone:   v => {
        const digits = v.replace(/\D/g, '');
        return (/^[+\d\s\-()]+$/.test(v) && digits.length >= 7 && digits.length <= 15) || 'Enter a valid phone number with 7 to 15 digits.';
      },
      project: v => v !== '' || 'Choose the project you are interested in.'
    };

    const validateField = input => {
      const rule = rules[input.name];
      if (!rule) return true;
      const result = rule(input.value);
      const wrap = input.closest('.field');
      const ok = result === true;
      wrap.classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      $('.field-error', wrap).textContent = ok ? '' : result;
      return ok;
    };

    $$('input, select', form).forEach(input => {
      input.addEventListener('blur', () => {
        if (input.value !== '' || input.closest('.field').classList.contains('has-error')) validateField(input);
      });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('has-error')) validateField(input);
      });
      input.addEventListener('change', () => validateField(input));
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = $$('input, select', form).filter(f => rules[f.name]);
      const results = fields.map(validateField);
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      /* TODO: replace this timeout with a real request, e.g.
         fetch('/api/enquiry', { method: 'POST', body: new FormData(form) }) */
      setTimeout(() => {
        const first = $('#f-name').value.trim().split(/\s+/)[0];
        $('#success-title').textContent = 'Thank you, ' + first + '.';
        form.hidden = true;
        success.hidden = false;
        success.focus();
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send enquiry';
      }, 900);
    });

    $('#another-btn').addEventListener('click', () => {
      form.reset();
      $$('.field', form).forEach(f => f.classList.remove('has-error'));
      $$('.field-error', form).forEach(s => { s.textContent = ''; });
      success.hidden = true;
      form.hidden = false;
      $('#f-name').focus();
    });
  }

  /* ---------- Newsletter (footer, every page) ---------- */
  const nlForm = $('#newsletter-form');
  if (nlForm) {
    const nlInput = $('#nl-email');
    const nlMsg = $('#nl-msg');
    nlForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!emailRe.test(nlInput.value.trim())) {
        nlMsg.textContent = 'Enter a valid email address.';
        nlMsg.className = 'nl-msg is-error';
        nlInput.focus();
        return;
      }
      /* TODO: send nlInput.value to your mailing-list provider here */
      nlMsg.textContent = 'Subscribed. Watch your inbox for our next project update.';
      nlMsg.className = 'nl-msg is-ok';
      nlForm.reset();
    });
  }

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
