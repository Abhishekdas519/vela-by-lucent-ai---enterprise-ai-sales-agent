import dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db/index.js';
import { users, clients } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import http from 'http';

let testPort = 4008;

async function runEnterpriseSecurityVerification() {
  console.log('================================================================');
  console.log('🚀 RUNNING ENTERPRISE SECURITY & AUTH VERIFICATION SUITE');
  console.log('================================================================\n');

  const { default: app } = await import('../api/app.js');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(testPort, () => resolve()));
  const baseUrl = `http://127.0.0.1:${testPort}`;
  console.log(`📡 Local Test Server running on ${baseUrl}\n`);

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      testsPassed++;
      console.log(`✅ [${totalTests}] ${testName}: PASSED`);
      if (detail) console.log(`   ${detail}`);
    } else {
      console.error(`❌ [${totalTests}] ${testName}: FAILED`);
      if (detail) console.error(`   ${detail}`);
      process.exit(1);
    }
  }

  try {
    // 1. Authenticate Admin (Abhishek Das)
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'abhishekdas2090@gmail.com', password: 'Enter@123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminLoginData.token && adminLoginData.user.role === 'admin', 'Admin Authentication');
    const adminToken = adminLoginData.token;

    // 2. Onboard New Enterprise Client via Admin API
    const testClientEmail = `enterprise.client.${Date.now()}@lucenttest.com`;
    const provisionRes = await fetch(`${baseUrl}/api/admin/provision-client`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: testClientEmail,
        companyName: 'AeroGlobal Logistics',
        contactName: 'Sarah Jenkins',
        twilioPhoneNumber: '+1 (800) 555-9988'
      })
    });
    const provisionData = await provisionRes.json();
    assert(provisionRes.ok && provisionData.success, 'Client Provisioning by Admin', `Provisioned email: ${testClientEmail}`);
    
    // 3. Verify Welcome Email Draft URL is https://velabylucentai.in/login
    const welcomeDraft = provisionData.welcomeEmailDraft;
    assert(
      welcomeDraft && welcomeDraft.includes('https://velabylucentai.in/login') && !welcomeDraft.includes('vercel.app'),
      'Welcome Email uses https://velabylucentai.in/login',
      `URL verified in email draft`
    );

    const tempPassword = provisionData.credentials.temporaryPassword;
    assert(tempPassword && tempPassword.startsWith('VL-2026-'), 'Temporary Password is URL-Safe VL-2026- token', `Generated: ${tempPassword}`);

    // 4. Test Client Login with Whitespace & Mixed Case Email
    const clientLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: `  ${testClientEmail.toUpperCase()}  `, 
        password: `  ${tempPassword}  ` // trailing/leading space simulation
      })
    });
    const clientLoginData = await clientLoginRes.json();
    assert(
      clientLoginRes.ok && clientLoginData.token && clientLoginData.user.email === testClientEmail,
      'Client Login with Sanitized Whitespace and Mixed-Case Email',
      `Received valid JWT token for ${clientLoginData.user.email}`
    );
    const clientToken = clientLoginData.token;

    // 5. Test Client Self-Service Password Change
    const newPermanentPass = 'UltraSecurePermanent@2026!';
    const changePassRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: newPermanentPass
      })
    });
    const changePassData = await changePassRes.json();
    assert(changePassRes.ok && changePassData.success, 'Client Password Change via /api/auth/change-password', changePassData.message);

    // 6. Test that Old Password is Now Rejected
    const oldPassLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testClientEmail, password: tempPassword })
    });
    assert(oldPassLoginRes.status === 401, 'Old Temporary Password Rejected (401 Unauthorized)');

    // 7. Test that New Password Successfully Logs In
    const newPassLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testClientEmail, password: newPermanentPass })
    });
    const newPassLoginData = await newPassLoginRes.json();
    assert(newPassLoginRes.ok && newPassLoginData.token, 'New Permanent Password Authentication (200 OK)');

    // 8. Test Rate Limiting on Failed Logins
    console.log('\n--- Testing Login Rate Limiting Protection ---');
    const attackerEmail = `victim.${Date.now()}@company.com`;
    let gotRateLimited = false;
    for (let i = 0; i < 18; i++) {
      const bruteRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: attackerEmail, password: `wrong-pass-${i}` })
      });
      if (bruteRes.status === 429) {
        gotRateLimited = true;
        break;
      }
    }
    assert(gotRateLimited, 'Brute-force attack blocked with 429 Too Many Requests');

    // Clean up test user
    console.log('\n🧹 Cleaning up test user from Supabase...');
    await db.delete(clients).where(eq(clients.email, testClientEmail));
    await db.delete(users).where(eq(users.email, testClientEmail));
    console.log('✅ Test user cleaned up.');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${testsPassed}/${totalTests} ENTERPRISE SECURITY TESTS PASSED (100%)!`);
    console.log('================================================================\n');

  } finally {
    server.close();
    process.exit(0);
  }
}

runEnterpriseSecurityVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
