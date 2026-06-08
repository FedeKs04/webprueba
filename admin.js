import { supabase } from './supabase-client.js';

const repairList = document.getElementById('adminRepairList');
const pageStatus = document.getElementById('adminStatus');
const statusFilter = document.getElementById('adminStatusFilter');
const dateFilter = document.getElementById('adminDateFilter');
const userFilter = document.getElementById('adminUserFilter');
const clearFilters = document.getElementById('adminClearFilters');

const statusLabels = {
  received: 'Recibido',
  diagnosis: 'En diagnóstico',
  quoted: 'Presupuestado',
  repairing: 'En reparación',
  ready: 'Listo para retirar',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

const statuses = Object.entries(statusLabels);
let repairs = [];
let profiles = new Map();
let staffProfiles = [];

function setStatus(message = '', type = '') {
  pageStatus.textContent = message;
  pageStatus.className = `auth-status${type ? ` auth-status--${type}` : ''}`;
}

function logAdminError(operation, error) {
  console.error(`[RE:Hardware Admin] ${operation} failed`, {
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

function option(value, label, selectedValue) {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  element.selected = value === selectedValue;
  return element;
}

function field(labelText, control) {
  const wrapper = document.createElement('div');
  wrapper.className = 'fg';
  const label = document.createElement('label');
  label.textContent = labelText;
  label.htmlFor = control.id;
  wrapper.append(label, control);
  return wrapper;
}

function createRepairCard(repair) {
  const profile = profiles.get(repair.user_id);
  const article = document.createElement('article');
  article.className = 'admin-repair-card';

  const header = document.createElement('header');
  header.className = 'admin-repair-card__header';
  const heading = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = `${repair.equipment_type} · ${repair.brand_model}`;
  const client = document.createElement('p');
  client.textContent = `${profile?.full_name || 'Usuario sin nombre'} · ${repair.user_id.slice(0, 8)}`;
  heading.append(title, client);

  const badge = document.createElement('span');
  badge.className = `repair-status repair-status--${repair.status}`;
  badge.textContent = statusLabels[repair.status] || repair.status;
  header.append(heading, badge);

  const description = document.createElement('p');
  description.className = 'admin-repair-card__problem';
  description.textContent = repair.problem_description;
  const created = document.createElement('time');
  created.dateTime = repair.created_at;
  created.textContent = `Creada: ${formatDate(repair.created_at)}`;

  const form = document.createElement('form');
  form.className = 'admin-repair-form';

  const statusSelect = document.createElement('select');
  statusSelect.id = `status-${repair.id}`;
  statusSelect.name = 'status';
  statuses.forEach(([value, label]) => statusSelect.appendChild(option(value, label, repair.status)));

  const technicianSelect = document.createElement('select');
  technicianSelect.id = `technician-${repair.id}`;
  technicianSelect.name = 'assigned_technician_id';
  technicianSelect.appendChild(option('', 'Sin asignar', repair.assigned_technician_id || ''));
  staffProfiles.forEach(profileItem => {
    technicianSelect.appendChild(
      option(profileItem.id, `${profileItem.full_name} (${profileItem.role})`, repair.assigned_technician_id)
    );
  });

  const notes = document.createElement('textarea');
  notes.id = `notes-${repair.id}`;
  notes.name = 'technician_notes';
  notes.rows = 4;
  notes.maxLength = 2000;
  notes.value = repair.technician_notes || '';
  notes.placeholder = 'Notas internas, diagnóstico y trabajo realizado';

  const amount = document.createElement('input');
  amount.id = `amount-${repair.id}`;
  amount.name = 'quote_amount';
  amount.type = 'number';
  amount.min = '0';
  amount.step = '0.01';
  amount.inputMode = 'decimal';
  amount.value = repair.quote_amount ?? '';

  const quoteDescription = document.createElement('textarea');
  quoteDescription.id = `quote-${repair.id}`;
  quoteDescription.name = 'quote_description';
  quoteDescription.rows = 3;
  quoteDescription.maxLength = 1200;
  quoteDescription.value = repair.quote_description || '';
  quoteDescription.placeholder = 'Detalle de repuestos, mano de obra y alcance';

  const grid = document.createElement('div');
  grid.className = 'admin-repair-form__grid';
  grid.append(
    field('Estado', statusSelect),
    field('Técnico asignado', technicianSelect),
    field('Monto (UYU)', amount)
  );

  const quoteMeta = document.createElement('p');
  quoteMeta.className = 'admin-quote-meta';
  quoteMeta.textContent = `Estado del presupuesto: ${repair.quote_status.replace('_', ' ')}`;
  if (repair.quote_decided_at) {
    quoteMeta.textContent += ` · ${formatDate(repair.quote_decided_at)}`;
  }

  const submit = document.createElement('button');
  submit.className = 'btn-auth-submit';
  submit.type = 'submit';
  submit.textContent = 'Guardar cambios';

  const formStatus = document.createElement('p');
  formStatus.className = 'auth-status';
  formStatus.setAttribute('role', 'status');
  formStatus.setAttribute('aria-live', 'polite');

  form.append(
    grid,
    field('Notas técnicas internas', notes),
    field('Descripción del presupuesto', quoteDescription),
    quoteMeta,
    submit,
    formStatus
  );

  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    submit.dataset.label ||= submit.textContent;
    submit.textContent = 'Guardando...';
    formStatus.textContent = '';

    const formData = new FormData(form);
    const amountValue = formData.get('quote_amount');
    const { error } = await supabase.rpc('admin_update_repair', {
      p_repair_id: repair.id,
      p_status: formData.get('status'),
      p_technician_notes: formData.get('technician_notes').trim() || null,
      p_quote_amount: amountValue === '' ? null : Number(amountValue),
      p_quote_description: formData.get('quote_description').trim() || null,
      p_assigned_technician_id: formData.get('assigned_technician_id') || null
    });

    submit.disabled = false;
    submit.textContent = submit.dataset.label;

    if (error) {
      logAdminError('update repair', error);
      formStatus.textContent = `Supabase: ${error.message}`;
      formStatus.className = 'auth-status auth-status--error';
      return;
    }

    formStatus.textContent = 'Reparación actualizada.';
    formStatus.className = 'auth-status auth-status--success';
    await loadRepairs();
  });

  article.append(header, description, created, form);
  return article;
}

function renderRepairs() {
  const statusValue = statusFilter.value;
  const dateValue = dateFilter.value;
  const userValue = userFilter.value.trim().toLowerCase();

  const filtered = repairs.filter(repair => {
    const profile = profiles.get(repair.user_id);
    const matchesStatus = !statusValue || repair.status === statusValue;
    const matchesDate = !dateValue || repair.created_at.slice(0, 10) >= dateValue;
    const searchable = `${profile?.full_name || ''} ${repair.user_id}`.toLowerCase();
    const matchesUser = !userValue || searchable.includes(userValue);
    return matchesStatus && matchesDate && matchesUser;
  });

  repairList.innerHTML = '';
  if (!filtered.length) {
    repairList.innerHTML = '<p class="repair-list__empty">No hay solicitudes para los filtros seleccionados.</p>';
    return;
  }

  filtered.forEach(repair => repairList.appendChild(createRepairCard(repair)));
}

async function loadRepairs() {
  setStatus('Actualizando solicitudes...');
  const { data, error } = await supabase.rpc('admin_list_repair_requests');

  if (error) {
    logAdminError('load repairs', error);
    setStatus(`Supabase: ${error.message}`, 'error');
    repairList.innerHTML = '';
    return;
  }

  repairs = data;
  setStatus(`${repairs.length} solicitud${repairs.length === 1 ? '' : 'es'} encontrada${repairs.length === 1 ? '' : 's'}.`);
  renderRepairs();
}

async function initializeAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', session.user.id)
    .single();

  if (currentProfileError || !['technician', 'admin'].includes(currentProfile?.role)) {
    logAdminError('authorize admin', currentProfileError || new Error('User is not staff'));
    sessionStorage.setItem('rehw-auth-message', 'Tu usuario no tiene permisos de administración.');
    window.location.replace('/cuenta.html?admin=denied');
    return;
  }

  document.getElementById('adminRole').textContent = currentProfile.role.toUpperCase();

  const { data: profileData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role');

  if (profilesError) {
    logAdminError('load profiles', profilesError);
    setStatus(`Supabase: ${profilesError.message}`, 'error');
    return;
  }

  profiles = new Map(profileData.map(profile => [profile.id, profile]));
  staffProfiles = profileData.filter(profile => ['technician', 'admin'].includes(profile.role));
  await loadRepairs();
}

[statusFilter, dateFilter, userFilter].forEach(control => {
  control.addEventListener('input', renderRepairs);
});

clearFilters.addEventListener('click', () => {
  statusFilter.value = '';
  dateFilter.value = '';
  userFilter.value = '';
  renderRepairs();
});

initializeAdmin();
