
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

/* REVIEWS */
(function() {
  if (window.REVIEWS_USE_SUPABASE) return;
  const form = document.getElementById('reviewForm');
  const list = document.getElementById('reviewsList');
  const ratingInput = document.getElementById('ratingInput');
  const ratingField = document.getElementById('reviewRating');
  const status = document.getElementById('reviewStatus');
  const storageKey = 'rehw-reviews';
  if (!form || !list || !ratingInput) return;

  const ratingButtons = Array.from(ratingInput.querySelectorAll('button'));

  function paintRating(value) {
    ratingButtons.forEach(button => {
      button.classList.toggle('active', Number(button.dataset.rating) <= value);
    });
  }

  ratingButtons.forEach(button => {
    button.addEventListener('mouseenter', () => paintRating(Number(button.dataset.rating)));
    button.addEventListener('click', () => {
      ratingField.value = button.dataset.rating;
      paintRating(Number(ratingField.value));
    });
  });
  ratingInput.addEventListener('mouseleave', () => paintRating(Number(ratingField.value || 0)));

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(date).replace('.', '').toUpperCase();
  }

  function createReviewCard(review, saved) {
    const card = document.createElement('article');
    card.className = 'review-card visible';
    card.dataset.rating = review.rating;

    const top = document.createElement('div');
    top.className = 'review-card__top';
    const author = document.createElement('div');
    author.className = 'review-author';
    const avatar = document.createElement('span');
    avatar.className = 'review-author__avatar';
    avatar.textContent = initials(review.name);
    const authorInfo = document.createElement('div');
    const authorName = document.createElement('h3');
    authorName.textContent = review.name;
    const service = document.createElement('span');
    service.textContent = review.service;
    authorInfo.append(authorName, service);
    author.append(avatar, authorInfo);

    const badge = document.createElement('span');
    badge.className = 'review-card__verified';
    badge.textContent = saved ? 'GUARDADA EN ESTE EQUIPO' : 'RESE\u00d1A DE EJEMPLO';
    top.append(author, badge);

    const stars = document.createElement('div');
    stars.className = 'stars';
    stars.setAttribute('aria-label', `${review.rating} de 5 estrellas`);
    stars.textContent = '\u2605'.repeat(review.rating);
    if (review.rating < 5) {
      const empty = document.createElement('span');
      empty.textContent = '\u2605'.repeat(5 - review.rating);
      stars.appendChild(empty);
    }

    const text = document.createElement('p');
    text.textContent = `\u201c${review.text}\u201d`;
    const time = document.createElement('time');
    time.dateTime = review.date;
    time.textContent = formatDate(new Date(review.date));
    card.append(top, stars, text, time);
    return card;
  }

  function storedReviews() {
    try {
      const reviews = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(reviews) ? reviews : [];
    } catch {
      return [];
    }
  }

  function updateSummary() {
    const ratings = Array.from(list.querySelectorAll('.review-card')).map(card => Number(card.dataset.rating));
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    document.getElementById('reviewsAverage').textContent = average.toFixed(1);
    document.getElementById('reviewsTotal').textContent =
      `Basado en ${ratings.length} ${ratings.length === 1 ? 'rese\u00f1a' : 'rese\u00f1as'}`;
    document.getElementById('reviewsAverageStars').setAttribute(
      'aria-label', `Puntuaci\u00f3n promedio: ${average.toFixed(1)} de 5`
    );

    const bars = document.getElementById('ratingBars');
    bars.innerHTML = '';
    for (let score = 5; score >= 1; score--) {
      const count = ratings.filter(rating => rating === score).length;
      const percentage = ratings.length ? (count / ratings.length) * 100 : 0;
      const row = document.createElement('div');
      row.className = 'rating-bar';
      row.innerHTML = `<span>${score} \u2605</span><span class="rating-bar__track"><span class="rating-bar__fill" style="width:${percentage}%"></span></span><span>${count}</span>`;
      bars.appendChild(row);
    }
  }

  storedReviews().reverse().forEach(review => list.prepend(createReviewCard(review, true)));
  updateSummary();

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!ratingField.value) {
      status.textContent = 'Seleccion\u00e1 una puntuaci\u00f3n para continuar.';
      ratingInput.focus();
      return;
    }

    const review = {
      name: form.elements.name.value.trim(),
      service: form.elements.service.value,
      rating: Number(ratingField.value),
      text: form.elements.review.value.trim(),
      date: new Date().toISOString()
    };
    const reviews = storedReviews();
    reviews.push(review);
    localStorage.setItem(storageKey, JSON.stringify(reviews));
    list.prepend(createReviewCard(review, true));
    updateSummary();
    form.reset();
    ratingField.value = '';
    paintRating(0);
    status.textContent = '\u00a1Gracias! Tu rese\u00f1a fue publicada.';
  });
})();
