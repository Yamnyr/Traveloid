const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Helper to parse .env.local
function getDatabaseUrl() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.error('Error reading .env.local:', err);
  }
  return process.env.DATABASE_URL;
}

const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env.local or process.env');
  process.exit(1);
}

async function runMigration() {
  console.log('Connecting to Neon PostgreSQL database...');
  const sql = neon(databaseUrl);

  try {
    // 1. Create public.users table
    console.log('Creating public.users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Create public.sessions table
    console.log('Creating public.sessions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Make sure profiles and other tables exist (so we can alter them)
    console.log('Ensuring application tables exist before adding foreign keys...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        display_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.travel_pins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        location_name TEXT,
        visit_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.pin_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pin_id UUID NOT NULL REFERENCES public.travel_pins(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        photo_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.pin_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        pin_id UUID NOT NULL REFERENCES public.travel_pins(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, pin_id)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL,
        following_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(follower_id, following_id),
        CONSTRAINT no_self_follow CHECK (follower_id != following_id)
      );
    `;

    // 4. Update foreign key constraints to point to public.users
    console.log('Adding/Updating foreign keys to reference public.users(id)...');
    
    // We clean orphan records (if any existed without active users) to avoid constraint failures
    await sql`DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM public.users);`;
    await sql`ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_user;`;
    await sql`ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;`;

    await sql`DELETE FROM public.travel_pins WHERE user_id NOT IN (SELECT id FROM public.users);`;
    await sql`ALTER TABLE public.travel_pins DROP CONSTRAINT IF EXISTS fk_travel_pins_user;`;
    await sql`ALTER TABLE public.travel_pins ADD CONSTRAINT fk_travel_pins_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`;

    await sql`DELETE FROM public.pin_photos WHERE user_id NOT IN (SELECT id FROM public.users);`;
    await sql`ALTER TABLE public.pin_photos DROP CONSTRAINT IF EXISTS fk_pin_photos_user;`;
    await sql`ALTER TABLE public.pin_photos ADD CONSTRAINT fk_pin_photos_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`;

    await sql`DELETE FROM public.pin_likes WHERE user_id NOT IN (SELECT id FROM public.users);`;
    await sql`ALTER TABLE public.pin_likes DROP CONSTRAINT IF EXISTS fk_pin_likes_user;`;
    await sql`ALTER TABLE public.pin_likes ADD CONSTRAINT fk_pin_likes_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`;

    await sql`DELETE FROM public.follows WHERE follower_id NOT IN (SELECT id FROM public.users) OR following_id NOT IN (SELECT id FROM public.users);`;
    await sql`ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS fk_follows_follower;`;
    await sql`ALTER TABLE public.follows ADD CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS fk_follows_following;`;
    await sql`ALTER TABLE public.follows ADD CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;`;

    // 5. Index creation
    console.log('Ensuring all indexes exist...');
    await sql`CREATE INDEX IF NOT EXISTS travel_pins_user_id_idx ON public.travel_pins(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS pin_photos_pin_id_idx ON public.pin_photos(pin_id);`;
    await sql`CREATE INDEX IF NOT EXISTS pin_photos_user_id_idx ON public.pin_photos(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);`;
    await sql`CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);`;
    await sql`CREATE INDEX IF NOT EXISTS sessions_token_idx ON public.sessions(token);`;

    console.log('Database migration successfully completed! Neon Auth schema is fully ready.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
