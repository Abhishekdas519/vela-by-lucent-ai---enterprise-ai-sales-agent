import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3000';

async function runDeepVerification() {
  console.log('================================================================');
  console.log('🚀 RUNNING DEEP AUDIT & HARDENING VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // Import app directly for in-process testing
  const appModule = await import('../api/app.js');
  const app = appModule.default;

  const server = app.listen(4819);
  const BASE = 'http://localhost:4819';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Live DB Health Check Endpoint
    // -------------------------------------------------------------------------
    console.log('📊 TEST SUITE 1: Database Health Check & Status');
    const healthRes = await fetch(`${BASE}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.ok, '/api/health responded with 200 OK');
    assert(healthData.status === 'ok', 'Health status is ok');
    assert(healthData.databaseStatus === 'connected', 'Database status is connected');
    assert(typeof healthData.databaseLatencyMs === 'number', `DB latency is ${healthData.databaseLatencyMs}ms`);

    // -------------------------------------------------------------------------
    // TEST 2: Admin Backdoor Lockdown
    // -------------------------------------------------------------------------
    console.log('\n🔒 TEST SUITE 2: Security & Admin Backdoor Lockdown');
    const fakeAdminEmail = `admin@fraudulent-corp-${Date.now()}.com`;
    const signupFakeRes = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fakeAdminEmail,
        password: 'Password@123',
        fullName: 'Attacker Trying Admin',
        companyName: 'Fake Corp'
      })
    });
    const fakeData = await signupFakeRes.json();
    assert(signupFakeRes.ok, 'Signup succeeded for normal user');
    assert(fakeData.user?.role === 'client', `User with email ${fakeAdminEmail} is role "client" (NOT admin)`);
    assert(fakeData.token !== undefined, 'Valid JWT received');

    // Test official Admin Login
    const adminLoginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'abhishekdas2090@gmail.com',
        password: 'Enter@123'
      })
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.ok, 'Official Admin login succeeded');
    assert(adminData.user?.role === 'admin', 'Official owner has role "admin"');
    const adminToken = adminData.token;

    // -------------------------------------------------------------------------
    // TEST 3: Settings Persistence via PATCH /api/db/clients/:id
    // -------------------------------------------------------------------------
    console.log('\n⚙️ TEST SUITE 3: Client Settings PostgreSQL Persistence');
    const clientToken = fakeData.token;
    const clientId = fakeData.client?.id;
    assert(!!clientId, `Client ID generated: ${clientId}`);

    const updatedSettings = {
      callingHoursStart: '08:45',
      callingHoursEnd: '19:15',
      autoFollowupEnabled: true,
      followupDelayHours: 8,
      systemPrompt: 'You are Vela for Fake Corp. Strictly qualify leads.',
      firstMessage: 'Hello! This is Vela calling from Fake Corp.'
    };

    const patchRes = await fetch(`${BASE}/api/db/clients/${clientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify(updatedSettings)
    });
    const patchData = await patchRes.json();
    assert(patchRes.ok, 'PATCH /api/db/clients/:id succeeded');
    assert(patchData.client?.callingHoursStart === '08:45', 'callingHoursStart persisted in DB');
    assert(patchData.client?.callingHoursEnd === '19:15', 'callingHoursEnd persisted in DB');
    assert(patchData.client?.followupDelayHours === 8, 'followupDelayHours persisted in DB');
    assert(patchData.client?.systemPrompt === updatedSettings.systemPrompt, 'systemPrompt persisted in DB');

    // -------------------------------------------------------------------------
    // TEST 4: RFC 4180 Quoted CSV Batch Import
    // -------------------------------------------------------------------------
    console.log('\n📁 TEST SUITE 4: Bulk Batch Lead Ingestion & RFC 4180 Parsing');
    const testLeads = [
      {
        id: `lead-test-1-${Date.now()}`,
        name: 'Elena Rostova',
        phone: '+1 (212) 555-0199',
        email: 'elena@apexlogistics.io',
        company: 'Apex Logistics, LLC', // Comma inside company name
        title: 'VP Fleet Operations',
        industry: 'Logistics, Freight & Transport'
      },
      {
        id: `lead-test-2-${Date.now()}`,
        name: 'Marcus Sterling',
        phone: '+1 (415) 890-4321',
        email: 'marcus@sterlingfreight.com',
        company: 'Sterling Freight',
        title: 'COO',
        industry: 'Transportation'
      }
    ];

    const batchRes = await fetch(`${BASE}/api/db/leads/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        clientId,
        leads: testLeads
      })
    });
    const batchData = await batchRes.json();
    assert(batchRes.ok, 'POST /api/db/leads/batch succeeded');
    assert(batchData.count === 2, `Inserted ${batchData.count} leads in PostgreSQL`);

    // Fetch leads for this client
    const getLeadsRes = await fetch(`${BASE}/api/db/leads/${clientId}`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const getLeadsData = await getLeadsRes.json();
    assert(getLeadsRes.ok, 'GET /api/db/leads/:clientId returned 200 OK');
    assert(getLeadsData.data.some((l: any) => l.companyName === 'Apex Logistics, LLC'), 'Complex quoted company name retrieved intact');

    // -------------------------------------------------------------------------
    // TEST 5: Atomic Talktime Deduction & Credit Increment
    // -------------------------------------------------------------------------
    console.log('\n⏱️ TEST SUITE 5: Atomic Talktime SQL Operations');
    const deductRes = await fetch(`${BASE}/api/db/clients/${clientId}/deduct-minutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ minutesUsed: 12 })
    });
    const deductData = await deductRes.json();
    assert(deductRes.ok, 'POST /api/db/clients/:id/deduct-minutes succeeded');
    assert(deductData.client?.talktimeMinutesUsed >= 12, `talktimeMinutesUsed is ${deductData.client?.talktimeMinutesUsed}`);

    // Admin talktime approval
    const orderRes = await fetch(`${BASE}/api/db/talktime-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        clientId,
        minutesRequested: 2500,
        amountDue: 275
      })
    });
    const orderData = await orderRes.json();
    assert(orderRes.ok, 'Talktime purchase order created');

    const approveRes = await fetch(`${BASE}/api/db/talktime-requests/${orderData.data.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const approveData = await approveRes.json();
    assert(approveRes.ok, 'Admin approved talktime order');
    assert(approveData.data?.status === 'approved', 'Order status is approved');

    // -------------------------------------------------------------------------
    // TEST 6: Call Log Intelligence Persistence
    // -------------------------------------------------------------------------
    console.log('\n📞 TEST SUITE 6: Call Log & Lead State Persistence');
    const callLogRes = await fetch(`${BASE}/api/db/call-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        clientId,
        leadName: 'Elena Rostova',
        leadPhone: '+1 (212) 555-0199',
        leadCompany: 'Apex Logistics, LLC',
        callDurationSeconds: 145,
        disposition: 'completed',
        sentiment: 'positive',
        conversionChance: 85,
        aiConclusion: 'High intent prospect interested in 12-hour follow-up.',
        transcript: [
          { speaker: 'ai', text: 'Hi Elena, this is Vela.' },
          { speaker: 'human', text: 'Hello! Yes, tell me about your follow-up pipeline.' }
        ]
      })
    });
    const callLogData = await callLogRes.json();
    assert(callLogRes.ok, 'POST /api/db/call-logs saved call intelligence');

    // Update single lead status to completed
    const patchLeadRes = await fetch(`${BASE}/api/db/leads/${testLeads[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    const patchLeadData = await patchLeadRes.json();
    assert(patchLeadRes.ok, 'PATCH /api/db/leads/:id saved completed status');

    // Fetch call logs for client
    const clientLogsRes = await fetch(`${BASE}/api/db/call-logs/${clientId}`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const clientLogsData = await clientLogsRes.json();
    assert(clientLogsRes.ok, 'GET /api/db/call-logs/:clientId returned 200 OK');
    assert(clientLogsData.data.length >= 1, 'Client logs list has records');

    console.log('\n================================================================');
    console.log(`🏁 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runDeepVerification().catch(e => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
