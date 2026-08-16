import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Phone, 
  Plus, 
  Sparkles, 
  Zap, 
  Clock, 
  Settings, 
  Activity, 
  Bot, 
  Building2, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ExternalLink,
  Bell,
  BellRing,
  DollarSign,
  Radio,
  FileText,
  Search,
  Server,
  Calendar
} from 'lucide-react';
import { ClientProfile, User } from '../types';

interface AdminDashboardProps {
  clients: ClientProfile[];
  onAddNewClient: (newClient: ClientProfile) => void;
  onUpdateClient: (updatedClient: ClientProfile) => void;
  onSwitchToClientView: (client: ClientProfile) => void;
  onOpenBuyMinutesForClient: (client: ClientProfile) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  onAddNewClient,
  onUpdateClient,
  onSwitchToClientView,
  onOpenBuyMinutesForClient,
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'leads' | 'orders' | 'meetings'>('clients');
  const [leads, setLeads] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardClient, setOnboardClient] = useState<ClientProfile | null>(null);
  const [twilioNumber, setTwilioNumber] = useState('');
  const [vapiId, setVapiId] = useState('');
  
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

  const generatePassword = () => {
    return 'VL-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '!' + Math.floor(Math.random() * 99);
  };
  
  const loadCombinedNotifications = () => {
    authFetch('/api/admin/notifications')
      .then(r => r.json())
      .then(data => {
        const apiNotifs = data.data || [];
        setNotifications(apiNotifs);
      })
      .catch(e => {
        console.error('Failed to load notifications:', e);
      });
  };

  React.useEffect(() => {
    loadCombinedNotifications();
    const interval = setInterval(loadCombinedNotifications, 3000);
    
    // Instant event trigger when a user signs up or buys in the same browser session
    const handleNotifEvent = () => loadCombinedNotifications();
    window.addEventListener('lucent_notification_event', handleNotifEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('lucent_notification_event', handleNotifEvent);
    };
  }, []);
  
  const handleMarkNotificationRead = async (id: string) => {
    try {
      authFetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ id })
      }).catch(() => {});

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch(e) {}
  };
  
  const handleMarkAllRead = async () => {
    try {
      authFetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({})
      }).catch(() => {});

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch(e) {}
  };

  React.useEffect(() => {
    if (activeTab === 'leads') {
      authFetch('/api/db/leads').then(r => r.json()).then(data => setLeads(data.data || []));
    } else if (activeTab === 'orders') {
      authFetch('/api/db/talktime-requests').then(r => r.json()).then(data => setOrders(data.data || []));
    } else if (activeTab === 'meetings') {
      authFetch('/api/meetings').then(r => r.json()).then(data => setMeetings(data.data || []));
    }
  }, [activeTab]);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleApproveOrder = async (orderId: string, clientId: string, minutes: number) => {
    try {
      const res = await authFetch(`/api/db/talktime-requests/${orderId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ clientId, addedMinutes: minutes })
      });
      const result = await res.json();
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
        const clientToUpdate = clients.find(c => c.id === clientId);
        if (clientToUpdate) {
          onUpdateClient({
            ...clientToUpdate,
            talktimeMinutesTotal: clientToUpdate.talktimeMinutesTotal + minutes
          });
        }
        showToast(`✅ Order ${orderId} approved! +${minutes.toLocaleString()} minutes credited.`);
      } else {
        showToast('❌ Failed to approve order: ' + (result.error || 'Unknown error'));
      }
    } catch (e: any) {
      showToast('❌ Error approving order: ' + e.message);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await authFetch(`/api/db/talktime-requests/${orderId}/reject`, { method: 'POST' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o));
      showToast('⚠️ Order rejected.');
    } catch (e: any) {
      showToast('❌ Error rejecting order: ' + e.message);
    }
  };

  const handleConfirmMeeting = async (meetingId: string, status: string) => {
    try {
      await authFetch(`/api/meetings/${meetingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      authFetch('/api/meetings').then(r => r.json()).then(data => setMeetings(data.data || []));
    } catch (e) {}
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardClient) return;

    const password = generatePassword();
    const loginId = onboardClient.email;
    
    onUpdateClient({
      ...onboardClient,
      twilioPhoneNumber: twilioNumber,
      vapiAssistantId: vapiId,
      status: 'active'
    });

    setOnboardModalOpen(false);

    // Generate automated email draft using mailto:
    const subject = encodeURIComponent(`Welcome to Vela by Lucent AI - Your Autonomous Sales Agent is Ready`);
    const body = encodeURIComponent(`Hi ${onboardClient.contactName},

Welcome to Vela! Your autonomous outbound voice agent has been fully provisioned and is ready to start dialing.

Here are your dedicated configuration details:
Assigned Twilio Number: ${twilioNumber || 'Pending'}
Vapi Assistant Node: ${vapiId || 'Auto-Provisioned'}

---
CLIENT PORTAL ACCESS:
Login URL: https://vela-by-lucent-ai-enterprise-ai-sal.vercel.app/login
Login ID: ${loginId}
Temporary Password: ${password}
---

Please log in to your portal to upload your first lead list and review your AI agent's system prompt.

Best regards,
Abhishek Das
CEO, Lucent AI`);

    window.location.href = `mailto:${onboardClient.email}?subject=${subject}&body=${body}`;
  };

  const handleUpdateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      await fetch(`/api/meetings/${meetingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status } : m));
    } catch (e) {
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status } : m));
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<ClientProfile | null>(null);

  // Onboarding Wizard State
  const [step, setStep] = useState(1);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIndustry, setNewIndustry] = useState('Logistics & Freight Brokerage');
  const [newVoiceId, setNewVoiceId] = useState('cartesia-sonic-marcus');
  const [newVoiceName, setNewVoiceName] = useState('Cartesia Sonic (Warm Authority)');
  const [targetAudience, setTargetAudience] = useState('VPs of Supply Chain and Logistics Directors');
  const [valueProp, setValueProp] = useState('Automated spot freight pricing engine that cuts quote time from 20 mins to 45s and saves 28%');
  const [primaryGoal, setPrimaryGoal] = useState('Book a 15-minute software demo with logistics architect');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [customVapiAssistantId, setCustomVapiAssistantId] = useState('');
  const [telephonyProvider, setTelephonyProvider] = useState<'vapi_free' | 'twilio_custom'>('vapi_free');
  const [initialMinutes, setInitialMinutes] = useState(5000);
  const [activeLines, setActiveLines] = useState(10);
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('18:00');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState('starter');
  const [stripeCustomerId, setStripeCustomerId] = useState('');

  // Calculate totals
  const totalClients = clients.length;
  const totalMinutesAllocated = clients.reduce((acc, c) => acc + c.talktimeMinutesTotal, 0);
  const totalMinutesUsed = clients.reduce((acc, c) => acc + c.talktimeMinutesUsed, 0);
  const totalActiveLines = clients.reduce((acc, c) => acc + c.activeLines, 0);

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.twilioPhoneNumber.includes(searchQuery)
  );

  const handleGeneratePromptWithAI = async () => {
    setIsGeneratingPrompt(true);
    try {
      const response = await authFetch('/api/prompts/generate', {
        method: 'POST',
        body: JSON.stringify({
          companyName: newCompanyName || 'Enterprise Client',
          industry: newIndustry,
          targetAudience,
          valueProposition: valueProp,
          primaryGoal
        })
      });

      const data = await response.json();
      setSystemPrompt(data.systemPrompt || '');
      setFirstMessage(data.firstMessage || '');
      if (data.suggestedVoiceId) setNewVoiceId(data.suggestedVoiceId);
      if (data.suggestedVoiceName) setNewVoiceName(data.suggestedVoiceName);
    } catch (err) {
      console.error('Prompt gen error:', err);
      setSystemPrompt(`You are Vela, the elite autonomous B2B sales agent for ${newCompanyName}. Handle objections naturally and schedule product demos.`);
      setFirstMessage(`Hi! This is Vela calling from ${newCompanyName}. Do you have 60 seconds?`);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientId = `client-${Date.now().toString().slice(-4)}`;
    const randomArea = ['415', '650', '312', '512', '206', '404'][Math.floor(Math.random() * 6)];
    const generatedTwilio = `+1 (${randomArea}) ${Math.floor(200 + Math.random() * 700)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const chosenPhoneNumber = telephonyProvider === 'vapi_free' 
      ? '+1 (800) 555-VAPI (Free Cloud DID)'
      : (twilioNumber || generatedTwilio);

    const newClient: any = {
      id: clientId,
      companyName: newCompanyName,
      contactName: newContactName,
      email: newEmail,
      industry: newIndustry,
      status: 'active',
      vapiAssistantId: customVapiAssistantId || `asst_vapi_${clientId}`,
      vapiVoiceId: newVoiceId,
      vapiVoiceName: newVoiceName,
      twilioPhoneNumber: chosenPhoneNumber,
      systemPrompt: systemPrompt || `You are Vela representing ${newCompanyName}. Qualify prospects and book calendar meetings.`,
      firstMessage: firstMessage || `Hi! This is Vela calling on behalf of ${newCompanyName}. Do you have 60 seconds?`,
      talktimeMinutesTotal: initialMinutes,
      talktimeMinutesUsed: 0,
      activeLines: activeLines,
      callingHoursStart: callingStart,
      callingHoursEnd: callingEnd,
      timezone: 'America/New_York (EST)',
      autoFollowupEnabled: true,
      followupDelayHours: 12,
      subscriptionPlan,
      stripeCustomerId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await authFetch('/api/db/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });
      if (response.ok) {
        const data = await response.json();
        onAddNewClient(data.data || newClient);
      } else {
        onAddNewClient(newClient);
      }
    } catch (err) {
      console.error('Failed to save client to DB:', err);
      onAddNewClient(newClient);
    }

    setIsOnboardingOpen(false);
    setStep(1);
    // Reset inputs
    setNewCompanyName('');
    setNewContactName('');
    setNewEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Onboard Modal */}
        {onboardModalOpen && onboardClient && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
              <h2 className="text-xl font-bold mb-4">Onboard Customer: {onboardClient.companyName}</h2>
              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Twilio Number</label>
                  <input type="text" value={twilioNumber} onChange={(e) => setTwilioNumber(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vapi Assistant ID</label>
                  <input type="text" value={vapiId} onChange={(e) => setVapiId(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200" required />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setOnboardModalOpen(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500">Provision & Send Email</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-500/40 text-xs font-semibold text-purple-700 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Lucent AI Master Administration Suite</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Client Fleet & Telephony Management
            </h1>
            <p className="text-xs text-slate-500">
              Onboard B2B enterprise clients, provision Vapi assistants, assign Twilio virtual phone numbers, and manage minute balances.
            </p>
          </div>

          <div className="flex items-center gap-3">

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-full hover:bg-slate-200 transition-colors bg-white border border-slate-200 shadow-sm text-slate-600"
              >
                {notifications.filter(n => !n.read).length > 0 ? (
                  <>
                    <BellRing className="w-5 h-5 text-cyan-600" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                  </>
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </button>
              
              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                    {notifications.some(n => !n.read) && (
                      <button onClick={handleMarkAllRead} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No recent notifications
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (!notif.read) handleMarkNotificationRead(notif.id);
                              if (notif.type === 'signup') setActiveTab('leads');
                              if (notif.type === 'purchase_request') setActiveTab('orders');
                              if (notif.type === 'meeting_request') setActiveTab('meetings');
                              setIsNotificationsOpen(false);
                            }}
                            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-cyan-50/30' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-cyan-500' : 'bg-transparent'}`} />
                              <div>
                                <h4 className={`text-sm font-medium ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                <span className="text-[10px] font-medium text-slate-400 mt-2 block">
                                  {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              id="btn-admin-quick-demo-client"
              onClick={() => {
                const demoId = `demo-${Date.now().toString().slice(-4)}`;
                const demoClient: ClientProfile = {
                  id: demoId,
                  companyName: 'My Vapi Demo Account',
                  contactName: 'Abhishek Das',
                  email: 'abhishekdas2090@gmail.com',
                  industry: 'AI Voice & Sales Technology',
                  status: 'active',
                  vapiAssistantId: 'asst_vapi_direct_demo',
                  vapiVoiceId: 'cartesia-sonic-marcus',
                  vapiVoiceName: 'Cartesia Sonic (Ultra-Low Latency)',
                  twilioPhoneNumber: '+1 (800) 555-VAPI (Free Cloud DID)',
                  systemPrompt: 'You are Vela, the ultimate AI cold caller and sales assistant. Qualify prospects effortlessly and schedule executive product demos.',
                  firstMessage: 'Hi there! This is Vela calling on behalf of your custom Vapi Demo Client. How can I help supercharge your sales conversions today?',
                  talktimeMinutesTotal: 10000,
                  talktimeMinutesUsed: 0,
                  activeLines: 15,
                  callingHoursStart: '08:00',
                  callingHoursEnd: '20:00',
                  timezone: 'America/New_York (EST)',
                  autoFollowupEnabled: true,
                  followupDelayHours: 12,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                onAddNewClient(demoClient);
                onSwitchToClientView(demoClient);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-cyan-700 border border-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Instantly deploy a pre-configured demo client portal using your free Vapi tier"
            >
              <Bot className="w-4 h-4 text-cyan-600" />
              <span>+ Quick Demo Client</span>
            </button>

            <button
              id="btn-admin-onboard-new"
              onClick={() => {
                setIsOnboardingOpen(true);
                setStep(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Client</span>
            </button>
          </div>
        </div>

        {/* System Health & Master KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-600" /> Total Active Clients
            </span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{totalClients}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block">All Fleets Operational</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" /> Total Minutes Pool
            </span>
            <span className="text-3xl font-extrabold text-emerald-700 font-mono">
              {(totalMinutesAllocated - totalMinutesUsed).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Used: {totalMinutesUsed.toLocaleString()} / {totalMinutesAllocated.toLocaleString()}m
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-indigo-600" /> Active Concurrent Lines
            </span>
            <span className="text-3xl font-extrabold text-indigo-700 font-mono">{totalActiveLines}</span>
            <span className="text-[11px] text-slate-500 block">Twilio SIP Trunking Connected</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200 space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-600" /> System Latency SLA
            </span>
            <span className="text-3xl font-extrabold text-purple-700 font-mono">418ms</span>
            <span className="text-[11px] text-emerald-600 font-semibold block">99.98% Platform Uptime</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button onClick={() => setActiveTab('clients')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition ${activeTab === 'clients' ? 'bg-white text-cyan-600 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-700'}`}>
            Active Clients
          </button>
          <button onClick={() => setActiveTab('leads')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'leads' ? 'bg-white text-purple-600 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-700'}`}>
            Pending Leads / Signups {leads.length > 0 && <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{leads.length}</span>}
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'orders' ? 'bg-white text-emerald-600 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}>
            Talktime Purchase Orders {orders.filter(o => o.status === 'pending').length > 0 && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{orders.filter(o => o.status === 'pending').length}</span>}
          </button>
          <button onClick={() => setActiveTab('meetings')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'meetings' ? 'bg-white text-amber-600 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-700'}`}>
            Strategy Meetings {meetings.filter(m => m.status === 'pending').length > 0 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{meetings.filter(m => m.status === 'pending').length}</span>}
          </button>
        </div>

        {activeTab === 'clients' && (
        <div className="rounded-3xl bg-white/80 border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Client Accounts & Telephony Routing</h2>
              <p className="text-xs text-slate-500">Click any client to switch directly to their portal view or manage Vapi & Twilio settings.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients, phone, or industry..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-bold">Company & Contact</th>
                  <th className="p-3.5 font-bold">Industry / Voice Model</th>
                  <th className="p-3.5 font-bold">Assigned Twilio Number</th>
                  <th className="p-3.5 font-bold">Talktime Balance</th>
                  <th className="p-3.5 font-bold">Concurrent Lines</th>
                  <th className="p-3.5 font-bold">Calling Window</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredClients.map((client) => {
                  const minutesLeft = Math.max(0, client.talktimeMinutesTotal - client.talktimeMinutesUsed);
                  const usagePercent = Math.min(100, Math.round((client.talktimeMinutesUsed / client.talktimeMinutesTotal) * 100));

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm">{client.companyName}</div>
                        <div className="text-[11px] text-slate-500">{client.contactName} • {client.email}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-600 font-medium block">{client.industry}</span>
                        <span className="text-[10px] text-cyan-600 font-mono">{client.vapiVoiceName}</span>
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-indigo-700">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-600" />
                          {client.twilioPhoneNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 block">{client.vapiAssistantId}</span>
                      </td>

                      <td className="p-3.5 min-w-[140px]">
                        <div className="flex justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-600 font-bold">{minutesLeft.toLocaleString()} left</span>
                          <span className="text-slate-500">{client.talktimeMinutesTotal.toLocaleString()} total</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                            }`}
                            style={{ width: `${100 - usagePercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-center font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                          {client.activeLines} Lines
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        {client.callingHoursStart} – {client.callingHoursEnd}
                        <span className="text-[10px] text-slate-500 block">12-Hr Follow-Up: ON</span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-admin-add-minutes-${client.id}`}
                            onClick={() => onOpenBuyMinutesForClient(client)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-500/40 hover:bg-emerald-900/80 transition"
                            title="Add talktime minutes"
                          >
                            + Minutes
                          </button>
                          <button
                            onClick={() => onSwitchToClientView(client)}
                            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold text-[10px] sm:text-xs transition flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View Portal</span>
                          </button>
                          <button
                            onClick={() => {
                              setOnboardClient(client);
                              setTwilioNumber(client.twilioPhoneNumber || '');
                              setVapiId(client.vapiAssistantId || '');
                              setOnboardModalOpen(true);
                            }}
                            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] sm:text-xs transition flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Onboard</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'leads' && (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6">
            <h2 className="text-lg font-bold text-slate-900">Pending Client Signups & Leads</h2>
            <p className="text-xs text-slate-500">Prospects who completed the signup form but require configuration.</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 font-bold">Company / Lead</th>
                    <th className="p-3.5 font-bold">Email</th>
                    <th className="p-3.5 font-bold">Request Type</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition group">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{lead.companyName}</div>
                        <div className="text-slate-500">{lead.contactName}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{lead.email}</td>
                      <td className="p-3.5">
                        {lead.meetingRequested 
                          ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-purple-600 font-semibold text-[11px] bg-purple-50 px-2 py-0.5 rounded border border-purple-500/20 inline-block w-fit">Strategy Meeting</span>
                                {lead.meetingTime && <span className="text-[10px] text-slate-500">{new Date(lead.meetingTime).toLocaleString()}</span>}
                              </div>
                            )
                          : <span className="text-cyan-600 font-semibold text-[11px] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-500/20">Direct Platform Access</span>
                        }
                      </td>
                      <td className="p-3.5 text-amber-600 font-mono font-semibold">Pending Config</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setNewCompanyName(lead.companyName);
                            setNewContactName(lead.contactName);
                            setNewEmail(lead.email);
                            setIsOnboardingOpen(true);
                            setStep(1);
                          }}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs"
                        >
                          Provision Now
                        </button>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-mono">No pending leads</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Talktime Minute Purchase Orders</h2>
                <p className="text-xs text-slate-500">Client top-up requests waiting for invoice verification and CEO minute allocation.</p>
              </div>
              <div className="text-xs font-mono font-bold text-slate-500">
                {orders.filter(o => o.status === 'pending').length} Pending Orders
              </div>
            </div>

            {actionMessage && (
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-bold text-cyan-800 animate-in fade-in">
                {actionMessage}
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 font-bold">Client / Company</th>
                    <th className="p-3.5 font-bold">Minutes Requested</th>
                    <th className="p-3.5 font-bold">Amount Due</th>
                    <th className="p-3.5 font-bold">Order Details</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold text-right">CEO Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition group">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{order.companyName || 'Enterprise Account'}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{order.email || order.clientId}</div>
                      </td>
                      <td className="p-3.5 text-cyan-700 font-bold font-mono text-sm">
                        +{order.minutesRequested?.toLocaleString()}m
                      </td>
                      <td className="p-3.5 text-emerald-700 font-bold font-mono text-sm">
                        ${order.amountDue} USD
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {order.notes ? <span className="italic">"{order.notes}"</span> : <span className="text-slate-400">Standard Topup</span>}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          order.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          order.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {order.status === 'pending' ? '⏳ PENDING CEO REVIEW' : order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {order.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveOrder(order.id, order.clientId, order.minutesRequested)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                              Approve & Credit
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-rose-600 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-mono">No purchase orders placed yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Infrastructure & Vapi/Twilio Configuration Accordion */}
        <div className="p-6 rounded-3xl bg-white/50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-600" />
              <h3 className="text-base font-bold text-slate-900">Global Integration & API Gateways</h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-600 border border-emerald-500/30 font-mono">
              Live Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold block">Vapi API Orchestrator</span>
              <span className="text-cyan-600 font-mono font-bold block">vapi_sec_••••••••••••9941</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Status: Connected (Cartesia Engine)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold block">Twilio SIP Trunking Pool</span>
              <span className="text-indigo-600 font-mono font-bold block">AC98df71b••••••••••••4a</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Status: 43 Virtual DIDs Ready</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold block">Stripe Payment Gateway</span>
              <span className="text-emerald-600 font-mono font-bold block">sk_live_••••••••••••3102</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Auto 15-min credit webhook</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-semibold block">Gemini 3.7 Intelligence</span>
              <span className="text-purple-600 font-mono font-bold block">gemini-3.7-flash</span>
              <span className="text-[10px] text-emerald-600 font-semibold">100% Objection & Analysis AI</span>
            </div>
          </div>
        </div>

        {/* MEETINGS TAB */}
        {activeTab === 'meetings' && (
          <div className="rounded-3xl bg-white/80 border border-slate-200 shadow-xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Strategy Meeting Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">All demo and strategy session requests from the booking form.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                  {meetings.filter(m => m.status === 'pending').length} Pending
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  {meetings.filter(m => m.status === 'confirmed').length} Confirmed
                </span>
              </div>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No meeting requests yet.</p>
                <p className="text-xs mt-1">When visitors book a strategy session from the landing page, they'll appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {meetings.map((mtg: any) => (
                  <div key={mtg.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{mtg.contactName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          mtg.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          mtg.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{mtg.status?.toUpperCase()}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span><span className="font-semibold text-slate-700">{mtg.companyName}</span></span>
                        <span>{mtg.email}</span>
                        {mtg.phone && <span>{mtg.phone}</span>}
                        {mtg.industry && <span className="text-cyan-600">{mtg.industry}</span>}
                      </div>
                      {mtg.preferredTime && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Requested: {mtg.preferredTime}
                        </div>
                      )}
                      {mtg.notes && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-lg mt-1">{mtg.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {mtg.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateMeetingStatus(mtg.id, 'confirmed')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleUpdateMeetingStatus(mtg.id, 'cancelled')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {mtg.status === 'confirmed' && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Onboard New Client Multi-Step Wizard Modal */}
      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-purple-950/50 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            
            <button
              id="btn-close-admin-wizard"
              onClick={() => setIsOnboardingOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-500/30 text-xs font-semibold text-purple-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Assisted Client Provisioning Wizard</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Onboard New Enterprise Client</h2>
              <p className="text-xs text-slate-500">Step {step} of 4: Configure profile, synthesize scripts, provision virtual DID, and setup billing.</p>
            </div>

            {/* Wizard Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-cyan-500' : 'bg-slate-100'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-100'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? 'bg-cyan-500' : 'bg-slate-100'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 4 ? 'bg-cyan-500' : 'bg-slate-100'}`} />
            </div>

            {/* Step 1: Client & Industry Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Company Name</label>
                    <input
                      type="text"
                      required
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="e.g. Apex Cloud Logistics"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Executive Contact Name</label>
                    <input
                      type="text"
                      required
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="e.g. Marcus Sterling"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Contact Email</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="marcus@apexlogistics.io"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Industry / Domain</label>
                    <select
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Logistics & Freight Brokerage">Logistics & Freight Brokerage</option>
                      <option value="B2B Software & SaaS">B2B Software & SaaS</option>
                      <option value="Commercial Solar & Clean Energy">Commercial Solar & Clean Energy</option>
                      <option value="Real Estate & Acquisitions">Real Estate & Acquisitions</option>
                      <option value="Healthcare & Specialized Clinics">Healthcare & Specialized Clinics</option>
                      <option value="Financial Services & Insurance">Financial Services & Insurance</option>
                    </select>
                  </div>
                </div>

                {/* Voice Model Selection */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-slate-600">Vapi Voice Model</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cartesia-sonic-marcus', name: 'Cartesia Sonic (Warm Authority)' },
                      { id: 'elevenlabs-rachel-conversational', name: 'ElevenLabs Sarah (Conversational)' },
                      { id: 'azure-neural-davis', name: 'Azure Neural Pro (Davis)' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setNewVoiceId(v.id);
                          setNewVoiceName(v.name);
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition ${
                          newVoiceId === v.id
                            ? 'bg-cyan-50 border-cyan-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="font-bold block text-slate-700">{v.name}</span>
                        <span className="text-[10px] text-cyan-600">&lt; 420ms Latency</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    id="btn-wizard-next-1"
                    disabled={!newCompanyName || !newEmail}
                    onClick={() => {
                      setStep(2);
                      handleGeneratePromptWithAI();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Next: AI Script Synthesis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: AI Script Synthesis & Prompt Tuning */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-200">
                      AI synthesized sales prompt based on {newIndustry}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePromptWithAI}
                    disabled={isGeneratingPrompt}
                    className="text-[11px] text-cyan-600 hover:underline font-semibold"
                  >
                    {isGeneratingPrompt ? 'Generating...' : '↻ Re-Generate'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Opening Hook (First Message)</label>
                  <input
                    type="text"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">System Prompt & Objection Battlecards</label>
                  <textarea
                    rows={5}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    id="btn-wizard-next-2"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>Next: Twilio DID & Quota</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Twilio/Vapi DID, Assistant Binding, Quota & Calling Windows */}
            {step === 3 && (
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                
                {/* Telephony Line Source */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Telephony Routing Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTelephonyProvider('vapi_free')}
                      className={`p-3 rounded-xl border text-left transition ${
                        telephonyProvider === 'vapi_free'
                          ? 'bg-cyan-50 border-cyan-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-700">
                        <Radio className="w-3.5 h-3.5" />
                        <span>Vapi Free WebRTC & Cloud Line</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Instantly deploy using your free Vapi tier without buying Twilio numbers.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTelephonyProvider('twilio_custom')}
                      className={`p-3 rounded-xl border text-left transition ${
                        telephonyProvider === 'twilio_custom'
                          ? 'bg-indigo-50 border-indigo-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 text-indigo-700">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Custom Twilio Dedicated DID</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Use specific company phone numbers with SIP trunking.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      {telephonyProvider === 'vapi_free' ? 'Assigned Vapi Inbound/Outbound Line' : 'Dedicated Twilio Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={telephonyProvider === 'vapi_free' ? '+1 (800) 555-VAPI (Free Cloud DID)' : twilioNumber}
                      onChange={(e) => setTwilioNumber(e.target.value)}
                      disabled={telephonyProvider === 'vapi_free'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-indigo-700 font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-75"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Vapi Assistant ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 5d92131a-xxxx-xxxx (Leave blank to auto-generate)"
                      value={customVapiAssistantId}
                      onChange={(e) => setCustomVapiAssistantId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-cyan-700 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Initial Minutes Allocation</label>
                    <input
                      type="number"
                      value={initialMinutes}
                      onChange={(e) => setInitialMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-emerald-600 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Concurrent Lines</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={activeLines}
                      onChange={(e) => setActiveLines(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Calling Hours (Start)</label>
                    <input
                      type="time"
                      value={callingStart}
                      onChange={(e) => setCallingStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Calling Hours (End)</label>
                    <input
                      type="time"
                      value={callingEnd}
                      onChange={(e) => setCallingEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-500/30 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Auto 12-hour follow-up trigger and Vapi webhook routing enabled by default.</span>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Next: Billing & Subscription</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Billing & Subscription */}
            {step === 4 && (
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Select Subscription Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('starter')}
                      className={`p-3 rounded-xl border text-left transition ${
                        subscriptionPlan === 'starter'
                          ? 'bg-cyan-50 border-cyan-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-xs">Starter ($299/mo)</div>
                      <span className="text-[10px] block mt-1">2,000 mins + 5 concurrent lines.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('pro')}
                      className={`p-3 rounded-xl border text-left transition ${
                        subscriptionPlan === 'pro'
                          ? 'bg-purple-50 border-purple-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-xs">Pro ($799/mo)</div>
                      <span className="text-[10px] block mt-1">10,000 mins + 20 concurrent lines.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('enterprise')}
                      className={`p-3 rounded-xl border text-left transition ${
                        subscriptionPlan === 'enterprise'
                          ? 'bg-emerald-50 border-emerald-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-xs">Enterprise</div>
                      <span className="text-[10px] block mt-1">Custom mins + Unlimited lines.</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    Stripe Customer ID / API Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="cus_xxxxxxxxxxxxx (We will connect Stripe API later)"
                    value={stripeCustomerId}
                    onChange={(e) => setStripeCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 placeholder-slate-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Payment gateway integration placeholder. You can link this later via Stripe webhook.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    id="btn-complete-client-onboarding"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Deploy & Launch Client Fleet</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
