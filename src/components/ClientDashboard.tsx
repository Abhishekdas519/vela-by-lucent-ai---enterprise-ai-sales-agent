import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneOff, 
  UploadCloud, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw, 
  FileText, 
  Mail, 
  MessageSquare, 
  Bot, 
  User as UserIcon, 
  Download, 
  Sparkles, 
  Filter, 
  Volume2, 
  Search, 
  Sliders, 
  Layers,
  Settings as SettingsIcon,
  ChevronRight,
  Send,
  Users,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Key,
  X
} from 'lucide-react';
import { ClientProfile, Lead, User } from '../types';
import { SAMPLE_CSV_DATA } from '../data/initialData';
import { AudioVisualizer } from './AudioVisualizer';
import confetti from 'canvas-confetti';

interface ClientDashboardProps {
  client: ClientProfile;
  leads: Lead[];
  currentUser: User | null;
  onUpdateClient: (updatedClient: ClientProfile) => void;
  onUpdateLeads: (updatedLeads: Lead[]) => void;
  onOpenBuyMinutes: () => void;
}

// RFC 4180 Compliant CSV Parser
function parseRFC4180CSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  client,
  leads,
  currentUser,
  onUpdateClient,
  onUpdateLeads,
  onOpenBuyMinutes,
}) => {
  // Sync refs to avoid stale closure corruption during async loops
  const leadsRef = useRef<Lead[]>(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  const clientRef = useRef<ClientProfile>(client);
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('vela_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };
  const [activeTab, setActiveTab] = useState<'campaigns' | 'leads' | 'analytics' | 'playground' | 'settings'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Auto-dialer state
  const [isDialingActive, setIsDialingActive] = useState(false);
  const [currentDialingLeadId, setCurrentDialingLeadId] = useState<string | null>(null);
  const [dialProgress, setDialProgress] = useState(0);

  // CSV Drag and Drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Settings State
  const [callingStart, setCallingStart] = useState(client.callingHoursStart);
  const [callingEnd, setCallingEnd] = useState(client.callingHoursEnd);
  const [autoFollowup, setAutoFollowup] = useState(client.autoFollowupEnabled);
  const [followupHours, setFollowupHours] = useState(client.followupDelayHours);
  const [systemPrompt, setSystemPrompt] = useState(client.systemPrompt);
  const [firstMessage, setFirstMessage] = useState(client.firstMessage);
  const [settingsToast, setSettingsToast] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Password Security State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass) {
      setPassMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }
    if (newPass.length < 8) {
      setPassMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsChangingPass(true);
    setPassMessage(null);

    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }
      setPassMessage({ type: 'success', text: '✅ Password successfully updated! Your account is fully secured.' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassMessage({ type: 'error', text: '❌ ' + (err.message || 'Password update failed') });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Load historical call logs on mount
  useEffect(() => {
    if (client?.id) {
      authFetch(`/api/db/call-logs/${client.id}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
            const logsByPhone = new Map<string, any>(data.data.map((log: any) => [log.leadPhone, log]));
            const updated = leadsRef.current.map(lead => {
              const match = logsByPhone.get(lead.phone);
              if (match && lead.status === 'pending') {
                let parsedTranscript = [];
                try { parsedTranscript = typeof match.transcript === 'string' ? JSON.parse(match.transcript) : match.transcript; } catch {}
                let parsedFollowup = null;
                try { parsedFollowup = typeof match.followupDraft === 'string' ? JSON.parse(match.followupDraft) : match.followupDraft; } catch {}
                return {
                  ...lead,
                  status: 'completed' as const,
                  callDurationSeconds: match.callDurationSeconds || 120,
                  sentiment: (match.sentiment || 'positive') as any,
                  conversionChance: match.conversionChance || 75,
                  aiConclusion: match.aiConclusion || '',
                  transcript: parsedTranscript,
                  followupDraft: parsedFollowup
                };
              }
              return lead;
            });
            leadsRef.current = updated;
            onUpdateLeads(updated);
          }
        })
        .catch(err => console.error('Failed to load historical call logs:', err));
    }
  }, [client?.id]);

  const minutesLeft = Math.max(0, client.talktimeMinutesTotal - client.talktimeMinutesUsed);
  const usagePercentage = Math.min(100, Math.round((client.talktimeMinutesUsed / client.talktimeMinutesTotal) * 100));

  // Check if current time is within calling window
  const now = new Date();
  const currentHourMinute = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const isWithinCallingWindow = currentHourMinute >= client.callingHoursStart && currentHourMinute <= client.callingHoursEnd;

  // Filtered Leads
  const clientLeads = leads.filter(l => l.clientId === client.id);
  const filteredLeads = clientLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Key Analytics calculations
  const totalDials = clientLeads.length;
  const completedCalls = clientLeads.filter(l => l.status === 'completed');
  const connectedRate = totalDials > 0 ? Math.round((completedCalls.length / totalDials) * 100) : 0;
  const avgConversionChance = completedCalls.length > 0 
    ? Math.round(completedCalls.reduce((acc, l) => acc + (l.conversionChance || 0), 0) / completedCalls.length)
    : 0;
  const highIntentLeads = completedCalls.filter(l => (l.conversionChance || 0) >= 70).length;
  const followupsQueued = clientLeads.filter(l => l.status === 'followup_queued' || l.followupScheduledAt).length;

  // Parse CSV helper using RFC 4180 engine
  const parseCSVContent = (csvText: string) => {
    const parsedRows = parseRFC4180CSV(csvText.trim());
    if (parsedRows.length < 2) return;

    const headers = parsedRows[0].map(h => h.toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('contact'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const compIdx = headers.findIndex(h => h.includes('company') || h.includes('org') || h.includes('business') || h.includes('account'));
    const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('role') || h.includes('position'));
    const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('comment'));

    const newParsedLeads: Lead[] = [];

    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (row.length >= 1) {
        const leadName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : (row[0] || 'Lead Contact');
        const leadPhone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : (row[1] || '+1 (555) 000-0000');
        const leadEmail = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : (row[2] || 'contact@domain.com');
        const leadCompany = compIdx !== -1 && row[compIdx] ? row[compIdx] : (row[3] || 'Target Account');
        const leadTitle = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : 'Decision Maker';
        const leadNotes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : 'Imported via CSV Batch Upload';

        newParsedLeads.push({
          id: `lead-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          clientId: client.id,
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          company: leadCompany,
          title: leadTitle,
          notes: leadNotes,
          status: 'pending'
        });
      }
    }

    if (newParsedLeads.length > 0) {
      const merged = [...newParsedLeads, ...leadsRef.current];
      leadsRef.current = merged;
      onUpdateLeads(merged);
      setUploadMessage(`Imported ${newParsedLeads.length} leads. Saving to database...`);

      // Bulk persist to PostgreSQL
      authFetch('/api/db/leads/batch', {
        method: 'POST',
        body: JSON.stringify({
          clientId: client.id,
          leads: newParsedLeads
        })
      }).then(res => res.json())
        .then(data => {
          if (data.success) {
            setUploadMessage(`✅ Successfully imported and saved ${newParsedLeads.length} leads in database!`);
          }
        })
        .catch(err => {
          console.error('Failed to batch save leads in DB:', err);
        })
        .finally(() => {
          setTimeout(() => setUploadMessage(null), 4000);
        });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) parseCSVContent(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCSV = () => {
    parseCSVContent(SAMPLE_CSV_DATA);
  };

  // Autonomous Batch Call Execution Loop
  const handleToggleAutoDialer = () => {
    if (isDialingActive) {
      setIsDialingActive(false);
      setCurrentDialingLeadId(null);
    } else {
      const pendingLeads = clientLeads.filter(l => l.status === 'pending');
      if (pendingLeads.length === 0) {
        alert("No pending leads in queue. Upload a CSV file or load sample leads to start dialing!");
        return;
      }
      setIsDialingActive(true);
      executeDialQueue(pendingLeads);
    }
  };

  const executeDialQueue = async (queue: Lead[]) => {
    for (let i = 0; i < queue.length; i++) {
      const lead = queue[i];
      setCurrentDialingLeadId(lead.id);

      // Update status to 'calling' using ref
      const callingList = leadsRef.current.map(l => l.id === lead.id ? { ...l, status: 'calling' as const } : l);
      leadsRef.current = callingList;
      onUpdateLeads(callingList);

      try {
        // Call backend simulate endpoint
        const response = await authFetch('/api/call/simulate', {
          method: 'POST',
          body: JSON.stringify({ lead, clientProfile: clientRef.current })
        });
        const result = await response.json();

        // Calculate followup time
        const followDate = new Date(Date.now() + (clientRef.current.followupDelayHours * 60 * 60 * 1000)).toISOString();

        // Update lead with complete call intelligence using fresh leadsRef.current
        const completedList = leadsRef.current.map(l => {
          if (l.id === lead.id) {
            return {
              ...l,
              status: 'completed' as const,
              callDurationSeconds: result.callDurationSeconds || 120,
              callStartedAt: new Date(Date.now() - 120000).toISOString(),
              callEndedAt: new Date().toISOString(),
              sentiment: (result.sentiment || 'positive') as any,
              conversionChance: result.conversionChance || 75,
              aiConclusion: result.aiConclusion || 'Lead qualified. High interest in product demo.',
              keyObjections: result.keyObjections || [],
              followupScheduledAt: followDate,
              followupSent: false,
              followupDraft: result.followupDraft || {
                channel: 'email',
                subject: `Follow-up from ${clientRef.current.companyName}`,
                body: `Hi ${lead.name},\n\nThank you for taking my call today. As discussed, here is the demo link.\n\nBest regards,\nVela AI`
              },
              transcript: result.transcript || []
            };
          }
          return l;
        });

        leadsRef.current = completedList;
        onUpdateLeads(completedList);

        // 1. Persist lead status update to database
        authFetch(`/api/db/leads/${lead.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' })
        }).catch(e => console.error('Failed to update lead status in DB:', e));

        // 2. Persist call log to database
        authFetch('/api/db/call-logs', {
          method: 'POST',
          body: JSON.stringify({
            clientId: clientRef.current.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            leadCompany: lead.company,
            callDurationSeconds: result.callDurationSeconds || 120,
            disposition: 'completed',
            sentiment: result.sentiment || 'positive',
            conversionChance: result.conversionChance || 75,
            aiConclusion: result.aiConclusion || '',
            transcript: result.transcript || [],
            followupDraft: result.followupDraft || null,
          })
        }).catch(e => console.error('Failed to persist call log in DB:', e));

        // 3. Atomically deduct talktime minutes in database
        const usedMins = Math.ceil((result.callDurationSeconds || 120) / 60);
        authFetch(`/api/db/clients/${clientRef.current.id}/deduct-minutes`, {
          method: 'POST',
          body: JSON.stringify({ minutesUsed: usedMins })
        }).then(r => r.json())
          .then(data => {
            if (data?.success && data.client) {
              clientRef.current = data.client;
              onUpdateClient(data.client);
            }
          })
          .catch(() => {});

        // Local state deduction
        const updatedClient = {
          ...clientRef.current,
          talktimeMinutesUsed: clientRef.current.talktimeMinutesUsed + usedMins
        };
        clientRef.current = updatedClient;
        onUpdateClient(updatedClient);

        // Delay between calls for realism
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error('Call failed:', err);
      }
    }

    setIsDialingActive(false);
    setCurrentDialingLeadId(null);
    confetti({ particleCount: 80, spread: 60 });
  };

  // Instant Single Lead Dial
  const handleDialSingleLead = async (lead: Lead) => {
    setCurrentDialingLeadId(lead.id);
    const callingList = leadsRef.current.map(l => l.id === lead.id ? { ...l, status: 'calling' as const } : l);
    leadsRef.current = callingList;
    onUpdateLeads(callingList);

    try {
      const response = await authFetch('/api/call/simulate', {
        method: 'POST',
        body: JSON.stringify({ lead, clientProfile: clientRef.current })
      });
      const result = await response.json();

      const followDate = new Date(Date.now() + (clientRef.current.followupDelayHours * 60 * 60 * 1000)).toISOString();

      let completedLeadRecord: Lead | null = null;
      const completedList = leadsRef.current.map(l => {
        if (l.id === lead.id) {
          const completedLead: Lead = {
            ...l,
            status: 'completed',
            callDurationSeconds: result.callDurationSeconds || 120,
            callStartedAt: new Date(Date.now() - 120000).toISOString(),
            callEndedAt: new Date().toISOString(),
            sentiment: (result.sentiment || 'positive') as any,
            conversionChance: result.conversionChance || 80,
            aiConclusion: result.aiConclusion || 'Conversation completed.',
            keyObjections: result.keyObjections || [],
            followupScheduledAt: followDate,
            followupSent: false,
            followupDraft: result.followupDraft,
            transcript: result.transcript
          };
          completedLeadRecord = completedLead;
          return completedLead;
        }
        return l;
      });

      leadsRef.current = completedList;
      onUpdateLeads(completedList);
      if (completedLeadRecord) {
        setSelectedLead(completedLeadRecord);
      }

      // Persist single lead status and call log to database
      authFetch(`/api/db/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' })
      }).catch(() => {});

      authFetch('/api/db/call-logs', {
        method: 'POST',
        body: JSON.stringify({
          clientId: clientRef.current.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadCompany: lead.company,
          callDurationSeconds: result.callDurationSeconds || 120,
          disposition: 'completed',
          sentiment: result.sentiment || 'positive',
          conversionChance: result.conversionChance || 80,
          aiConclusion: result.aiConclusion || '',
          transcript: result.transcript || [],
          followupDraft: result.followupDraft || null,
        })
      }).catch(() => {});

      const usedMins = Math.ceil((result.callDurationSeconds || 120) / 60);
      authFetch(`/api/db/clients/${clientRef.current.id}/deduct-minutes`, {
        method: 'POST',
        body: JSON.stringify({ minutesUsed: usedMins })
      }).then(r => r.json())
        .then(data => {
          if (data?.success && data.client) {
            clientRef.current = data.client;
            onUpdateClient(data.client);
          }
        })
        .catch(() => {});

      const updatedClient = {
        ...clientRef.current,
        talktimeMinutesUsed: clientRef.current.talktimeMinutesUsed + usedMins
      };
      clientRef.current = updatedClient;
      onUpdateClient(updatedClient);
    } catch (err) {
      console.error('Single call error:', err);
    } finally {
      setCurrentDialingLeadId(null);
    }
  };

  // Download Sample CSV Template
  const handleDownloadSampleCSV = () => {
    const csvContent = `Name,Phone,Email,Company,Title,Notes
Marcus Sterling,+1 (415) 890-4321,marcus@sterlingfreight.com,Sterling Freight Logistics,COO,Managing 500+ monthly LTL loads looking for broker automation
Elena Rostova,+1 (212) 555-0199,elena@apexlogistics.io,Apex Logistics,VP Fleet Operations,Interested in 12-hour follow-up pipelines
David Chen,+1 (312) 777-8822,dchen@swiftroute.net,SwiftRoute Carriers,Head of Brokerage,Wants TMS webhook integration
Sarah Jenkins,+1 (617) 444-9911,sarah@titanfreight.com,Titan Freight Lines,Director of Operations,Seeking sub-450ms human-grade outbound calls
Raj Patel,+1 (512) 888-3344,raj@novasupply.com,Nova Supply Chain,Chief Operating Officer,Evaluating AI voice agents vs traditional call centers`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vela_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export & Download All Leads as CSV
  const handleExportLeadsCSV = () => {
    if (!clientLeads || clientLeads.length === 0) {
      alert('No leads available to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Company', 'Title', 'Status', 'Call Duration (s)', 'Sentiment', 'Conversion Chance (%)', 'AI Conclusion', 'Key Objections', 'Followup Scheduled'];
    
    const rows = clientLeads.map(lead => [
      lead.id,
      `"${(lead.name || '').replace(/"/g, '""')}"`,
      `"${(lead.phone || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      `"${(lead.company || '').replace(/"/g, '""')}"`,
      `"${(lead.title || '').replace(/"/g, '""')}"`,
      lead.status,
      lead.callDurationSeconds || 0,
      lead.sentiment || 'N/A',
      lead.conversionChance !== undefined ? `${lead.conversionChance}%` : 'N/A',
      `"${(lead.aiConclusion || '').replace(/"/g, '""')}"`,
      `"${(lead.keyObjections || []).join('; ').replace(/"/g, '""')}"`,
      lead.followupScheduledAt || 'N/A'
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${client.companyName.toLowerCase().replace(/\\s+/g, '_')}_leads_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Individual Call Report / Transcript
  const handleDownloadCallReport = (lead: Lead) => {
    const reportText = `=====================================================
VELA BY LUCENT AI - CALL INTELLIGENCE REPORT
=====================================================
Client: ${client.companyName} (${client.industry})
Prospect: ${lead.name} (${lead.title} at ${lead.company})
Phone: ${lead.phone} | Email: ${lead.email || 'N/A'}
Date / Call Status: ${lead.status.toUpperCase()}
Call Duration: ${lead.callDurationSeconds || 0} seconds
Sentiment: ${(lead.sentiment || 'neutral').toUpperCase()}
Conversion Probability Score: ${lead.conversionChance ?? 'N/A'}%

-----------------------------------------------------
AI CALL CONCLUSION & SUMMARY:
-----------------------------------------------------
${lead.aiConclusion || 'No summary recorded.'}

-----------------------------------------------------
KEY OBJECTIONS DETECTED & RESOLVED:
-----------------------------------------------------
${lead.keyObjections && lead.keyObjections.length > 0 ? lead.keyObjections.map((obj, i) => `${i + 1}. ${obj}`).join('\n') : 'None recorded.'}

-----------------------------------------------------
TURN-BY-TURN TRANSCRIPT:
-----------------------------------------------------
${lead.transcript && lead.transcript.length > 0 ? lead.transcript.map(t => `[${t.timestamp}] ${t.speaker === 'agent' ? 'VELA AI' : lead.name.toUpperCase()}: ${t.text}`).join('\n\n') : 'No transcript recorded.'}

-----------------------------------------------------
AUTOMATED 12-HOUR FOLLOW-UP DRAFT:
-----------------------------------------------------
Channel: ${lead.followupDraft?.channel?.toUpperCase() || 'EMAIL'}
Subject: ${lead.followupDraft?.subject || 'N/A'}
Body:
${lead.followupDraft?.body || 'No follow-up queued.'}

=====================================================
Generated by Vela Autonomous Telephony Platform
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `call_report_${lead.name.toLowerCase().replace(/\\s+/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await authFetch(`/api/db/clients/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          callingHoursStart: callingStart,
          callingHoursEnd: callingEnd,
          autoFollowupEnabled: autoFollowup,
          followupDelayHours: followupHours,
          systemPrompt: systemPrompt,
          firstMessage: firstMessage
        })
      });
      const data = await res.json();
      if (data?.success && data.client) {
        clientRef.current = data.client;
        onUpdateClient(data.client);
        setSettingsToast('✅ Telephony & Calling Window settings saved to database!');
      } else {
        const updated = {
          ...client,
          callingHoursStart: callingStart,
          callingHoursEnd: callingEnd,
          autoFollowupEnabled: autoFollowup,
          followupDelayHours: followupHours,
          systemPrompt: systemPrompt,
          firstMessage: firstMessage
        };
        clientRef.current = updated;
        onUpdateClient(updated);
        setSettingsToast('Settings updated in session.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setSettingsToast('Settings updated.');
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSettingsToast(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Fleet Header Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-200 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Client Identity & DID Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-white">{client.companyName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">
                {client.industry}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1 text-indigo-700">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                Twilio DID: <strong>{client.twilioPhoneNumber}</strong>
              </span>
              <span>•</span>
              <span className="text-cyan-700">
                Vapi Voice: <strong>{client.vapiVoiceName}</strong>
              </span>
              <span>•</span>
              <span className={isWithinCallingWindow ? 'text-emerald-600 font-semibold' : 'text-amber-400 font-semibold'}>
                Calling Window: {client.callingHoursStart} – {client.callingHoursEnd} ({isWithinCallingWindow ? 'ACTIVE' : 'STANDBY'})
              </span>
            </div>
          </div>

          {/* Live Talktime Balance & Buy Minutes CTA */}
          <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shrink-0">
            <div className="space-y-1 text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Live Talktime Balance</span>
              <div className="text-2xl font-extrabold text-white font-mono flex items-center justify-end gap-1.5">
                <span className="text-cyan-600">{minutesLeft.toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-sans font-normal">/ {client.talktimeMinutesTotal.toLocaleString()} mins</span>
              </div>
              <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-auto">
                <div 
                  className={`h-full rounded-full ${usagePercentage > 80 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                  style={{ width: `${100 - usagePercentage}%` }}
                />
              </div>
            </div>

            <button
              id="btn-client-dashboard-buy-minutes"
              onClick={onOpenBuyMinutes}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-cyan-200" />
              <span>+ Buy Minutes</span>
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
          <button
            id="tab-leads-view"
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leads & Batch Auto-Dialer ({clientLeads.length})</span>
          </button>

          <button
            id="tab-analytics-view"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Conversion Analytics & Reports</span>
          </button>

          <button
            id="tab-settings-view"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Calling Hours & 12-Hr Follow-Up</span>
          </button>
        </div>

        {/* Tab 1: Leads & Batch Auto-Dialer */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            
            {/* KPI Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/60 border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Lead Queue</span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">{totalDials}</span>
                <span className="text-[10px] text-cyan-600 block">{clientLeads.filter(l => l.status === 'pending').length} pending dials</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 border border-slate-200">
                <span className="text-xs text-slate-500 block">Connected Rate</span>
                <span className="text-2xl font-extrabold text-emerald-600 font-mono">{connectedRate}%</span>
                <span className="text-[10px] text-slate-500 block">{completedCalls.length} completed calls</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 border border-slate-200">
                <span className="text-xs text-slate-500 block">Avg Conversion Chance</span>
                <span className="text-2xl font-extrabold text-cyan-700 font-mono">{avgConversionChance}%</span>
                <span className="text-[10px] text-emerald-600 block font-semibold">{highIntentLeads} hot prospects</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 border border-slate-200">
                <span className="text-xs text-slate-500 block">12-Hr Follow-Ups</span>
                <span className="text-2xl font-extrabold text-purple-700 font-mono">{followupsQueued}</span>
                <span className="text-[10px] text-purple-600 block font-semibold">Auto-trigger enabled</span>
              </div>
            </div>

            {/* CSV / Excel File Upload Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const content = event.target?.result as string;
                    if (content) parseCSVContent(content);
                  };
                  reader.readAsText(file);
                }
              }}
              className={`p-6 rounded-3xl border-2 border-dashed transition flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDragOver 
                  ? 'bg-cyan-50 border-cyan-400' 
                  : 'bg-white/40 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Import Lead List (CSV / Excel)</h4>
                  <p className="text-xs text-slate-500">
                    Drag and drop your spreadsheet here (Columns: Name, Phone, Email, Company, Title, Notes).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  id="btn-upload-csv-file"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-700 text-white border border-slate-300 transition cursor-pointer"
                >
                  Browse Files
                </button>
                <button
                  id="btn-load-sample-csv"
                  onClick={handleLoadSampleCSV}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-900/80 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Load Sample Leads</span>
                </button>
                <button
                  id="btn-download-sample-template"
                  onClick={handleDownloadSampleCSV}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300/80 transition flex items-center gap-1.5 cursor-pointer"
                  title="Download clean CSV template for lead import"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                  <span>CSV Template</span>
                </button>
              </div>
            </div>

            {uploadMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-500/40 text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{uploadMessage}</span>
              </div>
            )}

            {/* Batch Auto-Dialer Action Bar */}
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id="btn-toggle-batch-dialer"
                  onClick={handleToggleAutoDialer}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                    isDialingActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {isDialingActive ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause Batch Auto-Dialer</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Batch Auto-Dialer</span>
                    </>
                  )}
                </button>

                {isDialingActive && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-mono animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Dialing in progress via Twilio line...</span>
                  </div>
                )}
              </div>

              {/* Search, Filter & Export */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="calling">Calling Now</option>
                  <option value="completed">Completed</option>
                </select>

                <button
                  id="btn-export-leads-csv"
                  onClick={handleExportLeadsCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-cyan-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export all leads and call intelligence to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Export CSV</span>
                </button>
              </div>

            </div>

            {/* Leads Table */}
            <div className="rounded-3xl bg-white/70 border border-slate-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 font-bold">Prospect Name & Company</th>
                      <th className="p-3.5 font-bold">Phone Number</th>
                      <th className="p-3.5 font-bold">Call Status</th>
                      <th className="p-3.5 font-bold">Conversion Chance (%)</th>
                      <th className="p-3.5 font-bold">AI Call Conclusion</th>
                      <th className="p-3.5 font-bold">12-Hr Follow-Up</th>
                      <th className="p-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No leads found matching your criteria. Click "Load Sample Leads" above to populate!
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const isCalling = lead.id === currentDialingLeadId || lead.status === 'calling';

                        return (
                          <tr 
                            key={lead.id}
                            className={`hover:bg-slate-50/60 transition cursor-pointer ${
                              isCalling ? 'bg-cyan-50' : ''
                            }`}
                            onClick={() => setSelectedLead(lead)}
                          >
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 text-sm">{lead.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {lead.title || 'Decision Maker'} • <strong className="text-slate-600">{lead.company}</strong>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono text-slate-600">
                              {lead.phone}
                            </td>

                            <td className="p-3.5">
                              {isCalling ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-200 animate-pulse">
                                  <PhoneCall className="w-3 h-3" /> Calling Live...
                                </span>
                              ) : lead.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" /> Completed ({lead.callDurationSeconds}s)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                                  <Clock className="w-3 h-3" /> Pending Queue
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 min-w-[130px]">
                              {lead.conversionChance !== undefined ? (
                                <div>
                                  <div className="flex justify-between text-[11px] font-mono mb-1">
                                    <span className={lead.conversionChance >= 70 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                                      {lead.conversionChance}% Chance
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        lead.conversionChance >= 70 
                                          ? 'bg-emerald-400' 
                                          : lead.conversionChance >= 40 
                                          ? 'bg-cyan-400' 
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${lead.conversionChance}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 font-mono">--</span>
                              )}
                            </td>

                            <td className="p-3.5 max-w-xs">
                              {lead.aiConclusion ? (
                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                                  {lead.aiConclusion}
                                </p>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Awaiting call...</span>
                              )}
                            </td>

                            <td className="p-3.5 text-[11px]">
                              {lead.followupDraft ? (
                                <span className="text-purple-700 font-medium flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-purple-600" />
                                  {lead.followupSent ? 'Dispatched' : 'Queued (12h)'}
                                </span>
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </td>

                            <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              {lead.status === 'pending' ? (
                                <button
                                  id={`btn-dial-lead-${lead.id}`}
                                  onClick={() => handleDialSingleLead(lead)}
                                  className="px-3 py-1 text-[11px] font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1 ml-auto"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Dial Now</span>
                                </button>
                              ) : (
                                <button
                                  id={`btn-view-lead-${lead.id}`}
                                  onClick={() => setSelectedLead(lead)}
                                  className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-600 transition"
                                >
                                  View Intel
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Conversion Analytics & Reports */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Funnel conversion card */}
              <div className="p-6 rounded-3xl bg-white/80 border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  Outbound Conversion Funnel
                </h3>

                <div className="space-y-3 pt-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Total Dials Initiated</span>
                      <span className="font-bold text-white font-mono">{totalDials} (100%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Connected Conversations</span>
                      <span className="font-bold text-emerald-600 font-mono">{completedCalls.length} ({connectedRate}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${connectedRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">High-Intent Qualified (&gt;70%)</span>
                      <span className="font-bold text-purple-700 font-mono">{highIntentLeads}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400" style={{ width: `${totalDials > 0 ? (highIntentLeads/totalDials)*100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentiment breakdown card */}
              <div className="p-6 rounded-3xl bg-white/80 border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Prospect Sentiment Analysis
                </h3>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-500/20">
                    <span className="text-emerald-700 font-semibold">Positive Sentiment</span>
                    <span className="font-bold font-mono text-white">
                      {completedCalls.filter(l => l.sentiment === 'positive').length} calls
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 font-semibold">Neutral / Evaluative</span>
                    <span className="font-bold font-mono text-white">
                      {completedCalls.filter(l => l.sentiment === 'neutral').length} calls
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/20">
                    <span className="text-rose-300 font-semibold">Negative / Voicemail</span>
                    <span className="font-bold font-mono text-white">
                      {completedCalls.filter(l => l.sentiment === 'negative').length} calls
                    </span>
                  </div>
                </div>
              </div>

              {/* 12-Hour Follow-Up Performance */}
              <div className="p-6 rounded-3xl bg-white/80 border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  12-Hour Automated Follow-Up Engine
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Vela autonomously synthesizes personalized email and SMS follow-ups right after call completion and triggers them precisely after 12 hours.
                </p>

                <div className="p-3 rounded-xl bg-purple-50 border border-purple-500/30 text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-purple-700">Total Follow-Ups Triggered:</span>
                    <span className="text-white font-mono">{followupsQueued}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Response rate increased by +34%</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Settings & Calling Hours Window */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl rounded-3xl bg-white/80 border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Fleet Telephony & Calling Window Rules</h3>
              <p className="text-xs text-slate-500">
                Configure your business calling hours and automated 12-hour follow-up parameters.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-slate-600">Daily Calling Window (Start)</label>
                  <input
                    type="time"
                    value={callingStart}
                    onChange={(e) => setCallingStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-600">Daily Calling Window (End)</label>
                  <input
                    type="time"
                    value={callingEnd}
                    onChange={(e) => setCallingEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* 12-Hour Follow-up switch */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Auto Follow-Up Pipeline</span>
                    <span className="text-slate-500 text-[11px]">
                      Automatically dispatch personalized email/SMS follow-up after call conclusion.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFollowup}
                    onChange={(e) => setAutoFollowup(e.target.checked)}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {autoFollowup && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-600">Follow-Up Delay Interval:</span>
                    <span className="text-cyan-600 font-mono font-bold">{followupHours} Hours post-call</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-600">System Prompt & Objection Guidelines</label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {settingsToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{settingsToast}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-save-client-settings"
                disabled={isSavingSettings}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <span>Save Telephony Settings</span>
                )}
              </button>
            </form>

            {/* Account Security & Password Management */}
            <div className="pt-6 border-t border-slate-200">
              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-600" />
                  <h4 className="text-sm font-bold text-slate-900">Security & Account Password</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Update your temporary provisioning password to your personal permanent password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-slate-600">Current / Temporary Password</label>
                  <div className="relative">
                    <input
                      type={showCurPass ? 'text' : 'password'}
                      required
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurPass(!showCurPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      {showCurPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-600">New Password (min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-600">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {passMessage && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    passMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {passMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{passMessage.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2"
                >
                  {isChangingPass ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Update Account Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Deep Call Intelligence Drawer / Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-cyan-100/60 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto space-y-6">
            
            <button
              id="btn-close-lead-intel"
              onClick={() => setSelectedLead(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start justify-between pr-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-600">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Deep AI Call Intelligence</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">{selectedLead.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedLead.title} at <strong className="text-slate-700">{selectedLead.company}</strong> • {selectedLead.phone}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-download-single-report"
                  onClick={() => handleDownloadCallReport(selectedLead)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-cyan-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Download complete call transcript and AI analysis report"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Download Intel (.txt)</span>
                </button>

                {selectedLead.conversionChance !== undefined && (
                  <div className="text-right p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Chance to Convert</span>
                    <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                      {selectedLead.conversionChance}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Call Conclusion Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-cyan-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  Vela AI Call Conclusion:
                </span>
                <span className="text-[11px] font-mono text-emerald-600 uppercase font-semibold">
                  Sentiment: {selectedLead.sentiment || 'Positive'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {selectedLead.aiConclusion || "Call completed. The prospect was receptive to operational efficiency benchmarks."}
              </p>
            </div>

            {/* Key Objections Encountered */}
            {selectedLead.keyObjections && selectedLead.keyObjections.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600">Key Objections Addressed:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedLead.keyObjections.map((obj, i) => (
                    <span key={i} className="text-[11px] px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                      • {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Transcript */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Full Audio & Call Transcript:</span>
                <span className="text-slate-500 font-mono">Duration: {selectedLead.callDurationSeconds || 120}s</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 max-h-56 overflow-y-auto space-y-3 font-sans text-xs">
                {selectedLead.transcript && selectedLead.transcript.length > 0 ? (
                  selectedLead.transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.speaker === 'lead' ? 'justify-end' : 'justify-start'}`}>
                      {msg.speaker === 'agent' && (
                        <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          AI
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                          msg.speaker === 'lead'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-600">
                            {msg.speaker === 'lead' ? selectedLead.name : 'Vela Agent'}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-center py-4">No transcript records available for this lead.</p>
                )}
              </div>
            </div>

            {/* 12-Hour Follow-up Draft & Action */}
            {selectedLead.followupDraft && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-200">
                      Automated 12-Hour Follow-Up (Scheduled for {selectedLead.followupScheduledAt ? new Date(selectedLead.followupScheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Next Cycle'})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-700 uppercase font-semibold">
                    {selectedLead.followupSent ? 'SENT' : 'QUEUED'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 font-sans">
                  {selectedLead.followupDraft.subject && (
                    <div className="font-bold text-slate-900">
                      Subject: {selectedLead.followupDraft.subject}
                    </div>
                  )}
                  <p className="whitespace-pre-line text-slate-600 text-[11px] leading-relaxed">
                    {selectedLead.followupDraft.body}
                  </p>
                </div>

                {!selectedLead.followupSent && (
                  <div className="flex justify-end pt-1">
                    <button
                      id="btn-dispatch-followup-now"
                      onClick={() => {
                        const updated = leads.map(l => l.id === selectedLead.id ? { ...l, followupSent: true } : l);
                        onUpdateLeads(updated);
                        setSelectedLead({ ...selectedLead, followupSent: true });
                        alert("Follow-up email/SMS dispatched immediately to " + selectedLead.name);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Follow-Up Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
