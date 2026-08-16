import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Users table (authenticated clients or admins)
export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  role: text('role').default('client').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Client profiles & outbound phone agents
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  industry: text('industry').notNull(),
  status: text('status').default('active').notNull(),
  vapiAssistantId: text('vapi_assistant_id'),
  vapiVoiceId: text('vapi_voice_id'),
  vapiVoiceName: text('vapi_voice_name'),
  twilioPhoneNumber: text('twilio_phone_number'),
  systemPrompt: text('system_prompt'),
  firstMessage: text('first_message'),
  talktimeMinutesTotal: integer('talktime_minutes_total').default(5000).notNull(),
  talktimeMinutesUsed: integer('talktime_minutes_used').default(0).notNull(),
  activeLines: integer('active_lines').default(5).notNull(),
  callingHoursStart: text('calling_hours_start').default('09:00').notNull(),
  callingHoursEnd: text('calling_hours_end').default('18:00').notNull(),
  timezone: text('timezone').default('America/New_York (EST)').notNull(),
  autoFollowupEnabled: boolean('auto_followup_enabled').default(true).notNull(),
  followupDelayHours: integer('followup_delay_hours').default(12).notNull(),
  subscriptionPlan: text('subscription_plan').default('starter').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const talktimeRequests = pgTable('talktime_requests', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id),
  minutesRequested: integer('minutes_requested').notNull(),
  amountDue: integer('amount_due').notNull(),
  status: text('status').default('pending').notNull(), // pending, approved, rejected
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  industry: text('industry'),
  status: text('status').default('pending_configuration').notNull(),
  meetingRequested: boolean('meeting_requested').default(false).notNull(),
  meetingTime: text('meeting_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const callLogs = pgTable('call_logs', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id),
  leadName: text('lead_name').notNull(),
  leadPhone: text('lead_phone').notNull(),
  leadCompany: text('lead_company'),
  callDurationSeconds: integer('call_duration_seconds').default(0).notNull(),
  disposition: text('disposition').default('completed').notNull(),
  sentiment: text('sentiment').default('positive').notNull(),
  conversionChance: integer('conversion_chance').default(0),
  aiConclusion: text('ai_conclusion'),
  transcript: text('transcript'),
  followupDraft: text('followup_draft'),
  recordingUrl: text('recording_url'),
  scheduledCallback: text('scheduled_callback'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  contactName: text('contact_name').notNull(),
  companyName: text('company_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  industry: text('industry'),
  preferredTime: text('preferred_time'),
  status: text('status').default('pending').notNull(), // pending, confirmed, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
