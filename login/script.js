import { supabase } from "../supabase.js";


/*
 * KoshinLS Login
 */

const loginSection = document.getElementById("login");
const messageSection = document.getElementById("message");

const label = document.getElementById("label");
const title = document.getElementById("title");
const text = document.getElementById("text");

const backButton = document.getElementById("back");
const guestButton = document.getElementById("guest");

const googleButton = document.getElementById("googleLogin");
const githubButton = document.getElementById("githubLogin");
const klsButton = document.getElementById("klsLogin");
const createAccountButton = document.getElementById("createAccount");


/*
 * Show message
 */

function showMessage(
  newLabel,
  newTitle,
  newText
) {
  if (label) {
    label.textContent = newLabel;
  }

  if (title) {
    title.textContent = newTitle;
  }

  if (text) {
    text.textContent = newText;
  }

  loginSection?.classList.add("hidden");
  messageSection?.classList.remove("hidden");
}


/*
 * Back to login
 */

backButton?.addEventListener("click", () => {
  messageSection?.classList.add("hidden");
  loginSection?.classList.remove("hidden");
});


/*
 * Clear existing Supabase session
 */

async function clearCurrentSession() {
  if (!supabase) {
    return;
  }

  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();

  if (session) {
    await supabase.auth.signOut();
  }
}


/*
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

  if (button) {
    button.disabled = true;
  }

  try {
    await clearCurrentSession();

    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider,

      options: {
        redirectTo:
          "https://koshinls.localplayer.dev/auth/"
      }
    });

    if (error) {
      console.error(
        `KoshinLS ${provider} OAuth error:`,
        error
      );

      showMessage(
        "LOGIN ERROR",
        "Login failed.",
        error.message
      );

      if (button) {
        button.disabled = false;
      }

      return;
    }

  } catch (error) {

    console.error(
      `KoshinLS ${provider} login error:`,
      error
    );

    showMessage(
      "LOGIN ERROR",
      "Login failed.",
      error.message || "Something went wrong."
    );

    if (button) {
      button.disabled = false;
    }
  }
}


/*
 * Google
 */

googleButton?.addEventListener(
  "click",
  async () => {
    await startOAuth(
      "google",
      googleButton
    );
  }
);


/*
 * GitHub
 */

githubButton?.addEventListener(
  "click",
  async () => {
    await startOAuth(
      "github",
      githubButton
    );
  }
);


/*
 * KLS account
 *
 * Account form will be added here.
 */

klsButton?.addEventListener(
  "click",
  () => {
    showMessage(
      "KLS ACCOUNT",
      "KLS login.",
      "KLS account login is coming next."
    );
  }
);


/*
 * Create KLS account
 *
 * Account creation form will be added here.
 */

createAccountButton?.addEventListener(
  "click",
  () => {
    showMessage(
      "KLS ACCOUNT",
      "Create your account.",
      "KLS account creation is coming next."
    );
  }
);


/*
 * Guest
 */

guestButton?.addEventListener(
  "click",
  () => {
    sessionStorage.setItem(
      "koshinls_guest",
      "true"
    );

    showMessage(
      "GUEST",
      "Welcome.",
      "You are continuing as a guest."
    );
  }
);


/*
 * Check existing Supabase session
 */

async function checkExistingSession() {
  if (!supabase) {
    return;
  }

  try {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();

    if (session) {
      console.log(
        "KoshinLS: existing Supabase session found."
      );
    }

  } catch (error) {
    console.error(
      "KoshinLS: session check failed:",
      error
    );
  }
}


checkExistingSession();