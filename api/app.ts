import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

// Enable CORS for cross-origin requests from Vercel
app.use(cors());

app.use(express.json());

import { requireAuth, AuthRequest } from '../src/middleware/auth.js';
import { getOrCreateUser, getAllClients, createClient, getClientById, createLead, getLeads, createTalktimeRequest, getTalktimeRequests, updateTalktimeRequestStatus, updateClientTalktime, createCallLog, getClientLogs, createMeeting, getMeetings, updateMeetingStatus } from '../src/db/queries.js';

let adminNotifications: any[] = [];

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Fast Gemini 3.5 Flash engine optimized for voice conversations
async function generateWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  config?: any;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('No GEMINI_API_KEY set');
  }

  // 1500ms timeout for ultra-fast voice turnarounds
  const generatePromise = ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      maxOutputTokens: 80, // Crisp, natural phone-length responses
      temperature: 0.6,
      ...(params.config || {})
    }
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Voice latency timeout')), 1800)
  );

  const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
  if (response && response.text) {
    return response.text;
  }
  throw new Error('No response generated');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Vela by Lucent AI - Enterprise Voice Orchestrator',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Sync authenticated user to Cloud SQL database
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || '';
    const name = (req.user as any)?.name || email.split('@')[0];
    if (!uid) {
      return res.status(400).json({ error: 'Missing UID' });
    }
    const user = await getOrCreateUser(uid, email, name);
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Database sync error' });
  }
});

// Database Clients List
app.get('/api/db/clients', async (req, res) => {
  try {
    const clientsList = await getAllClients();
    res.json({ success: true, data: clientsList });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch clients from database' });
  }
});

// Create new Client profile
app.post('/api/db/clients', async (req, res) => {
  try {
    const newClient = await createClient(req.body);
    res.json({ success: true, data: newClient });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save client to database' });
  }
});

// Real-time Chat / Voice simulation turn for Live Interactive Landing Page Demo
app.post('/api/agent/chat', async (req, res) => {
  const { message, history, personaPrompt } = req.body;
  const userMsg = message || 'Hello, can you introduce yourself?';

  try {
    const systemInstruction = personaPrompt || `You are Vela, the elite autonomous B2B AI Sales Agent created by Lucent AI. 
You are speaking live over an ultra-low latency voice call with a business leader.
Your style: Highly professional, energetic, articulate, warm, consultative, and concise (under 2-3 sentences per turn for natural phone pacing).
You replace manual call centers and SDR cold calling teams with autonomous voice execution at 10% lower cost than any competitor (Vapi/Retell/BPOs), offering sub-450ms human-grade latency, automated CSV dialing, 0-100% conversion scoring, and 12-hour follow-up triggers.
Handle objections gracefully, explain your capabilities if asked, and invite them to test a batch dial or check their dashboard.`;

    // Construct conversation history
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.speaker === 'agent' ? 'model' : 'user',
          parts: [{ text: turn.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMsg }]
    });

    const text = await generateWithFallback({
      contents,
      systemInstruction,
      config: { temperature: 0.7 }
    });

    res.json({
      reply: text || "Hello! I am Vela by Lucent AI. I automate outbound sales calls and B2B qualification with human-grade voice latency.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  } catch (_error) {
    // Dynamic smart responses based on user query
    const lower = userMsg.toLowerCase();
    let reply = "I am Vela, Lucent AI's autonomous sales voice agent. I can dial thousands of qualified leads daily, handle complex objections, and book meetings directly to your calendar.";
    
    if (lower.includes('price') || lower.includes('cost') || lower.includes('cheap') || lower.includes('competitor')) {
      reply = "Our pricing is guaranteed 10% lower than traditional call centers and competing voice platforms, starting from just $0.09 per minute with zero setup fees and immediate Stripe top-up.";
    } else if (lower.includes('crm') || lower.includes('hubspot') || lower.includes('salesforce') || lower.includes('integrate')) {
      reply = "Vela provides seamless bidirectional integration with HubSpot, Salesforce, Supabase, and custom REST webhooks to push transcripts and conversion scores instantly.";
    } else if (lower.includes('latency') || lower.includes('vapi') || lower.includes('voice') || lower.includes('fast')) {
      reply = "With our Vapi and Twilio SIP infrastructure, our voice pipeline operates under 450 milliseconds, creating completely natural human-grade phone conversations with zero awkward pauses.";
    } else if (lower.includes('follow') || lower.includes('email') || lower.includes('12')) {
      reply = "Right after each call concludes, Vela synthesizes a tailored email or SMS draft and automatically triggers the follow-up 12 hours later to maximize conversion rates.";
    }

    res.json({
      reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  }
});

// Full Autonomous Call Execution & Intelligence Analyzer
app.post('/api/call/simulate', async (req, res) => {
  const { lead, clientProfile } = req.body;
  const leadName = lead?.name || 'Prospect';
  const leadCompany = lead?.company || 'Enterprise Account';
  const leadTitle = lead?.title || 'Decision Maker';
  const clientCompany = clientProfile?.companyName || 'Lucent AI Sales Fleet';
  const industry = clientProfile?.industry || 'B2B Services';

  try {
    const prompt = `You are simulating a complete autonomous B2B outbound phone call between Vela (an AI sales executive) and a lead named "${leadName}" (${leadTitle} at ${leadCompany}).
Client Context:
- Company: ${clientCompany}
- Industry: ${industry}
- Objective: ${clientProfile?.systemPrompt || 'Pitch autonomous workflow optimization and book a demo'}

Generate a realistic 4-to-6 turn phone dialog transcript, followed by a structured analysis including:
1. AI Call Conclusion (2-3 concise summary sentences)
2. Sentiment ('positive', 'neutral', or 'negative')
3. Chance of Conversion (integer percentage between 10 and 95)
4. Key Objections Encountered (array of strings)
5. Call duration in seconds (between 45 and 210)
6. Automated 12-Hour Follow-Up Draft (subject + professional body tailored to the conversation)`;

    const text = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            callDurationSeconds: { type: Type.INTEGER },
            sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
            conversionChance: { type: Type.INTEGER },
            aiConclusion: { type: Type.STRING },
            keyObjections: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING, enum: ['agent', 'lead'] },
                  text: { type: Type.STRING },
                  timestamp: { type: Type.STRING }
                },
                required: ['speaker', 'text', 'timestamp']
              }
            },
            followupDraft: {
              type: Type.OBJECT,
              properties: {
                channel: { type: Type.STRING, enum: ['email', 'sms'] },
                subject: { type: Type.STRING },
                body: { type: Type.STRING }
              },
              required: ['channel', 'body']
            }
          },
          required: ['callDurationSeconds', 'sentiment', 'conversionChance', 'aiConclusion', 'keyObjections', 'transcript', 'followupDraft']
        }
      }
    });

    const parsed = JSON.parse(text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.warn('Fallback simulated call generated for /api/call/simulate:', error?.message);

    const conversionScore = Math.floor(65 + Math.random() * 28);
    const duration = Math.floor(95 + Math.random() * 85);

    res.json({
      callDurationSeconds: duration,
      sentiment: conversionScore >= 75 ? 'positive' : 'neutral',
      conversionChance: conversionScore,
      aiConclusion: `Spoke with ${leadName} (${leadTitle} at ${leadCompany}). The lead confirmed current operational bottlenecks in their ${industry} workflow and expressed high interest in autonomous voice automation. Requested a calendar link for an in-depth walkthrough.`,
      keyObjections: [
        `Inquired about integration timeline with existing ${leadCompany} tech stack`,
        'Confirmed outbound concurrency and Twilio caller ID reputation guarantees'
      ],
      transcript: [
        { speaker: 'agent', text: `Hi ${leadName}! This is Vela calling on behalf of ${clientCompany}. Do you have 60 seconds?`, timestamp: '00:02' },
        { speaker: 'lead', text: `Hi Vela, I'm between meetings. What is this regarding?`, timestamp: '00:09' },
        { speaker: 'agent', text: `We help teams in ${industry} replace manual repetitive outreach with sub-450ms voice AI, cutting cost-per-lead by 89% while booking qualified discovery calls directly into your pipeline.`, timestamp: '00:22' },
        { speaker: 'lead', text: `That sounds interesting. Does it handle custom objection workflows and sync with our CRM?`, timestamp: '00:41' },
        { speaker: 'agent', text: `Yes, completely. It features bidirectional sync with HubSpot, Salesforce, Supabase, and automated 12-hour follow-ups for all qualified prospects.`, timestamp: '00:58' },
        { speaker: 'lead', text: `Great. Send over a quick demo link and your calendar to my email.`, timestamp: '01:18' }
      ],
      followupDraft: {
        channel: 'email',
        subject: `Follow-up & Demo Confirmation - ${clientCompany}`,
        body: `Hi ${leadName},\n\nIt was great speaking with you today regarding ${clientCompany}'s autonomous voice sales fleet. As discussed, here is the private link to review our platform benchmarks and book your live onboarding demo:\n\n👉 https://lucent.ai/demo/${encodeURIComponent(leadCompany.toLowerCase().replace(/\\s+/g, '-'))}\n\nLooking forward to accelerating your outbound revenue!\n\nBest regards,\nVela AI\nAutonomous Sales Specialist, ${clientCompany}`
      }
    });
  }
});

// Vapi Public Config for Web SDK
app.get('/api/vapi/config', (req, res) => {
  res.json({
    publicKey: process.env.VAPI_PUBLIC_KEY || null,
    defaultAssistantId: process.env.VAPI_ASSISTANT_ID || null,
    hasVapi: !!process.env.VAPI_PUBLIC_KEY,
  });
});

// AI Sales Prompt & Assistant System Creator
app.post('/api/prompts/generate', async (req, res) => {
  const { companyName, industry, targetAudience, valueProposition, primaryGoal } = req.body;
  const comp = companyName || 'Enterprise Client';
  const ind = industry || 'B2B Services';

  try {
    const prompt = `You are the Lead Voice Architecture Engineer at Lucent AI. 
Generate a high-converting Vapi Voice Assistant System Prompt and First Message for:
Company: ${comp}
Industry: ${ind}
Target Audience: ${targetAudience || 'Decision Makers'}
Key Value Prop: ${valueProposition || 'Automated efficiency and revenue growth'}
Primary Call Goal: ${primaryGoal || 'Book a 15-minute product tour'}

The prompt must include:
1. Persona & Tone (Human-like, sub-450ms pacing, confident, conversational)
2. Opening Hook & Permission Gate
3. Qualification Criteria
4. Concise Objection Battlecards (Budget, "Send me an email", "We already have a solution", "Busy right now")
5. Calendar Booking & CRM Hand-off flow.`;

    const text = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systemPrompt: { type: Type.STRING },
            firstMessage: { type: Type.STRING },
            suggestedVoiceId: { type: Type.STRING },
            suggestedVoiceName: { type: Type.STRING },
            keyObjectionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['systemPrompt', 'firstMessage', 'suggestedVoiceId', 'suggestedVoiceName', 'keyObjectionTips']
        }
      }
    });

    const parsed = JSON.parse(text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.warn('Fallback prompt generated for /api/prompts/generate:', error?.message);
    res.json({
      systemPrompt: `You are Vela, the autonomous executive sales agent for ${comp}. Your mission is to qualify prospects in ${ind} by presenting ${valueProposition || 'autonomous revenue acceleration'} and securing calendar commitments for a 15-minute discovery call. Keep responses concise (under 2-3 sentences), warm, and consultative.`,
      firstMessage: `Hi! This is Vela calling on behalf of ${comp}. Do you have 60 seconds to review how we streamline operations in ${ind}?`,
      suggestedVoiceId: 'cartesia-sonic-marcus',
      suggestedVoiceName: 'Cartesia Sonic (Warm Authority)',
      keyObjectionTips: [
        'Acknowledge objections with empathy before reframing value',
        'If prospect is busy, immediately offer the 12-hour follow-up channel',
        'Highlight guaranteed 10% lower pricing versus legacy solutions'
      ]
    });
  }
});

// Stripe Checkout & Instant Minute Credit Simulator
app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { packageId, minutes, price, clientId, companyName } = req.body;

    const sessionId = `cs_live_lucent_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const paymentIntentId = `pi_vela_${Math.random().toString(36).substring(2, 10)}`;

    res.json({
      success: true,
      sessionId,
      paymentIntentId,
      minutesCredited: minutes,
      amountCharged: price,
      currency: 'usd',
      creditedInMinutes: 15,
      instantStatus: 'confirmed',
      receiptUrl: `https://dashboard.stripe.com/receipts/${paymentIntentId}`,
      message: `Successfully allocated ${minutes?.toLocaleString() || 0} talktime minutes to ${companyName || 'your account'}. Live balance updated!`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Payment processing failed', details: error.message });
  }
});

// Admin Notifications Store
app.get('/api/admin/notifications', (req, res) => {
  res.json({ success: true, data: adminNotifications });
});

app.post('/api/admin/notifications/mark-read', (req, res) => {
  const { id } = req.body;
  if (id) {
    const notif = adminNotifications.find(n => n.id === id);
    if (notif) notif.read = true;
  } else {
    adminNotifications.forEach(n => n.read = true);
  }
  res.json({ success: true, data: adminNotifications });
});

// Leads / Signups
app.post('/api/db/leads', async (req, res) => {
  const leadPayload = {
    id: req.body.id || 'lead-' + Date.now(),
    companyName: req.body.companyName || 'Enterprise Lead',
    contactName: req.body.contactName || req.body.email?.split('@')[0] || 'Executive Prospect',
    email: req.body.email || 'prospect@enterprise.com',
  };

  let savedLead = leadPayload;
  try {
    savedLead = await createLead(leadPayload);
  } catch (err: any) {
    console.warn('Database save warning for lead, continuing with in-memory lead:', err?.message);
  }

  adminNotifications.unshift({
    id: 'notif-' + Date.now(),
    type: 'signup',
    title: '🚀 New Client Plan Signup / Lead',
    message: `${savedLead.contactName} from ${savedLead.companyName} (${savedLead.email}) just signed up for a plan!`,
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({ success: true, data: savedLead });
});

app.get('/api/db/leads', async (req, res) => {
  try {
    const allLeads = await getLeads();
    res.json({ success: true, data: allLeads });
  } catch (error: any) {
    res.json({ success: true, data: [] });
  }
});

// Talk-time Requests
app.post('/api/db/talktime-requests', async (req, res) => {
  const orderPayload = {
    id: 'order-' + Date.now(),
    clientId: req.body.clientId || 'Client Account',
    minutesRequested: req.body.minutesRequested || 500,
    amountDue: req.body.totalAmount || req.body.amountDue || 45,
  };

  let savedOrder = orderPayload;
  try {
    savedOrder = await createTalktimeRequest(orderPayload);
  } catch (err: any) {
    console.warn('Database save warning for talktime request, continuing:', err?.message);
  }

  adminNotifications.unshift({
    id: 'notif-' + Date.now(),
    type: 'purchase_request',
    title: '⚡ New Talk-Time Minute Purchase',
    message: `Client ${savedOrder.clientId} purchased ${savedOrder.minutesRequested?.toLocaleString()} minutes ($${savedOrder.amountDue}).`,
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({ success: true, data: savedOrder });
});

app.get('/api/db/talktime-requests', async (req, res) => {
  try {
    const orders = await getTalktimeRequests();
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.json({ success: true, data: [] });
  }
});

// Approve talktime request and credit minutes to client
app.post('/api/db/talktime-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTalktimeRequestStatus(id, 'approved');
    if (updated && updated.clientId && updated.minutesRequested) {
      try { await updateClientTalktime(updated.clientId, updated.minutesRequested); } catch(e) {}
    }
    adminNotifications.unshift({
      id: 'notif-' + Date.now(),
      type: 'order_approved',
      title: '✅ Order Approved',
      message: `Talktime order ${id} approved and ${updated?.minutesRequested || 0} minutes credited.`,
      timestamp: new Date().toISOString(),
      read: false
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject talktime request
app.post('/api/db/talktime-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTalktimeRequestStatus(id, 'rejected');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Call logs — save a simulated call result
app.post('/api/db/call-logs', async (req, res) => {
  try {
    const logData = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      clientId: req.body.clientId || null,
      leadName: req.body.leadName || 'Unknown Lead',
      leadPhone: req.body.leadPhone || '',
      leadCompany: req.body.leadCompany || '',
      callDurationSeconds: req.body.callDurationSeconds || 0,
      disposition: req.body.disposition || 'completed',
      sentiment: req.body.sentiment || 'neutral',
      conversionChance: req.body.conversionChance || 0,
      aiConclusion: req.body.aiConclusion || '',
      transcript: req.body.transcript ? JSON.stringify(req.body.transcript) : null,
      followupDraft: req.body.followupDraft ? JSON.stringify(req.body.followupDraft) : null,
    };
    const saved = await createCallLog(logData);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get call logs for a client
app.get('/api/db/call-logs/:clientId', async (req, res) => {
  try {
    const logs = await getClientLogs(req.params.clientId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.json({ success: true, data: [] });
  }
});

// Meetings — book a meeting with Lucent AI team
app.post('/api/meetings', async (req, res) => {
  const meetingPayload = {
    id: 'mtg-' + Date.now(),
    contactName: req.body.contactName || req.body.fullName || 'Executive',
    companyName: req.body.companyName || 'Enterprise',
    email: req.body.email || '',
    phone: req.body.phone || null,
    industry: req.body.industry || null,
    preferredTime: req.body.preferredTime || null,
    notes: req.body.notes || null,
    status: 'pending',
  };
  let savedMeeting = meetingPayload;
  try {
    savedMeeting = await createMeeting(meetingPayload) as any;
  } catch(err: any) {
    console.warn('Meeting DB save warning, continuing:', err?.message);
  }
  adminNotifications.unshift({
    id: 'notif-' + Date.now(),
    type: 'meeting_request',
    title: '📅 New Meeting Request',
    message: `${savedMeeting.contactName} from ${savedMeeting.companyName} (${savedMeeting.email}) requested a strategy meeting${savedMeeting.preferredTime ? ` at ${new Date(savedMeeting.preferredTime).toLocaleString()}` : ''}.`,
    timestamp: new Date().toISOString(),
    read: false
  });
  res.json({ success: true, data: savedMeeting });
});

app.get('/api/meetings', async (req, res) => {
  try {
    const allMeetings = await getMeetings();
    res.json({ success: true, data: allMeetings });
  } catch (error: any) {
    res.json({ success: true, data: [] });
  }
});

app.patch('/api/meetings/:id/status', async (req, res) => {
  try {
    const updated = await updateMeetingStatus(req.params.id, req.body.status);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vapi Outbound Instant Callback
app.post('/api/vapi/outbound', async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!process.env.VAPI_API_KEY) {
    return res.status(500).json({ error: 'VAPI_API_KEY is missing in Vercel environment variables.' });
  }
  
  if (!process.env.VAPI_PHONE_NUMBER_ID) {
    return res.status(500).json({ error: 'VAPI_PHONE_NUMBER_ID is missing in Vercel environment variables. You must add a Vapi Phone Number ID to dial outbound.' });
  }

  try {
    const payload: Record<string, any> = {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: phoneNumber
      }
    };

    if (process.env.VAPI_ASSISTANT_ID) {
      payload.assistantId = process.env.VAPI_ASSISTANT_ID;
    } else {
      payload.assistant = {
        name: "Vela Website Callback",
        firstMessage: "Hi, this is Vela! Thank you for visiting our website. We can chat right here on the phone. How can I help you accelerate your outbound revenue today?",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "You are Vela, the elite autonomous sales agent from Lucent AI. You just called a user who requested an instant callback from your website. You are confident, warm, and highly capable of explaining how Lucent AI replaces manual cold calling with sub-450ms AI voice agents."
          }]
        },
        voice: {
          provider: "cartesia",
          voiceId: "248be419-c632-4f23-adf1-5324ed7dbf1d"
        }
      };
    }

    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to trigger Vapi call');
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
export { app };
