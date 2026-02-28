-- Executar no Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.livro_digital_arquivos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  aluno_id text null,
  servidor_id text null,
  url text not null,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_livro_digital_arquivos_tipo on public.livro_digital_arquivos(tipo);
create index if not exists idx_livro_digital_arquivos_aluno on public.livro_digital_arquivos(aluno_id);
create index if not exists idx_livro_digital_arquivos_servidor on public.livro_digital_arquivos(servidor_id);
create index if not exists idx_livro_digital_arquivos_created on public.livro_digital_arquivos(created_at desc);

alter table public.livro_digital_arquivos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='livro_digital_arquivos' and policyname='livro_digital_arquivos_select'
  ) then
    create policy livro_digital_arquivos_select on public.livro_digital_arquivos
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='livro_digital_arquivos' and policyname='livro_digital_arquivos_insert'
  ) then
    create policy livro_digital_arquivos_insert on public.livro_digital_arquivos
      for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='livro_digital_arquivos' and policyname='livro_digital_arquivos_delete'
  ) then
    create policy livro_digital_arquivos_delete on public.livro_digital_arquivos
      for delete to authenticated using (true);
  end if;
end $$;
