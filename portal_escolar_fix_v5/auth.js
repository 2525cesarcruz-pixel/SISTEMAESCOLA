// auth.js — Integração com Supabase Auth (não usa usuarios_portal/senha em tabela)
// Fonte de sessão: Supabase Auth + tabela profiles (role, ativo)

if (typeof window.usuarioLogado === 'undefined') window.usuarioLogado = null;

function _parseSessaoPortal(raw) {
  try {
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object') return null;
    if (!u.usuario || !u.perfil) return null;
    return u;
  } catch { return null; }
}

// Sincrono: retorna cache em sessionStorage (para compatibilidade). Use getSessaoPortalAsync para checagem real.
function getSessaoPortal() {
  const raw = sessionStorage.getItem('portal_usuario');
  if (!raw) return null;
  const u = _parseSessaoPortal(raw);
  if (!u) { sessionStorage.removeItem('portal_usuario'); return null; }
  return u;
}

async function getSessaoPortalAsync() {
  if (!window.SupabaseAuth || typeof window.SupabaseAuth.getSession !== 'function') return null;
  const session = await window.SupabaseAuth.getSession();
  if (!session) {
    sessionStorage.removeItem('portal_usuario');
    return null;
  }
  const cached = sessionStorage.getItem('portal_usuario');
  if (cached) {
    try {
      const u = JSON.parse(cached);
      if (u && u.usuario && u.perfil && u.userId === session.user?.id) {
        return u;
      }
    } catch {}
  }
  const profile = await _fetchProfile(session.user.id);
  if (!profile || !profile.ativo) {
    if (window.SupabaseAuth.signOut) await window.SupabaseAuth.signOut();
    sessionStorage.removeItem('portal_usuario');
    return null;
  }
  const u = {
    usuario: session.user.email || session.user.id,
    perfil: profile.role || profile.perfil || 'professor',
    nome: profile.nome || profile.role,
    turma: (profile.turma ?? null),
    userId: session.user.id
  };
  sessionStorage.setItem('portal_usuario', JSON.stringify(u));
  return u;
}

async function _fetchProfile(userId) {
  const auth = window.SupabaseAuth;
  if (!auth) return null;
  const token = await auth.getAccessToken();
  const url = (auth.SUPA_URL || 'https://efhiwhdnlqipknkmputt.supabase.co') + '/rest/v1/profiles?user_id=eq.' + encodeURIComponent(userId) + '&select=user_id,role,ativo,nome&limit=1';
  const key = auth.SUPA_ANON;
  if (!key || !token) return null;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return null;
    const txt = await res.text().catch(() => '');
    const trimmed = (txt || '').trim();
    if (!trimmed) return null;
    const arr = JSON.parse(trimmed);
    return Array.isArray(arr) && arr[0] ? arr[0] : null;
  } catch { return null; }
}

function setSessaoPortal(user) {
  // Sanitiza para nunca persistir campos sensíveis (defensivo)
  const safe = (user && typeof user === 'object') ? { ...user } : user;
  if (safe && typeof safe === 'object') {
    delete safe.senha;
    delete safe.password;
  }
  window.usuarioLogado = safe;
  sessionStorage.setItem('portal_usuario', JSON.stringify(safe));
}

function clearSessaoPortal() {
  sessionStorage.removeItem('portal_usuario');
  window.usuarioLogado = null;
}

function isPaginaLogin() {
  const p = window.location.pathname || '';
  return p === '/' || p.endsWith('/index.html') || p === '/index.html' || p.endsWith('/');
}

async function requireLogin(perfisPermitidos) {
  const u = await getSessaoPortalAsync();
  if (!u) {
    if (!isPaginaLogin()) window.location.href = 'index.html';
    return null;
  }
  window.usuarioLogado = u;
  if (Array.isArray(perfisPermitidos) && perfisPermitidos.length) {
    if (!perfisPermitidos.includes(u.perfil)) {
      alert('Acesso negado. Você não tem permissão para acessar este módulo.');
      window.location.href = 'index.html';
      return null;
    }
  }
  return u;
}

async function fazerLogoutAuth() {
  if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') {
    await window.SupabaseAuth.signOut();
  }
  clearSessaoPortal();
  window.location.href = 'index.html';
}


async function getSupabaseUploadContext() {
  const auth = window.SupabaseAuth || {};
  const token = (typeof auth.getAccessToken === 'function') ? (await auth.getAccessToken()) : null;
  return {
    url: auth.SUPA_URL || 'https://efhiwhdnlqipknkmputt.supabase.co',
    anonKey: auth.SUPA_ANON || '',
    token: token || ''
  };
}

async function getSupabaseStorageHeaders(extra = {}) {
  const ctx = await getSupabaseUploadContext();
  const headers = {
    apikey: ctx.anonKey,
    ...(ctx.token ? { Authorization: 'Bearer ' + ctx.token } : {}),
    ...(extra || {})
  };
  return headers;
}

window.PortalAuth = {
  getSessaoPortal,
  getSessaoPortalAsync,
  setSessaoPortal,
  clearSessaoPortal,
  requireLogin,
  isPaginaLogin,
  fazerLogoutAuth,
  getSupabaseUploadContext,
  getSupabaseStorageHeaders
};

document.addEventListener('DOMContentLoaded', async () => {
  const u = await getSessaoPortalAsync();
  if (!u) {
    if (!isPaginaLogin()) window.location.href = 'index.html';
    return;
  }
  window.usuarioLogado = u;

  if (isPaginaLogin() && typeof window.entrarNoPortal === 'function') {
    try { window.entrarNoPortal(); } catch (e) { console.warn('entrarNoPortal falhou:', e); }
  }
});
