-- =========================================================
-- PORTAL ESCOLAR - SCHEMA ALINHADO COM O FRONT-END ATUAL
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1) PROFILES (auth.js usa: user_id, role, ativo, nome)
-- =========================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'diretor',
  ativo boolean not null default true,
  nome text,
  criado_em timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

-- =========================================================
-- 2) HELPERS DE PERMISSÃO
-- =========================================================
create or replace function public.is_portal_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.ativo = true
      and lower(p.role) in ('diretor','secretaria','admin','adm')
  );
$$;

create or replace function public.is_portal_active()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.ativo = true
  );
$$;

-- =========================================================
-- 3) TABELAS PRINCIPAIS
-- =========================================================
create table if not exists public.autoridades_assinantes (
  id bigserial primary key,
  cargo text not null,
  nome text not null,
  ativo boolean not null default true,
  carimbo_linha1 text,
  carimbo_linha2 text,
  carimbo_linha3 text,
  assinatura_png_path text,
  assinatura_mime text,
  assinatura_updated_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.documentos_emitidos (
  id bigserial primary key,
  tipo text not null,
  numero integer not null,
  ano integer not null,
  referencia_id text,
  dados jsonb not null default '{}'::jsonb,
  emitido_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  status text not null default 'ATIVO',
  inutilizado_em timestamptz,
  inutilizado_por uuid references auth.users(id),
  motivo_inutilizacao text
);

create unique index if not exists documentos_emitidos_uq
on public.documentos_emitidos (tipo, ano, numero);

create table if not exists public.matriculas (
  id text primary key,
  dados jsonb not null default '{}'::jsonb,
  nome_aluno text,
  turma text,
  turno text,
  etapa text,
  ano_letivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.pastas_digitais (
  aluno_id text primary key references public.matriculas(id) on delete cascade,
  docs jsonb not null default '{}'::jsonb,
  nome_aluno text,
  etapa text,
  turma text,
  turno text,
  ano_letivo text,
  atualizado_em timestamptz not null default now()
);

-- usado no fluxo automático da matrícula (ficha/termo)
create table if not exists public.documentos_aluno (
  id bigserial primary key,
  aluno_id text not null references public.matriculas(id) on delete cascade,
  tipo text not null,
  nome_arquivo text,
  caminho_storage text,
  url_publica text,
  status text not null default 'disponivel',
  criado_em timestamptz not null default now(),
  unique (aluno_id, tipo)
);

create table if not exists public.servidores (
  id text primary key,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.professores (
  id text primary key,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.pastas_digitais_servidores (
  servidor_id text primary key references public.servidores(id) on delete cascade,
  nome_servidor text,
  cargo text,
  docs jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ocorrencias_servidores (
  id bigserial primary key,
  tipo text not null,
  servidor_id text,
  servidor_nome text,
  cargo text,
  data date,
  criado_em timestamptz not null default now(),
  dias integer,
  subtipo text,
  medico text,
  obs text,
  hora_saida text,
  hora_retorno text,
  hora_correta text,
  hora_errada text,
  comunicou text,
  destino text,
  motivo text,
  atividade text,
  anexo jsonb
);

create index if not exists ocorrencias_servidores_idx_data
on public.ocorrencias_servidores (data);

create index if not exists ocorrencias_servidores_idx_criado
on public.ocorrencias_servidores (criado_em);

create table if not exists public.ocorrencias_alunos (
  id bigserial primary key,
  aluno_id text,
  aluno_nome text,
  turma text,
  tipo text,
  descricao text,
  data date,
  criado_em timestamptz not null default now(),
  dados jsonb
);

-- legado: ainda usado no index para CRUD administrativo
create table if not exists public.usuarios_portal (
  id bigserial primary key,
  usuario text not null unique,
  nome text not null,
  senha text not null,
  perfil text not null,
  turma text,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- 4) RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.autoridades_assinantes enable row level security;
alter table public.documentos_emitidos enable row level security;
alter table public.matriculas enable row level security;
alter table public.pastas_digitais enable row level security;
alter table public.documentos_aluno enable row level security;
alter table public.servidores enable row level security;
alter table public.professores enable row level security;
alter table public.pastas_digitais_servidores enable row level security;
alter table public.ocorrencias_servidores enable row level security;
alter table public.ocorrencias_alunos enable row level security;
alter table public.usuarios_portal enable row level security;

-- PROFILES
 drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Tabelas do portal (select ativo, write admin)
-- autoridades_assinantes
 drop policy if exists autoridades_select on public.autoridades_assinantes;
create policy autoridades_select on public.autoridades_assinantes
for select to authenticated
using (public.is_portal_active());

drop policy if exists autoridades_write on public.autoridades_assinantes;
create policy autoridades_write on public.autoridades_assinantes
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- documentos_emitidos
 drop policy if exists documentos_select on public.documentos_emitidos;
create policy documentos_select on public.documentos_emitidos
for select to authenticated
using (public.is_portal_active());

drop policy if exists documentos_write on public.documentos_emitidos;
create policy documentos_write on public.documentos_emitidos
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- matriculas
 drop policy if exists matriculas_select on public.matriculas;
create policy matriculas_select on public.matriculas
for select to authenticated
using (public.is_portal_active());

drop policy if exists matriculas_write on public.matriculas;
create policy matriculas_write on public.matriculas
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- pastas_digitais
 drop policy if exists pastas_select on public.pastas_digitais;
create policy pastas_select on public.pastas_digitais
for select to authenticated
using (public.is_portal_active());

drop policy if exists pastas_write on public.pastas_digitais;
create policy pastas_write on public.pastas_digitais
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- documentos_aluno
 drop policy if exists documentos_aluno_select on public.documentos_aluno;
create policy documentos_aluno_select on public.documentos_aluno
for select to authenticated
using (public.is_portal_active());

drop policy if exists documentos_aluno_write on public.documentos_aluno;
create policy documentos_aluno_write on public.documentos_aluno
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- servidores
 drop policy if exists servidores_select on public.servidores;
create policy servidores_select on public.servidores
for select to authenticated
using (public.is_portal_active());

drop policy if exists servidores_write on public.servidores;
create policy servidores_write on public.servidores
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- professores
 drop policy if exists professores_select on public.professores;
create policy professores_select on public.professores
for select to authenticated
using (public.is_portal_active());

drop policy if exists professores_write on public.professores;
create policy professores_write on public.professores
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- pastas_digitais_servidores
 drop policy if exists pastas_srv_select on public.pastas_digitais_servidores;
create policy pastas_srv_select on public.pastas_digitais_servidores
for select to authenticated
using (public.is_portal_active());

drop policy if exists pastas_srv_write on public.pastas_digitais_servidores;
create policy pastas_srv_write on public.pastas_digitais_servidores
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- ocorrencias_servidores
 drop policy if exists ocor_srv_select on public.ocorrencias_servidores;
create policy ocor_srv_select on public.ocorrencias_servidores
for select to authenticated
using (public.is_portal_active());

drop policy if exists ocor_srv_write on public.ocorrencias_servidores;
create policy ocor_srv_write on public.ocorrencias_servidores
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- ocorrencias_alunos
 drop policy if exists ocor_alunos_select on public.ocorrencias_alunos;
create policy ocor_alunos_select on public.ocorrencias_alunos
for select to authenticated
using (public.is_portal_active());

drop policy if exists ocor_alunos_write on public.ocorrencias_alunos;
create policy ocor_alunos_write on public.ocorrencias_alunos
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- usuarios_portal
 drop policy if exists usuarios_portal_select on public.usuarios_portal;
create policy usuarios_portal_select on public.usuarios_portal
for select to authenticated
using (public.is_portal_admin());

drop policy if exists usuarios_portal_write on public.usuarios_portal;
create policy usuarios_portal_write on public.usuarios_portal
for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- =========================================================
-- 5) STORAGE BUCKET + POLICIES (pastas_digitais)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('pastas_digitais', 'pastas_digitais', true)
on conflict (id) do nothing;

-- leitura de arquivos para usuário autenticado ativo
 drop policy if exists storage_pastas_digitais_select on storage.objects;
create policy storage_pastas_digitais_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pastas_digitais'
  and public.is_portal_active()
);

-- escrita apenas admin
 drop policy if exists storage_pastas_digitais_insert on storage.objects;
create policy storage_pastas_digitais_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pastas_digitais'
  and public.is_portal_admin()
);

 drop policy if exists storage_pastas_digitais_update on storage.objects;
create policy storage_pastas_digitais_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pastas_digitais'
  and public.is_portal_admin()
)
with check (
  bucket_id = 'pastas_digitais'
  and public.is_portal_admin()
);

 drop policy if exists storage_pastas_digitais_delete on storage.objects;
create policy storage_pastas_digitais_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pastas_digitais'
  and public.is_portal_admin()
);
