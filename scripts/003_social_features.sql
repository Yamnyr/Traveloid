-- Update RLS for travel_pins to be readable by everyone
drop policy if exists "pins_select_own" on public.travel_pins;
create policy "pins_select_public" on public.travel_pins for select using (true);

-- Update RLS for pin_photos to be readable by everyone
drop policy if exists "photos_select_own" on public.pin_photos;
create policy "photos_select_public" on public.pin_photos for select using (true);

-- Create likes table
create table if not exists public.pin_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pin_id uuid not null references public.travel_pins(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, pin_id)
);

alter table public.pin_likes enable row level security;

create policy "likes_select_public"
  on public.pin_likes for select
  using (true);

create policy "likes_insert_own"
  on public.pin_likes for insert
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on public.pin_likes for delete
  using (auth.uid() = user_id);
