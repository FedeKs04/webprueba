/* ============================================
   NEXATECH — script.js
   Funcionalidades: nav, scroll, filtros,
   búsqueda, estrellas, contadores, formulario
============================================ */

/* ===== 1. NAV STICKY + TOGGLE MOBILE ===== */
const header     = document.getElementById('header');
const navToggle  = document.getElementById('navToggle');
const navLinks   = document.getElementById('navLinks');

// Clase "scrolled" para cambiar apariencia del header
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
});

// Abrir/cerrar menú mobile
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
});

// Cerrar menú al hacer click en un enlace
navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
    });
});


/* ===== 2. SCROLL REVEAL ===== */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            // Efecto cascada con delay escalonado
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, 80 * (entry.target.dataset.delay || 0));
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

// Asignar delay escalonado a elementos dentro de grids
document.querySelectorAll('.productos__grid .producto-card').forEach((el, i) => {
    el.dataset.delay = i;
});
document.querySelectorAll('.servicios__grid .servicio-card').forEach((el, i) => {
    el.dataset.delay = i;
});
document.querySelectorAll('.reseñas__grid .reseña-card').forEach((el, i) => {
    el.dataset.delay = i;
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ===== 3. SISTEMA DE ESTRELLAS ===== */
/**
 * Convierte un número decimal (ej: 4.5) en estrellas visuales
 * usando caracteres ★ (llena) y ☆ (vacía)
 */
function renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// Renderizar estrellas en todas las tarjetas de producto
document.querySelectorAll('.producto-card__stars').forEach(el => {
    const rating = parseFloat(el.dataset.rating);
    const display = el.querySelector('.stars-display');
    if (display) {
        display.textContent = '★'.repeat(Math.floor(rating)) +
                              (rating % 1 >= 0.5 ? '½' : '') +
                              '☆'.repeat(5 - Math.ceil(rating));
    }
});


/* ===== 4. FILTRADO POR CATEGORÍA ===== */
const filtros        = document.querySelectorAll('.filtro-btn');
const productCards   = document.querySelectorAll('.producto-card');
const productosEmpty = document.getElementById('productosEmpty');
const searchInput    = document.getElementById('searchInput');

let currentFilter = 'todos';
let currentSearch = '';

// Actualizar visibilidad de las tarjetas según filtro y búsqueda
function updateProductos() {
    let visibles = 0;

    productCards.forEach(card => {
        const categoria   = card.dataset.categoria;
        const nombre      = card.querySelector('.producto-card__name').textContent.toLowerCase();
        const descripcion = card.querySelector('.producto-card__desc').textContent.toLowerCase();
        const cat         = card.querySelector('.producto-card__cat').textContent.toLowerCase();

        const matchFiltro = currentFilter === 'todos' || categoria === currentFilter;
        const matchSearch = currentSearch === '' ||
                            nombre.includes(currentSearch) ||
                            descripcion.includes(currentSearch) ||
                            cat.includes(currentSearch);

        if (matchFiltro && matchSearch) {
            card.style.display = '';
            visibles++;
        } else {
            card.style.display = 'none';
        }
    });

    // Mostrar mensaje de "sin resultados"
    productosEmpty.classList.toggle('visible', visibles === 0);
}

// Click en botones de filtro
filtros.forEach(btn => {
    btn.addEventListener('click', () => {
        filtros.forEach(b => b.classList.remove('filtro-btn--active'));
        btn.classList.add('filtro-btn--active');
        currentFilter = btn.dataset.filtro;
        updateProductos();
    });
});

// Búsqueda dinámica (con debounce)
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.toLowerCase().trim();
        updateProductos();
    }, 250);
});


/* ===== 5. CONTADORES ANIMADOS (sección Nosotros) ===== */
function animateCounter(el, target, duration = 1800) {
    const start     = performance.now();
    const startVal  = 0;

    function step(timestamp) {
        const progress  = Math.min((timestamp - start) / duration, 1);
        // Easing out cubic
        const eased     = 1 - Math.pow(1 - progress, 3);
        const current   = Math.round(startVal + (target - startVal) * eased);

        // Formatear con separador de miles
        el.textContent  = target >= 1000
            ? current.toLocaleString('es-ES') + '+'
            : current + (target < 100 ? '' : '+');

        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target >= 1000
            ? target.toLocaleString('es-ES') + '+'
            : target + (target < 100 ? ' años' : '+');
    }

    requestAnimationFrame(step);
}

// Activar contadores y barras cuando la sección entra en vista
const statCards = document.querySelectorAll('.stat-card');

const statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        statCards.forEach(card => {
            const numEl  = card.querySelector('.stat-card__num');
            const fill   = card.querySelector('.stat-card__fill');
            const target = parseInt(numEl.dataset.target, 10);

            animateCounter(numEl, target);
            if (fill) fill.classList.add('animated');
        });
        statsObserver.disconnect();
    }
}, { threshold: 0.3 });

if (statCards.length > 0) {
    statsObserver.observe(statCards[0].closest('section') || statCards[0]);
}


/* ===== 6. FORMULARIO DE CONTACTO ===== */
const contactoForm = document.getElementById('contactoForm');
const formSuccess  = document.getElementById('formSuccess');

if (contactoForm) {
    contactoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simular envío (aquí conectarías con tu backend o servicio de email)
        const submitBtn = contactoForm.querySelector('[type="submit"]');
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled    = true;

        setTimeout(() => {
            formSuccess.classList.add('visible');
            contactoForm.reset();
            submitBtn.textContent = 'Enviar mensaje';
            submitBtn.disabled    = false;

            // Ocultar mensaje de éxito después de 5s
            setTimeout(() => formSuccess.classList.remove('visible'), 5000);
        }, 1200);
    });
}


/* ===== 7. SMOOTH SCROLL para enlaces internos ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = 80; // altura del header fijo
        window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - offset,
            behavior: 'smooth'
        });
    });
});


/* ===== 8. HIGHLIGHT de enlace activo en nav ===== */
const sections = document.querySelectorAll('section[id]');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            document.querySelectorAll('.nav__link').forEach(link => {
                link.classList.remove('nav__link--active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('nav__link--active');
                }
            });
        }
    });
}, { rootMargin: '-50% 0px -50% 0px' });

/* ===== 9. BOTÓN VOLVER ARRIBA ===== */
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
});

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
