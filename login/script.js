import { supabase } from "../supabase.js";
import {
  isKlsConfigured,
  loginKls,
  createKlsAccount,
  getKlsRecoveryQuestion,
  resetKlsPassword,
  fetchCurrentKlsAccount,
  getStoredKlsSession,
  clearStoredKlsSession,
} from "../klsAuth.js";

/*
 * Section Cards
 */
const loginSection = document.getElementById("login");
const messageSection = document.getElementById("message");
const klsLoginCard = document.getElementById("klsLoginForm");
const klsRegisterCard = document.getElementById("klsRegisterForm");
const klsForgotCard = document.getElementById("klsForgotForm");

/*
 * Message Elements
 */
const label = document.getElementById("label");
const title = document.getElementById("title");
const text = document.getElementById("text");

/*
 * Navigation Buttons
 */
const backButton = document.getElementById("back");
const guestButton = document.getElementById("guest");
const googleButton = document.getElementById("googleLogin");
const githubButton = document.getElementById("githubLogin");
const klsButton = document.getElementById("klsLogin");
const createAccountButton = document.getElementById("createAccount");

/*
 * KLS Login Form Elements
 */
const klsSignInForm = document.getElementById("klsSignInForm");
const klsLoginId = document.getElementById("klsLoginId");
const klsLoginPassword = document.getElementById("klsLoginPassword");
const klsLoginSubmit = document.getElementById("klsLoginSubmit");
const klsLoginError = document.getElementById("klsLoginError");
const klsLoginBack = document.getElementById("klsLoginBack");
const klsForgotLink = document.getElementById("klsForgotLink");

/*
 * KLS Register Form Elements
 */
const klsSignUpForm = document.getElementById("klsSignUpForm");
const klsRegUsername = document.getElementById("klsRegUsername");
const klsRegDisplayName = document.getElementById("klsRegDisplayName");
const klsRegEmail = document.getElementById("klsRegEmail");
const klsRegPassword = document.getElementById("klsRegPassword");
const klsRegRecoveryQuestion = document.getElementById("klsRegRecoveryQuestion");
const klsRegRecoveryAnswer = document.getElementById("klsRegRecoveryAnswer");
const klsRegSubmit = document.getElementById("klsRegSubmit");
const klsRegError = document.getElementById("klsRegError");
const klsRegBack = document.getElementById("klsRegBack");

/*
 * KLS Recovery Form Elements
 */
const klsForgotStep1 = document.getElementById("klsForgotStep1");
const klsForgotStep2 = document.getElementById("klsForgotStep2");
const klsForgotId = document.getElementById("klsForgotId");
const klsForgotNextBtn = document.getElementById("klsForgotNextBtn");
const klsForgotError1 = document.getElementById("klsForgotError1");
const klsForgotQuestionDisplay = document.getElementById("klsForgotQuestionDisplay");
const klsForgotAnswer = document.getElementById("klsForgotAnswer");
const klsForgotNewPassword = document.getElementById("klsForgotNewPassword");
const klsForgotSubmitBtn = document.getElementById("klsForgotSubmitBtn");
const klsForgotError2 = document.getElementById("klsForgotError2");
const klsForgotBackBtn = document.getElementById("klsForgotBackBtn");

/**
 * Switch active visible card
 */
function showCard(activeCard) {
  const cards = [
    loginSection,
    messageSection,
    klsLoginCard,
    klsRegisterCard,
    klsForgotCard,
  ];

  cards.forEach((card) => {
    if (card) {
      if (card === activeCard) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    }
  });
}

/**
 * Show feedback / notification card
 */
function showMessage(newLabel, newTitle, newText) {
  if (label) label.textContent = newLabel;
  if (title) title.textContent = newTitle;
  if (text) text.textContent = newText;
  showCard(messageSection);
}

/**
 * Back to main login options
 */
backButton?.addEventListener("click", () => {
  showCard(loginSection);
});

klsLoginBack?.addEventListener("click", () => {
  showCard(loginSection);
});

klsRegBack?.addEventListener("click", () => {
  showCard(loginSection);
});

klsForgotBackBtn?.addEventListener("click", () => {
  showCard(klsLoginCard);
});

klsForgotLink?.addEventListener("click", () => {
  if (klsForgotId && klsLoginId?.value) {
    klsForgotId.value = klsLoginId.value;
  }
  klsForgotStep1?.classList.remove("hidden");
  klsForgotStep2?.classList.add("hidden");
  if (klsForgotError1) klsForgotError1.classList.add("hidden");
  if (klsForgotError2) klsForgotError2.classList.add("hidden");
  showCard(klsForgotCard);
});

/**
 * Clear existing Supabase session
 */
async function clearSupabaseSession() {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn("KoshinLS: Notice while clearing Supabase session:", err);
  }
}

/**
 * Google / GitHub OAuth
 */
async function startOAuth(provider, button) {
  if (!supabase) {
    showMessage(
      "LOGIN ERROR",
      "Supabase unavailable.",
      "The login system is not configured correctly."
    );
    return;
  }

  if (button) button.disabled = true;

  try {
    // Clear other sessions
    clearStoredKlsSession();
    sessionStorage.removeItem("koshinls_guest");
    await clearSupabaseSession();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "https://koshinls.localplayer.dev/auth/",
      },
    });

    if (error) {
      console.error(`KoshinLS ${provider} OAuth error:`, error);
      showMessage("LOGIN ERROR", "Login failed.", error.message);
      if (button) button.disabled = false;
      return;
    }
  } catch (error) {
    console.error(`KoshinLS ${provider} login error:`, error);
    showMessage(
      "LOGIN ERROR",
      "Login failed.",
      error.message || "Something went wrong."
    );
    if (button) button.disabled = false;
  }
}

googleButton?.addEventListener("click", async () => {
  await startOAuth("google", googleButton);
});

githubButton?.addEventListener("click", async () => {
  await startOAuth("github", githubButton);
});

/**
 * Guest mode
 */
guestButton?.addEventListener("click", async () => {
  clearStoredKlsSession();
  await clearSupabaseSession();
  sessionStorage.setItem("koshinls_guest", "true");

  showMessage(
    "GUEST",
    "Welcome.",
    "You are continuing as a guest."
  );
});

/**
 * KLS Account Login Option Clicked
 */
klsButton?.addEventListener("click", () => {
  if (!isKlsConfigured()) {
    showMessage(
      "KLS ACCOUNT",
      "Configuration Needed",
      "KLS_ACCOUNT_API_URL is not configured yet. Please configure the Apps Script Web App URL."
    );
    return;
  }

  if (klsLoginError) klsLoginError.classList.add("hidden");
  showCard(klsLoginCard);
});

/**
 * Create KLS Account Option Clicked
 */
createAccountButton?.addEventListener("click", () => {
  if (!isKlsConfigured()) {
    showMessage(
      "KLS ACCOUNT",
      "Configuration Needed",
      "KLS_ACCOUNT_API_URL is not configured yet. Please configure the Apps Script Web App URL."
    );
    return;
  }

  if (klsRegError) klsRegError.classList.add("hidden");
  showCard(klsRegisterCard);
});

/**
 * KLS Sign In Form Submit
 */
klsSignInForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const identifier = klsLoginId?.value.trim();
  const password = klsLoginPassword?.value;

  if (!identifier || !password) {
    if (klsLoginError) {
      klsLoginError.textContent = "Please enter both username/email and password.";
      klsLoginError.classList.remove("hidden");
    }
    return;
  }

  if (klsLoginSubmit) {
    klsLoginSubmit.disabled = true;
    klsLoginSubmit.textContent = "Signing in…";
  }
  if (klsLoginError) klsLoginError.classList.add("hidden");

  try {
    const result = await loginKls(identifier, password);

    if (result.success && result.account) {
      // Clear conflicting sessions
      await clearSupabaseSession();
      sessionStorage.removeItem("koshinls_guest");

      const name = result.account.display_name || result.account.username;
      showMessage(
        "SIGNED IN",
        `Welcome, ${name}.`,
        "You are now signed in with your KLS account. Redirecting home…"
      );

      setTimeout(() => {
        window.location.href = "../";
      }, 900);
      return;
    }

    if (klsLoginError) {
      klsLoginError.textContent = result.error || "Invalid username or password.";
      klsLoginError.classList.remove("hidden");
    }
  } catch (err) {
    if (klsLoginError) {
      klsLoginError.textContent = err.message || "Unable to sign in. Please try again.";
      klsLoginError.classList.remove("hidden");
    }
  } finally {
    if (klsLoginSubmit) {
      klsLoginSubmit.disabled = false;
      klsLoginSubmit.textContent = "Sign In";
    }
  }
});

/**
 * KLS Registration Form Submit
 */
klsSignUpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = klsRegUsername?.value.trim();
  const display_name = klsRegDisplayName?.value.trim();
  const email = klsRegEmail?.value.trim();
  const password = klsRegPassword?.value;
  const recovery_question = klsRegRecoveryQuestion?.value.trim() || "";
  const recovery_answer = klsRegRecoveryAnswer?.value.trim() || "";

  if (!username || !display_name || !email || !password) {
    if (klsRegError) {
      klsRegError.textContent = "Please fill in all required fields.";
      klsRegError.classList.remove("hidden");
    }
    return;
  }

  if (password.length < 4) {
    if (klsRegError) {
      klsRegError.textContent = "Password must be at least 4 characters.";
      klsRegError.classList.remove("hidden");
    }
    return;
  }

  if (klsRegSubmit) {
    klsRegSubmit.disabled = true;
    klsRegSubmit.textContent = "Creating account…";
  }
  if (klsRegError) klsRegError.classList.add("hidden");

  try {
    const result = await createKlsAccount({
      username,
      display_name,
      email,
      password,
      recovery_question,
      recovery_answer,
    });

    if (result.success && result.account) {
      await clearSupabaseSession();
      sessionStorage.removeItem("koshinls_guest");

      showMessage(
        "ACCOUNT CREATED",
        `Welcome, ${result.account.display_name}!`,
        "Your KLS account is ready. Redirecting home…"
      );

      setTimeout(() => {
        window.location.href = "../";
      }, 900);
      return;
    }

    if (klsRegError) {
      klsRegError.textContent = result.error || "Could not create account.";
      klsRegError.classList.remove("hidden");
    }
  } catch (err) {
    if (klsRegError) {
      klsRegError.textContent = err.message || "An unexpected error occurred.";
      klsRegError.classList.remove("hidden");
    }
  } finally {
    if (klsRegSubmit) {
      klsRegSubmit.disabled = false;
      klsRegSubmit.textContent = "Create Account";
    }
  }
});

/**
 * KLS Password Recovery - Step 1: Fetch Question
 */
klsForgotNextBtn?.addEventListener("click", async () => {
  const identifier = klsForgotId?.value.trim();
  if (!identifier) {
    if (klsForgotError1) {
      klsForgotError1.textContent = "Please enter your username or email.";
      klsForgotError1.classList.remove("hidden");
    }
    return;
  }

  if (klsForgotNextBtn) {
    klsForgotNextBtn.disabled = true;
    klsForgotNextBtn.textContent = "Checking…";
  }
  if (klsForgotError1) klsForgotError1.classList.add("hidden");

  try {
    const result = await getKlsRecoveryQuestion(identifier);

    if (result.success && result.question) {
      if (klsForgotQuestionDisplay) {
        klsForgotQuestionDisplay.textContent = `Security Question: ${result.question}`;
      }
      klsForgotStep1?.classList.add("hidden");
      klsForgotStep2?.classList.remove("hidden");
      return;
    }

    if (klsForgotError1) {
      klsForgotError1.textContent =
        result.error || "No recovery question found for this account.";
      klsForgotError1.classList.remove("hidden");
    }
  } catch (err) {
    if (klsForgotError1) {
      klsForgotError1.textContent = err.message || "Failed to find account.";
      klsForgotError1.classList.remove("hidden");
    }
  } finally {
    if (klsForgotNextBtn) {
      klsForgotNextBtn.disabled = false;
      klsForgotNextBtn.textContent = "Continue";
    }
  }
});

/**
 * KLS Password Recovery - Step 2: Submit Reset
 */
klsForgotStep2?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const identifier = klsForgotId?.value.trim();
  const recovery_answer = klsForgotAnswer?.value.trim();
  const new_password = klsForgotNewPassword?.value;

  if (!recovery_answer || !new_password) {
    if (klsForgotError2) {
      klsForgotError2.textContent = "Please answer the question and provide a new password.";
      klsForgotError2.classList.remove("hidden");
    }
    return;
  }

  if (new_password.length < 4) {
    if (klsForgotError2) {
      klsForgotError2.textContent = "New password must be at least 4 characters.";
      klsForgotError2.classList.remove("hidden");
    }
    return;
  }

  if (klsForgotSubmitBtn) {
    klsForgotSubmitBtn.disabled = true;
    klsForgotSubmitBtn.textContent = "Updating password…";
  }
  if (klsForgotError2) klsForgotError2.classList.add("hidden");

  try {
    const result = await resetKlsPassword({
      identifier,
      recovery_answer,
      new_password,
    });

    if (result.success) {
      showMessage(
        "PASSWORD UPDATED",
        "Success!",
        "Your password has been reset. You can now sign in with your new credentials."
      );
      return;
    }

    if (klsForgotError2) {
      klsForgotError2.textContent = result.error || "Could not reset password.";
      klsForgotError2.classList.remove("hidden");
    }
  } catch (err) {
    if (klsForgotError2) {
      klsForgotError2.textContent = err.message || "Failed to update password.";
      klsForgotError2.classList.remove("hidden");
    }
  } finally {
    if (klsForgotSubmitBtn) {
      klsForgotSubmitBtn.disabled = false;
      klsForgotSubmitBtn.textContent = "Update Password";
    }
  }
});

/**
 * Check existing authentication session on load
 */
async function checkExistingSession() {
  // Check Supabase session
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        const name =
          user.user_metadata?.user_name ||
          user.user_metadata?.preferred_username ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Koshin";

        showMessage(
          "SIGNED IN",
          `Welcome, ${name}.`,
          "You're already signed in."
        );
        return;
      }
    } catch (error) {
      console.warn("KoshinLS: Supabase session check notice:", error);
    }
  }

  // Check KLS session
  const klsSession = getStoredKlsSession();
  if (klsSession?.sessionToken) {
    try {
      const account = await fetchCurrentKlsAccount();
      if (account) {
        const name = account.display_name || account.username;
        showMessage(
          "SIGNED IN",
          `Welcome, ${name}.`,
          "You are signed in with your KLS account."
        );
        return;
      }
    } catch (err) {
      console.warn("KoshinLS: KLS session check notice:", err);
    }
  }

  // Check Guest session
  if (sessionStorage.getItem("koshinls_guest") === "true") {
    showMessage(
      "GUEST",
      "Welcome.",
      "You are continuing as a guest."
    );
  }
}

checkExistingSession();