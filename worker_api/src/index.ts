export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE: string;
  ALLOWED_ORIGINS: string;
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getAllowedOrigin(req: Request, env: Env): string {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (!origin) return allowed[0] || '*';
  if (allowed.includes('*')) return '*';
  return allowed.includes(origin) ? origin : '';
}

function corsHeaders(req: Request, env: Env): Headers {
  const allowedOrigin = getAllowedOrigin(req, env);
  const h = new Headers();
  if (allowedOrigin) h.set('Access-Control-Allow-Origin', allowedOrigin);
  h.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,apikey,Prefer,X-Client-Info');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Vary', 'Origin');
  return h;
}

function isReadOnly(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function json(data: unknown, status: number, req: Request, env: Env): Response {
  const headers = corsHeaders(req, env);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers });
}

function buildTarget(pathname: string, env: Env): URL | null {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  if (pathname.startsWith('/supabase/rest/')) {
    return new URL(base + pathname.replace('/supabase/rest/', '/rest/'));
  }
  if (pathname.startsWith('/supabase/storage/')) {
    return new URL(base + pathname.replace('/supabase/storage/', '/storage/'));
  }
  return null;
}

function hasBearer(req: Request): boolean {
  const auth = req.headers.get('Authorization') || '';
  return /^Bearer\s+.+/i.test(auth);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    }

    if (url.pathname === '/ping') {
      return json({ ok: true, ts: new Date().toISOString() }, 200, req, env);
    }

    const target = buildTarget(url.pathname, env);
    if (!target) return json({ error: 'Not found' }, 404, req, env);

    target.search = url.search;

    const method = req.method.toUpperCase();
    const incomingAuth = req.headers.get('Authorization');
    const authorizedWithJwt = hasBearer(req);

    if (!authorizedWithJwt && WRITE_METHODS.has(method)) {
      return json({ error: 'Unauthorized write without JWT' }, 401, req, env);
    }

    const headers = new Headers(req.headers);
    headers.delete('host');

    if (incomingAuth) {
      headers.set('Authorization', incomingAuth);
      headers.set('apikey', env.SUPABASE_ANON_KEY);
    } else if (isReadOnly(method)) {
      headers.set('Authorization', `Bearer ${env.SUPABASE_ANON_KEY}`);
      headers.set('apikey', env.SUPABASE_ANON_KEY);
    } else {
      headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_ROLE}`);
      headers.set('apikey', env.SUPABASE_SERVICE_ROLE);
    }

    const init: RequestInit = {
      method,
      headers,
      body: isReadOnly(method) ? undefined : await req.arrayBuffer(),
    };

    const upstream = await fetch(target.toString(), init);
    const respHeaders = new Headers(upstream.headers);
    for (const [k, v] of corsHeaders(req, env).entries()) respHeaders.set(k, v);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  },
};
