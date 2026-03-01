# Cloudflare Pages (sem Worker)

Configuração esperada deste projeto:

- **Framework preset:** None
- **Build command:** `exit 0`
- **Build output directory:** *(vazio)*
- **Root directory:** `portal_escolar_fix_v5`
- **Production branch:** `main`
- **Automatic deployments:** Enabled
- **Domain:** `sistemaescola.pages.dev`

## Observação

Este repositório **não utiliza Cloudflare Worker** para deploy do front-end.
Por isso, a configuração `wrangler.jsonc` orientada a `wrangler versions upload` foi removida.
