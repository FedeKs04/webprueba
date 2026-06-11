import { supabase } from './supabase-client.js';
import { hasFirstAndLastName, normalizeFullName } from './name-utils.js';

const profileForm = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const repairForm = document.getElementById('repairRequestForm');
const repairStatus = document.getElementById('repairRequestStatus');
const repairList = document.getElementById('repairList');
const adminPanelLink = document.getElementById('adminPanelLink');

const statusLabels = {
  received: 'Recibido',
  diagnosis: 'En diagnóstico',
  quoted: 'Presupuestado',
  repairing: 'En reparación',
  ready: 'Listo para retirar',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

const quoteStatusLabels = {
  not_issued: 'Sin presupuesto',
  pending: 'Pendiente de respuesta',
  accepted: 'Aceptado',
  rejected: 'Rechazado'
};

const repairSteps = [
  { status: 'received', label: 'Recibido' },
  { status: 'diagnosis', label: 'Diagnóstico' },
  { status: 'quoted', label: 'Presupuesto' },
  { status: 'repairing', label: 'En reparación' },
  { status: 'ready', label: 'Listo' }
];

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
  if (!value) return '';
  return new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function createTimeline(history) {
  const section = document.createElement('section');
  section.className = 'repair-timeline';

  const title = document.createElement('h4');
  title.textContent = 'Historial de progreso';
  section.appendChild(title);

  const list = document.createElement('ol');
  if (!history.length) {
    const empty = document.createElement('li');
    empty.className = 'repair-timeline__empty';
    empty.textContent = 'El historial estará disponible cuando se aplique la migración.';
    list.appendChild(empty);
  } else {
    history.forEach(item => {
      const entry = document.createElement('li');
      const marker = document.createElement('span');
      marker.className = 'repair-timeline__marker';

      const content = document.createElement('div');
      const status = document.createElement('strong');
      status.textContent = statusLabels[item.new_status] || item.new_status;
      const date = document.createElement('time');
      date.dateTime = item.created_at;
      date.textContent = formatDate(item.created_at);
      content.append(status, date);
      entry.append(marker, content);
      list.appendChild(entry);
    });
  }

  section.appendChild(list);
  return section;
}

function createQuote(repair) {
  if (repair.quote_status === 'not_issued' || repair.quote_amount === null) return null;

  const section = document.createElement('section');
  section.className = `repair-quote repair-quote--${repair.quote_status}`;

  const heading = document.createElement('div');
  heading.className = 'repair-quote__heading';
  const title = document.createElement('h4');
  title.textContent = 'Presupuesto';
  const badge = document.createElement('span');
  badge.className = 'repair-quote__status';
  badge.textContent = quoteStatusLabels[repair.quote_status] || repair.quote_status;
  heading.append(title, badge);

  const amount = document.createElement('strong');
  amount.className = 'repair-quote__amount';
  amount.textContent = formatMoney(repair.quote_amount);

  const description = document.createElement('p');
  description.textContent = repair.quote_description || '';

  section.append(heading, amount, description);

  if (repair.quote_status === 'pending') {
    const actions = document.createElement('div');
    actions.className = 'repair-quote__actions';

    const accept = document.createElement('button');
    accept.className = 'btn-auth-submit';
    accept.type = 'button';
    accept.textContent = 'Aceptar presupuesto';

    const reject = document.createElement('button');
    reject.className = 'btn-secondary-danger';
    reject.type = 'button';
    reject.textContent = 'Rechazar';

    const status = document.createElement('p');
    status.className = 'auth-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const respond = decision => async () => {
      accept.disabled = true;
      reject.disabled = true;
      setStatus(status, 'Guardando decisión...');

      const { error } = await supabase.rpc('respond_to_repair_quote', {
        p_repair_id: repair.id,
        p_decision: decision
      });

      if (error) {
        logAccountError('respond to quote', error);
        setStatus(status, `Supabase: ${error.message}`, 'error');
        accept.disabled = false;
        reject.disabled = false;
        return;
      }

      setStatus(
        status,
        decision === 'accepted' ? 'Presupuesto aceptado.' : 'Presupuesto rechazado.',
        'success'
      );
      await loadAccount();
    };

    accept.addEventListener('click', respond('accepted'));
    reject.addEventListener('click', respond('rejected'));
    actions.append(accept, reject);
    section.append(actions, status);
  } else if (repair.quote_decided_at) {
    const decisionDate = document.createElement('time');
    decisionDate.className = 'repair-quote__decision-date';
    decisionDate.dateTime = repair.quote_decided_at;
    decisionDate.textContent = `Decisión registrada: ${formatDate(repair.quote_decided_at)}`;
    section.appendChild(decisionDate);
  }

  return section;
}

function createRepairStepper(status) {
  const currentIndex = status === 'delivered'
    ? repairSteps.length - 1
    : repairSteps.findIndex(step => step.status === status);
  const stepper = document.createElement('ol');
  stepper.className = `repair-stepper${status === 'cancelled' ? ' repair-stepper--cancelled' : ''}`;
  stepper.setAttribute(
    'aria-label',
    status === 'cancelled'
      ? 'Solicitud cancelada'
      : `Estado actual: ${statusLabels[status] || status}`
  );

  repairSteps.forEach((step, index) => {
    const item = document.createElement('li');
    item.className = 'repair-stepper__step';
    if (currentIndex >= 0 && index < currentIndex) item.classList.add('is-complete');
    if (currentIndex >= 0 && index === currentIndex) {
      item.classList.add('is-active');
      item.setAttribute('aria-current', 'step');
    }

    const marker = document.createElement('span');
    marker.className = 'repair-stepper__marker';
    marker.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'repair-stepper__label';
    label.textContent = step.label;
    item.append(marker, label);
    stepper.appendChild(item);
  });

  return stepper;
}

function renderRepairs(repairs, historyByRepair) {
  repairList.innerHTML = '';
  if (!repairs.length) {
    repairList.innerHTML = '<p class="repair-list__empty">Todavía no tenés solicitudes registradas.</p>';
    return;
  }

  repairs.forEach(repair => {
    const article = document.createElement('article');
    article.className = 'repair-item repair-item--detailed';

    const heading = document.createElement('div');
    heading.className = 'repair-item__heading';
    const title = document.createElement('h3');
    title.textContent = `${repair.equipment_type} · ${repair.brand_model}`;
    heading.appendChild(title);

    const description = document.createElement('p');
    description.textContent = repair.problem_description;
    const date = document.createElement('time');
    date.dateTime = repair.created_at;
    date.textContent = `Solicitud creada: ${formatDate(repair.created_at)}`;
    article.append(heading, description, date, createRepairStepper(repair.status));

    if (repair.assigned_technician_id) {
      const assigned = document.createElement('p');
      assigned.className = 'repair-assigned';
      assigned.textContent = 'Técnico asignado';
      article.appendChild(assigned);
    }

    const quote = createQuote(repair);
    if (quote) article.appendChild(quote);
    article.appendChild(createTimeline(historyByRepair.get(repair.id) || []));
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
      .select(`
        id,
        equipment_type,
        brand_model,
        problem_description,
        status,
        assigned_technician_id,
        quote_amount,
        quote_description,
        quote_status,
        quote_decided_at,
        created_at
      `)
      .order('created_at', { ascending: false })
  ]);

  if (profileResult.error) {
    logAccountError('load profile', profileResult.error);
    setStatus(profileStatus, `Supabase: ${profileResult.error.message}`, 'error');
  } else {
    profileForm.elements.full_name.value = profileResult.data.full_name || '';
    profileForm.elements.phone.value = profileResult.data.phone || '';
    document.getElementById('accountName').textContent = profileResult.data.full_name || 'Sin nombre';
    adminPanelLink.hidden = !['technician', 'admin'].includes(profileResult.data.role);
  }

  if (repairsResult.error) {
    logAccountError('load repair requests', repairsResult.error);
    repairList.innerHTML = `<p class="auth-status auth-status--error">Supabase: ${repairsResult.error.message}</p>`;
    return;
  }

  const repairIds = repairsResult.data.map(repair => repair.id);
  let history = [];

  if (repairIds.length) {
    const historyResult = await supabase
      .from('repair_status_history')
      .select('repair_request_id, previous_status, new_status, created_at')
      .in('repair_request_id', repairIds)
      .order('created_at', { ascending: true });

    if (historyResult.error) {
      logAccountError('load repair history', historyResult.error);
    } else {
      history = historyResult.data;
    }
  }

  const historyByRepair = new Map();
  history.forEach(item => {
    const entries = historyByRepair.get(item.repair_request_id) || [];
    entries.push(item);
    historyByRepair.set(item.repair_request_id, entries);
  });

  renderRepairs(repairsResult.data, historyByRepair);

  if (new URLSearchParams(window.location.search).get('admin') === 'denied') {
    setStatus(profileStatus, 'Tu usuario no tiene permisos de administración.', 'error');
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
  await loadAccount();
});

loadAccount();
