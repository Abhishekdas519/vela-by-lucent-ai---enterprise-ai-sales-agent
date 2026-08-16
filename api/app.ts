import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Enable CORS for cross-origin requests from Vercel / clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

import { requireAuth, requireAdmin, generateToken, AuthRequest } from '../src/middleware/auth.js';
import { 
  getOrCreateUser, 
  getUserByEmail, 
  getUserById,
  createUser, 
  getAllClients, 
  createClient, 
  getClientById, 
  getClientByUserId, 
  getClientByEmail, 
  createLead, 
  getLeads, 
  getLeadsByClientId, 
  createTalktimeRequest, 
  getTalktimeRequests, 
  updateTalktimeRequestStatus, 
  updateClientTalktime, 
  createCallLog, 
  getClientLogs, 
  createMeeting, 
  getMeetings, 
  updateMeetingStatus,
  createAdminNotification,
  getAdminNotifications,
  markAdminNotificationRead
} from '../src/db/queries.js';

// ============================================================================
// 1. AUTHENTICATION & ONBOARDING
// ============================================================================

// Real User Registration & Client Onboarding API
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      companyName, 
      industry, 
      phoneNumber, 
      preferredTime, 
      meetingRequested 
    } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isAdmin = cleanEmail.startsWith('admin@') || cleanEmail === 'abhishekdas2090@gmail.com';
    const role: 'admin' | 'client' = isAdmin ? 'admin' : 'client';
    const userId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Check if user already exists
    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    let user;
    try {
      user = await createUser({
        uid: userId,
        email: cleanEmail,
        displayName: fullName || cleanEmail.split('@')[0],
        passwordHash: hashedPassword,
        role
      });
    } catch (err: any) {
      console.error('Failed to create user:', err);
      return res.status(500).json({ error: 'Failed to create user account in database' });
    }

    let clientProfile: any = null;

    if (role === 'client') {
      const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newClientData = {
        id: clientId,
        userId: user?.uid || userId,
        companyName: companyName || (fullName ? `${fullName}'s Business` : 'Client Organization'),
        contactName: fullName || cleanEmail.split('@')[0],
        email: cleanEmail,
        industry: industry || 'B2B Software & SaaS',
        status: 'active',
        vapiAssistantId: `asst_${clientId}`,
        vapiVoiceId: 'cartesia-sonic-marcus',
        vapiVoiceName: 'Cartesia Sonic (Warm Authority)',
        twilioPhoneNumber: '+1 (800) 555-VELA',
        systemPrompt: `You are Vela, the autonomous sales agent for ${companyName || 'Enterprise'}. Qualify prospects and book calendar meetings.`,
        firstMessage: `Hi! This is Vela calling from ${companyName || 'our team'}. Do you have 60 seconds?`,
        talktimeMinutesTotal: 500,
        talktimeMinutesUsed: 0,
        activeLines: 2,
        callingHoursStart: '09:00',
        callingHoursEnd: '18:00',
        timezone: 'America/New_York (EST)',
        autoFollowupEnabled: true,
        followupDelayHours: 12,
        subscriptionPlan: 'starter'
      };

      try {
        clientProfile = await createClient(newClientData);
      } catch (err) {
        console.error('Client record creation error:', err);
        clientProfile = newClientData;
      }

      // Record lead in database
      try {
        await createLead({
          id: 'lead-' + Date.now(),
          clientId: clientProfile.id,
          companyName: clientProfile.companyName,
          contactName: clientProfile.contactName,
          email: clientProfile.email,
          phone: phoneNumber || null,
          industry: clientProfile.industry,
          status: 'pending_configuration',
          meetingRequested: !!meetingRequested,
          meetingTime: preferredTime || null
        });
      } catch (e) {
        console.error('Lead creation error:', e);
      }

      if (meetingRequested || preferredTime) {
        try {
          await createMeeting({
            id: 'mtg-' + Date.now(),
            contactName: clientProfile.contactName,
            companyName: clientProfile.companyName,
            email: clientProfile.email,
            phone: phoneNumber || null,
            industry: clientProfile.industry,
            preferredTime: preferredTime || null,
            status: 'pending',
            notes: 'Automated signup onboarding meeting'
          });
        } catch (e) {
          console.error('Meeting creation error:', e);
        }
      }

      // Persist Admin Notification to Database
      await createAdminNotification({
        id: 'notif-' + Date.now(),
        type: 'signup',
        title: '🚀 New Client Account Registered',
        message: `${clientProfile.contactName} from ${clientProfile.companyName} (${cleanEmail}) registered on the platform!`,
        read: false
      });
    } else {
      await createAdminNotification({
        id: 'notif-' + Date.now(),
        type: 'signup',
        title: '👑 Admin Session Registered',
        message: `Admin user ${cleanEmail} registered into the Master Suite.`,
        read: false
      });
    }

    const token = generateToken({
      uid: user.uid,
      email: cleanEmail,
      role,
      displayName: user.displayName || cleanEmail.split('@')[0],
      clientId: clientProfile?.id
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.uid,
        name: user.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role,
        companyName: clientProfile?.companyName || (isAdmin ? 'Lucent AI Master Suite' : 'Client Organization'),
        clientId: clientProfile?.id
      },
      client: clientProfile
    });
  } catch (error: any) {
    console.error('Sign-up error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Real User Login & Session Verification API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Strict Password Verification
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Account password not configured. Please contact admin.' });
    }

    const isBcrypt = user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$');
    const isValid = isBcrypt ? bcrypt.compareSync(password, user.passwordHash) : (password === user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const role = (user.role || 'client') as 'admin' | 'client';
    let clientProfile: any = null;

    if (role === 'client') {
      clientProfile = await getClientByEmail(cleanEmail);
      if (!clientProfile && user.uid) {
        clientProfile = await getClientByUserId(user.uid);
      }
    }

    const token = generateToken({
      uid: user.uid,
      email: cleanEmail,
      role,
      displayName: user.displayName || cleanEmail.split('@')[0],
      clientId: clientProfile?.id
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.uid,
        name: user.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role,
        companyName: clientProfile?.companyName || (role === 'admin' ? 'Lucent AI Master Suite' : 'Client Organization'),
        clientId: clientProfile?.id
      },
      client: clientProfile
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Current User Session Verification via JWT Bearer Token
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const user = await getUserById(authUser.uid) || await getUserByEmail(authUser.email);
    if (!user) {
      return res.status(401).json({ error: 'User session expired or not found' });
    }

    let clientProfile = null;
    if (user.role === 'client') {
      clientProfile = await getClientByEmail(user.email) || await getClientByUserId(user.uid);
    }

    res.json({
      success: true,
      user: {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        role: user.role,
        companyName: clientProfile?.companyName || (user.role === 'admin' ? 'Lucent AI Master Suite' : 'Client Organization'),
        clientId: clientProfile?.id
      },
      client: clientProfile
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. GEMINI AI ENGINE & LIVE DEMO
// ============================================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function generateWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  config?: any;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('No GEMINI_API_KEY set');
  }

  const generatePromise = ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      maxOutputTokens: 120, // Punchy conversational sentences
      temperature: 0.6,
      ...(params.config || {})
    }
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Voice latency timeout')), 2500)
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
    version: '2.0.0',
    service: 'Vela by Lucent AI - Enterprise Voice Sales Engine',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    databaseConfigured: !!process.env.DATABASE_URL
  });
});

// Ultra-Persuasive Human-Like B2B Sales Agent Chat
app.post('/api/agent/chat', async (req, res) => {
  const { message, history, personaPrompt, interruptOccurred } = req.body;
  const userMsg = message || 'Hello, can you introduce yourself?';

  try {
    const systemInstruction = personaPrompt || `You are Vela, the world's most elite autonomous B2B AI Sales Agent built by Lucent AI.
You are speaking live over an ultra-low latency phone call with a business executive.

CRITICAL CONVERSATIONAL RULES:
1. TALK LIKE A REAL HUMAN: Warm, sharp, charismatic, concise. Keep each turn to 1 to 2 crisp, high-impact sentences. NEVER sound like a generic chatbot or write essays.
2. HANDLING OBJECTIONS & CLOSING:
   - If they say "I'm busy" / "Not interested": "I totally respect your time. Just 20 seconds: we replace entire 15-person SDR fleets with autonomous voice agents at 10% lower cost than manual BPOs. Can I send you a 60-second video breakdown?"
   - If they ask about price: "Our starter fleet is just $299 a month for 2,000 live dial minutes. When compared to paying $4,000 per month for a human SDR, the ROI is immediate. What is your team currently spending on outbound?"
   - If they ask how it works: "You upload a CSV of leads, and I dial up to 50 numbers simultaneously with sub-450ms voice, qualify the prospect, and book discovery calls right on your calendar."
   - If they ask about competitors (Vapi/Retell/BPOs): "Unlike raw APIs, Vela is a complete turnkey sales force with built-in CRM sync, real-time conversion scoring, and automated 12-hour follow-up dispatching."
3. IF INTERRUPTED: Acknowledge the interruption smoothly ("Understood," "Great point," "Hear you loud and clear") and pivot immediately to their concern.
4. CALL TO ACTION: Always end your turn by driving them toward booking a live pilot or creating their free account.`;

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
      parts: [{ text: (interruptOccurred ? '[User interrupted mid-sentence]: ' : '') + userMsg }]
    });

    const text = await generateWithFallback({
      contents,
      systemInstruction,
      config: { temperature: 0.7 }
    });

    res.json({
      reply: text || "Hi! I'm Vela from Lucent AI. We automate your outbound cold calling with sub-450ms voice AI and book qualified meetings. What industry does your team sell to?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  } catch (_error) {
    const lower = userMsg.toLowerCase();
    let reply = "I'm Vela from Lucent AI. We replace manual SDR cold calling with autonomous voice execution at 10% lower cost than traditional call centers. What industry is your company in?";
    
    if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('much')) {
      reply = "Our starter plan starts at $299/mo for 2,000 minutes. Compared to a $4,000/mo human SDR, you get 10x the dial volume for a fraction of the cost. Would you like to start a 50-lead trial?";
    } else if (lower.includes('busy') || lower.includes('not interested') || lower.includes('no thanks') || lower.includes('stop')) {
      reply = "Understood! Before you go—what if you could cut your cost-per-qualified-meeting by 89% this quarter? Let me drop our 1-minute case study in your inbox.";
    } else if (lower.includes('crm') || lower.includes('hubspot') || lower.includes('salesforce') || lower.includes('integrate')) {
      reply = "We integrate natively with HubSpot, Salesforce, Supabase, and custom webhooks. All transcripts, recordings, and lead scores push to your CRM in real time.";
    } else if (lower.includes('human') || lower.includes('sdr') || lower.includes('team') || lower.includes('replace')) {
      reply = "A single Vela agent handles up to 50 concurrent lines simultaneously, doing the heavy lifting of 15 SDRs without burnout or turnover. Are you ready to see a live batch run?";
    } else if (lower.includes('yes') || lower.includes('sure') || lower.includes('book') || lower.includes('try') || lower.includes('demo')) {
      reply = "Fantastic! Click 'Book Strategy Session' or sign up right here. I'll have your custom telephony line and voice persona provisioned in 3 minutes.";
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = "Hey there! I'm Vela. I dial prospects, qualify interest, and book meetings for B2B sales teams. How many leads does your company reach out to each month?";
    }

    res.json({
      reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  }
});

// Full Autonomous Call Execution & Intelligence Analyzer
app.post('/api/call/simulate', requireAuth, async (req: AuthRequest, res) => {
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

Generate a realistic 4-to-6 turn phone dialog transcript, followed by structured analysis:
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
    const conversionScore = Math.floor(65 + Math.random() * 28);
    const duration = Math.floor(95 + Math.random() * 85);

    res.json({
      callDurationSeconds: duration,
      sentiment: conversionScore >= 75 ? 'positive' : 'neutral',
      conversionChance: conversionScore,
      aiConclusion: `Spoke with ${leadName} (${leadTitle} at ${leadCompany}). Confirmed current operational bottlenecks in ${industry} and scheduled a calendar walkthrough.`,
      keyObjections: [
        `Inquired about integration timeline with existing tech stack`,
        'Confirmed outbound concurrency and caller ID reputation guarantees'
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
        body: `Hi ${leadName},\n\nIt was great speaking with you today regarding ${clientCompany}'s autonomous voice sales fleet. As discussed, here is the link to review benchmarks and book your onboarding:\n\n👉 https://lucent.ai/demo\n\nBest regards,\nVela AI`
      }
    });
  }
});

// Vapi Public Config for Web SDK
app.get(['/api/vapi/config', '/api/vapi-config'], (req, res) => {
  res.json({
    publicKey: process.env.VAPI_PUBLIC_KEY || null,
    defaultAssistantId: process.env.VAPI_ASSISTANT_ID || null,
    hasVapi: !!process.env.VAPI_PUBLIC_KEY,
  });
});

// AI Sales Prompt & Assistant System Creator
app.post('/api/prompts/generate', requireAuth, async (req: AuthRequest, res) => {
  const { companyName, industry, targetAudience, valueProposition, primaryGoal } = req.body;
  const comp = companyName || 'Enterprise Client';
  const ind = industry || 'B2B Services';

  try {
    const prompt = `You are the Lead Voice Architecture Engineer at Lucent AI. 
Generate a high-converting Voice Assistant System Prompt and First Message for:
Company: ${comp}
Industry: ${ind}
Target Audience: ${targetAudience || 'Decision Makers'}
Key Value Prop: ${valueProposition || 'Automated efficiency and revenue growth'}
Primary Call Goal: ${primaryGoal || 'Book a 15-minute product tour'}`;

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

// ============================================================================
// 3. DATABASE REST ENDPOINTS
// ============================================================================

// Database Clients List (ADMIN ONLY)
app.get('/api/db/clients', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const clientsList = await getAllClients();
    res.json({ success: true, data: clientsList });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch clients from database' });
  }
});

// Create new Client profile (ADMIN ONLY)
app.post('/api/db/clients', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const newClient = await createClient(req.body);
    res.json({ success: true, data: newClient });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save client to database' });
  }
});

// Admin Notifications Store (ADMIN ONLY)
app.get('/api/admin/notifications', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const notifs = await getAdminNotifications();
    res.json({ success: true, data: notifs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/notifications/mark-read', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.body;
    await markAdminNotificationRead(id);
    const notifs = await getAdminNotifications();
    res.json({ success: true, data: notifs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leads List (Scoped to Role)
app.get('/api/db/leads', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'admin') {
      const allLeads = await getLeads();
      return res.json({ success: true, data: allLeads });
    }
    const clientLeads = await getLeadsByClientId(req.user?.clientId || '');
    res.json({ success: true, data: clientLeads });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/db/leads/:clientId', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.clientId !== req.params.clientId) {
      return res.status(403).json({ error: 'Access denied to this client leads queue' });
    }
    const clientLeads = await getLeadsByClientId(req.params.clientId);
    res.json({ success: true, data: clientLeads });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/db/leads', async (req, res) => {
  try {
    const leadPayload = {
      id: req.body.id || 'lead-' + Date.now(),
      clientId: req.body.clientId || null,
      companyName: req.body.companyName || 'Enterprise Lead',
      contactName: req.body.contactName || req.body.email?.split('@')[0] || 'Executive Prospect',
      email: req.body.email || 'prospect@enterprise.com',
      phone: req.body.phone || null,
      industry: req.body.industry || 'B2B Software',
      status: 'pending_configuration',
      meetingRequested: !!req.body.meetingRequested,
      meetingTime: req.body.meetingTime || null
    };

    const savedLead = await createLead(leadPayload);

    await createAdminNotification({
      id: 'notif-' + Date.now(),
      type: 'signup',
      title: '🚀 New Client Lead Received',
      message: `${savedLead.contactName} from ${savedLead.companyName} (${savedLead.email}) requested onboarding!`,
      read: false
    });

    res.json({ success: true, data: savedLead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Talk-time Requests
app.post('/api/db/talktime-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderPayload = {
      id: 'order-' + Date.now(),
      clientId: req.body.clientId || req.user?.clientId || 'Client Account',
      minutesRequested: req.body.minutesRequested || 500,
      amountDue: req.body.totalAmount || req.body.amountDue || 45,
      status: 'pending'
    };

    const savedOrder = await createTalktimeRequest(orderPayload);

    await createAdminNotification({
      id: 'notif-' + Date.now(),
      type: 'purchase_request',
      title: '⚡ New Talk-Time Minute Purchase',
      message: `Client ${savedOrder.clientId} purchased ${savedOrder.minutesRequested?.toLocaleString()} minutes ($${savedOrder.amountDue}).`,
      read: false
    });

    res.json({ success: true, data: savedOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/talktime-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orders = await getTalktimeRequests();
    if (req.user?.role === 'admin') {
      return res.json({ success: true, data: orders });
    }
    const myOrders = orders.filter(o => o.clientId === req.user?.clientId);
    res.json({ success: true, data: myOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve talktime request and credit minutes to client (ADMIN ONLY)
app.post('/api/db/talktime-requests/:id/approve', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTalktimeRequestStatus(id, 'approved');
    if (updated && updated.clientId && updated.minutesRequested) {
      try { 
        await updateClientTalktime(updated.clientId, updated.minutesRequested); 
      } catch(e) {
        console.error('Talktime credit error:', e);
      }
    }
    await createAdminNotification({
      id: 'notif-' + Date.now(),
      type: 'order_approved',
      title: '✅ Order Approved',
      message: `Talktime order ${id} approved and ${updated?.minutesRequested || 0} minutes credited.`,
      read: false
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject talktime request (ADMIN ONLY)
app.post('/api/db/talktime-requests/:id/reject', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTalktimeRequestStatus(id, 'rejected');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Call logs — save a simulated call result
app.post('/api/db/call-logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const logData = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      clientId: req.body.clientId || req.user?.clientId || null,
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
app.get('/api/db/call-logs/:clientId', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.clientId !== req.params.clientId) {
      return res.status(403).json({ error: 'Unauthorized to view these call logs' });
    }
    const logs = await getClientLogs(req.params.clientId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Meetings — book a meeting with Lucent AI team (PUBLIC & AUTH)
app.post('/api/meetings', async (req, res) => {
  try {
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
    const savedMeeting = await createMeeting(meetingPayload);
    await createAdminNotification({
      id: 'notif-' + Date.now(),
      type: 'meeting_request',
      title: '📅 New Strategy Meeting Request',
      message: `${savedMeeting.contactName} from ${savedMeeting.companyName} (${savedMeeting.email}) requested a meeting${savedMeeting.preferredTime ? ` at ${new Date(savedMeeting.preferredTime).toLocaleString()}` : ''}.`,
      read: false
    });
    res.json({ success: true, data: savedMeeting });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/meetings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allMeetings = await getMeetings();
    res.json({ success: true, data: allMeetings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/meetings/:id/status', requireAdmin, async (req: AuthRequest, res) => {
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
    return res.status(500).json({ error: 'VAPI_API_KEY is not configured in environment variables.' });
  }
  
  if (!process.env.VAPI_PHONE_NUMBER_ID) {
    return res.status(500).json({ error: 'VAPI_PHONE_NUMBER_ID is not configured. Add a Vapi Phone Number ID to dial outbound PSTN calls.' });
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
        firstMessage: "Hi, this is Vela! Thank you for visiting our website. How can I help you accelerate your outbound sales today?",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "You are Vela, the autonomous sales agent from Lucent AI. You just called a user who requested an instant callback from your website."
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
