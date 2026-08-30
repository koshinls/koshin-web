const config = window.KLS_SUPABASE_CONFIG;

if (!config || !config.url || !config.publishableKey) {

  console.error(
    "KoshinLS: Supabase configuration is missing."
  );

} else {

  const klsSupabase =
    window.supabase.createClient(
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


  const login =
    document.getElementById("login");

  const message =
    document.getElementById("message");

  const label =
    document.getElementById("label");

  const title =
    document.getElementById("title");

  const text =
    document.getElementById("text");


  function showMessage(
    labelText,
    titleText,
    textText
  ) {

    label.textContent = labelText;

    title.textContent = titleText;

    text.textContent = textText;

    login.classList.add("hidden");

    message.classList.remove("hidden");

  }


  /* -------------------------
     GitHub + Google
  ------------------------- */

  document
    .querySelectorAll(".provider")
    .forEach((button) => {

      button.addEventListener(
        "click",
        async () => {

          const provider =
            button.dataset.provider;


          /* -------------------------
             GitHub
          ------------------------- */

          if (provider === "GitHub") {

            button.disabled = true;

            button.textContent =
              "Connecting to GitHub...";


            const { error } =
              await klsSupabase.auth.signInWithOAuth({

                provider: "github",

                options: {

                  redirectTo:
                    "https://koshinls.localplayer.dev/"

                }

              });


            if (error) {

              console.error(
                "KoshinLS GitHub login:",
                error
              );

              button.disabled = false;

              button.textContent =
                "GitHub";


              showMessage(
                "GITHUB",
                "Login failed",
                error.message
              );

            }

            return;
          }


          /* -------------------------
             Google
          ------------------------- */

          if (provider === "Google") {

            button.disabled = true;

            button.textContent =
              "Connecting to Google...";


            const { error } =
              await klsSupabase.auth.signInWithOAuth({

                provider: "google",

                options: {

                  redirectTo:
                    "https://koshinls.localplayer.dev/"

                }

              });


            if (error) {

              console.error(
                "KoshinLS Google login:",
                error
              );

              button.disabled = false;

              button.textContent =
                "Google";


              showMessage(
                "GOOGLE",
                "Login failed",
                error.message
              );

            }

            return;
          }


          /* -------------------------
             Other providers
          ------------------------- */

          showMessage(
            provider.toUpperCase(),
            "Coming soon",
            `${provider} login will be connected next.`
          );

        }
      );

    });


  /* -------------------------
     Guest
  ------------------------- */

  document
    .getElementById("guest")
    .addEventListener(
      "click",
      () => {

        showMessage(
          "GUEST",
          "You're in as a guest.",
          "Guest mode is working. No account was created."
        );

      }
    );


  /* -------------------------
     Existing session
  ------------------------- */

  klsSupabase.auth.onAuthStateChange(
    (event, session) => {

      if (
        (event === "SIGNED_IN" ||
         event === "INITIAL_SESSION") &&
        session?.user
      ) {

        const user =
          session.user;


        const name =
          user.user_metadata?.user_name ||
          user.user_metadata?.preferred_username ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Koshin";


        let providerName =
          "Account";


        if (
          user.app_metadata?.provider
        ) {

          providerName =
            user.app_metadata.provider;

        }


        providerName =
          providerName.charAt(0).toUpperCase() +
          providerName.slice(1);


        showMessage(
          "SIGNED IN",
          `Welcome, ${name}.`,
          `You are now signed in with ${providerName}.`
        );

      }

    }
  );


  /* -------------------------
     Back
  ------------------------- */

  document
    .getElementById("back")
    .addEventListener(
      "click",
      () => {

        message.classList.add("hidden");

        login.classList.remove("hidden");

      }
    );

}