import React, { useState } from 'react';
import { User, ClientProfile } from '../types';
import { 
  Radio, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  PhoneCall,
  LayoutDashboard,
  Zap,
  Menu,
  X,
  Calendar,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'client_dashboard' | 'admin_dashboard' | 'portal_login';
  currentUser: User | null;
  activeClient: ClientProfile | null;
  onNavigate: (view: 'landing' | 'client_dashboard' | 'admin_dashboard') => void;
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onLogout: () => void;
  onOpenBuyMinutes: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentUser,
  activeClient,
  onNavigate,
  onOpenLogin,
  onOpenSignUp,
  onLogout,
  onOpenBuyMinutes,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isLanding = currentView === 'landing' || currentView === 'portal_login';
  const talktimeMinutesLeft = activeClient
    ? Math.max(0, activeClient.talktimeMinutesTotal - activeClient.talktimeMinutesUsed)
    : 0;

  const scrollTo = (id: string) => {
    setIsMobileOpen(false);
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Light translucent navbar for landing and dashboards
  const navBg = 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm';
  const textColor = 'text-slate-600';
  const logoTextColor = 'text-slate-900';
  const hoverColor = 'hover:text-slate-900';

  return (
    <header className={`sticky top-0 z-40 w-full border-b ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onNavigate('landing'); setIsMobileOpen(false); }}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Radio className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`font-extrabold text-lg tracking-tight font-mono ${logoTextColor}`}>
                VELA
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                by Lucent AI
              </span>
            </div>
            <span className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block">
              Autonomous B2B Voice Sales Force
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className={`hidden md:flex items-center gap-5 text-sm ${textColor}`}>
          <button
            id="nav-overview-link"
            onClick={() => onNavigate('landing')}
            className={`transition ${hoverColor} font-medium ${currentView === 'landing' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Overview
          </button>
          <button
            id="nav-demo-link"
            onClick={() => scrollTo('voice-demo-section')}
            className={`transition ${hoverColor} flex items-center gap-1.5`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-cyan-500" />
            <span>Live Demo</span>
          </button>
          <button
            id="nav-pricing-link"
            onClick={() => scrollTo('pricing-section')}
            className={`transition ${hoverColor}`}
          >
            Pricing
          </button>
          <button
            id="nav-roi-link"
            onClick={() => scrollTo('proof-section')}
            className={`transition ${hoverColor}`}
          >
            ROI Calculator
          </button>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Talktime balance chip */}
              {currentUser.role === 'client' && activeClient && (
                <div
                  onClick={onOpenBuyMinutes}
                  className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer transition border ${isLanding ? 'bg-white/8 border-white/12 hover:border-cyan-500/40' : 'bg-slate-50 border-slate-200 hover:border-cyan-400'}`}
                  title="Click to buy more talktime minutes"
                >
                  <div className="flex flex-col text-right">
                    <span className={`text-[10px] uppercase font-semibold ${isLanding ? 'text-slate-400' : 'text-slate-500'}`}>Talktime</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{talktimeMinutesLeft.toLocaleString()}m</span>
                  </div>
                  <button id="btn-nav-buy-minutes" className="p-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition">
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Portal switcher */}
              {currentUser.role === 'admin' ? (
                <button
                  id="btn-admin-portal-switch"
                  onClick={() => onNavigate(currentView === 'admin_dashboard' ? 'landing' : 'admin_dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{currentView === 'admin_dashboard' ? 'Landing Page' : 'Admin Console'}</span>
                </button>
              ) : (
                <button
                  id="btn-client-portal-switch"
                  onClick={() => onNavigate(currentView === 'client_dashboard' ? 'landing' : 'client_dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${isLanding ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{currentView === 'client_dashboard' ? 'Landing Page' : 'Dashboard'}</span>
                </button>
              )}

              {/* User avatar & logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shadow">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className={`hidden lg:block text-xs font-semibold ${isLanding ? 'text-slate-300' : 'text-slate-700'}`}>
                  {currentUser.name}
                </span>
                <button
                  id="btn-nav-logout"
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenLogin}
                className={`hidden sm:flex items-center px-3.5 py-1.5 text-sm font-semibold rounded-lg transition cursor-pointer border ${isLanding ? 'bg-white/8 border-white/15 text-slate-200 hover:bg-white/12' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                Sign In
              </button>
              <button
                id="btn-nav-signup"
                onClick={onOpenSignUp}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className={`md:hidden p-1.5 rounded-lg ${isLanding ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileOpen && (
        <div className={`md:hidden border-t ${isLanding ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} px-4 py-4 space-y-2`}>
          {[
            { label: 'Overview', id: '', action: () => { onNavigate('landing'); setIsMobileOpen(false); } },
            { label: '🎙 Live Demo', id: 'voice-demo-section', action: () => scrollTo('voice-demo-section') },
            { label: 'Pricing', id: 'pricing-section', action: () => scrollTo('pricing-section') },
            { label: 'ROI Calculator', id: 'proof-section', action: () => scrollTo('proof-section') },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${isLanding ? 'text-slate-300 hover:text-white hover:bg-white/8' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
          {!currentUser && (
            <div className="pt-2 flex gap-2">
              <button onClick={onOpenLogin} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${isLanding ? 'border-white/15 text-slate-200 hover:bg-white/8' : 'border-slate-200 text-slate-700'}`}>Sign In</button>
              <button onClick={onOpenSignUp} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white">Get Started</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
