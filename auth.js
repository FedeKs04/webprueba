import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL
} from './supabase-config.js';

const isConfigured =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_URL.includes('.supabase.co') &&
  !SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_');

const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

const registerForm = document.getElementById('tab-register');
const loginForm = document.getElementById('tab-login');
const registerStatus = document.getElementById('registerStatus');
const loginStatus = document.getElementById('loginStatus');
const openAuthButton = document.getElementById('btnOpenAuth');
const accountLink = document.getElementById('authAccountLink');
const logoutButton = document.getElementById('btnLogout');
const forgotPasswordButton = document.getElementById('btnForgotPassword');
const modalOverlay = document.getElementById('modalOverlay');
const accountEmail = document.getElementById('accountEmail');
const accountName = document.getElementById('accountName');
const accountCreated = document.getElementById('accountCreated');
const accountLogout = document.getElementById('accountLogout');
const passwordUpdateForm = document.getElementById('passwordUpdateForm');
const passwordUpdateStatus = document.getElementById('passwordUpdateStatus');
const protectedPage = document.body.dataset.authRequired === 'true';
const recoveryRequest =
  window.location.hash.includes('type=recovery') ||
  new URLSearchParams(window.location.search).has('code');

function setStatus(element, message = '', type = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `auth-status${type ? ` auth-status--${type}` : ''}`;
}

function setLoading(form, loading) {
  if (!form) return;
  const button = form.querySelector('[type="submit"]');
  if (!button) return;
  button.disabled = loading;
  button.dataset.label ||= button.textContent;
  button.textContent = loading ? 'Procesando...' : button.dataset.label;
}

function switchToLogin() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === 'login');
  });
  document.querySelectorAll('.auth-field').forEach(field => {
    field.classList.toggle('active', field.id === 'tab-login');
  });
}

function openLogin() {
  switchToLogin();
  modalOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function displayName(user) {
  return user?.user_metadata?.full_name?.trim() || user?.email?.split('@')[0] || 'Usuario';
}

function renderSession(session) {
  const user = session?.user;
  const signedIn = Boolean(user);

  if (openAuthButton) openAuthButton.hidden = signedIn;
  if (accountLink) {
    accountLink.hidden = !signedIn;
    accountLink.textContent = displayName(user);
  }
  if (logoutButton) logoutButton.hidden = !signedIn;

  if (!user) return;
  if (accountEmail) accountEmail.textContent = user.email || '-';
  if (accountName) accountName.textContent = displayName(user);
  if (accountCreated) {
    accountCreated.textContent = new Intl.DateTimeFormat('es-UY', {
      dateStyle: 'long'
    }).format(new Date(user.created_at));
  }
}

function authErrorMessage(error, context) {
  const message = (error?.message || '').toLowerCase();
  const code = error?.code || '';

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Correo o contraseña incorrectos. Verificá los datos e intentá nuevamente.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirmá tu correo desde el mensaje enviado por Supabase antes de iniciar sesión.';
  }
  if (message.includes('user already registered') || code === 'user_already_exists') {
    return 'Este correo ya está registrado. Probá iniciar sesión.';
  }
  if (message.includes('password') && message.includes('least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (message.includes('rate limit')) {
    return 'Demasiados intentos. Esperá unos minutos antes de volver a probar.';
  }
  if (context === 'reset') {
    return 'No pudimos enviar el correo de recuperación. Revisá la dirección.';
  }
  return 'No se pudo completar la operación. Intentá nuevamente.';
}

function showConfigurationError(statusElement) {
  setStatus(
    statusElement,
    'Supabase todavía no está configurado. Agregá la URL y la publishable key.',
    'error'
  );
}

async function handleSignUp(event) {
  event.preventDefault();
  if (!supabase) return showConfigurationError(registerStatus);

  setLoading(registerForm, true);
  setStatus(registerStatus);
  const formData = new FormData(registerForm);
  const email = formData.get('email').trim().toLowerCase();
  const password = formData.get('password');
  const fullName = formData.get('name').trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  setLoading(registerForm, false);
  if (error) {
    setStatus(registerStatus, authErrorMessage(error, 'signup'), 'error');
    return;
  }
  if (data.user?.identities?.length === 0) {
    setStatus(registerStatus, 'Este correo ya está registrado. Probá iniciar sesión.', 'error');
    return;
  }

  registerForm.reset();
  if (data.session) {
    setStatus(registerStatus, 'Cuenta creada. Ya iniciaste sesión.', 'success');
    setTimeout(() => modalOverlay?.classList.remove('open'), 900);
  } else {
    setStatus(registerStatus, 'Cuenta creada. Revisá tu correo para confirmarla.', 'success');
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  if (!supabase) return showConfigurationError(loginStatus);

  setLoading(loginForm, true);
  setStatus(loginStatus);
  const formData = new FormData(loginForm);
  const email = formData.get('email').trim().toLowerCase();
  const password = formData.get('password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setLoading(loginForm, false);

  if (error) {
    setStatus(loginStatus, authErrorMessage(error, 'login'), 'error');
    return;
  }

  loginForm.reset();
  setStatus(loginStatus, 'Sesión iniciada correctamente.', 'success');
  setTimeout(() => {
    modalOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }, 700);
}

async function handlePasswordReset() {
  if (!supabase) return showConfigurationError(loginStatus);
  const email = loginForm?.elements.email.value.trim().toLowerCase();
  if (!email) {
    setStatus(loginStatus, 'Ingresá tu correo para recuperar la contraseña.', 'error');
    loginForm?.elements.email.focus();
    return;
  }

  forgotPasswordButton.disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/cuenta.html`
  });
  forgotPasswordButton.disabled = false;
  setStatus(
    loginStatus,
    error
      ? authErrorMessage(error, 'reset')
      : 'Si el correo está registrado, recibirás un enlace de recuperación.',
    error ? 'error' : 'success'
  );
}

async function handleLogout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    window.alert('No se pudo cerrar la sesión. Intentá nuevamente.');
    return;
  }
  if (protectedPage) window.location.replace('/');
}

async function handlePasswordUpdate(event) {
  event.preventDefault();
  if (!supabase) return showConfigurationError(passwordUpdateStatus);
  setLoading(passwordUpdateForm, true);
  const password = new FormData(passwordUpdateForm).get('password');
  const { error } = await supabase.auth.updateUser({ password });
  setLoading(passwordUpdateForm, false);

  if (error) {
    setStatus(passwordUpdateStatus, authErrorMessage(error, 'password'), 'error');
    return;
  }

  passwordUpdateForm.reset();
  setStatus(passwordUpdateStatus, 'Contraseña actualizada correctamente.', 'success');
}

async function initializeAuth() {
  if (!supabase) {
    document.documentElement.dataset.authConfigured = 'false';
    if (protectedPage) {
      document.getElementById('accountLoading')?.remove();
      document.getElementById('accountConfigError')?.removeAttribute('hidden');
    }
    return;
  }

  document.documentElement.dataset.authConfigured = 'true';
  supabase.auth.onAuthStateChange((event, nextSession) => {
    renderSession(nextSession);
    if (event === 'PASSWORD_RECOVERY') passwordUpdateForm?.removeAttribute('hidden');
    if (event === 'SIGNED_OUT' && protectedPage) window.location.replace('/');
  });

  const { data: { session } } = await supabase.auth.getSession();
  renderSession(session);

  if (protectedPage && !session && !recoveryRequest) {
    sessionStorage.setItem('rehw-auth-message', 'Iniciá sesión para acceder a tu cuenta.');
    window.location.replace('/?auth=required');
    return;
  }

  document.getElementById('accountLoading')?.remove();
  document.getElementById('accountContent')?.removeAttribute('hidden');

  if (recoveryRequest) passwordUpdateForm?.removeAttribute('hidden');

  if (new URLSearchParams(window.location.search).get('auth') === 'required') {
    openLogin();
    setStatus(loginStatus, sessionStorage.getItem('rehw-auth-message') || 'Iniciá sesión.', 'error');
    sessionStorage.removeItem('rehw-auth-message');
  }
}

registerForm?.addEventListener('submit', handleSignUp);
loginForm?.addEventListener('submit', handleSignIn);
forgotPasswordButton?.addEventListener('click', handlePasswordReset);
logoutButton?.addEventListener('click', handleLogout);
accountLogout?.addEventListener('click', handleLogout);
passwordUpdateForm?.addEventListener('submit', handlePasswordUpdate);

initializeAuth();
