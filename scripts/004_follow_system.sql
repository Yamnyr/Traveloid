-- Create follows table
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

alter table public.follows enable row level security;

-- Allow everyone to read follows
create policy "follows_select_public"
  on public.follows for select
  using (true);

-- Allow users to insert their own follows
create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

-- Allow users to delete their own follows
create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Create indexes for faster queries
create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

-- Update RLS for profiles to be publicly readable
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_public" on public.profiles for select using (true);


