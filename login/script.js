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


  /*
   * Provider login buttons
   */

  document
    .querySelectorAll(".provider")
    .forEach((button) => {

      button.addEventListener(
        "click",
        async () => {

          const provider =
            button.dataset.provider;


          /*
           * GitHub
           */

          if (provider === "GitHub") {

            button.disabled = true;
            button.textContent =
              "Connecting to GitHub...";


            const { error } =
              await klsSupabase.auth.signInWithOAuth({

                provider: "github",

                options: {
                  redirectTo:
                    "https://koshinls.localplayer.dev/auth/"
                }

              });


            if (error) {

              console.error(
                "KoshinLS GitHub login:",
                error
              );

              button.disabled = false;
              button.textContent = "GitHub";


              showMessage(
                "GITHUB",
                "Login failed",
                error.message
              );

            }

            return;
          }


          /*
           * Google
           */

          if (provider === "Google") {

            button.disabled = true;
            button.textContent =
              "Connecting to Google...";


            const { error } =
              await klsSupabase.auth.signInWithOAuth({

                provider: "google",

                options: {
                  redirectTo:
                    "https://koshinls.localplayer.dev/auth/"
                }

              });


            if (error) {

              console.error(
                "KoshinLS Google login:",
                error
              );

              button.disabled = false;
              button.textContent = "Google";


              showMessage(
                "GOOGLE",
                "Login failed",
                error.message
              );

            }

            return;
          }


          /*
           * Naver / Microsoft
           */

          showMessage(
            provider.toUpperCase(),
            "Coming soon",
            `${provider} login will be connected next.`
          );

        }
      );

    });


  /*
   * Guest
   */

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


  /*
   * Check saved session ONCE
   * when the login page loads.
   */

  async function checkExistingSession() {

    const {
      data: { session },
      error
    } =
      await klsSupabase.auth.getSession();


    if (error) {

      console.error(
        "KoshinLS: Could not get session:",
        error
      );

      return;
    }


    if (!session?.user) {
      return;
    }


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
      user.app_metadata?.provider ||
      "Account";


    providerName =
      providerName.charAt(0).toUpperCase() +
      providerName.slice(1);


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