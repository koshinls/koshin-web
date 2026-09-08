import { supabase } from '../supabase.js';

const status = document.getElementById("status");

async function finishLogin() {
  if (!supabase) {
    console.error("KoshinLS: Supabase client is not initialized.");
    if (status) {
      status.textContent = "Configuration error. Supabase environment is missing.";
    }
    return;
  }

  if (status) {
    status.textContent = "Checking your account…";
  }

  /*
   * Give Supabase a moment to process
   * the OAuth callback.
   */
  await new Promise((resolve) => setTimeout(resolve, 500));

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("KoshinLS: Session error:", error);
    if (status) {
      status.textContent = "Login failed. Returning to login…";
    }

    setTimeout(() => {
      window.location.href = "../login/";
    }, 1500);

    return;
  }

  if (!session?.user) {
    /*
     * OAuth may still be finishing.
     * Try once more.
     */
    if (status) {
      status.textContent = "Finishing authentication…";
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const {
      data: retryData,
    } = await supabase.auth.getSession();

    if (!retryData?.session) {
      if (status) {
        status.textContent = "No session found. Returning to login…";
      }

      setTimeout(() => {
        window.location.href = "../login/";
      }, 1500);

      return;
    }
  }

  /*
   * Session exists.
   * NOW go home.
   */
  if (status) {
    status.textContent = "Login complete. Welcome!";
  }

  setTimeout(() => {
    window.location.href = "../";
  }, 300);
}

finishLogin();