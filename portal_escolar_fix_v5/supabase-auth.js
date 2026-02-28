// ══════════════════════════════════════════════════════════════════
// SUPABASE AUTH — Autenticação via Supabase Auth (não usuarios_portal)
// Carregue ANTES de supabase-config.js para supaFetch enviar JWT
// ══════════════════════════════════════════════════════════════════
(function () {
  if (window.SupabaseAuth) return;

  const SUPA_URL = "https://efhiwhdnlqipknkmputt.supabase.co";
  const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaGl3aGRubHFpcGtua21wdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU0NzUsImV4cCI6MjA4NzEwMTQ3NX0.TzLZiRtHeBSVTSVaZ9RnNNNigD-mZ5ZsZp-jTglurNw";

  let _client = null;

  function getClient() {
    if (_client) return _client;
    if (typeof window.supabase === 'undefined') {
      console.error('SupabaseAuth: supabase client não carregou. Inclua <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>');
      return null;
    }
    _client = window.supabase.createClient(SUPA_URL, SUPA_ANON);
    return _client;
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
    return _client || getClient();
  }

  window.SupabaseAuth = {
    signIn,
    signOut,
    getSession,
    getAccessToken,
    getClient: getClientSync,
    SUPA_URL,
    SUPA_ANON
  };
})();
