-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Create travel_pins table
create table if not exists public.travel_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude decimal(10, 8) not null,
  longitude decimal(11, 8) not null,
  location_name text,
  visit_date date,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.travel_pins enable row level security;

create policy "pins_select_own"
  on public.travel_pins for select
  using (auth.uid() = user_id);

create policy "pins_insert_own"
  on public.travel_pins for insert
  with check (auth.uid() = user_id);

create policy "pins_update_own"
  on public.travel_pins for update
  using (auth.uid() = user_id);

create policy "pins_delete_own"
  on public.travel_pins for delete
  using (auth.uid() = user_id);

-- Create pin_photos table
create table if not exists public.pin_photos (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.travel_pins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  caption text,
  created_at timestamp with time zone default now()
);

alter table public.pin_photos enable row level security;

create policy "photos_select_own"
  on public.pin_photos for select
  using (auth.uid() = user_id);

create policy "photos_insert_own"
  on public.pin_photos for insert
  with check (auth.uid() = user_id);

create policy "photos_update_own"
  on public.pin_photos for update
  using (auth.uid() = user_id);

create policy "photos_delete_own"
  on public.pin_photos for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists travel_pins_user_id_idx on public.travel_pins(user_id);
create index if not exists pin_photos_pin_id_idx on public.pin_photos(pin_id);
create index if not exists pin_photos_user_id_idx on public.pin_photos(user_id);
