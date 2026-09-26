/**
 * KLS LOGIN SYSTEM - Google Apps Script Web App
 * Spreadsheet: "KLS login sys"
 *
 * Row 1:
 * A id | B username | C display_name | D email | E avatar_url
 * F created_at | G last_login | H status | I role | J password
 *
 * Deploy as a Web App. Keep the spreadsheet private.
 *
 * NOTE: This hobby version intentionally stores the password in J because
 * the current KLS design requires owner-only password retrieval. Password
 * handling is isolated so it can later be replaced with hashing.
 */

const SHEET_NAME = 'KLS login sys';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_PREFIX = 'KLS_SESSION_';

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'ping');

    switch (action) {
      case 'ping':
        return jsonResponse({
          success: true,
          service: 'KLS Account System',
          status: 'online',
          timestamp: new Date().toISOString()
        });
      case 'getAccount':
        return jsonResponse(handleGetAccount(p.sessionToken));
      case 'getOwnPassword':
        return jsonResponse(handleGetOwnPassword(p.sessionToken));
      default:
        return jsonResponse(fail('Unknown action.'));
    }
  } catch (err) {
    return jsonResponse(serverError(err));
  }
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const action = String(body.action || '');

    switch (action) {
      case 'createAccount':
        return jsonResponse(handleCreateAccount(body));
      case 'loginAccount':
        return jsonResponse(handleLoginAccount(body));
      case 'updateAccount':
        return jsonResponse(handleUpdateAccount(body));
      case 'getAccount':
        return jsonResponse(handleGetAccount(body.sessionToken));
      case 'getOwnPassword':
        return jsonResponse(handleGetOwnPassword(body.sessionToken));
      case 'logout':
        return jsonResponse(handleLogout(body.sessionToken));
      default:
        return jsonResponse(fail('Unknown action.'));
    }
  } catch (err) {
    return jsonResponse(serverError(err));
  }
}

function handleCreateAccount(input) {
  const username = clean(input.username, 40);
  const displayName = clean(input.display_name, 80);
  const email = clean(input.email, 160).toLowerCase();
  const password = PasswordService.prepareForStorage(input.password);

  if (!username) return fail('Username is required.');
  if (!displayName) return fail('Display name is required.');
  if (!email || !email.includes('@')) return fail('A valid email is required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const rows = readRows(sheet);

    if (rows.some(r => r.username.toLowerCase() === username.toLowerCase())) {
      return fail('Username already in use.');
    }
    if (rows.some(r => r.email.toLowerCase() === email)) {
      return fail('Email already in use.');
    }

    const id = generateAccountId(rows);
    const now = new Date().toISOString();

    sheet.appendRow([id, username, displayName, email, '', now, '', 'active', 'user', password]);

    return {
      success: true,
      account: safeAccount({
        id, username, display_name: displayName, email, avatar_url: '',
        created_at: now, last_login: '', status: 'active', role: 'user'
      })
    };
  } finally {
    lock.releaseLock();
  }
}

function handleLoginAccount(input) {
  const identifier = clean(input.identifier || input.username || input.email, 160);
  const password = String(input.password || '');
  if (!identifier || !password) return fail('Username/email and password are required.');

  const sheet = getSheet();
  const rows = readRows(sheet);
  const index = rows.findIndex(r =>
    r.username.toLowerCase() === identifier.toLowerCase() ||
    r.email.toLowerCase() === identifier.toLowerCase()
  );

  if (index < 0) return fail('Invalid credentials.');

  const account = rows[index];
  if (String(account.status).toLowerCase() !== 'active') return fail('Account is disabled.');
  if (!PasswordService.verify(password, account.password)) return fail('Invalid credentials.');

  const now = new Date().toISOString();
  sheet.getRange(index + 2, 7).setValue(now);

  return {
    success: true,
    sessionToken: createSession(account.id),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    account: safeAccount({ ...account, last_login: now })
  };
}

function handleGetAccount(sessionToken) {
  const session = requireSession(sessionToken);
  if (!session.success) return session;

  const account = findAccountById(session.accountId);
  if (!account) return fail('Account not found.');

  return { success: true, account: safeAccount(account) };
}

function handleUpdateAccount(input) {
  const session = requireSession(input.sessionToken);
  if (!session.success) return session;

  const account = findAccountById(session.accountId);
  if (!account) return fail('Account not found.');

  const sheet = getSheet();
  const username = clean(input.username !== undefined ? input.username : account.username, 40);
  const displayName = clean(input.display_name !== undefined ? input.display_name : account.display_name, 80);
  const email = clean(input.email !== undefined ? input.email : account.email, 160).toLowerCase();
  const avatarUrl = clean(input.avatar_url !== undefined ? input.avatar_url : account.avatar_url, 500);

  if (!username) return fail('Username is required.');
  if (!displayName) return fail('Display name is required.');
  if (!email || !email.includes('@')) return fail('A valid email is required.');

  const rows = readRows(sheet);
  if (rows.some(r => r.id !== account.id && r.username.toLowerCase() === username.toLowerCase())) {
    return fail('Username already in use.');
  }
  if (rows.some(r => r.id !== account.id && r.email.toLowerCase() === email)) {
    return fail('Email already in use.');
  }

  // Only owner-editable columns are written. id/status/role/created_at are untouched.
  sheet.getRange(account.rowNumber, 2, 1, 4).setValues([[username, displayName, email, avatarUrl]]);

  if (input.password !== undefined) {
    sheet.getRange(account.rowNumber, 10).setValue(
      PasswordService.prepareForStorage(input.password)
    );
  }

  return { success: true, account: safeAccount(findAccountById(session.accountId)) };
}

function handleGetOwnPassword(sessionToken) {
  const session = requireSession(sessionToken);
  if (!session.success) return session;

  const account = findAccountById(session.accountId);
  if (!account) return fail('Account not found.');

  // Deliberately available only to the authenticated owner in this hobby version.
  return { success: true, password: account.password };
}

function handleLogout(sessionToken) {
  const token = normalizeToken(sessionToken);
  if (token) PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
  return { success: true };
}

function createSession(accountId) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const session = {
    accountId: accountId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  PropertiesService.getScriptProperties().setProperty(
    SESSION_PREFIX + token,
    JSON.stringify(session)
  );
  return token;
}

function requireSession(sessionToken) {
  const token = normalizeToken(sessionToken);
  if (!token) return fail('Unauthorized.');

  const props = PropertiesService.getScriptProperties();
  const key = SESSION_PREFIX + token;
  const raw = props.getProperty(key);
  if (!raw) return fail('Unauthorized.');

  let session;
  try {
    session = JSON.parse(raw);
  } catch (err) {
    props.deleteProperty(key);
    return fail('Unauthorized.');
  }

  if (!session.expiresAt || Date.now() >= Number(session.expiresAt)) {
    props.deleteProperty(key);
    return fail('Session expired.');
  }

  return { success: true, accountId: String(session.accountId) };
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Bind this Apps Script to the KLS login sys spreadsheet.');

  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" was not found.');
  return sheet;
}

function readRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, 10).getValues()
    .map((v, i) => ({
      rowNumber: i + 2,
      id: String(v[0] || ''),
      username: String(v[1] || ''),
      display_name: String(v[2] || ''),
      email: String(v[3] || ''),
      avatar_url: String(v[4] || ''),
      created_at: String(v[5] || ''),
      last_login: String(v[6] || ''),
      status: String(v[7] || ''),
      role: String(v[8] || ''),
      password: String(v[9] || '')
    }))
    .filter(r => r.id);
}

function findAccountById(id) {
  return readRows(getSheet()).find(r => r.id === String(id)) || null;
}

const PasswordService = {
  prepareForStorage: function(rawPassword) {
    const password = String(rawPassword || '');
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');
    return password;
  },
  verify: function(inputPassword, storedPassword) {
    return String(inputPassword || '') === String(storedPassword || '');
  }
};

function safeAccount(account) {
  return {
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    email: account.email,
    avatar_url: account.avatar_url,
    created_at: account.created_at,
    last_login: account.last_login,
    status: account.status,
    role: account.role
  };
}

function generateAccountId(rows) {
  let id;
  do {
    id = 'kls_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  } while (rows.some(r => r.id === id));
  return id;
}

function normalizeToken(value) { return String(value || '').trim(); }
function clean(value, maxLength) { return String(value || '').trim().slice(0, maxLength); }

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(String(e.postData.contents)); }
  catch (err) { return e.parameter || {}; }
}

function fail(message) { return { success: false, error: message }; }

function serverError(err) {
  console.error(err);
  return { success: false, error: 'Server error.' };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}