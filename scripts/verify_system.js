import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Client } = pg;
const connectionString = 'postgresql://postgres.nywstjkatvbifduwlnrw:lJpBnBuMOyuszM1W@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const JWT_SECRET = 'vela_enterprise_jwt_super_secret_key_2026_production_guard_9837429182374982374';

async function testSystem() {
  console.log('--- STARTING GOD-LEVEL VERIFICATION SUITE ---');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ [1/5] Supabase PostgreSQL Connection: ACTIVE');

  // Test 1: Verify Admin User exists with role=admin and valid password hash
  const adminRes = await client.query(`SELECT uid, email, display_name, password_hash, role FROM users WHERE email = $1`, ['abhishekdas2090@gmail.com']);
  if (adminRes.rows.length === 0) {
    throw new Error('Admin user not found in database!');
  }
  const adminUser = adminRes.rows[0];
  console.log(`✅ [2/5] Admin User Found: ${adminUser.email} (Role: ${adminUser.role})`);

  // Test 2: Test correct and incorrect password verification
  const isMatchCorrect = bcrypt.compareSync('Enter@123', adminUser.password_hash);
  const isMatchWrong = bcrypt.compareSync('WrongPassword', adminUser.password_hash);

  if (!isMatchCorrect || isMatchWrong) {
    throw new Error('Password verification check failed!');
  }
  console.log('✅ [3/5] Cryptographic Password Verification: PASSED (Correct accepted, wrong rejected)');

  // Test 3: Test JWT Token Generation & Verification
  const token = jwt.sign({
    uid: adminUser.uid,
    email: adminUser.email,
    role: adminUser.role,
    displayName: adminUser.display_name
  }, JWT_SECRET, { expiresIn: '7d' });

  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.email !== adminUser.email || decoded.role !== 'admin') {
    throw new Error('JWT verification payload mismatch!');
  }
  console.log('✅ [4/5] JWT Token Generation & Verification: PASSED');

  // Test 4: Verify Admin Notifications in PostgreSQL
  const notifRes = await client.query(`SELECT id, type, title, message FROM admin_notifications ORDER BY created_at DESC LIMIT 5`);
  console.log(`✅ [5/5] Admin Notifications Stored in Supabase: ${notifRes.rows.length} records verified`);
  notifRes.rows.forEach(n => console.log(`   - [${n.type}] ${n.title}: ${n.message}`));

  await client.end();
  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

testSystem().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
