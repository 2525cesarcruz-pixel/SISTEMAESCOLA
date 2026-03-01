-- Tabela para registrar PDFs gerados da matrícula
create table if not exists public.documentos_aluno (
  id bigserial primary key,
  aluno_id bigint not null,
  tipo text not null,
  url text not null,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_documentos_aluno_aluno_id on public.documentos_aluno (aluno_id);
create index if not exists idx_documentos_aluno_tipo on public.documentos_aluno (tipo);

-- Bucket para arquivos de matrícula
insert into storage.buckets (id, name, public)
values ('pastas_digitais', 'pastas_digitais', false)
on conflict (id) do nothing;

-- RLS mínimo (ajuste conforme sua política de segurança)
alter table public.documentos_aluno enable row level security;

create policy if not exists "documentos_aluno_select_authenticated"
on public.documentos_aluno
for select
to authenticated
using (true);

create policy if not exists "documentos_aluno_insert_authenticated"
on public.documentos_aluno
for insert
to authenticated
with check (true);

create policy if not exists "documentos_aluno_update_authenticated"
on public.documentos_aluno
for update
to authenticated
using (true)
with check (true);

-- Storage policies
create policy if not exists "pastas_digitais_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'pastas_digitais');

create policy if not exists "pastas_digitais_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'pastas_digitais');

create policy if not exists "pastas_digitais_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'pastas_digitais')
with check (bucket_id = 'pastas_digitais');
