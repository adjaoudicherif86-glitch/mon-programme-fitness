-- ═══════════════════════════════════════════════════════════════════
--  Mon Programme Fitness : base de données Supabase
--  À coller en entier dans Supabase → SQL Editor → New query → Run.
--  Le script peut être relancé sans danger (il ne supprime aucune donnée).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Séances (une ligne par séance terminée ; le détail des séries est dans "data")
create table if not exists public.workouts (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session     text not null check (session in ('A','B','C')),
  date        date not null,
  data        jsonb not null,
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Pesées
create table if not exists public.weights (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date              date not null,
  kg                numeric(5,2) not null check (kg between 30 and 250),
  waist             numeric(5,1) check (waist is null or waist between 40 and 200),
  deleted           boolean not null default false,
  client_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 3. Profil (objectif de poids)
create table if not exists public.profil (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  goal_kg     numeric(5,2),
  start_kg    numeric(5,2),
  updated_at  timestamptz not null default now()
);

-- Programme personnalisé (exercices ajoutés / retirés par séance)
alter table public.profil add column if not exists extras  jsonb;
alter table public.profil add column if not exists removed jsonb;

create index if not exists workouts_user_updated on public.workouts (user_id, updated_at);
create index if not exists weights_user_updated  on public.weights  (user_id, updated_at);

-- 4. Horodatage serveur à chaque écriture (sert à la synchronisation)
--    + interdiction de changer le propriétaire d'une ligne.
create or replace function public.mpf_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then new.user_id := old.user_id; end if;
  return new;
end $$;

drop trigger if exists workouts_touch on public.workouts;
create trigger workouts_touch before insert or update on public.workouts for each row execute function public.mpf_touch();
drop trigger if exists weights_touch on public.weights;
create trigger weights_touch before insert or update on public.weights for each row execute function public.mpf_touch();
drop trigger if exists profil_touch on public.profil;
create trigger profil_touch before insert or update on public.profil for each row execute function public.mpf_touch();

-- 5. Sécurité : chaque utilisateur ne voit et ne modifie QUE ses propres lignes (Row Level Security)
alter table public.workouts enable row level security;
alter table public.weights  enable row level security;
alter table public.profil   enable row level security;

drop policy if exists "mes seances" on public.workouts;
create policy "mes seances" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "mes pesees" on public.weights;
create policy "mes pesees" on public.weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "mon profil" on public.profil;
create policy "mon profil" on public.profil for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.workouts, public.weights, public.profil from anon;
grant select, insert, update, delete on public.workouts, public.weights, public.profil to authenticated;

-- 6. Vue pratique : une ligne par série (pour consulter tes données dans Supabase → Table Editor)
create or replace view public.series with (security_invoker = true) as
select w.user_id, w.id as seance_id, w.date, w.session, e.key as exercice,
       s.n as serie, nullif(s.v->>'kg','') as kg, nullif(s.v->>'reps','') as reps,
       coalesce((s.v->>'done')::boolean, false) as fait
from public.workouts w
cross join lateral jsonb_each(w.data->'entries') as e(key, value)
cross join lateral jsonb_array_elements(e.value->'sets') with ordinality as s(v, n)
where not w.deleted;

revoke all on public.series from anon;
grant select on public.series to authenticated;
