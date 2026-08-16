import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;

const connectionString = 'postgresql://postgres.nywstjkatvbifduwlnrw:lJpBnBuMOyuszM1W@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Running schema migrations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        password_hash TEXT,
        role TEXT DEFAULT 'client' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(uid),
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        email TEXT NOT NULL,
        industry TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        vapi_assistant_id TEXT,
        vapi_voice_id TEXT,
        vapi_voice_name TEXT,
        twilio_phone_number TEXT,
        system_prompt TEXT,
        first_message TEXT,
        talktime_minutes_total INTEGER DEFAULT 5000 NOT NULL,
        talktime_minutes_used INTEGER DEFAULT 0 NOT NULL,
        active_lines INTEGER DEFAULT 5 NOT NULL,
        calling_hours_start TEXT DEFAULT '09:00' NOT NULL,
        calling_hours_end TEXT DEFAULT '18:00' NOT NULL,
        timezone TEXT DEFAULT 'America/New_York (EST)' NOT NULL,
        auto_followup_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        followup_delay_hours INTEGER DEFAULT 12 NOT NULL,
        subscription_plan TEXT DEFAULT 'starter' NOT NULL,
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS talktime_requests (
        id TEXT PRIMARY KEY,
        client_id TEXT REFERENCES clients(id),
        minutes_requested INTEGER NOT NULL,
        amount_due INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        industry TEXT,
        status TEXT DEFAULT 'pending_configuration' NOT NULL,
        meeting_requested BOOLEAN DEFAULT FALSE NOT NULL,
        meeting_time TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_requested BOOLEAN DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_time TEXT;

      CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        client_id TEXT REFERENCES clients(id),
        lead_name TEXT NOT NULL,
        lead_phone TEXT NOT NULL,
        lead_company TEXT,
        call_duration_seconds INTEGER DEFAULT 0 NOT NULL,
        disposition TEXT DEFAULT 'completed' NOT NULL,
        sentiment TEXT DEFAULT 'positive' NOT NULL,
        conversion_chance INTEGER DEFAULT 0,
        ai_conclusion TEXT,
        transcript TEXT,
        followup_draft TEXT,
        recording_url TEXT,
        scheduled_callback TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS conversion_chance INTEGER DEFAULT 0;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ai_conclusion TEXT;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS followup_draft TEXT;

      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        contact_name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        industry TEXT,
        preferred_time TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tables created / updated successfully.');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);
      CREATE UNIQUE INDEX IF NOT EXISTS admin_notif_pk ON admin_notifications (id);
    `);

    // Seed Admin Account: abhishekdas2090@gmail.com / Enter@123
    console.log('Seeding Admin User...');
    const adminEmail = 'abhishekdas2090@gmail.com';
    const adminPassword = 'Enter@123';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);

    // Delete existing user with this email to ensure clean insert if needed
    await client.query(`DELETE FROM users WHERE email = $1`, [adminEmail]);

    await client.query(`
      INSERT INTO users (uid, email, display_name, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, ['admin-ceo-1', adminEmail, 'Abhishek (CEO / Admin)', passwordHash, 'admin']);

    console.log(`Admin account [${adminEmail}] successfully seeded with role=admin!`);

    // Add initial welcome notification in admin_notifications table
    await client.query(`DELETE FROM admin_notifications WHERE id = 'notif-welcome'`);
    await client.query(`
      INSERT INTO admin_notifications (id, type, title, message, read, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
    `, ['notif-welcome', 'system', '🚀 Vela Master Suite Online', 'Live database connected to Supabase and authenticated with secure JWT tokens.']);

    console.log('Database setup and admin seeding completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
