/* ============================================================
   NEXATECH v2 — script.js
============================================================ */

/* ── 1. HEADER sticky + burger ────────────────────────────── */
const header = document.getElementById('header');
const burger  = document.getElementById('burger');
const nav     = document.getElementById('nav');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
  fabTop.classList.toggle('show', window.scrollY > 400);
});

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  nav.classList.toggle('open');
});

nav.querySelectorAll('.nav__item').forEach(link => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    nav.classList.remove('open');
  });
});

/* ── 2. SCROLL REVEAL ─────────────────────────────────────── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── 3. SMOOTH SCROLL ─────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});

/* ── 4. NAV ACTIVE on scroll ──────────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav__item');
new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navItems.forEach(n => n.classList.remove('active'));
      const active = document.querySelector(`.nav__item[href="#${e.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' }).forEach ? null : null;
sections.forEach(s => new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navItems.forEach(n => n.classList.remove('active'));
      const m = document.querySelector(`.nav__item[href="#${e.target.id}"]`);
      if (m) m.classList.add('active');
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' }).observe(s));

/* ── 5. ESTADÍSTICAS ANIMADAS ─────────────────────────────── */
function animCount(el, target, suffix, duration = 1800) {
  const start = performance.now();
  const step = ts => {
    const p   = Math.min((ts - start) / duration, 1);
    const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = val.toLocaleString('es-UY') + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const statsSection = document.getElementById('stats');
let statsAnimated  = false;
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    document.querySelectorAll('.stat-item__num').forEach(el => {
      animCount(el, +el.dataset.target, el.dataset.suffix);
    });
  }
}, { threshold: 0.4 }).observe(statsSection);

/* ── 6. RBAR ANIMATION ────────────────────────────────────── */
const overviewObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    document.querySelectorAll('.rbar__fill').forEach(f => f.classList.add('anim'));
    overviewObs.disconnect();
  }
}, { threshold: 0.3 });
const overview = document.querySelector('.reseñas__overview');
if (overview) overviewObs.observe(overview);

/* ── 7. BÚSQUEDA + FILTROS ────────────────────────────────── */
const searchInput  = document.getElementById('searchInput');
const filtros      = document.querySelectorAll('.filtro');
const cards        = document.querySelectorAll('.prod-card');
const emptyMsg     = document.getElementById('catalogoEmpty');

let currentCat    = 'todos';
let currentSearch = '';

function filterProducts() {
  let count = 0;
  cards.forEach(card => {
    const cat   = card.dataset.cat;
    const name  = card.dataset.nombre.toLowerCase();
    const desc  = card.dataset.desc.toLowerCase();
    const okCat = currentCat === 'todos' || cat === currentCat;
    const okSrch = !currentSearch || name.includes(currentSearch) || desc.includes(currentSearch);
    const show   = okCat && okSrch;
    card.style.display = show ? '' : 'none';
    if (show) count++;
  });
  emptyMsg.classList.toggle('show', count === 0);
}

filtros.forEach(btn => {
  btn.addEventListener('click', () => {
    filtros.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    filterProducts();
  });
});

let searchTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value.toLowerCase().trim();
    filterProducts();
  }, 220);
});

/* ── 8. COMPARADOR ────────────────────────────────────────── */
const PRODUCTS = {
  1: { nombre:'Notebook ProMax X15',   precio:'$1.299',   cat:'Hardware', rating:'★★★★★', desc:'Intel i9 · 32GB RAM · SSD 1TB · Pantalla 144Hz IPS · Batería 10h' },
  2: { nombre:'Suite ERP NexaCloud',   precio:'$89/mes',  cat:'Software', rating:'★★★★½', desc:'CRM · Facturación · RRHH · Inventario · API REST incluida' },
  3: { nombre:'Monitor UltraWide 34"', precio:'$749',     cat:'Hardware', rating:'★★★★★', desc:'34" QHD 3440x1440 · 144Hz · USB-C 90W · HDR400 · Altura ajustable' },
  4: { nombre:'ShieldPro Antivirus',   precio:'$49/año',  cat:'Seguridad',rating:'★★★★☆', desc:'IA antimalware · VPN incluida · 5 dispositivos · Actualizaciones auto' },
  5: { nombre:'Teclado Mecánico K7',   precio:'$179',     cat:'Accesorios',rating:'★★★★½', desc:'Cherry MX Red · TKL · RGB por zona · Cuerpo aluminio · Bluetooth 5.0' },
  6: { nombre:'Router WiFi 6E Mesh',   precio:'$329',     cat:'Redes',    rating:'★★★★★', desc:'Tribanda WiFi 6E · Cobertura 500m² · VPN · App móvil · Firewall' },
};

let selected = [];
const comparadorBar = document.getElementById('comparadorBar');
const comparadorSels = document.getElementById('comparadorSels');
const modalOverlay   = document.getElementById('modalOverlay');
const modalTable     = document.getElementById('modalTable');

document.querySelectorAll('.btn--compare').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = +btn.dataset.id;
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
    } else if (selected.length < 2) {
      selected.push(id);
    } else {
      selected.shift();
      selected.push(id);
    }
    updateComparador();
  });
});

function updateComparador() {
  comparadorSels.innerHTML = selected.map(id =>
    `<span class="comp-sel-tag">${PRODUCTS[id].nombre}</span>`
  ).join('');
  comparadorBar.classList.toggle('show', selected.length > 0);
}

document.getElementById('btnComparar').addEventListener('click', () => {
  if (selected.length < 2) return;
  const [a, b] = selected.map(id => PRODUCTS[id]);
  const row = (label, va, vb) =>
    `<div class="modal__row"><span>${label}</span></div>
     <div style="display:flex;gap:16px;margin-bottom:10px">
       <span style="flex:1;color:#fff;font-size:.9rem;font-weight:600">${va}</span>
       <span style="flex:1;color:#fff;font-size:.9rem;font-weight:600">${vb}</span>
     </div>`;

  modalTable.innerHTML = `
    <div class="modal__col">
      <h3>${a.nombre}</h3>
      <div class="modal__row"><span>Precio</span><span>${a.precio}</span></div>
      <div class="modal__row"><span>Categoría</span><span>${a.cat}</span></div>
      <div class="modal__row"><span>Calificación</span><span>${a.rating}</span></div>
      <div class="modal__row"><span>Características</span></div>
      <p style="font-size:.85rem;color:rgba(255,255,255,.5);line-height:1.6">${a.desc}</p>
    </div>
    <div class="modal__col">
      <h3>${b.nombre}</h3>
      <div class="modal__row"><span>Precio</span><span>${b.precio}</span></div>
      <div class="modal__row"><span>Categoría</span><span>${b.cat}</span></div>
      <div class="modal__row"><span>Calificación</span><span>${b.rating}</span></div>
      <div class="modal__row"><span>Características</span></div>
      <p style="font-size:.85rem;color:rgba(255,255,255,.5);line-height:1.6">${b.desc}</p>
    </div>
  `;
  modalOverlay.classList.add('show');
});

document.getElementById('modalClose').addEventListener('click', () => modalOverlay.classList.remove('show'));
document.getElementById('btnClearComp').addEventListener('click', () => { selected = []; updateComparador(); });
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('show'); });

/* ── 9. ASESOR INTELIGENTE ────────────────────────────────── */
const RECOMENDACIONES = {
  gaming:  [
    { cat:'Hardware', nombre:'Notebook ProMax X15', precio:'$1.299' },
    { cat:'Accesorios', nombre:'Teclado Mecánico K7 Pro', precio:'$179' },
    { cat:'Hardware', nombre:'Monitor UltraWide 34"', precio:'$749' },
  ],
  oficina: [
    { cat:'Software', nombre:'Suite ERP NexaCloud', precio:'$89/mes' },
    { cat:'Accesorios', nombre:'Teclado Mecánico K7 Pro', precio:'$179' },
    { cat:'Redes', nombre:'Router WiFi 6E Mesh', precio:'$329' },
  ],
  empresa: [
    { cat:'Software', nombre:'Suite ERP NexaCloud', precio:'$89/mes' },
    { cat:'Seguridad', nombre:'ShieldPro Antivirus', precio:'$49/año' },
    { cat:'Redes', nombre:'Router WiFi 6E Mesh', precio:'$329' },
  ],
  diseño:  [
    { cat:'Hardware', nombre:'Monitor UltraWide 34"', precio:'$749' },
    { cat:'Hardware', nombre:'Notebook ProMax X15', precio:'$1.299' },
    { cat:'Accesorios', nombre:'Teclado Mecánico K7 Pro', precio:'$179' },
  ],
};

const asesorResult = document.getElementById('asesorResultado');
document.querySelectorAll('.asesor__opcion').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.asesor__opcion').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const uso  = btn.dataset.uso;
    const recs = RECOMENDACIONES[uso];
    asesorResult.innerHTML = `
      <div class="asesor__recs">
        ${recs.map(r => `
          <div class="asesor__rec">
            <div class="asesor__rec-cat">${r.cat}</div>
            <div class="asesor__rec-name">${r.nombre}</div>
            <div class="asesor__rec-price">${r.precio}</div>
          </div>
        `).join('')}
      </div>
    `;
  });
});

/* ── 10. CARRUSEL DE SERVICIOS ────────────────────────────── */
(function initCarousel() {
  const track      = document.getElementById('carouselTrack');
  const dotsWrap   = document.getElementById('carouselDots');
  const btnPrev    = document.getElementById('carouselPrev');
  const btnNext    = document.getElementById('carouselNext');

  if (!track) return;

  const slides     = Array.from(track.children);
  const total      = slides.length;
  let current      = 0;

  // Determine slides per view based on viewport
  function slidesPerView() {
    if (window.innerWidth < 768)  return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  // Build dots
  function buildDots() {
    dotsWrap.innerHTML = '';
    const pages = total - slidesPerView() + 1;
    for (let i = 0; i < Math.max(pages, 1); i++) {
      const d = document.createElement('button');
      d.className = 'carousel__dot' + (i === current ? ' active' : '');
      d.setAttribute('aria-label', `Slide ${i + 1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
    }
  }

  function maxIndex() {
    return Math.max(total - slidesPerView(), 0);
  }

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, maxIndex()));
    const spv        = slidesPerView();
    // Calculate slide width (including gap)
    const slideWidth = slides[0].offsetWidth + 24; // 24px gap
    track.style.transform = `translateX(-${current * slideWidth}px)`;

    // Update dots
    dotsWrap.querySelectorAll('.carousel__dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });

    btnPrev.style.opacity = current === 0 ? '.35' : '1';
    btnNext.style.opacity = current >= maxIndex() ? '.35' : '1';
  }

  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  // Touch / swipe
  let startX = 0;
  track.parentElement.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.parentElement.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goTo(current + 1) : goTo(current - 1);
  });

  // Keyboard arrows when focused inside
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  // Auto-play
  let autoTimer = setInterval(() => goTo(current + 1 > maxIndex() ? 0 : current + 1), 4200);
  track.parentElement.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.parentElement.addEventListener('mouseleave', () => {
    autoTimer = setInterval(() => goTo(current + 1 > maxIndex() ? 0 : current + 1), 4200);
  });

  // Re-init on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildDots();
      goTo(0);
    }, 200);
  });

  buildDots();
  goTo(0);
})();

/* ── 11. FORMULARIO ───────────────────────────────────────── */
document.getElementById('contactoForm').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.textContent = 'Enviando...';
  btn.disabled = true;
  setTimeout(() => {
    document.getElementById('formOk').classList.add('show');
    e.target.reset();
    btn.textContent = 'Enviar mensaje';
    btn.disabled = false;
    setTimeout(() => document.getElementById('formOk').classList.remove('show'), 5000);
  }, 1200);
});

/* ── 12. FAB TOP ──────────────────────────────────────────── */
const fabTop = document.getElementById('fabTop');
fabTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
