// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRALIZADA SUPABASE (robusta / anti-duplicação)
// ══════════════════════════════════════════════════════════════════
(function () {
  // Evita redeclarar tudo se o arquivo for carregado 2x (ex.: /supabase-config.js e supabase-config.js)
  if (window.SupabasePortal && typeof window.SupabasePortal.supaFetch === 'function') {
    // Garante também aliases globais
    window.supaFetch = window.supaFetch || window.SupabasePortal.supaFetch;
    window.lerTabelaGenerica = window.lerTabelaGenerica || window.SupabasePortal.lerTabelaGenerica;
    window.apiFetch = window.apiFetch || window.SupabasePortal.apiFetch;
    return;
  }

  const SUPA_URL = "https://efhiwhdnlqipknkmputt.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmaGl3aGRubHFpcGtua21wdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU0NzUsImV4cCI6MjA4NzEwMTQ3NX0.TzLZiRtHeBSVTSVaZ9RnNNNigD-mZ5ZsZp-jTglurNw";


  window.API_BASE = (window.SITE_API_BASE || localStorage.getItem("SITE_API_BASE") || "https://sistemaescola-api.<seu-subdominio>.workers.dev");

  async function getPortalAccessToken() {
    try {
      if (window.SupabaseAuth && typeof window.SupabaseAuth.getAccessToken === 'function') {
        const tk = await window.SupabaseAuth.getAccessToken();
        if (tk) return tk;
      }
    } catch (_) {}

    const lsKeys = ['sb-access-token', 'portal_token'];
    for (const k of lsKeys) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }

    for (const k of lsKeys) {
      const v = sessionStorage.getItem(k);
      if (v) return v;
    }

    return '';
  }

  function isWriteMethod(method) {
    const m = String(method || 'GET').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  }

  async function apiFetch(path, options = {}) {
    const fullPath = String(path || '');
    const hasApiBase = !!(window.API_BASE && !window.API_BASE.includes('<seu-subdominio>'));
    const method = String((options && options.method) || 'GET').toUpperCase();
    const token = await getPortalAccessToken();

    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    };

    if (!token && isWriteMethod(method)) {
      console.warn('[apiFetch] Tentativa de escrita sem token de autenticação:', method, fullPath);
    }

    const reqOptions = {
      ...options,
      headers
    };

    if (hasApiBase) {
      return fetch(window.API_BASE + fullPath, reqOptions);
    }

    // fallback local/dev: usa Supabase direto quando API_BASE não está configurada
    if (fullPath.startsWith('/supabase/rest/')) {
      return fetch(SUPA_URL + fullPath.replace('/supabase', ''), reqOptions);
    }
    if (fullPath.startsWith('/supabase/storage/')) {
      return fetch(SUPA_URL + fullPath.replace('/supabase', ''), reqOptions);
    }
    return fetch(fullPath, reqOptions);
  }

  async function supaFetch(path, options = {}) {
    const { prefer, headers: extraHeaders, ...rest } = options || {};
    const method = (rest.method || 'GET').toUpperCase();

    let authBearer = SUPA_KEY;
    if (window.SupabaseAuth && typeof window.SupabaseAuth.getAccessToken === 'function') {
      const token = await window.SupabaseAuth.getAccessToken();
      if (token) authBearer = token;
    }

    const headers = {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + authBearer,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
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
    buscarUsuarioPortalPorUsuario,
    apiFetch
  };
  window.supaFetch = supaFetch;
  window.lerTabelaGenerica = lerTabelaGenerica;
  window.apiFetch = apiFetch;
})();
