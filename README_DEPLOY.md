# Deploy do SISTEMAESCOLA (Cloudflare Pages + Worker API)

## 1) Deploy do site estático (Cloudflare Pages)

No painel do Cloudflare Pages, configure o projeto conectado a este repositório com:

- **Framework preset**: `None`
- **Build command**: vazio (ou `echo no-build`)
- **Output directory**: `portal_escolar_fix_v5`
- **Root directory** (se houver): `/` (raiz do repositório)

Variável pública opcional para o frontend:

- `SITE_API_BASE=https://<worker-domain>`

> O site é estático e deve publicar diretamente os arquivos HTML/CSS/JS de `portal_escolar_fix_v5`.


### Branch de produção (obrigatório)

Para evitar deploy como **Preview**, configure no Pages:

- **Production branch**: `main`

No painel: **Workers & Pages → Pages → seu projeto → Settings → Builds & deployments → Production branch**.

Somente commits/push na `main` devem ser usados para deploy de produção.

## 2) Deploy do Worker (API)

A API roda separada em `worker_api/`.

### Variáveis obrigatórias no Worker

Configure no Cloudflare Workers:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE`
- `ALLOWED_ORIGINS` (lista separada por vírgula, ex.: `https://meusite.pages.dev,https://portal.exemplo.com`)

### Endpoints principais

- `GET /ping`
- Proxy Supabase REST: `/supabase/rest/v1/...`
- Proxy Supabase Storage: `/supabase/storage/v1/...`

### Regras de segurança aplicadas

- CORS por allowlist (`ALLOWED_ORIGINS`)
- `OPTIONS` com resposta CORS
- Sem token JWT:
  - `GET/HEAD/OPTIONS` usam `SUPABASE_ANON_KEY`
  - métodos de escrita (`POST/PUT/PATCH/DELETE`) são bloqueados (401)
- Com JWT (`Authorization: Bearer <jwt>`): repassa o token ao Supabase
- Escrita sem JWT (se liberada no código para fluxos específicos): usa `SUPABASE_SERVICE_ROLE` no servidor

## 3) CI/CD

- **Pages**: preferencialmente pelo próprio fluxo do Cloudflare Pages (deploy automático do git conectado).
- **Worker**: workflow opcional em `.github/workflows/deploy-worker.yml`.

## 4) Observações importantes

- O frontend não deve conter `service_role`.
- A chave `SUPABASE_SERVICE_ROLE` deve existir **somente** nas env vars do Worker.
- O pipeline do site **não** deve usar `wrangler versions upload`.
