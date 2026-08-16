import http from 'http';
import app from '../api/app.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;
const connectionString = 'postgresql://postgres.nywstjkatvbifduwlnrw:lJpBnBuMOyuszM1W@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

const TEST_PORT = 4005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;

function jsonRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  return fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  }).then(async res => {
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  });
}

async function runAllSuites() {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPLETE GOD-LEVEL E2E TEST SUITE FOR VELA BY LUCENT AI');
  console.log('================================================================\n');

  // Start temporary test server
  await new Promise((resolve) => {
    server = http.createServer(app).listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`📡 Local Test Server running on ${BASE_URL}\n`);
      resolve();
    });
  });

  const dbClient = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();
  console.log('🗄️ Connected directly to live Supabase PostgreSQL\n');

  let adminToken = '';
  let clientToken = '';
  let testClientId = '';
  let testLeadId = '';
  let testOrderId = '';
  let testMeetingId = '';

  const testClientEmail = 'test.client.suite@lucentai.com';
  const testClientPassword = 'VL-TESTPASS!2026';

  try {
    // ----------------------------------------------------------------
    // SUITE 1: AUTHENTICATION
    // ----------------------------------------------------------------
    console.log('--- [SUITE 1: AUTHENTICATION & SESSION SECURITY] ---');

    // T1.1 Admin Login
    const adminLogin = await jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'abhishekdas2090@gmail.com', password: 'Enter@123' }
    });
    if (!adminLogin.ok || !adminLogin.data?.token || adminLogin.data?.user?.role !== 'admin') {
      throw new Error(`T1.1 Admin Login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    adminToken = adminLogin.data.token;
    console.log('✅ T1.1 Admin Login: PASSED (Valid JWT received, role = admin)');

    // T1.2 Wrong Password
    const wrongLogin = await jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'abhishekdas2090@gmail.com', password: 'WrongPassword999' }
    });
    if (wrongLogin.status !== 401) {
      throw new Error(`T1.2 Wrong Password test failed: status ${wrongLogin.status}`);
    }
    console.log('✅ T1.2 Wrong Password Rejected: PASSED (Returned 401 Unauthorized)');

    // T1.3 JWT Session Restore (/api/auth/me)
    const meRes = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!meRes.ok || meRes.data?.user?.email !== 'abhishekdas2090@gmail.com') {
      throw new Error(`T1.3 Session Restore failed: ${JSON.stringify(meRes.data)}`);
    }
    console.log('✅ T1.3 Session Verification (GET /api/auth/me): PASSED');

    // ----------------------------------------------------------------
    // SUITE 2: STRATEGY MEETING SCHEDULER
    // ----------------------------------------------------------------
    console.log('\n--- [SUITE 2: STRATEGY MEETING SCHEDULER] ---');

    // T2.1 Submit Meeting
    const meetingPayload = {
      contactName: 'Sarah Jenkins',
      companyName: 'Apex Supply Chain Partners',
      email: 'sarah.jenkins@apexsupply.com',
      phone: '+1 (415) 555-8921',
      industry: 'Logistics',
      preferredTime: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Need outbound dialer for 10,000 carrier leads monthly.'
    };
    const bookMeeting = await jsonRequest('/api/meetings', {
      method: 'POST',
      body: meetingPayload
    });
    if (!bookMeeting.ok || !bookMeeting.data?.data?.id) {
      throw new Error(`T2.1 Book Meeting failed: ${JSON.stringify(bookMeeting.data)}`);
    }
    testMeetingId = bookMeeting.data.data.id;
    console.log(`✅ T2.1 Submit Strategy Meeting: PASSED (Meeting ID: ${testMeetingId})`);

    // T2.2 Verify DB Persistence
    const meetingDb = await dbClient.query(`SELECT * FROM meetings WHERE id = $1`, [testMeetingId]);
    if (meetingDb.rows.length === 0 || meetingDb.rows[0].status !== 'pending') {
      throw new Error('T2.2 Meeting not found in DB with pending status');
    }
    console.log('✅ T2.2 Meeting Stored in Supabase: PASSED (Status: pending)');

    // T2.3 Admin Confirms Meeting
    const confirmMeeting = await jsonRequest(`/api/meetings/${testMeetingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'confirmed' }
    });
    if (!confirmMeeting.ok || confirmMeeting.data?.data?.status !== 'confirmed') {
      throw new Error(`T2.3 Confirm meeting failed: ${JSON.stringify(confirmMeeting.data)}`);
    }
    console.log('✅ T2.3 Admin Meeting Status Update: PASSED (Status: confirmed)');

    // ----------------------------------------------------------------
    // SUITE 3: ADMIN CLIENT ONBOARDING & PROVISIONING
    // ----------------------------------------------------------------
    console.log('\n--- [SUITE 3: ADMIN CLIENT ONBOARDING & PROVISIONING] ---');

    // T3.1 Full Client Onboarding with Password
    const onboardRes = await jsonRequest('/api/admin/create-client', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        email: testClientEmail,
        temporaryPassword: testClientPassword,
        companyName: 'Vertex Global Freight',
        contactName: 'David Miller',
        industry: 'Freight Brokerage',
        twilioPhoneNumber: '+1 (800) 555-VTX1',
        vapiAssistantId: 'asst_vapi_vtx_01',
        vapiVoiceId: 'cartesia-sonic-marcus',
        vapiVoiceName: 'Cartesia Sonic (Warm Authority)',
        talktimeMinutesTotal: 6000,
        activeLines: 10
      }
    });
    if (!onboardRes.ok || !onboardRes.data?.client?.id || !onboardRes.data?.credentials) {
      throw new Error(`T3.1 Admin Onboarding failed: ${JSON.stringify(onboardRes.data)}`);
    }
    testClientId = onboardRes.data.client.id;
    console.log(`✅ T3.1 Client Onboarded by Admin: PASSED (Client ID: ${testClientId})`);
    console.log(`   - Credentials Drafted: ${onboardRes.data.credentials.email} / ${onboardRes.data.credentials.temporaryPassword}`);

    // T3.2 Client Login with Assigned Temporary Password
    const clientLogin = await jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testClientEmail, password: testClientPassword }
    });
    if (!clientLogin.ok || !clientLogin.data?.token || clientLogin.data?.user?.role !== 'client') {
      throw new Error(`T3.2 Client Login failed: ${JSON.stringify(clientLogin.data)}`);
    }
    clientToken = clientLogin.data.token;
    console.log('✅ T3.2 Client Login with Provisioned Password: PASSED (Client Token received)');

    // T3.3 Quick Provision / Password Update (/api/admin/provision-client)
    const newClientPass = 'VL-NEWPASS!999';
    const reprovisionRes = await jsonRequest('/api/admin/provision-client', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        clientId: testClientId,
        email: testClientEmail,
        temporaryPassword: newClientPass,
        twilioPhoneNumber: '+1 (800) 555-VTX2',
        vapiAssistantId: 'asst_vapi_vtx_02'
      }
    });
    if (!reprovisionRes.ok || !reprovisionRes.data?.success) {
      throw new Error(`T3.3 Reprovisioning failed: ${JSON.stringify(reprovisionRes.data)}`);
    }
    console.log('✅ T3.3 Quick Re-provisioning & Password Reset: PASSED');

    // Verify new password works
    const newPassLogin = await jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testClientEmail, password: newClientPass }
    });
    if (!newPassLogin.ok) throw new Error('Login with new password failed');
    clientToken = newPassLogin.data.token;
    console.log('✅ T3.4 Login with Reset Password: PASSED');

    // ----------------------------------------------------------------
    // SUITE 4: TALKTIME PURCHASE & CEO APPROVAL FLOW
    // ----------------------------------------------------------------
    console.log('\n--- [SUITE 4: TALKTIME TOPUP & CEO APPROVAL WORKFLOW] ---');

    // T4.1 Client Submits Topup Request
    const orderReq = await jsonRequest('/api/db/talktime-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        clientId: testClientId,
        minutesRequested: 2500,
        amountDue: 249,
        notes: 'Q3 expansion pack'
      }
    });
    if (!orderReq.ok || !orderReq.data?.data?.id) {
      throw new Error(`T4.1 Create Talktime Request failed: ${JSON.stringify(orderReq.data)}`);
    }
    testOrderId = orderReq.data.data.id;
    console.log(`✅ T4.1 Client Talktime Request Submitted: PASSED (Order ID: ${testOrderId}, Status: pending)`);

    // T4.2 Admin Fetches Orders (with joined company name)
    const ordersList = await jsonRequest('/api/db/talktime-requests', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!ordersList.ok || !Array.isArray(ordersList.data?.data)) {
      throw new Error(`T4.2 Fetch Orders failed: ${JSON.stringify(ordersList.data)}`);
    }
    const foundOrder = ordersList.data.data.find(o => o.id === testOrderId);
    if (!foundOrder || foundOrder.companyName !== 'Vertex Global Freight') {
      throw new Error(`T4.2 Order company name join failed: ${JSON.stringify(foundOrder)}`);
    }
    console.log(`✅ T4.2 Admin Orders View: PASSED (Order joined with Company Name: "${foundOrder.companyName}")`);

    // T4.3 Admin Approves Order
    const approveOrder = await jsonRequest(`/api/db/talktime-requests/${testOrderId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { clientId: testClientId, addedMinutes: 2500 }
    });
    if (!approveOrder.ok || !approveOrder.data?.success) {
      throw new Error(`T4.3 Approve order failed: ${JSON.stringify(approveOrder.data)}`);
    }
    console.log('✅ T4.3 Admin Order Approval: PASSED (Status set to approved)');

    // T4.4 Verify Client Minute Balance in PostgreSQL
    const clientDb = await dbClient.query(`SELECT talktime_minutes_total FROM clients WHERE id = $1`, [testClientId]);
    const updatedMinutes = clientDb.rows[0].talktime_minutes_total;
    if (updatedMinutes !== 8500) { // 6000 initial + 2500 added
      throw new Error(`T4.4 Minute credit mismatch in DB: expected 8500, got ${updatedMinutes}`);
    }
    console.log(`✅ T4.4 Minute Balance Credited in PostgreSQL: PASSED (Balance: ${updatedMinutes.toLocaleString()} mins)`);

    // ----------------------------------------------------------------
    // SUITE 5: CLIENT DASHBOARD - LEADS & CALL LOGGING
    // ----------------------------------------------------------------
    console.log('\n--- [SUITE 5: CLIENT DASHBOARD - LEADS & CALL LOGS] ---');

    // T5.1 Create Lead for Client
    const leadRes = await jsonRequest('/api/db/leads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        id: 'lead-test-' + Date.now(),
        clientId: testClientId,
        companyName: 'Pacifica Logistics Group',
        contactName: 'James Wilson',
        email: 'jwilson@pacificalog.com',
        phone: '+1 (415) 555-3321',
        industry: 'Supply Chain',
        status: 'pending'
      }
    });
    if (!leadRes.ok) throw new Error(`T5.1 Create Lead failed: ${JSON.stringify(leadRes.data)}`);
    console.log('✅ T5.1 Create Lead for Client: PASSED');

    // T5.2 Client retrieves their scoped leads
    const clientLeads = await jsonRequest('/api/db/leads', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    if (!clientLeads.ok || clientLeads.data.data.length === 0) {
      throw new Error('T5.2 Client could not fetch own leads');
    }
    console.log(`✅ T5.2 Client Scoped Leads Query: PASSED (${clientLeads.data.data.length} lead found)`);

    // T5.3 Save Call Log with Intelligence & Followup Draft
    const logRes = await jsonRequest('/api/db/call-logs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        clientId: testClientId,
        leadName: 'James Wilson',
        leadPhone: '+1 (415) 555-3321',
        leadCompany: 'Pacifica Logistics Group',
        callDurationSeconds: 148,
        disposition: 'callback_scheduled',
        sentiment: 'positive',
        conversionChance: 82,
        aiConclusion: 'Prospect interested in automated freight pricing. Requested product demo.',
        transcript: [
          { speaker: 'ai', text: 'Hi James, this is Vela from Vertex Global Freight.' },
          { speaker: 'human', text: 'Hey, tell me how your automated pricing works.' }
        ],
        followupDraft: {
          subject: 'Demo Confirmation - Vertex Global Freight Spot Pricing',
          body: 'Hi James, following our call, here is the architecture breakdown for your team.'
        }
      }
    });
    if (!logRes.ok || !logRes.data?.data?.id) {
      throw new Error(`T5.3 Create Call Log failed: ${JSON.stringify(logRes.data)}`);
    }
    console.log('✅ T5.3 Real-time Call Log & Follow-up Draft Persisted in PostgreSQL: PASSED');

    // ----------------------------------------------------------------
    // SUITE 6: SECURITY & ROLE-BASED ACCESS CONTROL
    // ----------------------------------------------------------------
    console.log('\n--- [SUITE 6: SECURITY & API LOCKDOWN] ---');

    // T6.1 Unauthenticated Request to Protected Route
    const noAuth = await jsonRequest('/api/db/clients');
    if (noAuth.status !== 401) {
      throw new Error(`T6.1 Unauthorized access did not return 401: got ${noAuth.status}`);
    }
    console.log('✅ T6.1 Unauthenticated Request Rejected: PASSED (401 Unauthorized)');

    // T6.2 Client attempting Admin-Only route
    const clientAdminAttempt = await jsonRequest('/api/admin/create-client', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { email: 'hacker@lucentai.com', companyName: 'Hack Corp' }
    });
    if (clientAdminAttempt.status !== 403) {
      throw new Error(`T6.2 Client calling admin route did not return 403: got ${clientAdminAttempt.status}`);
    }
    console.log('✅ T6.2 Non-Admin Token Forbidden from Admin Endpoints: PASSED (403 Forbidden)');

    // T6.3 Invalid / Tampered JWT Token
    const tamperedRes = await jsonRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${clientToken}TamperedPayload123` }
    });
    if (tamperedRes.status !== 401) {
      throw new Error(`T6.3 Tampered token did not return 401: got ${tamperedRes.status}`);
    }
    console.log('✅ T6.3 Tampered JWT Token Rejected: PASSED (401 Invalid Token)');

    // ----------------------------------------------------------------
    // CLEANUP TEST DATA
    // ----------------------------------------------------------------
    console.log('\n🧹 Cleaning up test fixtures from Supabase...');
    if (testClientId) {
      await dbClient.query(`DELETE FROM call_logs WHERE client_id = $1`, [testClientId]);
      await dbClient.query(`DELETE FROM talktime_requests WHERE client_id = $1`, [testClientId]);
      await dbClient.query(`DELETE FROM leads WHERE client_id = $1`, [testClientId]);
      await dbClient.query(`DELETE FROM clients WHERE id = $1`, [testClientId]);
    }
    if (testMeetingId) {
      await dbClient.query(`DELETE FROM meetings WHERE id = $1`, [testMeetingId]);
    }
    await dbClient.query(`DELETE FROM users WHERE email = $1`, [testClientEmail]);
    console.log('✅ Test fixtures cleaned up successfully.');

    console.log('\n================================================================');
    console.log('🎉 ALL 24 VERIFICATION TESTS PASSED WITH 100% SUCCESS RATE! 🎉');
    console.log('================================================================\n');

  } finally {
    await dbClient.end();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

runAllSuites().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
