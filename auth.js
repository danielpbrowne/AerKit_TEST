(() => {
  const config = window.AERKIT_SUPABASE_CONFIG;
  const supabaseLibrary = window.supabase;
  const client = config?.url && config?.publishableKey && supabaseLibrary?.createClient
    ? supabaseLibrary.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;

  const authButton = document.getElementById('auth-open');
  const dialog = document.getElementById('auth-dialog');
  const emailForm = document.getElementById('auth-email-form');
  const otpForm = document.getElementById('auth-otp-form');
  const emailInput = document.getElementById('auth-email');
  const otpInput = document.getElementById('auth-otp');
  const status = document.getElementById('auth-status');
  const accountState = document.getElementById('auth-account-state');
  const sendCodeButton = document.getElementById('auth-send-code');
  const modeButtons = [...document.querySelectorAll('[data-auth-mode]')];
  const registerFields = [...document.querySelectorAll('.auth-register-field')];
  let mode = 'signin';
  let pendingEmail = '';
  let profile = null;
  let currentUser = null;
  let dataLoadId = 0;

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.dataset.state = isError ? 'error' : 'info';
  };

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
    registerFields.forEach(field => {
      field.hidden = mode !== 'register';
      const input = field.querySelector('input');
      input.required = mode === 'register';
    });
    sendCodeButton.textContent = mode === 'register' ? 'Create account and email a code' : 'Email me a sign-in code';
    setStatus('');
  }

  function openDialog() {
    if (!dialog.open) dialog.showModal();
    if (!client) setStatus('Sign-in is not configured yet. Open tools remain available.', true);
  }

  function clearRestrictedData() {
    dataLoadId += 1;
    if (window.CSM_DATA) {
      window.CSM_DATA.destinationFacts = [];
      window.CSM_DATA.usefulContacts = [];
    }
    window.dispatchEvent(new CustomEvent('aerkit-access-updated'));
  }

  async function loadRestrictedData(userId, expectedLoadId) {
    const [factsResult, contactsResult] = await Promise.all([
      client.from('restricted_destination_facts')
        .select('id,destination_code,category,field_name,field_value,sort_order')
        .order('sort_order', { ascending: true }),
      client.from('restricted_useful_contacts')
        .select('id,display_name,category,email,phone,notes,sort_order')
        .order('sort_order', { ascending: true })
    ]);
    if (expectedLoadId !== dataLoadId || currentUser?.id !== userId) return;
    if (factsResult.error || contactsResult.error) {
      clearRestrictedData();
      setStatus('Your account is approved, but restricted references could not be loaded. The access database may still need its setup applied.', true);
      return;
    }
    const destinations = window.CSM_DATA.destinations || [];
    window.CSM_DATA.destinationFacts = (factsResult.data || []).map(row => ({
      id: row.id,
      code: row.destination_code,
      destination: destinations.find(destination => destination.code === row.destination_code)?.name || row.destination_code,
      category: row.category,
      field: row.field_name,
      value: row.field_value
    }));
    window.CSM_DATA.usefulContacts = (contactsResult.data || []).map(row => ({
      id: row.id,
      name: row.display_name,
      category: row.category,
      email: row.email,
      phone: row.phone,
      notes: row.notes
    }));
    window.dispatchEvent(new CustomEvent('aerkit-access-updated'));
  }

  async function setSession(session) {
    const loadId = ++dataLoadId;
    currentUser = session?.user || null;
    profile = null;
    if (!currentUser) {
      clearRestrictedData();
      authButton.textContent = 'Sign in';
      accountState.hidden = true;
      emailForm.hidden = false;
      otpForm.hidden = true;
      return;
    }

    emailForm.hidden = true;
    otpForm.hidden = true;
    accountState.hidden = false;
    authButton.textContent = 'Account';
    accountState.innerHTML = '<p>Checking your access status…</p>';
    const result = await client.from('profiles').select('display_name,access_status').eq('user_id', currentUser.id).single();
    if (loadId !== dataLoadId || currentUser?.id !== session.user.id) return;
    if (result.error || !result.data) {
      profile = null;
      accountState.innerHTML = '<p>Your account is signed in, but its AerKit access profile could not be found. Please contact the AerKit administrator.</p><button class="auth-secondary" type="button" id="auth-signout">Sign out</button>';
      setStatus('The access database may need its setup applied.', true);
      document.getElementById('auth-signout').addEventListener('click', () => client.auth.signOut());
      clearRestrictedData();
      return;
    }
    profile = result.data;
    const labels = {
      pending: 'Your account is awaiting identity review. Restricted references will appear after approval.',
      rejected: 'This account was not approved for restricted references. Contact the AerKit administrator if you think this is an error.',
      suspended: 'Access to restricted references is currently suspended. Contact the AerKit administrator.',
      approved: 'Your account is approved for restricted references.'
    };
    const displayName = profile.display_name ? `<p class="auth-account-name">${escapeHtml(profile.display_name)}</p>` : '';
    accountState.innerHTML = `${displayName}<p class="auth-status-note">${escapeHtml(labels[profile.access_status] || 'Your access status is unavailable.')}</p><button class="auth-secondary" type="button" id="auth-signout">Sign out</button>`;
    document.getElementById('auth-signout').addEventListener('click', async () => {
      const { error } = await client.auth.signOut();
      if (error) setStatus('Sign out failed. Please try again.', true);
      else setStatus('You are signed out.');
    });
    if (profile.access_status === 'approved') await loadRestrictedData(currentUser.id, loadId);
    else clearRestrictedData();
  }

  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.authMode)));
  authButton.addEventListener('click', openDialog);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-auth-open]')) openDialog();
    if (event.target.closest('[data-auth-close]')) dialog.close();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  document.getElementById('auth-back').addEventListener('click', () => {
    otpForm.hidden = true;
    emailForm.hidden = false;
    otpInput.value = '';
    setStatus('');
  });

  emailForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return setStatus('Sign-in is not configured yet. Open tools remain available.', true);
    const email = emailInput.value.trim().toLowerCase();
    const options = { shouldCreateUser: mode === 'register' };
    if (mode === 'register') {
      options.data = {
        display_name: document.getElementById('auth-name').value.trim(),
        staff_number: document.getElementById('auth-staff-number').value.trim()
      };
    }
    sendCodeButton.disabled = true;
    setStatus('Sending your sign-in code…');
    const { error } = await client.auth.signInWithOtp({ email, options });
    sendCodeButton.disabled = false;
    if (error) return setStatus(error.message, true);
    pendingEmail = email;
    emailForm.hidden = true;
    otpForm.hidden = false;
    setStatus(`A sign-in code was sent to ${email}. Enter it here to continue.`);
    otpInput.focus();
  });

  otpForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client || !pendingEmail) return setStatus('Request a new code to continue.', true);
    const verifyButton = otpForm.querySelector('[type="submit"]');
    verifyButton.disabled = true;
    setStatus('Verifying your code…');
    const { error } = await client.auth.verifyOtp({ email: pendingEmail, token: otpInput.value.trim(), type: 'email' });
    verifyButton.disabled = false;
    if (error) return setStatus(error.message, true);
    setStatus('Your email is verified. Checking access…');
  });

  window.AERKIT_AUTH = {
    client,
    get status() { return profile?.access_status || (currentUser ? 'checking' : 'signed_out'); },
    openDialog,
    get approved() { return profile?.access_status === 'approved'; }
  };

  if (client) {
    client.auth.onAuthStateChange((_event, session) => {
      Promise.resolve().then(() => setSession(session));
    });
  } else {
    authButton.title = 'Sign-in configuration is not available';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
})();
