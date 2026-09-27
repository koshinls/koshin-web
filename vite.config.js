import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const websiteUrl = process.env.WEBSITE_URL || env.WEBSITE_URL || '';
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
  const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
  const klsAccountApiUrl =
    process.env.KLS_ACCOUNT_API_URL || env.KLS_ACCOUNT_API_URL || '';

  return {
    define: {
      'import.meta.env.WEBSITE_URL': JSON.stringify(websiteUrl),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
      'import.meta.env.KLS_ACCOUNT_API_URL': JSON.stringify(klsAccountApiUrl),
    },
    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          login: fileURLToPath(new URL('./login/index.html', import.meta.url)),
          auth: fileURLToPath(new URL('./auth/index.html', import.meta.url)),
        },
      },
    },
  };
});

