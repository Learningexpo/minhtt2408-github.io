/* ============================================
   Personal academic website — behaviour
   Vanilla JavaScript, zero dependencies. The page works without it.
   ============================================ */

(function () {
  'use strict';

  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };

  /* ── Theme ── */
  const themeToggle = document.getElementById('themeToggle');
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    document.querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => { m.content = theme === 'dark' ? '#0f1113' : '#ffffff'; });
  }

  applyTheme(store.get('theme') || (media.matches ? 'dark' : 'light'));

  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set('theme', next);
    applyTheme(next);
  });

  media.addEventListener('change', (e) => {
    if (!store.get('theme')) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* ── Animated figures: a still frame for reduced motion or quiet reading ── */
  const motionToggle = document.getElementById('motionToggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const figures = [...document.querySelectorAll('.research-figure img[src$=".gif"], .pub-thumb img[src$=".gif"]')];
  let paused = store.get('pause-animations') === 'true' || (store.get('pause-animations') === null && reducedMotion.matches);

  function updateFigure(img) {
    if (!paused) {
      if (img.dataset.animationSrc) {
        img.src = img.dataset.animationSrc;
        delete img.dataset.animationSrc;
      }
    } else if (!img.dataset.animationSrc && img.complete && img.naturalWidth) {
      // All animated figures are local, so their pixels can be read safely.
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      img.dataset.animationSrc = img.getAttribute('src');
      img.src = canvas.toDataURL();
    }
  }

  function updateMotion() {
    motionToggle.textContent = paused ? 'Play animations' : 'Pause animations';
    figures.forEach(updateFigure);
  }

  figures.forEach((img) => img.addEventListener('load', () => updateFigure(img)));
  motionToggle.hidden = false;
  motionToggle.addEventListener('click', () => {
    paused = !paused;
    store.set('pause-animations', String(paused));
    updateMotion();
  });
  reducedMotion.addEventListener('change', (e) => {
    if (store.get('pause-animations') === null) { paused = e.matches; updateMotion(); }
  });
  updateMotion();

  /* ── Active nav link ── */
  const navItems = [...document.querySelectorAll('#navLinks a')];
  const tracked = navItems.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const strip = document.getElementById('navLinks');
  const navbar = document.querySelector('.navbar');
  let lastActive = '';

  function updateActiveNav() {
    const y = window.scrollY + navbar.offsetHeight + 20;
    let current = '';
    tracked.forEach((s) => { if (y >= s.offsetTop) current = '#' + s.id; });
    navItems.forEach((a) => {
      const active = a.getAttribute('href') === current;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (current !== lastActive) {
      lastActive = current;
      // On narrow screens the links scroll sideways: keep the active one visible.
      const a = navItems.find((n) => n.getAttribute('href') === current);
      if (a && strip.scrollWidth > strip.clientWidth) {
        const linkRect = a.getBoundingClientRect();
        const stripRect = strip.getBoundingClientRect();
        if (linkRect.left < stripRect.left || linkRect.right > stripRect.right) {
          strip.scrollLeft += linkRect.left - stripRect.left - 16;
        }
      }
    }
  }
  strip.addEventListener('focusin', (e) => e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  window.addEventListener('resize', updateActiveNav);
  updateActiveNav();

  /* ── Publication filters: topic AND year ── */
  const filters = { topic: 'all', year: 'all' };
  const pubs = document.querySelectorAll('.pub-item');
  const groups = document.querySelectorAll('.pub-year-group');
  const empty = document.getElementById('pubEmpty');
  const status = document.getElementById('pubStatus');

  function applyFilters() {
    let shown = 0;
    pubs.forEach((p) => {
      const ok = (filters.topic === 'all' || p.dataset.topic.split(' ').includes(filters.topic)) &&
                 (filters.year === 'all' || p.dataset.year === filters.year);
      p.hidden = !ok;
      shown += ok;
    });
    groups.forEach((g) => { g.hidden = !g.querySelector('.pub-item:not([hidden])'); });
    empty.hidden = shown > 0;
    status.textContent = shown + (shown === 1 ? ' paper shown' : ' papers shown');
    updateActiveNav();
  }

  function setFilter(kind, value) {
    filters[kind] = value;
    document.querySelectorAll(`.pub-filter-btn[data-kind="${kind}"]`)
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  }

  document.querySelectorAll('.pub-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => { setFilter(btn.dataset.kind, btn.dataset.value); applyFilters(); });
  });
  applyFilters();

  // A link to a paper hidden by the filters resets them first.
  document.querySelectorAll('a[href^="#pub-"]').forEach((a) => {
    a.addEventListener('click', () => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target && target.hidden) { setFilter('topic', 'all'); setFilter('year', 'all'); applyFilters(); }
    });
  });

  /* ── BibTeX copy buttons ── */
  if (navigator.clipboard) {
    document.querySelectorAll('.bib').forEach((d) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bib-copy';
      btn.textContent = 'Copy BibTeX';
      btn.setAttribute('aria-live', 'polite');
      const flash = (text) => {
        btn.textContent = text;
        setTimeout(() => { btn.textContent = 'Copy BibTeX'; }, 1500);
      };
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(d.querySelector('pre').textContent.trim())
          .then(() => flash('Copied'), () => flash('Copy failed'));
      });
      d.appendChild(btn);
    });
  }
})();

// ── Open-source repo stats: refresh stars/forks live (cached for a day), fall back to static values ──
(function () {
  const DAY = 864e5;
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '' + n);
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

  document.querySelectorAll('.repo-card[data-repo]').forEach((card) => {
    const key = 'repo:' + card.dataset.repo;
    const show = (d) => {
      card.querySelector('.repo-stars').textContent = fmt(d.s);
      card.querySelector('.repo-forks').textContent = fmt(d.f);
    };
    const cached = read(key);
    if (cached && Date.now() - cached.t < DAY) { if (cached.s != null) show(cached); return; }
    fetch('https://api.github.com/repos/' + card.dataset.repo, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (typeof d.stargazers_count !== 'number') return;
        const v = { s: d.stargazers_count, f: d.forks_count, t: Date.now() };
        write(key, v);
        show(v);
      })
      .catch(() => {
        // Rate-limited or offline: keep any stale values and wait a day before retrying.
        if (cached && cached.s != null) show(cached);
        write(key, Object.assign({}, cached, { t: Date.now() }));
      });
  });
})();
