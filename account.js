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


  const accountArea =
    document.getElementById("accountArea");


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
      "User"
    );

  }


  function getUsername(user) {

    return (
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      "user"
    );

  }


  function getAvatar(user) {

    return (
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      ""
    );

  }


  function getProvider(user) {

    const provider =
      user.app_metadata?.provider ||
      "unknown";

    switch (provider) {

      case "github":
        return "GitHub";

      case "google":
        return "Google";

      case "naver":
        return "Naver";

      case "azure":
      case "microsoft":
        return "Microsoft";

      default:
        return provider;

    }

  }


  async function updateAccount() {

    if (!accountArea) {
      return;
    }


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

      accountArea.innerHTML = `
        <a class="button primary" href="login/">
          Login
        </a>
      `;

      return;
    }


    const user = session.user;

    const name =
      escapeHtml(
        getUserName(user)
      );

    const username =
      escapeHtml(
        getUsername(user)
      );

    const avatar =
      escapeHtml(
        getAvatar(user)
      );

    const provider =
      escapeHtml(
        getProvider(user)
      );


    const avatarHTML = avatar
      ? `
        <img
          class="account-avatar"
          src="${avatar}"
          alt="${name}'s profile picture"
          referrerpolicy="no-referrer"
        >
      `
      : `
        <div class="account-avatar account-avatar-fallback">
          ${name.charAt(0).toUpperCase()}
        </div>
      `;


    accountArea.innerHTML = `

      <div class="account-card">

        ${avatarHTML}

        <div class="account-info">

          <strong class="account-name">
            ${name}
          </strong>

          <span class="account-username">
            @${username}
          </span>

          <span class="account-provider">
            ${provider} ✓
          </span>

        </div>

        <button
          class="button account-logout"
          type="button"
          id="logoutButton"
        >
          Log out
        </button>

      </div>

    `;


    const logoutButton =
      document.getElementById(
        "logoutButton"
      );


    logoutButton.addEventListener(
      "click",
      async () => {

        logoutButton.disabled = true;

        logoutButton.textContent =
          "Logging out...";


        const { error } =
          await klsSupabase.auth.signOut();


        if (error) {

          console.error(
            "KoshinLS: Logout failed:",
            error
          );

          logoutButton.disabled = false;

          logoutButton.textContent =
            "Log out";

          return;
        }


        updateAccount();

      }
    );

  }


  /*
   * Check saved session.
   */

  updateAccount();


  /*
   * React to login/logout.
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