import { supabase } from './supabase-client.js';
import {
  abbreviatedName,
  hasFirstAndLastName,
  normalizeFullName
} from './name-utils.js';

const form = document.getElementById('reviewForm');
const list = document.getElementById('reviewsList');
const ratingInput = document.getElementById('ratingInput');
const ratingField = document.getElementById('reviewRating');
const status = document.getElementById('reviewStatus');
const deleteModal = document.getElementById('reviewDeleteModal');
const deleteCancelButton = document.getElementById('reviewDeleteCancel');
const deleteConfirmButton = document.getElementById('reviewDeleteConfirm');

if (
  form && list && ratingInput && ratingField && status &&
  deleteModal && deleteCancelButton && deleteConfirmButton && supabase
) {
  const ratingButtons = Array.from(ratingInput.querySelectorAll('button'));
  const submitButton = form.querySelector('[type="submit"]');
  let currentUserId = null;
  let loadVersion = 0;
  let lastAuthUserId;
  let pendingDelete = null;
  let deleteInProgress = false;
  let lastFocusedElement = null;

  function setStatus(message = '', type = '') {
    status.textContent = message;
    status.dataset.type = type;
  }

  function logReviewError(operation, error) {
    console.error(`[RE:Hardware Reviews] ${operation} failed`, {
      message: error?.message || String(error),
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      status: error?.status
    });
  }

  function reviewErrorMessage(error) {
    if (error?.code === '23514') {
      return 'La reseña debe tener entre 10 y 320 caracteres y una puntuación de 1 a 5.';
    }
    if (error?.code === '42501') {
      return 'Supabase rechazó la operación por permisos. Volvé a iniciar sesión.';
    }
    return `Supabase: ${error?.message || 'No se pudo publicar la reseña.'}`;
  }

  function openLogin() {
    setStatus('Iniciá sesión para publicar una reseña.', 'error');
    document.getElementById('btnOpenAuth')?.click();
    document.querySelector('[data-tab="login"]')?.click();
  }

  async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logReviewError('getSession', error);
      throw error;
    }
    return session;
  }

  async function getAuthorName(session) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) logReviewError('load author profile', error);

    const fullName = normalizeFullName(
      profile?.full_name || session.user.user_metadata?.full_name || ''
    );

    if (!hasFirstAndLastName(fullName)) return '';
    return abbreviatedName(fullName);
  }

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

  function closeDeleteModal() {
    if (deleteInProgress) return;
    deleteModal.hidden = true;
    document.body.style.overflow = '';
    pendingDelete = null;
    lastFocusedElement?.focus();
    lastFocusedElement = null;
  }

  function openDeleteModal(review, card, button) {
    if (!currentUserId || review.user_id !== currentUserId) {
      setStatus('No tenés permiso para eliminar esta reseña.', 'error');
      return;
    }

    if (deleteInProgress) return;
    pendingDelete = { review, card, button };
    lastFocusedElement = button;
    deleteModal.hidden = false;
    document.body.style.overflow = 'hidden';
    deleteCancelButton.focus();
  }

  async function confirmDeleteReview() {
    if (deleteInProgress || !pendingDelete) return;
    const { review, card, button } = pendingDelete;
    if (!currentUserId || review.user_id !== currentUserId) {
      closeDeleteModal();
      setStatus('No tenés permiso para eliminar esta reseña.', 'error');
      return;
    }

    deleteInProgress = true;
    button.disabled = true;
    deleteCancelButton.disabled = true;
    deleteConfirmButton.disabled = true;
    deleteConfirmButton.textContent = 'Eliminando...';
    setStatus();
    try {
      const { data, error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', review.id)
        .eq('user_id', currentUserId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('La reseña no existe o no pertenece al usuario actual.');

      loadVersion += 1;
      card.remove();
      updateSummary();
      deleteModal.hidden = true;
      document.body.style.overflow = '';
      pendingDelete = null;
      lastFocusedElement = null;
      setStatus('Reseña eliminada correctamente.', 'success');
      console.info('[RE:Hardware Reviews] review deleted', {
        reviewId: review.id,
        userId: currentUserId
      });
    } catch (error) {
      logReviewError('delete review', error);
      setStatus(reviewErrorMessage(error), 'error');
      button.disabled = false;
    } finally {
      deleteInProgress = false;
      deleteCancelButton.disabled = false;
      deleteConfirmButton.disabled = false;
      deleteConfirmButton.textContent = 'Eliminar reseña';
    }
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
    const actions = document.createElement('div');
    actions.className = 'review-card__actions';
    actions.appendChild(badge);

    if (currentUserId && review.user_id === currentUserId) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'review-card__delete';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Eliminar';
      deleteButton.setAttribute('aria-label', 'Eliminar mi reseña');
      deleteButton.addEventListener('click', () => openDeleteModal(review, card, deleteButton));
      actions.appendChild(deleteButton);
    }

    top.append(author, actions);

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

  async function loadReviews(sessionOverride) {
    const requestVersion = ++loadVersion;
    const session = sessionOverride === undefined ? await getSession() : sessionOverride;
    const nextUserId = session?.user?.id || null;
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, author_name, service, rating, content, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      logReviewError('load reviews', error);
      return;
    }

    if (requestVersion !== loadVersion) return;

    currentUserId = nextUserId;
    const cards = document.createDocumentFragment();
    data.forEach(review => cards.appendChild(createReviewCard(review)));
    list.querySelectorAll('[data-database-review="true"]').forEach(card => card.remove());
    list.prepend(cards);
    updateSummary();
  }

  submitButton.addEventListener('click', async event => {
    event.preventDefault();
    try {
      if (!await getSession()) {
        openLogin();
        return;
      }
      form.requestSubmit();
    } catch (error) {
      setStatus(reviewErrorMessage(error), 'error');
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus();

    if (!ratingField.value) {
      setStatus('Seleccioná una puntuación para continuar.', 'error');
      ratingInput.focus();
      return;
    }

    submitButton.disabled = true;
    try {
      const session = await getSession();
      if (!session) {
        openLogin();
        return;
      }

      const formData = new FormData(form);
      const authorName = await getAuthorName(session);
      if (!authorName) {
        setStatus(
          'Completá tu nombre y apellido en Mi cuenta antes de publicar una reseña.',
          'error'
        );
        return;
      }
      const payload = {
        user_id: session.user.id,
        author_name: authorName,
        service: formData.get('service'),
        rating: Number(ratingField.value),
        content: formData.get('review').trim()
      };

      console.info('[RE:Hardware Reviews] publishing review', {
        userId: session.user.id,
        service: payload.service,
        rating: payload.rating,
        contentLength: payload.content.length
      });

      const { data: review, error } = await supabase
        .from('reviews')
        .insert(payload)
        .select('id, user_id, author_name, service, rating, content, created_at')
        .single();

      if (error) throw error;

      loadVersion += 1;
      list.prepend(createReviewCard(review));
      updateSummary();
      form.reset();
      ratingField.value = '';
      paintRating(0);
      setStatus('¡Gracias! Tu reseña fue publicada.', 'success');
      console.info('[RE:Hardware Reviews] review published', {
        reviewId: review.id,
        userId: session.user.id
      });
    } catch (error) {
      logReviewError('publish review', error);
      setStatus(reviewErrorMessage(error), 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  deleteCancelButton.addEventListener('click', closeDeleteModal);
  deleteConfirmButton.addEventListener('click', confirmDeleteReview);
  deleteModal.querySelector('[data-review-delete-cancel]')
    .addEventListener('click', closeDeleteModal);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !deleteModal.hidden) closeDeleteModal();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const nextUserId = session?.user?.id || null;
    if (nextUserId === lastAuthUserId) return;
    lastAuthUserId = nextUserId;
    setTimeout(() => {
      loadReviews(session).catch(error => logReviewError('refresh reviews after auth change', error));
    }, 0);
  });

  loadReviews();
}
