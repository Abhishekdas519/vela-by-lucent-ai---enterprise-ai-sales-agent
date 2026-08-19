import { db } from './index.js';
import { users, clients, callLogs, leads, talktimeRequests, meetings, adminNotifications } from './schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (error: any) {
    return { healthy: false, latencyMs: Date.now() - start, error: error?.message || 'Database connection error' };
  }
}

export async function getUserByEmail(email: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database getUserByEmail failed:", error);
    return null;
  }
}

export async function getUserById(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database getUserById failed:", error);
    return null;
  }
}

export async function createUser(userData: typeof users.$inferInsert) {
  try {
    const cleanEmail = userData.email.toLowerCase().trim();
    const result = await db.insert(users).values({
      ...userData,
      email: cleanEmail
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database createUser failed:", error);
    throw new Error("Database createUser failed.", { cause: error });
  }
}

export async function getClientByUserId(userId: string) {
  try {
    const result = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database getClientByUserId failed:", error);
    return null;
  }
}

export async function getClientByEmail(email: string) {
  try {
    const result = await db.select().from(clients).where(eq(clients.email, email.toLowerCase().trim())).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database getClientByEmail failed:", error);
    return null;
  }
}

export async function getLeadsByClientId(clientId: string) {
  try {
    return await db.select().from(leads).where(eq(leads.clientId, clientId)).orderBy(desc(leads.createdAt));
  } catch (error) {
    console.error("Database getLeadsByClientId failed:", error);
    return [];
  }
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || cleanEmail.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || cleanEmail.split('@')[0],
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database user query failed:", error);
    throw new Error("Database user query failed.", { cause: error });
  }
}

export async function getAllClients() {
  try {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error("Database clients query failed:", error);
    throw new Error("Database clients query failed.", { cause: error });
  }
}

export async function updateUserPassword(uid: string, passwordHash: string) {
  try {
    const result = await db.update(users)
      .set({ passwordHash })
      .where(eq(users.uid, uid))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Database updateUserPassword failed:", error);
    throw new Error("Database updateUserPassword failed.", { cause: error });
  }
}

export async function updateClient(clientId: string, data: Partial<typeof clients.$inferInsert>) {
  try {
    const result = await db.update(clients)
      .set(data)
      .where(eq(clients.id, clientId))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Database update client failed:", error);
    throw new Error("Database update client failed.", { cause: error });
  }
}

export async function createClient(clientData: typeof clients.$inferInsert) {
  try {
    const result = await db.insert(clients).values(clientData).returning();
    return result[0];
  } catch (error) {
    console.error("Database create client failed:", error);
    throw new Error("Database create client failed.", { cause: error });
  }
}

export async function getClientById(clientId: string) {
  try {
    const result = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database get client failed:", error);
    return null;
  }
}

export async function getClientLogs(clientId: string) {
  try {
    return await db.select().from(callLogs).where(eq(callLogs.clientId, clientId)).orderBy(desc(callLogs.createdAt));
  } catch (error) {
    console.error("Database call logs query failed:", error);
    throw new Error("Database call logs query failed.", { cause: error });
  }
}

export async function createCallLog(logData: typeof callLogs.$inferInsert) {
  try {
    const result = await db.insert(callLogs).values(logData).returning();
    return result[0];
  } catch (error) {
    console.error("Database create call log failed:", error);
    throw new Error("Database create call log failed.", { cause: error });
  }
}

export async function createLead(leadData: typeof leads.$inferInsert) {
  try {
    const result = await db.insert(leads).values(leadData).returning();
    return result[0];
  } catch (error) {
    console.error("Database create lead failed:", error);
    throw new Error("Database create lead failed.", { cause: error });
  }
}

export async function createLeadsBatch(leadsList: (typeof leads.$inferInsert)[]) {
  try {
    if (!leadsList.length) return [];
    const result = await db.insert(leads).values(leadsList).returning();
    return result;
  } catch (error) {
    console.error("Database createLeadsBatch failed:", error);
    throw new Error("Database createLeadsBatch failed.", { cause: error });
  }
}

export async function updateLead(leadId: string, data: Partial<typeof leads.$inferInsert>) {
  try {
    const result = await db.update(leads)
      .set(data)
      .where(eq(leads.id, leadId))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Database updateLead failed:", error);
    return null;
  }
}

export async function getLeads() {
  try {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  } catch (error) {
    console.error("Database get leads failed:", error);
    throw new Error("Database get leads failed.", { cause: error });
  }
}

export async function createTalktimeRequest(requestData: typeof talktimeRequests.$inferInsert) {
  try {
    const result = await db.insert(talktimeRequests).values(requestData).returning();
    return result[0];
  } catch (error) {
    console.error("Database create talktime request failed:", error);
    throw new Error("Database create talktime request failed.", { cause: error });
  }
}

export async function getTalktimeRequests() {
  try {
    const orders = await db.select().from(talktimeRequests).orderBy(desc(talktimeRequests.createdAt));
    const allClients = await db.select().from(clients);
    const clientMap = new Map(allClients.map(c => [c.id, c]));
    
    return orders.map(order => {
      const client = order.clientId ? clientMap.get(order.clientId) : null;
      return {
        ...order,
        companyName: client?.companyName || 'Enterprise Client',
        contactName: client?.contactName || 'Executive',
        email: client?.email || ''
      };
    });
  } catch (error) {
    console.error("Database get talktime requests failed:", error);
    throw new Error("Database get talktime requests failed.", { cause: error });
  }
}

export async function updateTalktimeRequestStatus(requestId: string, status: string) {
  try {
    const result = await db.update(talktimeRequests)
      .set({ status })
      .where(eq(talktimeRequests.id, requestId))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database update talktime request status failed:", error);
    throw new Error("Database update talktime request status failed.", { cause: error });
  }
}

export async function updateClientTalktime(clientId: string, addedMinutes: number) {
  try {
    const updated = await db.update(clients)
      .set({ talktimeMinutesTotal: sql`${clients.talktimeMinutesTotal} + ${addedMinutes}` })
      .where(eq(clients.id, clientId))
      .returning();
    if (!updated.length) throw new Error("Client not found");
    return updated[0];
  } catch (error) {
    console.error("Database update client talktime failed:", error);
    throw new Error("Database update client talktime failed.", { cause: error });
  }
}

export async function deductClientTalktime(clientId: string, usedMinutes: number) {
  try {
    const updated = await db.update(clients)
      .set({ talktimeMinutesUsed: sql`${clients.talktimeMinutesUsed} + ${usedMinutes}` })
      .where(eq(clients.id, clientId))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Database deduct client talktime failed:", error);
    return null;
  }
}

export async function createMeeting(meetingData: typeof meetings.$inferInsert) {
  try {
    const result = await db.insert(meetings).values(meetingData).returning();
    return result[0];
  } catch (error) {
    console.error("Database create meeting failed:", error);
    throw new Error("Database create meeting failed.", { cause: error });
  }
}

export async function getMeetings() {
  try {
    return await db.select().from(meetings).orderBy(desc(meetings.createdAt));
  } catch (error) {
    console.error("Database get meetings failed:", error);
    throw new Error("Database get meetings failed.", { cause: error });
  }
}

export async function updateMeetingStatus(meetingId: string, status: string) {
  try {
    const result = await db.update(meetings)
      .set({ status })
      .where(eq(meetings.id, meetingId))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database update meeting status failed:", error);
    throw new Error("Database update meeting status failed.", { cause: error });
  }
}

export async function createAdminNotification(notifData: typeof adminNotifications.$inferInsert) {
  try {
    const result = await db.insert(adminNotifications).values(notifData).returning();
    return result[0];
  } catch (error) {
    console.error("Database createAdminNotification failed:", error);
    return null;
  }
}

export async function getAdminNotifications() {
  try {
    return await db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt)).limit(50);
  } catch (error) {
    console.error("Database getAdminNotifications failed:", error);
    return [];
  }
}

export async function markAdminNotificationRead(notifId?: string) {
  try {
    if (notifId) {
      await db.update(adminNotifications).set({ read: true }).where(eq(adminNotifications.id, notifId));
    } else {
      await db.update(adminNotifications).set({ read: true });
    }
    return true;
  } catch (error) {
    console.error("Database markAdminNotificationRead failed:", error);
    return false;
  }
}
