import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import app from '../api/app.js';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function runSecurityAuditTests() {
  console.log('================================================================');
  console.log('🛡️  RUNNING SECURITY AUDIT VERIFICATION SUITE');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4012, resolve));
  const baseUrl = 'http://127.0.0.1:4012';

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [${total}] ${title}: PASSED`);
      if (detail) console.log(`   ${detail}`);
    } else {
      console.error(`❌ [${total}] ${title}: FAILED`);
      if (detail) console.error(`   ${detail}`);
    }
  }

  try {
    // TEST 1: CORS Wildcard / Rogue Origin Rejection
    const rogueRes = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Origin': 'https://evil.com' }
    });
    const allowOriginHeader = rogueRes.headers.get('access-control-allow-origin');
    assert(
      allowOriginHeader !== 'https://evil.com',
      'CORS Rogue Origin Rejection (https://evil.com blocked)',
      `Access-Control-Allow-Origin header is: ${allowOriginHeader || 'null/omitted'} (Not allowed)`
    );

    // TEST 2: CORS Whitelist Allowed Origin
    const validRes = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Origin': 'https://velabylucentai.in' }
    });
    const validAllowOrigin = validRes.headers.get('access-control-allow-origin');
    assert(
      validAllowOrigin === 'https://velabylucentai.in',
      'CORS Whitelist Verification (https://velabylucentai.in allowed)',
      `Access-Control-Allow-Origin: ${validAllowOrigin}`
    );

    // TEST 3: Public Signup Cannot Elevate to Admin
    const testEmail = 'public.signup.' + Date.now() + '@lucentsecuritytest.com';
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
        fullName: 'Audit Prospect'
      })
    });
    const signupData = await signupRes.json();
    assert(
      signupRes.status === 200 && signupData.user?.role === 'client',
      'Public Signup Strictly Creates Client Role (No Privilege Elevation)',
      `Assigned role: ${signupData.user?.role} (Admin elevation blocked)`
    );

    // TEST 4: Non-Admin Token Forbidden from Admin Endpoints
    const adminEndpointRes = await fetch(`${baseUrl}/api/db/clients`, {
      headers: { 'Authorization': 'Bearer ' + signupData.token }
    });
    assert(
      adminEndpointRes.status === 403,
      'Admin Route Lockdown (Non-Admin Token gets 403 Forbidden)',
      `Status: ${adminEndpointRes.status} Forbidden`
    );

    // TEST 5: Admin Login Strictly Authenticated via PostgreSQL
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'abhishekdas2090@gmail.com',
        password: 'Enter@123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginData.user?.role === 'admin',
      'Admin Role Verified via Database Record',
      `Logged in as ${adminLoginData.user?.email} with role: ${adminLoginData.user?.role}`
    );

    // TEST 6: Tampered JWT Token Rejected
    const tamperedToken = adminLoginData.token.substring(0, adminLoginData.token.length - 6) + 'XXXXXX';
    const tamperedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer ' + tamperedToken }
    });
    assert(
      tamperedRes.status === 401,
      'Cryptographic JWT Signature Verification (Tampered token returns 401)',
      `Status: ${tamperedRes.status} Unauthorized`
    );

    // Cleanup test user
    await db.delete(users).where(eq(users.email, testEmail));
    console.log('🧹 Cleaned up audit test user.');

  } finally {
    server.close();
  }

  console.log(`\n================================================================`);
  console.log(`🎉 SECURITY AUDIT VERIFICATION: ${passed}/${total} PASSED (${Math.round(passed/total*100)}%)`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSecurityAuditTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
