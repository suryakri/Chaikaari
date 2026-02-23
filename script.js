/**
 * Chai Kaari – Main JavaScript
 *
 * Pour animation:
 *   Phase 1  (scroll 0.00 → 0.15): glass tilts from 0° → TILT_MAX; no pour until ~0.13
 *   Phase 2  (scroll 0.15 → 1.00): glass stays locked at TILT_MAX; pour grows with scroll
 *   Retract  : pour retracts smoothly when scrolling back up (viscous lag)
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. UTILITIES
   ═══════════════════════════════════════════════════════════════ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* ═══════════════════════════════════════════════════════════════
   2. HERO IMAGE SEQUENCE BACKGROUND
   ═══════════════════════════════════════════════════════════════ */

(function initHeroSequence() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false }); // alpha:false for performance

  /* ── CONFIG ────────────────────────────────────────────────── */
  const FRAME_COUNT = 70; // 000 through 069
  const FPS = 16.8;       // 30% slower than 24fps
  const FRAME_DUR = 1000 / FPS;

  /* Image paths matching the provided directory structure */
  // e.g., hero/Make_it_a_1080p_202602221549_000/Make_it_a_1080p_202602221549_000.jpg
  // Using path interpolation:
  const getPath = (i) => {
    const num = i.toString().padStart(3, '0');
    return `hero/Make_it_a_1080p_202602221549_000/Make_it_a_1080p_202602221549_${num}.jpg`;
  };

  const images = [];
  let loadedCount = 0;
  let currentFrameIndex = 0;
  let lastDrawTime = performance.now();
  let raf = null;

  /* ── RESIZE HANDLING (object-fit: cover) ───────────────────── */
  // We manage the canvas internal resolution to match logical size
  let cw, ch;
  function resize() {
    // The canvas CSS handles width/height 100%, 
    // but the internal resolution must match to look crisp.
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    cw = rect.width;
    ch = rect.height;

    // Immediately draw current frame on resize to avoid blank flash
    if (images[currentFrameIndex] && images[currentFrameIndex].complete) {
      drawFrame(images[currentFrameIndex]);
    }
  }

  window.addEventListener('resize', resize);
  resize();

  /* ── DRAWING LOGIC ─────────────────────────────────────────── */
  // Draws the image imitating CSS 'object-fit: cover'
  function drawFrame(img) {
    if (!cw || !ch) return;

    const imgW = img.width;
    const imgH = img.height;
    if (!imgW || !imgH) return;

    // Math for cover sizing
    const scale = Math.max(cw / imgW, ch / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    // Center it
    const dx = (cw - drawW) / 2;
    const dy = (ch - drawH) / 2;

    ctx.fillStyle = '#1a2b1c'; // fallback green-900
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  /* ── SCROLL SCRUBBING LOGIC ────────────────────────────────── */
  const pinnedSpace = document.getElementById('home'); // The .hero-pinned-space wrapper
  let targetFrameIndex = 0;
  let scrollTicking = false;

  function updateFrameOnScroll() {
    scrollTicking = false;
    if (!pinnedSpace || loadedCount === 0) return;

    // Calculate scroll progress relative to the pinned space bounding rect
    const rect = pinnedSpace.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;

    let progress = 0;
    if (scrollableDistance > 0) {
      // When rect.top is 0, pinning starts.
      // When rect.top is -scrollableDistance, pinning ends.
      progress = clamp(-rect.top / scrollableDistance, 0, 1);
    }

    // Map progress to exact frame
    targetFrameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.floor(progress * FRAME_COUNT)
    );

    // Only draw if frame changed
    if (currentFrameIndex !== targetFrameIndex) {
      currentFrameIndex = targetFrameIndex;
      if (images[currentFrameIndex] && images[currentFrameIndex].complete) {
        drawFrame(images[currentFrameIndex]);
      }
    }
  }

  function handleScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateFrameOnScroll);
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  /* ── PRELOADER ─────────────────────────────────────────────── */
  if (!prefersReducedMotion) {
    // Preload all frames
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getPath(i);
      images.push(img);
      img.onload = () => {
        loadedCount++;
        // Start animation once the first few frames are ready
        if (loadedCount === 3) {
          updateFrameOnScroll(); // Initial draw
        }
      };
      img.onerror = () => {
        console.warn('Failed to load sequence frame: ' + i);
      };
    }
  } else {
    // Reduced motion: fall back to a single static image (like frame 0 or midpoint)
    const img = new Image();
    img.onload = () => drawFrame(img);
    img.src = getPath(0);
  }
})();

/* ═══════════════════════════════════════════════════════════════
   3. THEME TOGGLE (Dark / Light Mode)
   ═══════════════════════════════════════════════════════════════ */

(function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;

  const sunIcon = toggleBtn.querySelector('.sun-icon');
  const moonIcon = toggleBtn.querySelector('.moon-icon');

  // Check saved preference or fallback to system preference
  const savedTheme = localStorage.getItem('chaikaari-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Default to light if no preference is saved (since current design is light-first),
  // but respect dark mode OS setting if it exists.
  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      document.documentElement.removeAttribute('data-theme');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  // Apply initial theme
  applyTheme(currentTheme);

  // Toggle on click
  toggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('chaikaari-theme', currentTheme);
  });
})();

/* ═══════════════════════════════════════════════════════════════
   4. CHAI GLASS POUR ANIMATION — Phase 1 / Phase 2 model
   ═══════════════════════════════════════════════════════════════ */

(function initChaiAnimation() {

  /* ── DOM refs ──────────────────────────────────────────────── */
  const wrapper = document.getElementById('chaiGlassWrapper');
  const container = document.getElementById('chaiGlassContainer');
  const streamSvg = document.getElementById('pourStreamSvg');
  const streamPath = document.getElementById('pourStreamPath');
  const splashEl = document.getElementById('splashEllipse');

  /* These live inside the swappable SVG asset */
  const getTeaBody = () => document.getElementById('teaBody');
  const getFoamSurface = () => document.getElementById('foamSurface');
  const getSteamGroup = () => document.getElementById('steamGroup');

  if (!container || !streamSvg || !streamPath) return;

  /* ── PHASE / TILT CONFIG ───────────────────────────────────
     Phase 1: scroll 0 → P1_END   – glass tilts, no pour yet
     Pour threshold: glassbegins pouring at scroll POUR_START
                     (inside phase 1, near its end)
     Phase 2: scroll P1_END → 1   – tilt locked, pour grows
  ─────────────────────────────────────────────────────────── */
  const PHASE1_END = 0.15;   // scroll fraction where phase 1 ends
  const POUR_START = 0.12;   // tilt threshold where tea starts (≈ end of phase 1)
  const TILT_MAX_DEG = 56;     // degrees at max tilt (locked in phase 2)

  /* Glass SVG coordinate constants (viewBox 0 0 120 200) */
  const PIVOT_X = 60;     // rotate around handle-side midpoint
  const PIVOT_Y = 88;
  const LIP_X = 20;     // top-left rim corner (the pour lip)
  const LIP_Y = 16;

  /* Stream SVG coordinate constants (viewBox 0 0 120 2000, sits below glass) */
  const GLASS_SVG_H = 200;    // glass SVG height in its own coordinate space

  /* Physics */
  const GRAVITY = 0.48;   // downward parabolic coefficient
  const SEGMENTS = 32;     // bezier smoothing segments

  /* ── ANIMATION STATE ───────────────────────────────────────── */
  let curTilt = 0;   // smoothed tilt (degrees)
  let tgtTilt = 0;
  let curPour = 0;   // smoothed pour progress 0–1
  let tgtPour = 0;
  let raf = null;
  let dirty = true;

  /* ── SCROLL (passive + RAF-gated) ─────────────────────────── */
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });

  /* ── HELPERS ─────────────────────────────────────────────── */
  function scrollFrac() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  }

  function rotatePt(px, py, cx, cy, rad) {
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  /* ── STREAM BUILDER ──────────────────────────────────────────
     Physics: parabolic arc from rotated lip position.
     Stream SVG is placed at CSS top = (glass SVG height in px).
     We map glass-SVG y → streamSVG y by subtracting GLASS_SVG_H.
  ─────────────────────────────────────────────────────────────  */
  function buildStream(pourPct, tiltDeg) {
    if (pourPct <= 0.003) {
      streamPath.setAttribute('d', '');
      streamPath.setAttribute('stroke-width', '0');
      if (splashEl) { splashEl.setAttribute('rx', 0); splashEl.setAttribute('ry', 0); }
      hideDroplets();
      return;
    }

    const rad = (tiltDeg * Math.PI) / 180;

    /* Rotated lip in glass-SVG space */
    const lip = rotatePt(LIP_X, LIP_Y, PIVOT_X, PIVOT_Y, -rad);

    /* Translate into stream-SVG space (stream-SVG top ≡ glass-SVG y = GLASS_SVG_H) */
    const ex = lip.x;
    const ey = lip.y - GLASS_SVG_H;   // negative means above stream top → clip naturally

    /* Exit velocity vector (perpendicular to tilted cup axis) */
    const exitAngle = rad + Math.PI / 2;
    const speed = 0.78 + tiltDeg * 0.009;
    const vx = -Math.abs(Math.cos(exitAngle)) * speed;   // always left
    const vy = Math.max(Math.sin(exitAngle) * speed, 0.32); // always down

    /* Stream length grows with pourPct, max 1100 SVG units */
    const maxLen = pourPct * 1100;

    /* Sample parabola */
    const pts = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const L = t * maxLen;
      pts.push({
        x: ex + vx * L,
        y: ey + vy * L + 0.5 * GRAVITY * Math.pow(L, 1.50)
      });
    }

    /* Mid-point quadratic bezier chain for smooth curve */
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
      const my = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx} ${my}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    streamPath.setAttribute('d', d);

    /* ── Stroke width: drips → continuous → thick ribbon ─── */
    let sw;
    if (pourPct < 0.08) { sw = 1.0 + pourPct * 22; }
    else if (pourPct < 0.45) { sw = 2.8 + (pourPct - 0.08) * 5.5; }
    else { sw = 4.8 + (pourPct - 0.45) * 4.0; }
    streamPath.setAttribute('stroke-width', sw.toFixed(1));

    /* ── Splash ellipse ──────────────────────────────────── */
    if (splashEl) {
      const sr = clamp(pourPct * 16, 0, 16);
      splashEl.setAttribute('cx', last.x.toFixed(1));
      splashEl.setAttribute('cy', last.y.toFixed(1));
      splashEl.setAttribute('rx', sr.toFixed(1));
      splashEl.setAttribute('ry', (sr * 0.27).toFixed(1));
    }

    /* ── Breakup droplets (high flow only) ──────────────── */
    updateDroplets(pts, pourPct);
  }

  /* ── DROPLET POOL ─────────────────────────────────────────── */
  const MAX_DROPS = 6;
  let dropEls = [];

  function ensureDroplets() {
    if (dropEls.length) return;
    const NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < MAX_DROPS; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('fill', '#c47a3a');
      c.setAttribute('opacity', '0');
      c.setAttribute('r', '3');
      streamSvg.appendChild(c);
      dropEls.push(c);
    }
  }

  function hideDroplets() {
    dropEls.forEach(d => d.setAttribute('opacity', '0'));
  }

  function updateDroplets(pts, pourPct) {
    ensureDroplets();
    if (pourPct < 0.44) { hideDroplets(); return; }
    const alpha = clamp((pourPct - 0.44) / 0.50, 0, 0.88).toFixed(2);
    const start = Math.floor(pts.length * 0.60);
    dropEls.forEach((drop, i) => {
      const idx = clamp(start + Math.floor((i / MAX_DROPS) * (pts.length - start)), 0, pts.length - 1);
      const pt = pts[idx];
      const jit = (i % 2 === 0 ? 1 : -1) * (2 + i * 1.8);
      drop.setAttribute('cx', (pt.x + jit).toFixed(1));
      drop.setAttribute('cy', (pt.y + i * 8).toFixed(1));
      drop.setAttribute('r', (1.5 + (i % 3) * 1.3).toFixed(1));
      drop.setAttribute('opacity', alpha);
    });
  }

  /* ── TEA LEVEL (internal glass fill drops as liquid pours) ── */
  function updateTeaLevel(pourPct) {
    const tb = getTeaBody();
    const fs = getFoamSurface();
    if (!tb || !fs) return;

    /* tea body top (y attr) rises by up to 40 SVG units */
    const base = 62;
    const maxDrop = 38;
    const newY = clamp(base + pourPct * maxDrop, base, base + maxDrop);

    tb.setAttribute('y', newY.toFixed(1));
    tb.setAttribute('height', Math.max(0, 192 - newY).toFixed(1));
    fs.setAttribute('cy', newY.toFixed(1));
  }

  /* ── STEAM (fades out as glass tilts) ─────────────────────── */
  function updateSteam(tiltDeg) {
    const sg = getSteamGroup();
    if (!sg) return;
    sg.style.opacity = clamp(1 - tiltDeg / 30, 0, 1).toFixed(2);
  }

  /* ── REDUCED MOTION: static cup + tiny ribbon ──────────────── */
  function staticFallback() {
    container.style.transform = 'none';
    streamPath.setAttribute('d', 'M 20 0 Q 10 60 5 160');
    streamPath.setAttribute('stroke-width', '2.5');
    streamPath.setAttribute('opacity', '0.35');
    if (splashEl) {
      splashEl.setAttribute('cx', '5');
      splashEl.setAttribute('cy', '160');
      splashEl.setAttribute('rx', '6');
      splashEl.setAttribute('ry', '1.8');
    }
  }

  if (prefersReducedMotion) {
    staticFallback();
    return;
  }

  /* ── MAIN RAF LOOP ─────────────────────────────────────────── */
  function tick() {
    if (dirty) {
      dirty = false;
      const s = scrollFrac();

      /* ─── PHASE 1: tilt 0 → TILT_MAX over scroll 0 → PHASE1_END ─── */
      /* ─── PHASE 2: tilt LOCKED at TILT_MAX beyond PHASE1_END ──────── */
      const phase1Prog = clamp(s / PHASE1_END, 0, 1);
      tgtTilt = phase1Prog * TILT_MAX_DEG;   // reaches max at phase1 end, locks thereafter

      /* Pour only begins after POUR_START threshold, fully linear into phase 2 */
      if (s < POUR_START) {
        tgtPour = 0;
      } else {
        /* In phase 1 tail: tiny drip starts */
        /* In phase 2: full pour range grows with scroll */
        tgtPour = clamp((s - POUR_START) / (1.0 - POUR_START), 0, 1);
      }
    }

    /* Smoothing — forward fast, retract viscous (like thick liquid) */
    curTilt = lerp(curTilt, tgtTilt, curTilt < tgtTilt ? 0.11 : 0.07);
    curPour = lerp(curPour, tgtPour, curPour < tgtPour ? 0.09 : 0.05);

    /* Rotate glass — pivot at handle side so cup tips left */
    container.style.transform = `rotate(${-curTilt}deg)`;
    container.style.transformOrigin = `${PIVOT_X}px ${PIVOT_Y}px`;

    /* Stream only active past physical pour threshold (~12° tilt) */
    const activePour = curTilt > 11 ? curPour : 0;
    buildStream(activePour, curTilt);

    updateTeaLevel(curPour);
    updateSteam(curTilt);

    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { dirty = true; raf = requestAnimationFrame(tick); }
  });

})();

/* ═══════════════════════════════════════════════════════════════
   3. STICKY HEADER
   ═══════════════════════════════════════════════════════════════ */

(function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  let ticking = false;
  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 60);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateHeader); ticking = true; }
  }, { passive: true });
  updateHeader();
})();

/* ═══════════════════════════════════════════════════════════════
   4. MOBILE NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

(function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;

  let isOpen = false;

  function openNav() {
    isOpen = true;
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.removeAttribute('aria-hidden');
    document.addEventListener('keydown', handleKey);
  }

  function closeNav() {
    isOpen = false;
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) { if (e.key === 'Escape') closeNav(); }

  hamburger.addEventListener('click', () => isOpen ? closeNav() : openNav());
  mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', closeNav));
  document.addEventListener('click', e => {
    if (isOpen && !mobileNav.contains(e.target) && !hamburger.contains(e.target)) closeNav();
  });
})();

/* ═══════════════════════════════════════════════════════════════
   5. MENU TABS
   ═══════════════════════════════════════════════════════════════ */

(function initMenuTabs() {
  const tabContainer = document.querySelector('.menu-tabs');
  if (!tabContainer) return;

  const tabs = tabContainer.querySelectorAll('.menu-tab');
  const panels = document.querySelectorAll('.tab-panel');

  function activateTab(tab) {
    const id = tab.dataset.tab;
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(p => {
      const on = p.id === `tab-${id}`;
      if (on) { p.removeAttribute('hidden'); p.classList.add('active'); }
      else { p.setAttribute('hidden', ''); p.classList.remove('active'); }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', e => {
      const arr = [...tabs];
      const i = arr.indexOf(tab);
      let ni = null;
      if (e.key === 'ArrowRight') ni = (i + 1) % arr.length;
      if (e.key === 'ArrowLeft') ni = (i - 1 + arr.length) % arr.length;
      if (e.key === 'Home') ni = 0;
      if (e.key === 'End') ni = arr.length - 1;
      if (ni !== null) { e.preventDefault(); arr[ni].focus(); activateTab(arr[ni]); }
    });
  });
})();

/* ═══════════════════════════════════════════════════════════════
   6. SMOOTH ANCHOR SCROLL
   ═══════════════════════════════════════════════════════════════ */

(function initSmoothScroll() {
  const hh = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '72', 10
  );
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - hh - 8),
        behavior: prefersReducedMotion ? 'instant' : 'smooth'
      });
      history.pushState(null, '', `#${id}`);
    });
  });
})();

/* ═══════════════════════════════════════════════════════════════
   7. LAZY LOAD
   ═══════════════════════════════════════════════════════════════ */

(function initLazyLoad() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px 0px' });
  document.querySelectorAll('img[loading="lazy"]').forEach(img => obs.observe(img));
})();

/* ═══════════════════════════════════════════════════════════════
   8. ACTIVE NAV
   ═══════════════════════════════════════════════════════════════ */

(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-link, .mobile-nav-link');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        links.forEach(l => {
          l.style.color = l.getAttribute('href') === `#${id}` ? 'var(--white)' : '';
          l.style.opacity = l.getAttribute('href') === `#${id}` ? '1' : '';
        });
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
})();

/* ═══════════════════════════════════════════════════════════════
   9. CONTACT CARD HOVER
   ═══════════════════════════════════════════════════════════════ */

(function initContactCards() {
  const cards = document.querySelectorAll('.contact-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => cards.forEach(c => { if (c !== card) c.style.opacity = '0.6'; }));
    card.addEventListener('mouseleave', () => cards.forEach(c => { c.style.opacity = ''; }));
  });
})();
