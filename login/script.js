const config = window.KLS_SUPABASE_CONFIG;

const login = document.getElementById("login");
const message = document.getElementById("message");
const label = document.getElementById("label");
const title = document.getElementById("title");
const text = document.getElementById("text");

const supabase = window.supabase.createClient(
  config.url,
  config.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

function showMessage(labelText, titleText, textText) {
  label.textContent = labelText;
  title.textContent = titleText;
  text.textContent = textText;

  login.classList.add("hidden");
  message.classList.remove("hidden");
}

/* -------------------------
   GitHub login
------------------------- */

document
  .querySelector('[data-provider="GitHub"]')
  .addEventListener("click", async () => {

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "https://koshinls.localplayer.dev/login/"
      }
    });

    if (error) {
      showMessage(
        "GITHUB",
        "Login failed",
        error.message
      );
    }
  });


/* -------------------------
   Other providers
------------------------- */

document
  .querySelectorAll(".provider")
  .forEach((button) => {

    if (button.dataset.provider === "GitHub") return;

    button.addEventListener("click", () => {

      showMessage(
        button.dataset.provider.toUpperCase(),
        "Coming soon",
        `${button.dataset.provider} login will be connected next.`
      );

    });

  });


/* -------------------------
   Guest
------------------------- */

document
  .getElementById("guest")
  .addEventListener("click", () => {

    showMessage(
      "GUEST",
      "You're in as a guest.",
      "Guest mode is working. No account was created."
    );

  });


/* -------------------------
   Check existing session
------------------------- */

supabase.auth.onAuthStateChange((event, session) => {

  if (event === "SIGNED_IN" && session?.user) {

    const user = session.user;

    showMessage(
      "SIGNED IN",
      `Welcome, ${user.user_metadata?.user_name || user.email || "Koshin"}.`,
      "You are now signed in with GitHub."
    );

  }

});


/* -------------------------
   Back
------------------------- */

document
  .getElementById("back")
  .addEventListener("click", () => {

    message.classList.add("hidden");
    login.classList.remove("hidden");

  });