/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  ClientProfile,
  Lead,
  PricingPlan,
  MinutePackage
} from './types';
import { INITIAL_CLIENTS, INITIAL_LEADS, PRICING_PLANS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { LiveVoiceDemo } from './components/LiveVoiceDemo';
import { ProofOfResults } from './components/ProofOfResults';
import { CompetitivePricing } from './components/CompetitivePricing';
import { AuthModal } from './components/AuthModal';
import { BuyMinutesModal } from './components/BuyMinutesModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ComingSoonChannels } from './components/ComingSoonChannels';
import { PortalLoginPage } from './components/PortalLoginPage';
import { ClientDashboard } from './components/ClientDashboard';
import { LiveCallTicker } from './components/LiveCallTicker';
import { MeetingScheduler } from './components/MeetingScheduler';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Phone,
  Bot,
  Lock,
  UploadCloud,
  Calendar,
  Activity,
  CheckCircle2,
  ArrowRight,
  Twitter,
  Linkedin,
  Globe,
} from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<'landing' | 'client_dashboard' | 'admin_dashboard' | 'portal_login'>('landing');

  // Data State
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const saved = localStorage.getItem('vela_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [activeClient, setActiveClient] = useState<ClientProfile>(() => {
    return clients[0] || INITIAL_CLIENTS[0];
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('vela_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vela_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isBuyMinutesOpen, setIsBuyMinutesOpen] = useState(false);
  const [selectedMinutePackage, setSelectedMinutePackage] = useState<MinutePackage | null>(null);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isPortalRoute, setIsPortalRoute] = useState(false);

  // Sync to local storage & load live database clients
  useEffect(() => {
    localStorage.setItem('vela_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    // Fetch live clients from Supabase database
    fetch('/api/db/clients')
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setClients(data.data);
          if (!activeClient || activeClient.id === 'client-1') {
            setActiveClient(data.data[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('vela_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vela_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vela_user');
    }
  }, [currentUser]);

  // Check for Subdomain (app. / admin.) or /login route
  useEffect(() => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const isPortalSubdomain = hostname.startsWith('app.') || hostname.startsWith('portal.') || hostname.startsWith('admin.');
    const isPortalPath = pathname === '/login' || pathname === '/portal' || pathname === '/admin' || pathname === '/app';

    if (isPortalSubdomain || isPortalPath) {
      setIsPortalRoute(true);
      if (currentUser) {
        setCurrentView(currentUser.role === 'admin' ? 'admin_dashboard' : 'client_dashboard');
      } else {
        setCurrentView('portal_login');
      }
    } else {
      if (currentUser && pathname === '/dashboard') {
        setCurrentView(currentUser.role === 'admin' ? 'admin_dashboard' : 'client_dashboard');
      }
    }

    const handlePopState = () => {
      if (window.location.pathname === '/login' || window.location.pathname === '/admin' || window.location.pathname === '/portal') {
        if (currentUser) {
          setCurrentView(currentUser.role === 'admin' ? 'admin_dashboard' : 'client_dashboard');
        } else {
          setCurrentView('portal_login');
        }
      } else if (window.location.pathname === '/') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Auth Callbacks
  const handleLoginSuccess = (user: User, client?: ClientProfile) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin_dashboard');
    } else {
      const matchedClient = client || clients.find(c => c.id === user.clientId) || clients[0];
      setActiveClient(matchedClient);
      setCurrentView('client_dashboard');
    }
  };

  const handleSignUpSuccess = (newClient: ClientProfile, newUser: User) => {
    const updatedClients = [newClient, ...clients.filter(c => c.id !== newClient.id)];
    setClients(updatedClients);
    setActiveClient(newClient);
    setCurrentUser(newUser);
    setCurrentView('client_dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('landing');
  };

  const handleSelectPlan = (plan: PricingPlan) => {
    if (!currentUser) {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
    } else {
      setIsBuyMinutesOpen(true);
    }
  };

  const handleSelectMinutePackage = (pkg: MinutePackage) => {
    setSelectedMinutePackage(pkg);
    setIsBuyMinutesOpen(true);
  };

  const handleMinutesPurchased = (addedMinutes: number) => {
    if (!activeClient) return;
    const updated = {
      ...activeClient,
      talktimeMinutesTotal: activeClient.talktimeMinutesTotal + addedMinutes
    };
    setActiveClient(updated);
    setClients(clients.map(c => c.id === updated.id ? updated : c));
  };

  const handleAddNewClient = (newClient: ClientProfile) => {
    setClients([newClient, ...clients]);
  };

  const handleUpdateClient = (updatedClient: ClientProfile) => {
    setActiveClient(updatedClient);
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleAdminSwitchToClient = (client: ClientProfile) => {
    setActiveClient(client);
    setCurrentView('client_dashboard');
  };

  const handleOpenBuyMinutesForClient = (client: ClientProfile) => {
    setActiveClient(client);
    setIsBuyMinutesOpen(true);
  };

  const scrollToDemo = () => {
    const element = document.getElementById('voice-demo-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const HOW_IT_WORKS = [
    {
      step: '01',
      icon: UploadCloud,
      title: 'Upload Your Lead CSV',
      desc: 'Drag & drop any CSV file with contacts. Vela maps name, phone, company, and title automatically in seconds.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      step: '02',
      icon: Phone,
      title: 'Vela Dials Autonomously',
      desc: 'Your AI agent calls every lead in your list with sub-450ms latency. Real objections, real conversation, no scripts.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      step: '03',
      icon: Calendar,
      title: 'Meetings Get Booked',
      desc: 'High-intent leads get auto-qualified and meeting requests land in your calendar. Vela sends 12-hour follow-ups.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">

      {/* Live call activity ticker */}
      {currentView === 'landing' && <LiveCallTicker />}

      {/* Universal Navigation Bar */}
      <Navbar
        currentView={currentView}
        currentUser={currentUser}
        activeClient={activeClient}
        onNavigate={(view) => setCurrentView(view)}
        onOpenLogin={() => { window.history.pushState({}, '', '/login'); setCurrentView('portal_login'); }}
        onOpenSignUp={() => {
          setAuthMode('signup');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenBuyMinutes={() => setIsBuyMinutesOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'portal_login' && (
          <PortalLoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigateHome={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('landing');
            }}
          />
        )}

        {currentView === 'landing' && (
          <div className="space-y-0">
            {/* Premium Hero */}
            <HeroSection
              onTryDemo={scrollToDemo}
              onOpenSignUp={() => {
                setAuthMode('signup');
                setIsAuthModalOpen(true);
              }}
              onOpenScheduler={() => setIsSchedulerOpen(true)}
            />

            {/* How It Works */}
            <section className="py-20 bg-slate-50 border-b border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4">
                    <Zap className="w-3.5 h-3.5" /> Operational Workflow
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    From Lead List to Booked Meeting in Minutes
                  </h2>
                  <p className="mt-3 text-slate-600 text-base max-w-2xl mx-auto">
                    No complex setup. No engineering. Upload, configure once, and watch Vela work autonomously 24/7.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                  {HOW_IT_WORKS.map((item, i) => (
                    <div key={i} className={`relative rounded-2xl border ${item.border} ${item.bg} p-6 hover:scale-[1.02] transition-transform`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center flex-shrink-0`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="font-mono text-3xl font-black text-slate-700">{item.step}</div>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-4">{item.title}</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Coming Soon Channels */}
            <ComingSoonChannels />

            {/* Interactive Live Voice Demo */}
            <LiveVoiceDemo
              onOpenSignUp={() => {
                setAuthMode('signup');
                setIsAuthModalOpen(true);
              }}
            />

            {/* Proof of Results & ROI Calculator */}
            <ProofOfResults
              onOpenSignUp={() => {
                setAuthMode('signup');
                setIsAuthModalOpen(true);
              }}
            />

            {/* Pricing */}
            <CompetitivePricing
              onSelectPlan={handleSelectPlan}
              onSelectMinutePackage={handleSelectMinutePackage}
            />

            {/* Final CTA Section */}
            <section className="py-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/60">
              <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300">
                  <Activity className="w-3.5 h-3.5 animate-pulse" /> Enterprise-Grade Voice AI
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Ready to Deploy Your AI Sales Fleet?
                </h2>
                <p className="text-slate-400 text-base">
                  Join hundreds of revenue teams replacing manual cold calling with autonomous AI agents. Start in under 3 minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold hover:from-cyan-400 hover:to-indigo-500 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                  >
                    Start Free Trial <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsSchedulerOpen(true)}
                    className="px-8 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:border-slate-500 hover:text-white transition flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-cyan-400" /> Book a Live Demo
                  </button>
                </div>
                <p className="text-xs text-slate-600 pt-1">No credit card required · Setup in 3 minutes · Cancel anytime</p>
              </div>
            </section>
          </div>
        )}

        {currentView === 'admin_dashboard' && (
          <AdminDashboard
            clients={clients}
            onAddNewClient={handleAddNewClient}
            onUpdateClient={handleUpdateClient}
            onSwitchToClientView={handleAdminSwitchToClient}
            onOpenBuyMinutesForClient={handleOpenBuyMinutesForClient}
          />
        )}

        {currentView === 'client_dashboard' && (
          <ClientDashboard
            client={activeClient}
            leads={leads}
            currentUser={currentUser}
            onUpdateClient={handleUpdateClient}
            onUpdateLeads={(updatedLeads) => setLeads(updatedLeads)}
            onOpenBuyMinutes={() => setIsBuyMinutesOpen(true)}
          />
        )}
      </main>

      {/* Enterprise Footer */}
      {currentView === 'landing' && (
        <footer className="bg-slate-950 border-t border-slate-800/60 pt-14 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-cyan-500/20">
                    V
                  </div>
                  <span className="text-base font-extrabold text-white tracking-tight">
                    Vela <span className="text-cyan-400 font-medium text-xs">by Lucent AI</span>
                  </span>
                </div>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  Replacing manual outbound call center seats with sub-450ms autonomous voice agents. Guaranteed 10% lower pricing.
                </p>
                <div className="flex gap-3">
                  {[
                    { Icon: Twitter, label: 'Twitter' },
                    { Icon: Linkedin, label: 'LinkedIn' },
                    { Icon: Globe, label: 'Website' },
                  ].map(({ Icon, label }) => (
                    <button key={label} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition">
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Product</h4>
                <ul className="space-y-2">
                  {['Features', 'Pricing', 'Integrations', 'API Reference', 'Changelog'].map(l => (
                    <li key={l}><button onClick={scrollToDemo} className="text-sm text-slate-500 hover:text-slate-200 transition">{l}</button></li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Company</h4>
                <ul className="space-y-2">
                  {['About Lucent AI', 'Blog', 'Careers', 'Press Kit', 'Contact'].map(l => (
                    <li key={l}><button className="text-sm text-slate-500 hover:text-slate-200 transition">{l}</button></li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Legal</h4>
                <ul className="space-y-2">
                  {['Privacy Policy', 'Terms of Service', 'GDPR Compliance', 'CCPA', 'Data Processing'].map(l => (
                    <li key={l}><button className="text-sm text-slate-500 hover:text-slate-200 transition">{l}</button></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Platform Badges */}
            <div className="border-t border-slate-800/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { Icon: ShieldCheck, label: 'Twilio SIP Attestation A', color: 'text-cyan-400' },
                  { Icon: Zap, label: 'Vapi Real-Time Voice', color: 'text-emerald-400' },
                  { Icon: Sparkles, label: 'Gemini 3.5 Intelligence', color: 'text-purple-400' },
                  { Icon: Lock, label: 'SOC 2 Type II Ready', color: 'text-amber-400' },
                ].map(({ Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-600">
                © {new Date().getFullYear()} Lucent AI Technologies Inc. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Auth & Onboarding Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        isPortalRoute={isPortalRoute}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSignUpSuccess={handleSignUpSuccess}
      />

      {/* Buy Minutes & Stripe Checkout Modal */}
      <BuyMinutesModal
        isOpen={isBuyMinutesOpen}
        client={activeClient}
        selectedPresetPackage={selectedMinutePackage}
        onClose={() => {
          setIsBuyMinutesOpen(false);
          setSelectedMinutePackage(null);
        }}
        onMinutesPurchased={handleMinutesPurchased}
      />

      {/* Meeting Scheduler Modal */}
      {isSchedulerOpen && (
        <MeetingScheduler
          isModal={true}
          onClose={() => setIsSchedulerOpen(false)}
        />
      )}
    </div>
  );
}
