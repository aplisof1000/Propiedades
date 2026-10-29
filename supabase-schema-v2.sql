-- Gestor de Propiedades V2 - Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin','user','owner')),
  created_at timestamptz default now()
);

create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid references owners(id) on delete set null,
  name text not null,
  type text not null,
  address text,
  city text,
  area numeric default 0,
  commercial_value numeric default 0,
  cadastral_id text,
  property_registration text,
  status text default 'Disponible',
  notes text,
  created_at timestamptz default now()
);

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  start_date date,
  end_date date,
  monthly_rent numeric default 0,
  deposit numeric default 0,
  increase_percent numeric default 0,
  status text default 'Vigente',
  notes text,
  created_at timestamptz default now()
);

create table if not exists taxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  concept text not null,
  due_date date,
  amount numeric default 0,
  status text default 'Pendiente',
  notes text,
  created_at timestamptz default now()
);

create table if not exists administration_fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  concept text,
  period text,
  amount numeric default 0,
  status text default 'Pendiente',
  notes text,
  created_at timestamptz default now()
);

create table if not exists maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  date date,
  category text,
  description text,
  provider text,
  cost numeric default 0,
  status text default 'Solicitado',
  notes text,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  type text,
  date date,
  concept text,
  amount numeric default 0,
  status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  category text,
  title text not null,
  file_path text,
  expires_on date,
  notes text,
  created_at timestamptz default now()
);

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS: cada usuario ve/modifica únicamente sus registros.
do $$
declare t text;
begin
  foreach t in array array['owners','tenants','properties','leases','taxes','administration_fees','maintenance_orders','payments','documents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('drop policy if exists own_delete on public.%I', t);
    execute format('create policy own_select on public.%I for select using (user_id = auth.uid())', t);
    execute format('create policy own_insert on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('create policy own_update on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy own_delete on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles for select using (id = auth.uid());

-- Storage para documentos.
insert into storage.buckets (id,name,public) values ('property-documents','property-documents',false)
on conflict (id) do nothing;

drop policy if exists docs_read on storage.objects;
drop policy if exists docs_insert on storage.objects;
drop policy if exists docs_delete on storage.objects;

create policy docs_read on storage.objects for select
using (bucket_id='property-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy docs_insert on storage.objects for insert
with check (bucket_id='property-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy docs_delete on storage.objects for delete
using (bucket_id='property-documents' and (storage.foldername(name))[1]=auth.uid()::text);
