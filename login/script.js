import { supabase } from '../supabase.js';

const login = document.getElementById("login");
const message = document.getElementById("message");
const label = document.getElementById("label");
const title = document.getElementById("title");
const text = document.getElementById("text");

function showMessage(labelText, titleText, textText) {
  if (label) label.textContent = labelText;
  if (title) title.textContent = titleText;
  if (text) text.textContent = textText;

  if (login) login.classList.add("hidden");
  if (message) message.classList.remove("hidden");
}

/**
 * Clears any active browser authentication session before switching login methods.
 *
 * IMPORTANT:
 * - Only signs out / clears the local browser session tokens.
 * - Does NOT delete user accounts, database data, or profiles.
 * - Never called merely because /login/ was opened.
 */
export async function clearCurrentSession() {
  if (supabase) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("KoshinLS: Notice while clearing Supabase session:", error.message);
      }
    } catch (err) {
      console.warn("KoshinLS: Exception while clearing Supabase session:", err);
    }
  }

  // Clear any guest session marker from browser storage
  sessionStorage.removeItem("koshinls_guest");
}

/**
 * Auth Methods Registry.
 *
 * Each method defines its specific login routine.
 * When invoked via startLoginFlow(), any existing browser session
 * is guaranteed to be cleared FIRST before the selected method starts.
 *
 * To add a future method (such as Special Account / custom account system):
 * 1. Define its handler function here (e.g., specialAccount).
 * 2. Invoke startLoginFlow("specialAccount", options) from the UI.
 */
export const AUTH_METHODS = {
  /**
   * Google OAuth Flow:
   * 1. User clicks Google
   * 2. (Existing Supabase browser session cleared first by startLoginFlow)
   * 3. Start Google OAuth
   * 4. Complete OAuth through /auth/
   * 5. Create/use new Google session
   */
  async google(button) {
    if (!supabase) {
      console.error("KoshinLS: Supabase client is not initialized.");
      showMessage("ERROR", "Configuration missing", "Supabase environment configuration is missing.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Connecting to Google...";
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://koshinls.localplayer.dev/auth/",
      },
    });

    if (error) {
      console.error("KoshinLS Google login:", error);
      if (button) {
        button.disabled = false;
        button.textContent = "Google";
      }
      showMessage("GOOGLE", "Login failed", error.message);
    }
  },

  /**
   * GitHub OAuth Flow:
   * 1. User clicks GitHub
   * 2. (Existing Supabase browser session cleared first by startLoginFlow)
   * 3. Start GitHub OAuth
   * 4. Complete OAuth through /auth/
   * 5. Create/use new GitHub session
   */
  async github(button) {
    if (!supabase) {
      console.error("KoshinLS: Supabase client is not initialized.");
      showMessage("ERROR", "Configuration missing", "Supabase environment configuration is missing.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Connecting to GitHub...";
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "https://koshinls.localplayer.dev/auth/",
      },
    });

    if (error) {
      console.error("KoshinLS GitHub login:", error);
      if (button) {
        button.disabled = false;
        button.textContent = "GitHub";
      }
      showMessage("GITHUB", "Login failed", error.message);
    }
  },

  /**
   * Guest Flow:
   * 1. User clicks Guest
   * 2. (Existing Supabase browser session cleared first by startLoginFlow)
   * 3. Start the guest login/session
   * 4. Continue normally
   */
  async guest() {
    sessionStorage.setItem("koshinls_guest", "true");
    showMessage(
      "GUEST",
      "You're in as a guest.",
      "Guest mode is working. No account was created."
    );
  },

  /**
   * Future Method: Special Account / Custom Account system
   *
   * Designed for seamless future extension:
   * 1. User clicks/submits Special Account
   * 2. (Existing session is automatically cleared FIRST by startLoginFlow)
   * 3. Authenticate with the custom account system
   * 4. Complete session setup and continue normally
   */
  async specialAccount(payload) {
    // Extension point: Custom account authentication logic will be handled here
    console.log("KoshinLS: Special Account authentication initiated.", payload);
  },
};

/**
 * Unified login dispatcher:
 * Ensures the previous browser authentication session is ALWAYS cleared first
 * before triggering the selected login method.
 *
 * @param {string} methodKey - The key corresponding to the handler in AUTH_METHODS
 * @param {...any} args - Arguments passed to the method handler
 */
export async function startLoginFlow(methodKey, ...args) {
  const handler = AUTH_METHODS[methodKey];
  if (!handler) {
    console.error(`KoshinLS: Unknown login method "${methodKey}".`);
    return;
  }

  // 1. ALWAYS clear currently saved authentication session FIRST
  await clearCurrentSession();

  // 2. Start selected login method
  return await handler(...args);
}

/*
 * Provider login buttons (Google, GitHub)
 */
document.querySelectorAll(".provider").forEach((button) => {
  button.addEventListener("click", async () => {
    const provider = button.dataset.provider?.toLowerCase();
    if (provider === "google" || provider === "github") {
      await startLoginFlow(provider, button);
    } else {
      console.warn(`KoshinLS: Unrecognized provider button "${provider}".`);
    }
  });
});

/*
 * Guest
 */
const guestButton = document.getElementById("guest");
if (guestButton) {
  guestButton.addEventListener("click", async () => {
    await startLoginFlow("guest", guestButton);
  });
}

/*
 * Check saved session ONCE when the login page loads.
 * IMPORTANT: Does NOT clear the session when /login/ loads.
 */
async function checkExistingSession() {
  if (!supabase) return;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("KoshinLS: Could not get session:", error);
    return;
  }

  if (!session?.user) {
    return;
  }

  const user = session.user;
  const name =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Koshin";

  let providerName = user.app_metadata?.provider || "Account";
  providerName = providerName.charAt(0).toUpperCase() + providerName.slice(1);

  showMessage(
    "SIGNED IN",
    `Welcome, ${name}.`,
    `You are already signed in with ${providerName}.`
  );
}

checkExistingSession();

/*
 * Back
 */
const backButton = document.getElementById("back");
if (backButton) {
  backButton.addEventListener("click", () => {
    if (message) message.classList.add("hidden");
    if (login) login.classList.remove("hidden");
  });
}