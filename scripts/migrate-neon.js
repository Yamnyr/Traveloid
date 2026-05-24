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
  return process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wJLy6g9rbUph@ep-flat-shadow-alk2s7lv-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
}

const databaseUrl = getDatabaseUrl();

async function runMigration() {
  console.log('Connecting to Neon PostgreSQL database...');
  const sql = neon(databaseUrl);

  try {
    console.log('Creating public.profiles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        display_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('Creating public.travel_pins table...');
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

    console.log('Creating public.pin_photos table...');
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

    console.log('Creating public.pin_likes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.pin_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        pin_id UUID NOT NULL REFERENCES public.travel_pins(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, pin_id)
      );
    `;

    console.log('Creating public.follows table...');
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

    console.log('Creating indices for optimal performance...');
    await sql`CREATE INDEX IF NOT EXISTS travel_pins_user_id_idx ON public.travel_pins(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS pin_photos_pin_id_idx ON public.pin_photos(pin_id);`;
    await sql`CREATE INDEX IF NOT EXISTS pin_photos_user_id_idx ON public.pin_photos(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);`;
    await sql`CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);`;

    console.log('Database migration successfully completed! All tables and indices created.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
