import { supabase } from './supabase-client.js';
import { hasFirstAndLastName, normalizeFullName } from './name-utils.js';

const profileForm = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const repairForm = document.getElementById('repairRequestForm');
const repairStatus = document.getElementById('repairRequestStatus');
const repairList = document.getElementById('repairList');

const statusLabels = {
  received: 'Recibido',
  diagnosis: 'En diagnóstico',
  quoted: 'Presupuestado',
  repairing: 'En reparación',
  ready: 'Listo para retirar',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

function setStatus(element, message = '', type = '') {
  element.textContent = message;
  element.className = `auth-status${type ? ` auth-status--${type}` : ''}`;
}

function setLoading(form, loading) {
  const button = form.querySelector('[type="submit"]');
  button.disabled = loading;
  button.dataset.label ||= button.textContent;
  button.textContent = loading ? 'Procesando...' : button.dataset.label;
}

function logAccountError(operation, error) {
  console.error(`[RE:Hardware Account] ${operation} failed`, {
    message: error?.message || String(error),
    code: error?.code,
    details: error?.details,
    hint: error?.hint
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function renderRepairs(repairs) {
  repairList.innerHTML = '';
  if (!repairs.length) {
    repairList.innerHTML = '<p class="repair-list__empty">Todavía no tenés solicitudes registradas.</p>';
    return;
  }

  repairs.forEach(repair => {
    const article = document.createElement('article');
    article.className = 'repair-item';

    const heading = document.createElement('div');
    heading.className = 'repair-item__heading';
    const title = document.createElement('h3');
    title.textContent = `${repair.equipment_type} · ${repair.brand_model}`;
    const badge = document.createElement('span');
    badge.className = `repair-status repair-status--${repair.status}`;
    badge.textContent = statusLabels[repair.status] || repair.status;
    heading.append(title, badge);

    const description = document.createElement('p');
    description.textContent = repair.problem_description;
    const date = document.createElement('time');
    date.dateTime = repair.created_at;
    date.textContent = formatDate(repair.created_at);
    article.append(heading, description, date);
    repairList.appendChild(article);
  });
}

async function loadAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const [profileResult, repairsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone, role')
      .eq('id', session.user.id)
      .single(),
    supabase
      .from('repair_requests')
      .select('id, equipment_type, brand_model, problem_description, status, created_at')
      .order('created_at', { ascending: false })
  ]);

  if (profileResult.error) {
    logAccountError('load profile', profileResult.error);
    setStatus(profileStatus, `Supabase: ${profileResult.error.message}`, 'error');
  } else {
    profileForm.elements.full_name.value = profileResult.data.full_name || '';
    profileForm.elements.phone.value = profileResult.data.phone || '';
    document.getElementById('accountName').textContent = profileResult.data.full_name || 'Sin nombre';
  }

  if (repairsResult.error) {
    logAccountError('load repair requests', repairsResult.error);
    repairList.innerHTML = `<p class="auth-status auth-status--error">Supabase: ${repairsResult.error.message}</p>`;
  } else {
    renderRepairs(repairsResult.data);
  }
}

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  setLoading(profileForm, true);
  setStatus(profileStatus);
  const formData = new FormData(profileForm);
  const fullName = normalizeFullName(formData.get('full_name'));

  if (!hasFirstAndLastName(fullName)) {
    setStatus(profileStatus, 'Ingresá nombre y apellido, por ejemplo: Federico Vidal.', 'error');
    profileForm.elements.full_name.focus();
    setLoading(profileForm, false);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const [profileResult, authResult] = await Promise.all([
    supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: formData.get('phone').trim() || null
      })
      .eq('id', user.id),
    supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        full_name: fullName
      }
    })
  ]);
  setLoading(profileForm, false);

  const error = profileResult.error || authResult.error;
  if (error) {
    logAccountError('update profile', error);
    setStatus(profileStatus, `Supabase: ${error.message}`, 'error');
    return;
  }
  document.getElementById('accountName').textContent = fullName;
  setStatus(profileStatus, 'Perfil actualizado.', 'success');
});

repairForm.addEventListener('submit', async event => {
  event.preventDefault();
  setLoading(repairForm, true);
  setStatus(repairStatus);
  const formData = new FormData(repairForm);
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('repair_requests').insert({
    user_id: user.id,
    equipment_type: formData.get('equipment_type'),
    brand_model: formData.get('brand_model').trim(),
    problem_description: formData.get('problem_description').trim()
  });
  setLoading(repairForm, false);

  if (error) {
    logAccountError('create repair request', error);
    setStatus(repairStatus, `Supabase: ${error.message}`, 'error');
    return;
  }
  repairForm.reset();
  setStatus(repairStatus, 'Solicitud creada correctamente.', 'success');
  loadAccount();
});

loadAccount();
