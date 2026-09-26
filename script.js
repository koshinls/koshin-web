import { supabase } from "./supabase.js";
import { fetchCurrentKlsAccount, logoutKls, getStoredKlsSession } from "./klsAuth.js";

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const accountArea = document.getElementById("accountArea");

function renderLoginButton() {
  if (!accountArea) return;
  accountArea.innerHTML = `
    <a class="button primary" href="login/">
      Login
    </a>
  `;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function updateAccountDisplay() {
  if (!accountArea) return;

  // 1. Check Supabase OAuth
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          'Koshin';
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        const provider = user.app_metadata?.provider || 'Supabase';
        const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
        const initial = (name[0] || 'K').toUpperCase();

        const avatarMarkup = avatar
          ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="account-avatar">`
          : `<div class="account-avatar">${escapeHtml(initial)}</div>`;

        accountArea.innerHTML = `
          <div class="account-box">
            ${avatarMarkup}
            <div class="account-details">
              <span class="account-name">${escapeHtml(name)}</span>
              <span class="account-badge">${escapeHtml(providerLabel)}</span>
            </div>
            <button type="button" class="account-logout-btn" id="logoutBtn">
              Sign out
            </button>
          </div>
        `;

        document.getElementById("logoutBtn")?.addEventListener("click", async () => {
          await supabase.auth.signOut();
          renderLoginButton();
        });
        return;
      }
    } catch (e) {
      console.warn("Supabase account check notice:", e);
    }
  }

  // 2. Check KLS Account
  const klsSession = getStoredKlsSession();
  if (klsSession) {
    try {
      const account = await fetchCurrentKlsAccount();
      if (account) {
        const name = account.display_name || account.username;
        const initial = (name[0] || 'K').toUpperCase();
        const avatarMarkup = account.avatar_url
          ? `<img src="${escapeHtml(account.avatar_url)}" alt="${escapeHtml(name)}" class="account-avatar">`
          : `<div class="account-avatar">${escapeHtml(initial)}</div>`;

        accountArea.innerHTML = `
          <div class="account-box">
            ${avatarMarkup}
            <div class="account-details">
              <span class="account-name">${escapeHtml(name)}</span>
              <span class="account-badge">@${escapeHtml(account.username)} · KLS</span>
            </div>
            <button type="button" class="account-logout-btn" id="logoutBtn">
              Sign out
            </button>
          </div>
        `;

        document.getElementById("logoutBtn")?.addEventListener("click", async () => {
          await logoutKls();
          renderLoginButton();
        });
        return;
      }
    } catch (e) {
      console.warn("KLS account check notice:", e);
    }
  }

  // 3. Check Guest Mode
  if (sessionStorage.getItem("koshinls_guest") === "true") {
    accountArea.innerHTML = `
      <div class="account-box">
        <div class="account-avatar">✦</div>
        <div class="account-details">
          <span class="account-name">Guest Mode</span>
          <span class="account-badge">Temporary Session</span>
        </div>
        <a class="account-logout-btn" href="login/" style="text-decoration:none;">
          Sign in
        </a>
      </div>
    `;
    return;
  }

  // Default: show Login button
  renderLoginButton();
}

updateAccountDisplay();
