import { isSupabaseConfigured, supabase } from './supabase-client.js';

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

function logAuth(operation, details = {}) {
  console.info(`[RE:Hardware Auth] ${operation}`, {
    event: details.event,
    userId: details.user?.id || details.userId,
    email: details.user?.email || details.email,
    session: details.session ? 'present' : details.session === null ? 'missing' : undefined,
    emailConfirmationRequired: details.emailConfirmationRequired
  });
}

function logAuthError(operation, error) {
  console.error(`[RE:Hardware Auth] ${operation} failed`, {
    name: error?.name,
    message: error?.message || String(error),
    code: error?.code,
    status: error?.status
  });
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
  const originalMessage = error?.message || 'Error desconocido de Supabase';
  const message = originalMessage.toLowerCase();
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
  if (message.includes('rate limit') || code === 'over_email_send_rate_limit') {
    return `Supabase: ${originalMessage}. Se alcanzó el límite de correos; esperá unos minutos o configurá SMTP propio.`;
  }
  if (message.includes('database error saving new user')) {
    return `Supabase: ${originalMessage}. No se pudo crear el perfil asociado al usuario.`;
  }
  if (message.includes('signup is disabled')) {
    return `Supabase: ${originalMessage}. El registro está deshabilitado en Auth.`;
  }
  if (context === 'reset') {
    return `Supabase: ${originalMessage}`;
  }
  return `Supabase: ${originalMessage}${code ? ` (${code})` : ''}`;
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

  logAuth('signUp started', { email });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Supabase no devolvió el usuario creado.');
    if (data.user.identities?.length === 0) {
      const duplicateError = new Error('User already registered');
      duplicateError.code = 'user_already_exists';
      throw duplicateError;
    }

    logAuth('signUp completed', {
      user: data.user,
      session: data.session,
      emailConfirmationRequired: !data.session
    });

    if (data.session) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        logAuthError('profile verification after signUp', profileError);
        throw new Error(`Usuario creado, pero el perfil falló: ${profileError.message}`);
      }
      logAuth('profile verified after signUp', { userId: profile.id });
    }

    registerForm.reset();
    if (data.session) {
      setStatus(registerStatus, 'Cuenta y perfil creados. Ya iniciaste sesión.', 'success');
      setTimeout(() => {
        modalOverlay?.classList.remove('open');
        document.body.style.overflow = '';
      }, 900);
    } else {
      setStatus(registerStatus, 'Cuenta y perfil creados. Revisá tu correo para confirmarla.', 'success');
    }
  } catch (error) {
    logAuthError('signUp', error);
    setStatus(registerStatus, authErrorMessage(error, 'signup'), 'error');
  } finally {
    setLoading(registerForm, false);
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
  logAuth('signIn started', { email });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    logAuth('signIn completed', { user: data.user, session: data.session });

    loginForm.reset();
    setStatus(loginStatus, 'Sesión iniciada correctamente.', 'success');
    setTimeout(() => {
      modalOverlay?.classList.remove('open');
      document.body.style.overflow = '';
    }, 700);
  } catch (error) {
    logAuthError('signIn', error);
    setStatus(loginStatus, authErrorMessage(error, 'login'), 'error');
  } finally {
    setLoading(loginForm, false);
  }
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
  logAuth('signOut started');
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    logAuthError('signOut', error);
    window.alert(authErrorMessage(error, 'logout'));
    return;
  }
  logAuth('signOut completed');
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
  if (!isSupabaseConfigured) {
    document.documentElement.dataset.authConfigured = 'false';
    if (protectedPage) {
      document.getElementById('accountLoading')?.remove();
      document.getElementById('accountConfigError')?.removeAttribute('hidden');
    }
    return;
  }

  document.documentElement.dataset.authConfigured = 'true';
  supabase.auth.onAuthStateChange((event, nextSession) => {
    logAuth('state changed', { event, user: nextSession?.user, session: nextSession });
    renderSession(nextSession);
    if (event === 'PASSWORD_RECOVERY') passwordUpdateForm?.removeAttribute('hidden');
    if (event === 'SIGNED_OUT' && protectedPage) window.location.replace('/');
  });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) logAuthError('getSession', sessionError);
  else logAuth('session restored', { user: session?.user, session });
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
