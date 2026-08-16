import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Client } = pg;
const connectionString = 'postgresql://postgres.nywstjkatvbifduwlnrw:lJpBnBuMOyuszM1W@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const JWT_SECRET = 'vela_enterprise_jwt_super_secret_key_2026_production_guard_9837429182374982374';

async function testCustomerOnboarding() {
  console.log('--- STARTING CUSTOMER ONBOARDING & LOGIN VERIFICATION ---');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ [1/6] PostgreSQL Connection: ACTIVE');

  const testEmail = 'onboard.test.client@lucentai.com';
  const testTempPass = 'VL-DEMO99!SECURE';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(testTempPass, salt);

  // Clean any previous test data
  await client.query(`DELETE FROM users WHERE email = $1`, [testEmail]);
  await client.query(`DELETE FROM clients WHERE email = $1`, [testEmail]);

  // Test 1: Simulate onboarding customer creation
  const userId = 'usr-test-' + Date.now();
  const clientId = 'client-test-' + Date.now().toString().slice(-4);

  await client.query(
    `INSERT INTO users (uid, email, display_name, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
    [userId, testEmail, 'Test Onboard Lead', passwordHash, 'client']
  );
  console.log('✅ [2/6] User record created with bcrypt password hash in PostgreSQL');

  await client.query(
    `INSERT INTO clients (id, user_id, company_name, contact_name, email, industry, status, twilio_phone_number, vapi_assistant_id, talktime_minutes_total, active_lines) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [clientId, userId, 'Apex Global Logistics', 'Test Onboard Lead', testEmail, 'Freight & Logistics', 'active', '+1 (800) 555-TEST', 'asst_vapi_test', 5000, 5]
  );
  console.log('✅ [3/6] Client profile provisioned in PostgreSQL');

  // Test 2: Verify login with the temporary password
  const userRes = await client.query(`SELECT * FROM users WHERE email = $1`, [testEmail]);
  if (userRes.rows.length === 0) throw new Error('User was not stored in database');
  const fetchedUser = userRes.rows[0];

  const isPasswordValid = bcrypt.compareSync(testTempPass, fetchedUser.password_hash);
  if (!isPasswordValid) throw new Error('Password verification failed for temporary password!');
  console.log('✅ [4/6] Temporary password authentication: VALIDATED & ACCEPTED');

  const isWrongPasswordRejected = !bcrypt.compareSync('WrongPassword!123', fetchedUser.password_hash);
  if (!isWrongPasswordRejected) throw new Error('Wrong password was incorrectly accepted!');
  console.log('✅ [5/6] Invalid password authentication: REJECTED AS EXPECTED');

  // Test 3: Test password re-provisioning / update
  const newTempPass = 'VL-RESET88!NEW';
  const newHash = bcrypt.hashSync(newTempPass, bcrypt.genSaltSync(10));
  await client.query(`UPDATE users SET password_hash = $1 WHERE uid = $2`, [newHash, userId]);

  const updatedUserRes = await client.query(`SELECT password_hash FROM users WHERE uid = $1`, [userId]);
  const isNewPassValid = bcrypt.compareSync(newTempPass, updatedUserRes.rows[0].password_hash);
  const isOldPassInvalid = !bcrypt.compareSync(testTempPass, updatedUserRes.rows[0].password_hash);

  if (!isNewPassValid || !isOldPassInvalid) throw new Error('Password update / re-provisioning failed!');
  console.log('✅ [6/6] Password Re-provisioning / Reset: PASSED (New works, old invalidated)');

  // Clean up
  await client.query(`DELETE FROM clients WHERE email = $1`, [testEmail]);
  await client.query(`DELETE FROM users WHERE email = $1`, [testEmail]);
  await client.end();

  console.log('\n🎉 ALL ONBOARDING & LOGIN VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

testCustomerOnboarding().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
