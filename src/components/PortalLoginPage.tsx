import React, { useState } from 'react';
import { 
  Sparkles, 
  Shield, 
  Building2, 
  Mail, 
  Lock, 
  ArrowRight,
  Zap,
  Bot
} from 'lucide-react';
import { User, ClientProfile } from '../types';

interface PortalLoginPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigateHome: () => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;

    if (loginEmail.includes('@')) {
      const isAdmin = loginEmail.toLowerCase().startsWith('admin@');
      
      const clientUser: User = {
        id: isAdmin ? `user-admin-1` : `user-client-1`,
        name: isAdmin ? 'Admin' : loginEmail.split('@')[0],
        email: loginEmail,
        role: isAdmin ? 'admin' : 'client',
        companyName: isAdmin ? 'Lucent AI' : 'Client Organization',
        clientId: isAdmin ? undefined : 'client-1'
      };
      onLoginSuccess(clientUser);
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background Decorators */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-cyan-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-purple-100/40 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row relative z-10 animate-in fade-in duration-500 slide-in-from-bottom-8">
        
        {/* Left Side: Brand & Context */}
        <div className="md:w-5/12 bg-slate-900 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 z-0"></div>
          
          <div className="relative z-10">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-slate-900" />
              </div>
              <span className="font-bold text-xl tracking-tight">Lucent<span className="text-cyan-400">.ai</span></span>
            </button>
            
            <h2 className="text-3xl font-bold mb-4 leading-tight">Welcome to your Autonomous Fleet.</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Access your real-time analytics, provision new AI voice agents, and monitor your outbound lead generation campaigns.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Bot className="w-5 h-5 text-cyan-400" />
              <div className="text-sm">
                <span className="block font-medium text-white">Live Call Monitoring</span>
                <span className="text-slate-400 text-xs">View transcripts in sub-450ms real-time</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Zap className="w-5 h-5 text-cyan-400" />
              <div className="text-sm">
                <span className="block font-medium text-white">Instant Deployment</span>
                <span className="text-slate-400 text-xs">Sync numbers & prompts in seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-7/12 p-10 md:p-14 flex items-center justify-center bg-white">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Sign in to Client Portal</h3>
              <p className="text-slate-500 text-sm">Use your organization email to continue</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Work Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors sm:text-sm"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <a href="#" className="text-xs font-medium text-cyan-600 hover:text-cyan-700">Forgot?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-2 mt-4">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-blue-700">
                  <strong>Secure Portal:</strong><br />
                  All connections are end-to-end encrypted.
                </p>
              </div>

              <button
                type="submit"
                className="w-full mt-6 bg-slate-900 text-white rounded-xl py-3 px-4 font-semibold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
