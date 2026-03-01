// ══════════════════════════════════════════════════════════════════
// SUPABASE AUTH — Autenticação via Supabase Auth (não usuarios_portal)
// Carregue ANTES de supabase-config.js para supaFetch enviar JWT
// ══════════════════════════════════════════════════════════════════
(function () {
  if (window.SupabaseAuth) return;

  function getClient() {
    return window.SupabaseInit ? window.SupabaseInit.getClient() : null;
  }

  async function signIn(email, senha) {
    const client = getClient();
    if (!client) throw new Error('Cliente Supabase não disponível.');
    const { data, error } = await client.auth.signInWithPassword({ email: String(email || '').trim(), password: senha || '' });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = getClient();
    if (client) await client.auth.signOut();
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session?.access_token || null;
  }

  function getClientSync() {
    return getClient();
  }

  window.SupabaseAuth = {
    signIn,
    signOut,
    getSession,
    getAccessToken,
    getClient: getClientSync,
    SUPA_URL: window.SupabaseInit ? window.SupabaseInit.SUPA_URL : "",
    SUPA_ANON: window.SupabaseInit ? window.SupabaseInit.SUPA_ANON : ""
  };
})();
