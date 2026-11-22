(() => {
  const config = window.AERKIT_SUPABASE_CONFIG || {};
  const gate = document.querySelector('#auth-gate');
  const shell = document.querySelector('#app-shell');
  const status = document.querySelector('#auth-status');
  const otpForm = document.querySelector('#otp-form');
  const emailInput = document.querySelector('#auth-email');
  const otpInput = document.querySelector('#auth-otp');
  const otpSubmit = document.querySelector('#otp-submit');
  const otpResend = document.querySelector('#otp-resend');
  const otpCodeField = document.querySelector('#otp-code-field');
  let client;
  let appStarted = false;
  let otpSent = false;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  };
  const isAerLingusEmail = email => typeof email === 'string'
    && email.trim().toLowerCase().split('@').length === 2
    && email.trim().toLowerCase().endsWith('@aerlingus.com');
  function isLocalPreviewOrigin() {
    return window.location.protocol === 'file:'
      || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  }

  function startLocalPreview() {
    window.AERKIT_PREVIEW_MODE = true;
    window.CSM_DATA = window.AERKIT_PREVIEW_DATA;
    gate.hidden = true;
    shell.hidden = false;
    const banner = document.querySelector('#preview-banner');
    banner.hidden = false;
    document.querySelector('#auth-signout').hidden = true;
    const script = document.createElement('script');
    script.src = './app.js?v=flight-snapshot-20261121-r4';
    script.onerror = () => {
      shell.hidden = true;
      gate.hidden = false;
      setStatus('Local preview could not load app.js.', true);
    };
    document.body.append(script);
  }

  async function clearLegacyOfflineCopies() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map(registration => registration.unregister().catch(() => false)));
    }
    if ('caches' in window) {
      const keys = await caches.keys().catch(() => []);
      await Promise.all(keys.filter(key => key.startsWith('aerkit-reference-')).map(key => caches.delete(key)));
    }
  }

  async function showApp(user) {
    if (!user || !isAerLingusEmail(user.email) || !user.email_confirmed_at) {
      await client.auth.signOut();
      gate.hidden = false;
      shell.hidden = true;
      setStatus('Use a verified @aerlingus.com address to access AerKit.', true);
      return;
    }
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return;
    if (appStarted) return;
    setStatus('Loading protected reference material…');
    const { data: download, error } = await client.storage.from('aerkit-private').download('reference-data.json');
    if (error) {
      setStatus(`Could not load protected references: ${error.message}`, true);
      return;
    }
    try {
      window.CSM_DATA = JSON.parse(await download.text());
    } catch {
      setStatus('The protected reference file could not be read.', true);
      return;
    }
    gate.hidden = true;
    shell.hidden = false;
    appStarted = true;
    setStatus('');
    const script = document.createElement('script');
    script.src = './app.js?v=flight-snapshot-20261121-r4';
    script.onerror = () => setStatus('AerKit could not finish loading.', true);
    document.body.append(script);
  }

  async function start() {
    if (isLocalPreviewOrigin()) {
      startLocalPreview();
      return;
    }
    await clearLegacyOfflineCopies();
    if (!config.url || !config.publishableKey) {
      setStatus('Add the Supabase publishable key in supabase-config.js before using this test app.', true);
      return;
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: {
        fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' })
      }
    });

    async function sendOtp() {
      const email = emailInput.value.trim();
      if (!isAerLingusEmail(email)) return setStatus('Use an @aerlingus.com email address.', true);
      otpSubmit.disabled = true;
      setStatus('Sending your sign-in code…');
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      otpSubmit.disabled = false;
      if (error) return setStatus(error.message, true);
      otpSent = true;
      emailInput.readOnly = true;
      otpCodeField.hidden = false;
      otpInput.hidden = false;
      otpInput.required = true;
      otpSubmit.textContent = 'Verify code and sign in';
      otpResend.hidden = false;
      otpInput.focus();
      setStatus('Check your Aer Lingus email and enter the one-time code.');
    }

    otpForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!otpSent) return sendOtp();
      if (!isAerLingusEmail(emailInput.value)) return setStatus('Use an @aerlingus.com email address.', true);
      otpSubmit.disabled = true;
      setStatus('Verifying your code…');
      const { data, error } = await client.auth.verifyOtp({
        email: emailInput.value.trim(), token: otpInput.value.trim(), type: 'email'
      });
      otpSubmit.disabled = false;
      if (error) return setStatus(error.message, true);
      await showApp(data.user);
    });

    otpResend.addEventListener('click', sendOtp);

    document.querySelector('#auth-signout').addEventListener('click', async () => {
      await client.auth.signOut();
      window.CSM_DATA = null;
      window.location.reload();
    });

    const { data: currentSession } = await client.auth.getSession();
    if (currentSession.session?.user) {
      await showApp(currentSession.session.user);
    }
  }

  start().catch(error => setStatus(error?.message || 'Authentication setup failed.', true));
})();
