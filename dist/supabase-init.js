// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRALIZADA SUPABASE (SSO / Shared Config)
// ══════════════════════════════════════════════════════════════════
(function () {
  if (window.SupabaseInit) return;

  const SUPA_URL = "https://efhiwhdnlqipknkmputt.supabase.co";
  const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaGl3aGRubHFpcGtua21wdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU0NzUsImV4cCI6MjA4NzEwMTQ3NX0.TzLZiRtHeBSVTSVaZ9RnNNNigD-mZ5ZsZp-jTglurNw";

  let _client = null;

  function getClient() {
    if (_client) return _client;
    if (typeof window.supabase === 'undefined') {
      console.error('SupabaseInit: supabase client não carregou. Inclua <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>');
      return null;
    }
    _client = window.supabase.createClient(SUPA_URL, SUPA_ANON);
    return _client;
  }

  // Exporta
  window.SupabaseInit = {
    SUPA_URL,
    SUPA_ANON,
    getClient
  };

  // Listener para mudanças de estado (Harden flow)
  const client = getClient();
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      console.log('Supabase Auth Change:', event);
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('portal_usuario');
        window.location.href = 'index.html';
      }
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Se já houver uma sessão no sessionStorage, atualizamos o userId para garantir consistência
        const cached = sessionStorage.getItem('portal_usuario');
        if (cached && session?.user) {
          try {
            const u = JSON.parse(cached);
            u.userId = session.user.id;
            sessionStorage.setItem('portal_usuario', JSON.stringify(u));
          } catch (e) {}
        }
      }
    });
  }
})();
