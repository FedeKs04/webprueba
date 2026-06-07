
/* ════════════════════════════════════════════════════════════
   HEADER sticky
════════════════════════════════════════════════════════════ */
const header = document.getElementById('header');
const fabTop  = document.getElementById('fabTop');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
  fabTop.classList.toggle('show',    window.scrollY > 400);
});

fabTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

/* ── BURGER ──────────────────────────────────────────────── */
const burger = document.getElementById('burger');
const nav    = document.getElementById('nav');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  nav.classList.toggle('open');
});
nav.querySelectorAll('.nav__item').forEach(l => l.addEventListener('click', () => {
  burger.classList.remove('open');
  nav.classList.remove('open');
}));

/* ════════════════════════════════════════════════════════════
   THEME TOGGLE
   Persiste en localStorage, aplica al <html data-theme>
════════════════════════════════════════════════════════════ */
const themeToggle = document.getElementById('themeToggle');
const html        = document.documentElement;

// Restore saved preference
const savedTheme = localStorage.getItem('rehw-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('rehw-theme', next);
});

/* ════════════════════════════════════════════════════════════
   AUTH MODAL
════════════════════════════════════════════════════════════ */
const modalOverlay = document.getElementById('modalOverlay');
const btnOpenAuth  = document.getElementById('btnOpenAuth');
const modalClose   = document.getElementById('modalClose');

function openModal()  { modalOverlay.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal() { modalOverlay.classList.remove('open'); document.body.style.overflow=''; }

btnOpenAuth.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-field').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

/* ════════════════════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ════════════════════════════════════════════════════════════
   SMOOTH SCROLL
════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 74, behavior:'smooth' });
  });
});

/* ════════════════════════════════════════════════════════════
   STATS COUNTER ANIMATION
════════════════════════════════════════════════════════════ */
function animCount(el, target, prefix='', suffix='', duration=1600) {
  const start = performance.now();
  const step  = ts => {
    const p   = Math.min((ts - start) / duration, 1);
    const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = prefix + val.toLocaleString('es-UY') + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let statsAnimated = false;
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    document.querySelectorAll('.stat-item__num').forEach(el => {
      animCount(el,
        +el.dataset.target,
        el.dataset.prefix  || '',
        el.dataset.suffix  || ''
      );
    });
  }
}, { threshold: 0.4 }).observe(document.getElementById('stats'));

/* ════════════════════════════════════════════════════════════
   CAROUSEL
════════════════════════════════════════════════════════════ */
(function() {
  const track    = document.getElementById('carouselTrack');
  const slides   = Array.from(track.querySelectorAll('.carousel__slide'));
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn  = document.getElementById('carouselPrev');
  const nextBtn  = document.getElementById('carouselNext');

  let current = 0;
  let autoTimer;

  // Determine how many slides fit at once
  function visibleCount() {
    const w = track.parentElement.offsetWidth;
    if (w < 600)  return 1;
    if (w < 960)  return 2;
    return 3;
  }

  function maxIndex() {
    return slides.length - visibleCount();
  }

  // Build dots
  function buildDots() {
    dotsWrap.innerHTML = '';
    const count = maxIndex() + 1;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'carousel__dot' + (i === current ? ' active' : '');
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
    }
  }

  function updateDots() {
    dotsWrap.querySelectorAll('.carousel__dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, maxIndex()));
    // Calculate slide width including gap
    const slideEl = slides[0];
    const gap     = 20;
    const slideW  = slideEl.offsetWidth + gap;
    track.style.transform = `translateX(-${current * slideW}px)`;
    updateDots();
  }

  prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      goTo(current < maxIndex() ? current + 1 : 0);
    }, 4500);
  }

  // Touch / swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? goTo(current+1) : goTo(current-1); resetAuto(); }
  });

  // Init & resize
  function init() {
    buildDots();
    goTo(0);
    resetAuto();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildDots(); goTo(Math.min(current, maxIndex())); }, 150);
  });

  init();
})();
