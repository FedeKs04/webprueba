import { supabase } from './supabase-client.js';

const form = document.getElementById('reviewForm');
const list = document.getElementById('reviewsList');
const ratingInput = document.getElementById('ratingInput');
const ratingField = document.getElementById('reviewRating');
const status = document.getElementById('reviewStatus');

if (form && list && ratingInput && supabase) {
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

  function formatDate(value) {
    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value)).replace('.', '').toUpperCase();
  }

  function createReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card visible';
    card.dataset.rating = review.rating;
    card.dataset.databaseReview = 'true';

    const top = document.createElement('div');
    top.className = 'review-card__top';
    const author = document.createElement('div');
    author.className = 'review-author';
    const avatar = document.createElement('span');
    avatar.className = 'review-author__avatar';
    avatar.textContent = initials(review.author_name);
    const authorInfo = document.createElement('div');
    const authorName = document.createElement('h3');
    authorName.textContent = review.author_name;
    const service = document.createElement('span');
    service.textContent = review.service;
    authorInfo.append(authorName, service);
    author.append(avatar, authorInfo);
    const badge = document.createElement('span');
    badge.className = 'review-card__verified';
    badge.textContent = 'CLIENTE REGISTRADO';
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
    text.textContent = `\u201c${review.content}\u201d`;
    const time = document.createElement('time');
    time.dateTime = review.created_at;
    time.textContent = formatDate(review.created_at);
    card.append(top, stars, text, time);
    return card;
  }

  function updateSummary() {
    const ratings = Array.from(list.querySelectorAll('.review-card'))
      .map(card => Number(card.dataset.rating));
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    document.getElementById('reviewsAverage').textContent = average.toFixed(1);
    document.getElementById('reviewsTotal').textContent =
      `Basado en ${ratings.length} ${ratings.length === 1 ? 'reseña' : 'reseñas'}`;
    document.getElementById('reviewsAverageStars').setAttribute(
      'aria-label',
      `Puntuación promedio: ${average.toFixed(1)} de 5`
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

  async function loadReviews() {
    list.querySelectorAll('[data-database-review="true"]').forEach(card => card.remove());
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_name, service, rating, content, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12);

    if (!error) {
      [...data].reverse().forEach(review => list.prepend(createReviewCard(review)));
    }
    updateSummary();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.textContent = '';
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      status.textContent = 'Iniciá sesión para publicar una reseña.';
      document.getElementById('btnOpenAuth')?.click();
      document.querySelector('[data-tab="login"]')?.click();
      return;
    }
    if (!ratingField.value) {
      status.textContent = 'Seleccioná una puntuación para continuar.';
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    const formData = new FormData(form);
    const { error } = await supabase.from('reviews').insert({
      user_id: session.user.id,
      author_name: formData.get('name').trim(),
      service: formData.get('service'),
      rating: Number(ratingField.value),
      content: formData.get('review').trim(),
      status: 'published'
    });
    submitButton.disabled = false;

    if (error) {
      status.textContent = 'No se pudo publicar la reseña. Intentá nuevamente.';
      return;
    }

    form.reset();
    ratingField.value = '';
    paintRating(0);
    status.textContent = '¡Gracias! Tu reseña fue publicada.';
    loadReviews();
  });

  loadReviews();
}
