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

/*
 * Provider login buttons (Google, GitHub)
 */
document.querySelectorAll(".provider").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!supabase) {
      console.error("KoshinLS: Supabase client is not initialized.");
      showMessage("ERROR", "Configuration missing", "Supabase environment configuration is missing.");
      return;
    }

    const provider = button.dataset.provider;

    /*
     * Google
     */
    if (provider === "Google") {
      button.disabled = true;
      button.textContent = "Connecting to Google...";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://koshinls.localplayer.dev/auth/",
        },
      });

      if (error) {
        console.error("KoshinLS Google login:", error);
        button.disabled = false;
        button.textContent = "Google";
        showMessage("GOOGLE", "Login failed", error.message);
      }
      return;
    }

    /*
     * GitHub
     */
    if (provider === "GitHub") {
      button.disabled = true;
      button.textContent = "Connecting to GitHub...";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: "https://koshinls.localplayer.dev/auth/",
        },
      });

      if (error) {
        console.error("KoshinLS GitHub login:", error);
        button.disabled = false;
        button.textContent = "GitHub";
        showMessage("GITHUB", "Login failed", error.message);
      }
      return;
    }
  });
});

/*
 * Guest
 */
const guestButton = document.getElementById("guest");
if (guestButton) {
  guestButton.addEventListener("click", () => {
    showMessage(
      "GUEST",
      "You're in as a guest.",
      "Guest mode is working. No account was created."
    );
  });
}

/*
 * Check saved session ONCE when the login page loads.
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