(() => {
  const config = window.AERKIT_SUPABASE_CONFIG || {};
  const gate = document.querySelector('#auth-gate');
  const shell = document.querySelector('#app-shell');
  const status = document.querySelector('#auth-status');
  const enrolmentRequestForm = document.querySelector('#enrolment-request-form');
  const emailInput = document.querySelector('#auth-email');
  let client;
  let appStarted = false;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  };
  const isAerLingusEmail = email => typeof email === 'string'
    && email.trim().toLowerCase().split('@').length === 2
    && email.trim().toLowerCase().endsWith('@aerlingus.com');
  const hasPasskeyAmr = token => {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
      return Array.isArray(claims.amr) && claims.amr.some(item => item?.method === 'passkey');
    } catch {
      return false;
    }
  };

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
    if (!sessionData.session || !hasPasskeyAmr(sessionData.session.access_token)) {
      await client.auth.signOut();
      gate.hidden = false;
      shell.hidden = true;
      setStatus('Protected references require a passkey sign-in. Email verification is only for initial enrolment.', true);
      return;
    }
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
    await clearLegacyOfflineCopies();
    if (!config.url || !config.publishableKey) {
      setStatus('Add the Supabase publishable key in supabase-config.js before using this test app.', true);
      return;
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    client = createClient(config.url, config.publishableKey, {
      auth: { experimental: { passkey: true }, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: {
        fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' })
      }
    });

    document.querySelector('#passkey-signin').addEventListener('click', async event => {
      event.currentTarget.disabled = true;
      setStatus('Waiting for your passkey…');
      const { data, error } = await client.auth.signInWithPasskey();
      event.currentTarget.disabled = false;
      if (error) return setStatus(error.message, true);
      await showApp(data.user);
    });

    async function enrolPasskey(user) {
      if (!isAerLingusEmail(user?.email) || !user?.email_confirmed_at) {
        await client.auth.signOut();
        return setStatus('Only verified @aerlingus.com email addresses can enrol.', true);
      }
      setStatus('Email verified. Create a passkey for this Aer Lingus account…');
      const { error: passkeyError } = await client.auth.registerPasskey();
      if (passkeyError) return setStatus(`Passkey enrolment failed: ${passkeyError.message}`, true);
      await client.auth.signOut();
      setStatus('Passkey created. Sign in with it to open the protected references.');
      const { data: passkeySession, error: signInError } = await client.auth.signInWithPasskey();
      if (signInError) return setStatus(`Passkey created; sign-in failed: ${signInError.message}`, true);
      await showApp(passkeySession.user);
    }

    enrolmentRequestForm.addEventListener('submit', async event => {
      event.preventDefault();
      const email = emailInput.value.trim();
      if (!isAerLingusEmail(email)) return setStatus('Use an @aerlingus.com email address.', true);
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
      });
      if (error) return setStatus(error.message, true);
      enrolmentRequestForm.hidden = true;
      setStatus('Check your Aer Lingus mailbox and follow the one-time sign-in link to enrol your passkey.');
    });

    document.querySelector('#auth-signout').addEventListener('click', async () => {
      await client.auth.signOut();
      window.CSM_DATA = null;
      window.location.reload();
    });

    const { data: currentSession } = await client.auth.getSession();
    if (currentSession.session?.user) {
      const user = currentSession.session.user;
      if (hasPasskeyAmr(currentSession.session.access_token)) await showApp(user);
      else await enrolPasskey(user);
    }
  }

  start().catch(error => setStatus(error?.message || 'Authentication setup failed.', true));
})();
