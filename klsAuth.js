/**
 * KoshinLS Account System Client
 *
 * Communicates ONLY with the Google Apps Script Web App endpoint.
 * The Google Sheet is completely private and only accessed server-side by Apps Script.
 * Never accesses Google Sheets directly.
 */

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const KLS_ACCOUNT_API_URL =
  env.KLS_ACCOUNT_API_URL ||
  env.VITE_KLS_ACCOUNT_API_URL ||
  '';

const STORAGE_KEY = 'koshinls_account_session';

/**
 * Checks whether the public Apps Script endpoint is configured.
 */
export function isKlsConfigured() {
  return Boolean(KLS_ACCOUNT_API_URL && KLS_ACCOUNT_API_URL.trim().length > 0);
}

/**
 * Sends a POST request to the Apps Script Web App.
 * Uses text/plain to avoid CORS preflight (OPTIONS) which Apps Script does not support.
 */
async function callApi(action, payload = {}) {
  if (!isKlsConfigured()) {
    return {
      success: false,
      error: 'KLS Account API is not configured yet. Set KLS_ACCOUNT_API_URL in your environment.',
    };
  }

  try {
    const response = await fetch(KLS_ACCOUNT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Server responded with status ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`KLS API [${action}] error:`, err);
    return {
      success: false,
      error: err.message || 'Network request failed.',
    };
  }
}

/**
 * Retrieves the local KLS session from localStorage.
 */
export function getStoredKlsSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() >= new Date(session.expiresAt).getTime()) {
      clearStoredKlsSession();
      return null;
    }
    return session;
  } catch (e) {
    clearStoredKlsSession();
    return null;
  }
}

/**
 * Saves KLS session data to localStorage.
 */
export function saveKlsSession(sessionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Could not persist KLS session:', e);
  }
}

/**
 * Clears the local KLS session.
 */
export function clearStoredKlsSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Log in to a KLS account.
 */
export async function loginKls(identifier, password) {
  const result = await callApi('loginAccount', {
    identifier: identifier.trim(),
    password,
  });

  if (result.success && result.sessionToken) {
    saveKlsSession({
      sessionToken: result.sessionToken,
      account: result.account,
      expiresAt: result.expiresAt,
    });
  }

  return result;
}

/**
 * Register a new KLS account.
 */
export async function createKlsAccount({
  username,
  display_name,
  email,
  password,
  recovery_question = '',
  recovery_answer = '',
}) {
  const result = await callApi('createAccount', {
    username: username.trim(),
    display_name: display_name.trim(),
    email: email.trim().toLowerCase(),
    password,
    recovery_question: recovery_question.trim(),
    recovery_answer: recovery_answer.trim(),
  });

  if (result.success && result.sessionToken) {
    saveKlsSession({
      sessionToken: result.sessionToken,
      account: result.account,
      expiresAt: result.expiresAt,
    });
  }

  return result;
}

/**
 * Fetches the recovery question for password reset.
 */
export async function getKlsRecoveryQuestion(identifier) {
  return await callApi('getRecoveryQuestion', {
    identifier: identifier.trim(),
  });
}

/**
 * Resets a KLS account password using the security answer.
 */
export async function resetKlsPassword({ identifier, recovery_answer, new_password }) {
  return await callApi('resetPassword', {
    identifier: identifier.trim(),
    recovery_answer: recovery_answer.trim(),
    new_password,
  });
}

/**
 * Gets the current account data using an active session token.
 */
export async function fetchCurrentKlsAccount() {
  const session = getStoredKlsSession();
  if (!session?.sessionToken) return null;

  const result = await callApi('getAccount', {
    sessionToken: session.sessionToken,
  });

  if (result.success && result.account) {
    saveKlsSession({
      ...session,
      account: result.account,
    });
    return result.account;
  }

  clearStoredKlsSession();
  return null;
}

/**
 * Logs out of the KLS account.
 */
export async function logoutKls() {
  const session = getStoredKlsSession();
  if (session?.sessionToken) {
    await callApi('logout', { sessionToken: session.sessionToken });
  }
  clearStoredKlsSession();
}
