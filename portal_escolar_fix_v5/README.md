# portal_escolar_fix_v5

Checklist operacional de Supabase para o portal escolar.

## ✅ Checklist Supabase

### 1) `pastas_digitais` com `UNIQUE(aluno_id)`
Necessário para `on_conflict=aluno_id` funcionar no upsert da pasta digital de alunos.

```sql
alter table public.pastas_digitais
  add constraint pastas_digitais_aluno_id_key unique (aluno_id);
```

### 2) `pastas_digitais_servidores` com `UNIQUE(servidor_id)`
Necessário para upsert consistente do dossiê de servidores.

```sql
alter table public.pastas_digitais_servidores
  add constraint pastas_digitais_servidores_servidor_id_key unique (servidor_id);
```

### 3) Se RLS estiver ON
Se as tabelas estiverem com Row Level Security habilitado, criar policies mínimas para `authenticated` (`select`, `insert`, `update`) **ou** mover escrita para backend com service role.

Exemplo base (ajuste conforme sua regra de negócio):

```sql
alter table public.pastas_digitais enable row level security;
alter table public.pastas_digitais_servidores enable row level security;

create policy if not exists pastas_digitais_select_auth
on public.pastas_digitais for select to authenticated using (true);

create policy if not exists pastas_digitais_insert_auth
on public.pastas_digitais for insert to authenticated with check (true);

create policy if not exists pastas_digitais_update_auth
on public.pastas_digitais for update to authenticated using (true) with check (true);

create policy if not exists pastas_digitais_servidores_select_auth
on public.pastas_digitais_servidores for select to authenticated using (true);

create policy if not exists pastas_digitais_servidores_insert_auth
on public.pastas_digitais_servidores for insert to authenticated with check (true);

create policy if not exists pastas_digitais_servidores_update_auth
on public.pastas_digitais_servidores for update to authenticated using (true) with check (true);
```

> Observação: se for necessário controle mais restritivo por usuário/perfil, troque `using (true)`/`with check (true)` por regras baseadas em `auth.uid()` e claims.

### 4) Bucket de Storage usado e permissões
Bucket utilizado no projeto para documentos: **`pastas-digitais`**.

Valide:
- bucket criado no Supabase Storage;
- permissões de upload/leitura conforme o fluxo (URLs públicas ou signed URLs);
- políticas de Storage compatíveis com operações de `upload`, `select` e `delete` quando aplicável.

Exemplo de criação:

```sql
insert into storage.buckets (id, name, public)
values ('pastas-digitais', 'pastas-digitais', true)
on conflict (id) do nothing;
```

## Referências no projeto
- Migração de suporte ao livro digital: `portal_escolar_fix_v5/sql/20260228_livro_digital_arquivos.sql`.
