const config = window.KLS_SUPABASE_CONFIG;

if (!config || !config.url || !config.publishableKey) {
  console.error("KoshinLS: Supabase configuration is missing.");
} else {

  const klsSupabase = window.supabase.createClient(
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


  const accountArea = document.getElementById("accountArea");


  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function getUserName(user) {

    return (
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "User"
    );

  }


  async function updateAccount() {

    if (!accountArea) {
      return;
    }

    const {
      data: { session },
      error
    } = await klsSupabase.auth.getSession();


    if (error) {

      console.error(
        "KoshinLS: Could not get session:",
        error
      );

      return;
    }


    if (!session?.user) {

      accountArea.innerHTML = `
        <a class="button primary" href="login/">
          Login
        </a>
      `;

      return;
    }


    const user = session.user;
    const name = escapeHtml(getUserName(user));


    accountArea.innerHTML = `
      <div class="account">

        <span>
          Welcome, ${name}
        </span>

        <button
          class="button"
          type="button"
          id="logoutButton"
        >
          Log out
        </button>

      </div>
    `;


    const logoutButton =
      document.getElementById("logoutButton");


    logoutButton.addEventListener(
      "click",
      async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";


        const { error } =
          await klsSupabase.auth.signOut();


        if (error) {

          console.error(
            "KoshinLS: Logout failed:",
            error
          );

          logoutButton.disabled = false;
          logoutButton.textContent = "Log out";

          return;
        }


        updateAccount();

      }
    );

  }


  /*
   * Check the saved session immediately.
   */
  updateAccount();


  /*
   * Keep the website synchronized if the
   * authentication state changes.
   */
  klsSupabase.auth.onAuthStateChange(
    (event) => {

      console.log(
        "KoshinLS auth event:",
        event
      );

      updateAccount();

    }
  );

}