// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRALIZADA SUPABASE (robusta / anti-duplicação)
// ══════════════════════════════════════════════════════════════════
(function () {
  // Evita redeclarar tudo se o arquivo for carregado 2x (ex.: /supabase-config.js e supabase-config.js)
  if (window.SupabasePortal && typeof window.SupabasePortal.supaFetch === 'function') {
    // Garante também aliases globais
    window.supaFetch = window.supaFetch || window.SupabasePortal.supaFetch;
    window.lerTabelaGenerica = window.lerTabelaGenerica || window.SupabasePortal.lerTabelaGenerica;
    return;
  }

  const SUPA_URL = "https://efhiwhdnlqipknkmputt.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaGl3aGRubHFpcGtua21wdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU0NzUsImV4cCI6MjA4NzEwMTQ3NX0.TzLZiRtHeBSVTSVaZ9RnNNNigD-mZ5ZsZp-jTglurNw";

  async function supaFetch(path, options = {}) {
    const { prefer, headers: extraHeaders, ...rest } = options || {};
    const method = (rest.method || 'GET').toUpperCase();

    let authBearer = SUPA_KEY;
    if (window.SupabaseAuth && typeof window.SupabaseAuth.getAccessToken === 'function') {
      const token = await window.SupabaseAuth.getAccessToken();
      if (token) authBearer = token;
    }

    const body = rest.body;
    const isFormData = (typeof FormData !== 'undefined') && (body instanceof FormData);
    const isBlob = (typeof Blob !== 'undefined') && (body instanceof Blob);
    const isArrayBuffer = (typeof ArrayBuffer !== 'undefined') && (body instanceof ArrayBuffer);
    const hasCustomContentType = !!(extraHeaders && (extraHeaders['Content-Type'] || extraHeaders['content-type']));

    const headers = {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + authBearer,
      ...(prefer ? { Prefer: prefer } : {}),
      ...((!isFormData && !isBlob && !isArrayBuffer && !hasCustomContentType) ? { 'Content-Type': 'application/json' } : {}),
      ...(extraHeaders || {})
    };

    const res = await fetch(SUPA_URL + path, {
      ...rest,
      headers
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Erro Supabase (${res.status}): ${err || res.statusText}`);
    }

    const txt = await res.text();
    const trimmed = (txt || '').trim();

    if (!trimmed) {
      return (method === 'GET') ? [] : null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`Supabase: resposta inválida (${e.message}): ${trimmed.substring(0, 100)}`);
    }
  }

  async function lerTabelaGenerica(tabela) {
    try {
      let rows;
      try {
        rows = await supaFetch(`/rest/v1/${tabela}?select=id,dados&order=criado_em.asc`);
      } catch (e1) {
        try {
          rows = await supaFetch(`/rest/v1/${tabela}?select=id,dados`);
        } catch (e2) {
          try {
            rows = await supaFetch(`/rest/v1/${tabela}?select=dados&order=criado_em.asc`);
          } catch (e3) {
            rows = await supaFetch(`/rest/v1/${tabela}?select=dados`);
          }
        }
      }

      if (!Array.isArray(rows)) return [];
      return rows
        .filter(r => r && r.dados)
        .map(r => (r.id !== undefined ? ({ id: r.id, ...r.dados }) : r.dados));
    } catch (e) {
      console.error(`Erro ao ler tabela ${tabela}:`, e);
      return [];
    }
  }

  function _encode(v) {
    return encodeURIComponent(String(v || '').trim());
  }

  async function buscarUsuarioPortalPorUsuario(usuario) {
    console.warn('[DEPRECATED] buscarUsuarioPortalPorUsuario: use Supabase Auth + profiles.');
    const u = _encode(usuario).toLowerCase();
    const rows = await supaFetch(`/rest/v1/usuarios_portal?select=id,usuario,nome,perfil,turma,criado_em&usuario=eq.${u}&limit=1`);
    return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
  }

  // Exporta: portal + aliases globais (para páginas antigas que chamam supaFetch direto)
  window.SupabasePortal = {
    supaFetch,
    lerTabelaGenerica,
    buscarUsuarioPortalPorUsuario
  };
  window.supaFetch = supaFetch;
  window.lerTabelaGenerica = lerTabelaGenerica;
})();
