-- ============================================================
--  The Chow & Pair — booking system database
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to run once on a fresh project.
-- ============================================================

create extension if not exists btree_gist;

-- ------------------------------------------------------------
--  Tables
-- ------------------------------------------------------------

-- Staff roster. One row per person who can sign in.
-- Created automatically when someone signs up (see the trigger below).
create table if not exists public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  email      text not null default '',
  role       text not null default 'staff' check (role in ('admin','staff')),
  active     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id     text primary key,
  name   text not null,
  phone  text not null default '',
  note   text not null default '',
  active boolean not null default true
);

create table if not exists public.tables (
  id       text primary key,
  num      integer not null unique,
  capacity integer not null default 4 check (capacity between 1 and 12),
  active   boolean not null default true
);

create table if not exists public.customers (
  id         text primary key,
  name       text not null,
  phone      text not null default '',
  email      text not null default '',
  source     text not null default 'Walk-in',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id           text primary key,
  customer_id  text not null references public.customers(id) on delete restrict,
  type         text not null check (type in ('play','learn')),
  guests       integer not null default 4 check (guests between 1 and 12),
  booking_date date not null,
  start_time   time not null,
  end_time     time not null,
  table_id     text not null references public.tables(id) on delete restrict,
  teacher_id   text references public.teachers(id) on delete restrict,
  payment      text not null default 'unpaid'
                 check (payment in ('paid','partial','unpaid','refunded')),
  amount_due   numeric(10,2) not null default 0,
  amount_paid  numeric(10,2) not null default 0,
  stage        text not null default 'New Lead'
                 check (stage in ('New Lead','Confirmed','Paid','Checked-In',
                                  'Completed','Cancelled','No-Show')),
  notes        text not null default '',
  created_by   text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint end_after_start   check (end_time > start_time),
  constraint learn_has_teacher check (type <> 'learn' or teacher_id is not null)
);

-- Single row of studio-wide settings.
create table if not exists public.settings (
  id                    integer primary key default 1 check (id = 1),
  open_time             time not null default '10:00',
  close_time            time not null default '22:00',
  slot_minutes          integer not null default 30,
  default_play_minutes  integer not null default 120,
  default_learn_minutes integer not null default 90,
  rate_play             numeric(10,2) not null default 2400,
  rate_learn            numeric(10,2) not null default 3200,
  sources               text[] not null default
    array['Instagram','Walk-in','Referral','WhatsApp','Google','Event','Other']
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
--  The double-booking guard
--
--  These two constraints are the real protection. The web app also
--  checks before saving, but two people clicking at the same instant
--  can slip past a check in a browser. They cannot slip past these:
--  Postgres refuses to store the second row.
--
--  Cancelled and no-show bookings are excluded, so they release
--  the table and the teacher.
-- ------------------------------------------------------------

alter table public.bookings drop constraint if exists no_table_overlap;
alter table public.bookings add constraint no_table_overlap
  exclude using gist (
    table_id with =,
    tsrange(booking_date + start_time, booking_date + end_time) with &&
  ) where (stage not in ('Cancelled','No-Show'));

alter table public.bookings drop constraint if exists no_teacher_overlap;
alter table public.bookings add constraint no_teacher_overlap
  exclude using gist (
    teacher_id with =,
    tsrange(booking_date + start_time, booking_date + end_time) with &&
  ) where (stage not in ('Cancelled','No-Show') and teacher_id is not null);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- Helpful indexes.
create index if not exists bookings_by_date  on public.bookings (booking_date);
create index if not exists bookings_by_stage on public.bookings (stage);
create index if not exists customers_by_phone on public.customers (phone);

-- ------------------------------------------------------------
--  Who is allowed to do what
--
--  security definer so these can read the staff table without
--  tripping over that table's own row-level security.
-- ------------------------------------------------------------

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff s where s.id = auth.uid() and s.active
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid() and s.active and s.role = 'admin'
  );
$$;

-- The first person to sign up becomes the active admin.
-- Everyone after that is created inactive and cannot see a thing
-- until an admin switches them on in Settings.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.staff;
  insert into public.staff (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''),
             split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'admin' else 'staff' end,
    is_first
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
--  Row level security
-- ------------------------------------------------------------

alter table public.staff     enable row level security;
alter table public.teachers  enable row level security;
alter table public.tables    enable row level security;
alter table public.customers enable row level security;
alter table public.bookings  enable row level security;
alter table public.settings  enable row level security;

-- Everyone signed in can see their own staff row, so the app can tell
-- them whether they are still waiting for approval.
drop policy if exists staff_read_self on public.staff;
create policy staff_read_self on public.staff
  for select using (id = auth.uid());

drop policy if exists staff_read_all on public.staff;
create policy staff_read_all on public.staff
  for select using (public.is_staff());

drop policy if exists staff_admin_write on public.staff;
create policy staff_admin_write on public.staff
  for all using (public.is_admin()) with check (public.is_admin());

-- Bookings and customers: every active staff member reads and writes.
drop policy if exists customers_rw on public.customers;
create policy customers_rw on public.customers
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists bookings_rw on public.bookings;
create policy bookings_rw on public.bookings
  for all using (public.is_staff()) with check (public.is_staff());

-- Teachers, tables, settings: staff read, admins change.
drop policy if exists teachers_read on public.teachers;
create policy teachers_read on public.teachers
  for select using (public.is_staff());
drop policy if exists teachers_admin on public.teachers;
create policy teachers_admin on public.teachers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists tables_read on public.tables;
create policy tables_read on public.tables
  for select using (public.is_staff());
drop policy if exists tables_admin on public.tables;
create policy tables_admin on public.tables
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings
  for select using (public.is_staff());
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
--  Table privileges
--
--  Row level security decides WHICH ROWS a signed-in person may
--  touch. It does not grant access to the table in the first place.
--  Those are two separate layers and PostgREST needs both.
--
--  Supabase can hand out these privileges automatically ("Automatically
--  expose new tables"), but their own advice is to leave that off and
--  be deliberate. So this grants them explicitly, which means the
--  schema works whichever way that switch is set.
--
--  'authenticated' is any signed-in account. It gets table access here
--  and is then filtered row by row by the policies above, so an account
--  that has not been switched on in Settings still sees nothing.
--  'anon' is a visitor who has not signed in. It gets nothing at all:
--  sign-up and sign-in go through Supabase Auth, not through these
--  tables.
-- ------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on
      public.staff, public.teachers, public.tables,
      public.customers, public.bookings, public.settings
      to authenticated;
    grant execute on function public.is_staff() to authenticated;
    grant execute on function public.is_admin() to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on
      public.staff, public.teachers, public.tables,
      public.customers, public.bookings, public.settings
      from anon;
  end if;
end $$;

-- ------------------------------------------------------------
--  Live updates between open screens
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.teachers;
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.staff;

-- ============================================================
--  SAMPLE DATA
--  Everything below is here so the app has something to show on
--  day one. Delete this whole section if you would rather start
--  with an empty studio. The 8 tables are not sample data - keep
--  those unless your floor is a different size.
-- ============================================================

insert into public.tables (id, num, capacity, active) values
  ('tb1',1,4,true),('tb2',2,4,true),('tb3',3,4,true),('tb4',4,4,true),
  ('tb5',5,4,true),('tb6',6,4,true),('tb7',7,4,true),('tb8',8,4,true)
on conflict (id) do nothing;

insert into public.teachers (id, name, phone, note, active) values
  ('t1','Mei Lin Tan',    '+91 98200 11223','Hong Kong Old Style, beginners', true),
  ('t2','Arvind Rao',     '+91 98670 45512','Riichi, intermediate strategy',  true),
  ('t3','Priya Shetty',   '+91 99301 77840','American mahjong, card play',    true),
  ('t4','Kenji Watanabe', '+91 98190 33260','Riichi, tournament prep',        true)
on conflict (id) do nothing;

insert into public.customers (id, name, phone, email, source, notes) values
  ('c1','Anaya Kapoor',   '+91 9710 20000','anaya.kapoor@example.com','Instagram','Prefers evening slots.'),
  ('c2','Rohan Mehta',    '+91 9811 20731','rohan.mehta@example.com','Walk-in',''),
  ('c3','Farah Sheikh',   '+91 9912 21462','farah.sheikh@example.com','Referral',''),
  ('c4','Vikram Nair',    '+91 9713 22193','vikram.nair@example.com','WhatsApp',''),
  ('c5','Sneha Iyer',     '+91 9814 22924','sneha.iyer@example.com','Google','Prefers evening slots.'),
  ('c6','Aditya Bose',    '+91 9915 23655','aditya.bose@example.com','Event','Corporate group organiser.'),
  ('c7','Tara D''Souza',  '+91 9716 24386','tara.dsouza@example.com','Other',''),
  ('c8','Imran Qureshi',  '+91 9817 25117','imran.qureshi@example.com','Instagram',''),
  ('c9','Nikhil Jain',    '+91 9918 25848','nikhil.jain@example.com','Walk-in','Prefers evening slots.'),
  ('c10','Meera Raghavan','+91 9719 26579','meera.raghavan@example.com','Referral',''),
  ('c11','Karan Bhatia',  '+91 9820 27310','karan.bhatia@example.com','WhatsApp','Corporate group organiser.'),
  ('c12','Leila Merchant','+91 9921 28041','leila.merchant@example.com','Google',''),
  ('c13','Sanjay Pillai', '+91 9722 28772','sanjay.pillai@example.com','Event','Prefers evening slots.'),
  ('c14','Diya Chandra',  '+91 9823 29503','diya.chandra@example.com','Other',''),
  ('c15','Zoya Ansari',   '+91 9924 30234','zoya.ansari@example.com','Instagram','')
on conflict (id) do nothing;

insert into public.bookings
  (id, customer_id, type, guests, booking_date, start_time, end_time,
   table_id, teacher_id, payment, amount_due, amount_paid, stage, created_by)
values
  ('b1','c1','play',4,current_date - 6,'11:00','13:00','tb1',null,'paid',2400,2400,'Completed','seed'),
  ('b2','c2','learn',3,current_date - 6,'16:00','17:30','tb3','t1','paid',3200,3200,'Completed','seed'),
  ('b3','c3','play',4,current_date - 5,'18:30','20:30','tb2',null,'paid',2400,2400,'Completed','seed'),
  ('b4','c4','learn',2,current_date - 5,'10:30','12:00','tb5','t2','paid',3200,3200,'Completed','seed'),
  ('b5','c6','play',4,current_date - 4,'19:00','21:00','tb4',null,'unpaid',2400,0,'No-Show','seed'),
  ('b6','c7','learn',4,current_date - 4,'14:00','15:30','tb1','t3','paid',3200,3200,'Completed','seed'),
  ('b7','c8','play',3,current_date - 3,'17:00','19:00','tb6',null,'paid',2400,2400,'Completed','seed'),
  ('b8','c9','learn',2,current_date - 3,'11:30','13:00','tb2','t4','partial',3200,1600,'Completed','seed'),
  ('b9','c10','play',4,current_date - 2,'20:00','22:00','tb7',null,'paid',2400,2400,'Completed','seed'),
  ('b10','c11','learn',4,current_date - 2,'15:00','16:30','tb3','t1','refunded',3200,0,'Cancelled','seed'),
  ('b11','c12','play',4,current_date - 1,'18:00','20:00','tb1',null,'paid',2400,2400,'Completed','seed'),
  ('b12','c13','learn',3,current_date - 1,'10:00','11:30','tb4','t2','paid',3200,3200,'Completed','seed'),
  ('b13','c14','play',4,current_date,'11:00','13:00','tb1',null,'paid',2400,2400,'Checked-In','seed'),
  ('b14','c15','learn',3,current_date,'11:00','12:30','tb2','t1','paid',3200,3200,'Checked-In','seed'),
  ('b15','c1','play',4,current_date,'14:00','16:00','tb3',null,'partial',2400,1200,'Confirmed','seed'),
  ('b16','c2','learn',4,current_date,'16:30','18:00','tb5','t3','paid',3200,3200,'Paid','seed'),
  ('b17','c3','play',4,current_date,'18:00','20:00','tb4',null,'unpaid',2400,0,'Confirmed','seed'),
  ('b18','c4','learn',2,current_date,'19:30','21:00','tb6','t4','unpaid',3200,0,'New Lead','seed'),
  ('b19','c5','play',4,current_date,'20:00','22:00','tb7',null,'paid',2400,2400,'Confirmed','seed'),
  ('b20','c6','learn',4,current_date + 1,'10:30','12:00','tb1','t2','paid',3200,3200,'Confirmed','seed'),
  ('b21','c7','play',3,current_date + 1,'13:00','15:00','tb2',null,'unpaid',2400,0,'New Lead','seed'),
  ('b22','c8','learn',4,current_date + 1,'17:00','18:30','tb3','t1','paid',3200,3200,'Paid','seed'),
  ('b23','c9','play',4,current_date + 1,'19:00','21:00','tb8',null,'partial',2400,1000,'Confirmed','seed'),
  ('b24','c10','play',4,current_date + 2,'11:00','13:00','tb4',null,'unpaid',2400,0,'New Lead','seed'),
  ('b25','c11','learn',3,current_date + 2,'15:30','17:00','tb5','t3','paid',3200,3200,'Confirmed','seed'),
  ('b26','c12','play',4,current_date + 3,'18:30','20:30','tb1',null,'paid',2400,2400,'Confirmed','seed'),
  ('b27','c13','learn',2,current_date + 4,'10:00','11:30','tb2','t4','unpaid',3200,0,'New Lead','seed'),
  ('b28','c14','play',4,current_date + 5,'16:00','18:00','tb6',null,'paid',2400,2400,'Confirmed','seed'),
  ('b29','c15','learn',4,current_date + 7,'11:30','13:00','tb3','t2','unpaid',3200,0,'New Lead','seed'),
  ('b30','c1','play',4,current_date + 9,'19:00','21:00','tb7',null,'unpaid',2400,0,'Confirmed','seed'),
  ('b31','c4','learn',3,current_date + 12,'14:00','15:30','tb1','t1','unpaid',3200,0,'New Lead','seed')
on conflict (id) do nothing;
