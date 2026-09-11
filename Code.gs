/**
 * ============================================================================
 * KLS LOGIN SYSTEM - GOOGLE APPS SCRIPT WEB APP BACKEND (Code.gs)
 * ============================================================================
 *
 * Spreadsheet: "KLS login sys"
 * Sheet 1 Columns (Row 1):
 *   A: id
 *   B: username
 *   C: display_name
 *   D: email
 *   E: avatar_url
 *   F: created_at
 *   G: last_login
 *   H: status
 *   I: role
 *   J: password
 *
 * SECURITY & BEHAVIOR CONSTRAINTS:
 * 1. The Google Sheet remains 100% private.
 * 2. The client browser communicates solely with this Web App URL.
 * 3. Browser never receives Google Sheet credentials or service-account keys.
 * 4. Users may create and manage ONLY their own KLS account.
 * 5. A user must NEVER be able to edit or inspect another user's account.
 * 6. Never expose all users' accounts or passwords in any API response.
 * 7. Password handling is isolated for future cryptographic hashing upgrades.
 * ============================================================================
 */

// Optional: If running as a standalone script, set your Spreadsheet ID here.
// When bound to the spreadsheet (Extensions > Apps Script), leave empty.
var SPREADSHEET_ID = "";
var SHEET_NAME = "KLS login sys";

/**
 * PASSWORD HANDLING MODULE (ISOLATED)
 *
 * Currently stores passwords directly for early hobby phase as requested.
 * When migrating to hashed passwords (e.g. SHA-256 + salt or bcrypt),
 * ONLY the functions inside this object need to be modified.
 */
var PasswordService = {
  /**
   * Prepares a raw password for storage in the spreadsheet.
   * @param {string} rawPassword
   * @return {string}
   */
  prepareForStorage: function (rawPassword) {
    if (typeof rawPassword !== "string" || rawPassword.trim().length === 0) {
      throw new Error("Password must be a non-empty string.");
    }
    // Future upgrade: return Utilities.computeHmacSha256(rawPassword, salt);
    return rawPassword;
  },

  /**
   * Verifies if the input password matches the stored password.
   * @param {string} inputPassword
   * @param {string} storedPassword
   * @return {boolean}
   */
  verify: function (inputPassword, storedPassword) {
    if (!inputPassword || !storedPassword) return false;
    return String(inputPassword) === String(storedPassword);
  }
};

/**
 * Returns a standardized JSON response with proper CORS headers.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gets the target sheet in the spreadsheet.
 */
function getTargetSheet() {
  var ss;
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    throw new Error("Could not connect to Google Spreadsheet. Ensure script is bound or SPREADSHEET_ID is set.");
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Fall back to first sheet if named differently
    sheet = ss.getSheets()[0];
  }
  return sheet;
}

/**
 * Generates a tamper-resistant session token derived from account ID & password.
 * Changes automatically if the user changes their password.
 */
function generateSessionToken(accountId, storedPassword) {
  var raw = accountId + ":" + storedPassword;
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return signature.map(function (byte) {
    return ("0" + (byte & 0xFF).toString(16)).slice(-2);
  }).join("");
}

/**
 * Sanitizes an account row before returning to client.
 * Strips password and internal values completely.
 */
function sanitizeAccount(rowValues) {
  return {
    id: String(rowValues[0] || ""),
    username: String(rowValues[1] || ""),
    display_name: String(rowValues[2] || ""),
    email: String(rowValues[3] || ""),
    avatar_url: String(rowValues[4] || ""),
    created_at: String(rowValues[5] || ""),
    last_login: String(rowValues[6] || ""),
    status: String(rowValues[7] || "active"),
    role: String(rowValues[8] || "user")
  };
}

/**
 * Finds a row by Account ID.
 * Returns { rowIndex: number, rowValues: Array } or null.
 * Note: rowIndex is 1-based sheet row index.
 */
function findRowById(sheet, accountId) {
  if (!accountId) return null;
  var data = sheet.getDataRange().getValues();
  // Row 0 is header row
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(accountId)) {
      return { rowIndex: i + 1, rowValues: data[i] };
    }
  }
  return null;
}

/**
 * Finds a row by username or email.
 */
function findRowByUsernameOrEmail(sheet, query) {
  if (!query) return null;
  var q = String(query).trim().toLowerCase();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var u = String(data[i][1]).trim().toLowerCase();
    var e = String(data[i][3]).trim().toLowerCase();
    if (u === q || e === q) {
      return { rowIndex: i + 1, rowValues: data[i] };
    }
  }
  return null;
}

/**
 * Verifies that the request has permission to access this account.
 * Caller must provide either a valid session token or the correct password.
 */
function authenticateCaller(rowValues, token, password) {
  var accountId = String(rowValues[0]);
  var storedPassword = String(rowValues[9]);

  if (token && typeof token === "string") {
    var expectedToken = generateSessionToken(accountId, storedPassword);
    if (expectedToken === token) {
      return true;
    }
  }

  if (password && typeof password === "string") {
    if (PasswordService.verify(password, storedPassword)) {
      return true;
    }
  }

  return false;
}

/**
 * ACTION: createAccount
 * Validates inputs, creates new row, auto-generates id/timestamps/status/role.
 */
function handleCreateAccount(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return { success: false, error: "Server busy. Please try again." };
  }

  try {
    var username = String(data.username || "").trim();
    var displayName = String(data.display_name || "").trim() || username;
    var email = String(data.email || "").trim().toLowerCase();
    var rawPassword = String(data.password || "");

    // Validation
    if (!username || username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters long." };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return { success: false, error: "Username may only contain letters, numbers, dots, dashes, and underscores." };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "A valid email address is required." };
    }
    if (!rawPassword || rawPassword.length < 4) {
      return { success: false, error: "Password must be at least 4 characters long." };
    }

    var sheet = getTargetSheet();
    var allData = sheet.getDataRange().getValues();

    // Check for duplicate username or email
    for (var i = 1; i < allData.length; i++) {
      var rowUser = String(allData[i][1]).trim().toLowerCase();
      var rowEmail = String(allData[i][3]).trim().toLowerCase();

      if (rowUser === username.toLowerCase()) {
        return { success: false, error: "Username is already taken." };
      }
      if (rowEmail === email) {
        return { success: false, error: "An account with this email already exists." };
      }
    }

    // Auto-generate fields
    var id = "kls_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    var now = new Date().toISOString();
    var status = "active";
    var role = "user";
    var avatarUrl = String(data.avatar_url || "").trim();
    var storedPassword = PasswordService.prepareForStorage(rawPassword);

    var newRow = [
      id,              // A: id
      username,        // B: username
      displayName,     // C: display_name
      email,           // D: email
      avatarUrl,       // E: avatar_url
      now,             // F: created_at
      now,             // G: last_login
      status,          // H: status
      role,            // I: role
      storedPassword   // J: password
    ];

    sheet.appendRow(newRow);

    var token = generateSessionToken(id, storedPassword);
    var safeAccount = sanitizeAccount(newRow);

    return {
      success: true,
      message: "Account created successfully.",
      account: safeAccount,
      token: token
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ACTION: getAccount
 * Retrieves ONLY the caller's own account.
 * Strictly verifies identity via token or password.
 */
function handleGetAccount(data) {
  var accountId = String(data.id || "").trim();
  var token = String(data.token || "").trim();
  var password = String(data.password || "");

  if (!accountId) {
    return { success: false, error: "Account ID is required." };
  }

  var sheet = getTargetSheet();
  var found = findRowById(sheet, accountId);
  if (!found) {
    return { success: false, error: "Account not found." };
  }

  var isAuthorized = authenticateCaller(found.rowValues, token, password);
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. You cannot view other accounts." };
  }

  return {
    success: true,
    account: sanitizeAccount(found.rowValues),
    token: generateSessionToken(accountId, String(found.rowValues[9]))
  };
}

/**
 * ACTION: updateAccount
 * Allows the caller to update ONLY their own account.
 * Allowed updates: username, display_name, email, avatar_url, password.
 * Client CANNOT modify id, role, status, or created_at.
 */
function handleUpdateAccount(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return { success: false, error: "Server busy. Please try again." };
  }

  try {
    var accountId = String(data.id || "").trim();
    var token = String(data.token || "").trim();
    var currentPassword = String(data.current_password || data.password || "");
    var updates = data.updates || {};

    if (!accountId) {
      return { success: false, error: "Account ID is required." };
    }

    var sheet = getTargetSheet();
    var found = findRowById(sheet, accountId);
    if (!found) {
      return { success: false, error: "Account not found." };
    }

    var isAuthorized = authenticateCaller(found.rowValues, token, currentPassword);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized. You cannot edit other accounts." };
    }

    var rowValues = found.rowValues.slice();
    var allData = sheet.getDataRange().getValues();

    // 1. Update username if provided
    if (updates.username !== undefined) {
      var newUsername = String(updates.username).trim();
      if (!newUsername || newUsername.length < 3) {
        return { success: false, error: "Username must be at least 3 characters." };
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(newUsername)) {
        return { success: false, error: "Username may only contain letters, numbers, dots, dashes, and underscores." };
      }
      // Check uniqueness against other users
      for (var i = 1; i < allData.length; i++) {
        if (i + 1 !== found.rowIndex && String(allData[i][1]).trim().toLowerCase() === newUsername.toLowerCase()) {
          return { success: false, error: "Username is already taken by another account." };
        }
      }
      rowValues[1] = newUsername;
    }

    // 2. Update display_name if provided
    if (updates.display_name !== undefined) {
      var newDisplayName = String(updates.display_name).trim();
      if (!newDisplayName) newDisplayName = rowValues[1]; // fallback to username
      rowValues[2] = newDisplayName;
    }

    // 3. Update email if provided
    if (updates.email !== undefined) {
      var newEmail = String(updates.email).trim().toLowerCase();
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return { success: false, error: "Invalid email format." };
      }
      // Check uniqueness against other users
      for (var j = 1; j < allData.length; j++) {
        if (j + 1 !== found.rowIndex && String(allData[j][3]).trim().toLowerCase() === newEmail) {
          return { success: false, error: "Email is already in use by another account." };
        }
      }
      rowValues[3] = newEmail;
    }

    // 4. Update avatar_url if provided
    if (updates.avatar_url !== undefined) {
      rowValues[4] = String(updates.avatar_url).trim();
    }

    // 5. Update password if provided
    if (updates.password !== undefined && updates.password !== "") {
      var newPassword = String(updates.password);
      if (newPassword.length < 4) {
        return { success: false, error: "New password must be at least 4 characters." };
      }
      rowValues[9] = PasswordService.prepareForStorage(newPassword);
    }

    // Explicit security enforcement: NEVER allow modifying id, created_at, status, or role via client
    // rowValues[0], rowValues[5], rowValues[7], rowValues[8] remain original

    // Write updated row back to sheet
    var range = sheet.getRange(found.rowIndex, 1, 1, 10);
    range.setValues([rowValues]);

    var updatedToken = generateSessionToken(accountId, String(rowValues[9]));

    return {
      success: true,
      message: "Account updated successfully.",
      account: sanitizeAccount(rowValues),
      token: updatedToken
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ACTION: loginAccount (Helper action for authenticating existing KLS users)
 */
function handleLoginAccount(data) {
  var usernameOrEmail = String(data.usernameOrEmail || data.username || data.email || "").trim();
  var password = String(data.password || "");

  if (!usernameOrEmail || !password) {
    return { success: false, error: "Username/email and password are required." };
  }

  var sheet = getTargetSheet();
  var found = findRowByUsernameOrEmail(sheet, usernameOrEmail);
  if (!found) {
    return { success: false, error: "Invalid credentials." };
  }

  var storedPassword = String(found.rowValues[9]);
  if (!PasswordService.verify(password, storedPassword)) {
    return { success: false, error: "Invalid credentials." };
  }

  var now = new Date().toISOString();
  sheet.getRange(found.rowIndex, 7).setValue(now); // Col G: last_login
  found.rowValues[6] = now;

  var accountId = String(found.rowValues[0]);
  var token = generateSessionToken(accountId, storedPassword);

  return {
    success: true,
    message: "Login successful.",
    account: sanitizeAccount(found.rowValues),
    token: token
  };
}

/**
 * Web App HTTP POST Handler (Primary API Entry Point)
 * Receives JSON payloads sent with Content-Type: text/plain to avoid CORS issues.
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return jsonResponse({ success: false, error: "Invalid JSON format." });
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action;
    var result;

    switch (action) {
      case "createAccount":
        result = handleCreateAccount(payload);
        break;

      case "getAccount":
        result = handleGetAccount(payload);
        break;

      case "updateAccount":
        result = handleUpdateAccount(payload);
        break;

      case "loginAccount":
        result = handleLoginAccount(payload);
        break;

      default:
        result = { success: false, error: 'Unknown action "' + action + '".' };
        break;
    }

    return jsonResponse(result);
  } catch (globalError) {
    return jsonResponse({
      success: false,
      error: "Server error: " + globalError.toString()
    });
  }
}

/**
 * Web App HTTP GET Handler (Health check & fallback)
 */
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  if (action === "ping") {
    return jsonResponse({
      success: true,
      service: "KLS Account System",
      status: "online",
      timestamp: new Date().toISOString()
    });
  }

  if (action === "getAccount") {
    return jsonResponse(handleGetAccount(e.parameter));
  }

  return jsonResponse({
    service: "KLS Account System Web App",
    version: "1.0.0",
    status: "ready",
    endpoints: ["createAccount", "getAccount", "updateAccount", "loginAccount"]
  });
}
