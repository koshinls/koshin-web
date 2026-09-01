const config = window.KLS_SUPABASE_CONFIG;

if (
  !config ||
  !config.url ||
  !config.publishableKey
) {

  console.error(
    "KoshinLS: Supabase configuration is missing."
  );

} else {

  const supabaseClient =
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


  const status =
    document.getElementById("status");


  async function finishLogin() {

    status.textContent =
      "Checking your account…";


    /*
     * Give Supabase a moment to process
     * the OAuth callback.
     */

    await new Promise(
      resolve => setTimeout(resolve, 500)
    );


    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "KoshinLS: Session error:",
        error
      );

      status.textContent =
        "Login failed. Returning to login…";


      setTimeout(() => {

        window.location.href =
          "../login/";

      }, 1500);

      return;
    }


    if (!session?.user) {

      /*
       * OAuth may still be finishing.
       * Try once more.
       */

      status.textContent =
        "Finishing authentication…";


      await new Promise(
        resolve => setTimeout(resolve, 1000)
      );


      const {
        data: retryData
      } =
        await supabaseClient.auth.getSession();


      if (!retryData?.session) {

        status.textContent =
          "No session found. Returning to login…";


        setTimeout(() => {

          window.location.href =
            "../login/";

        }, 1500);

        return;
      }

    }


    /*
     * Session exists.
     * NOW go home.
     */

    status.textContent =
      "Login complete. Welcome!";


    setTimeout(() => {

      window.location.href =
        "../";

    }, 300);

  }


  finishLogin();

}