import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Shield, 
  Building2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, ClientProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onLoginSuccess: (user: User, client?: ClientProfile) => void;
  onSignUpSuccess: (newClient: ClientProfile, newUser: User) => void;
  isPortalRoute?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
  isPortalRoute = false,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(isPortalRoute ? 'login' : initialMode);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [industry, setIndustry] = useState('Logistics & Supply Chain');
  const [password, setPassword] = useState('');
  const [meetingRequested, setMeetingRequested] = useState(false);
  const [meetingTime, setMeetingTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [createdSessionData, setCreatedSessionData] = useState<{ user: User; client?: ClientProfile } | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;

    setAuthError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your email and password.');
      }

      if (data.token) {
        localStorage.setItem('vela_token', data.token);
      }

      onLoginSuccess(data.user, data.client);
      onClose();
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workEmail.trim() || !companyName.trim()) return;

    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: workEmail,
          password,
          fullName,
          companyName,
          industry,
          phoneNumber,
          preferredTime: meetingTime,
          meetingRequested: !!meetingTime || meetingRequested
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      if (data.token) {
        localStorage.setItem('vela_token', data.token);
      }

      setCreatedSessionData({ user: data.user, client: data.client });
      setIsSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedAfterSuccess = () => {
    if (createdSessionData) {
      onSignUpSuccess(createdSessionData.client as any, createdSessionData.user);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/20 p-6 sm:p-8 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-700">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
            <span>Vela by Lucent AI Cloud Suite</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {mode === 'login' ? 'Sign In to Portal' : 'Create Your Organization Fleet'}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === 'login' 
              ? 'Access real-time telemetry, AI call logs, and minutes manager.'
              : 'Launch your autonomous B2B voice sales force in 3 minutes.'}
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="font-medium">{authError}</div>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        {!isSuccess && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => { setMode('login'); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Form Body */}
        {isSuccess ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Account Successfully Provisioned!</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                Your organization <span className="font-bold">{companyName}</span> is now registered in the database with 500 complimentary test talktime minutes.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                A confirmation has been dispatched to <span className="font-bold">{workEmail}</span>.
              </p>
            </div>
            <button
              onClick={handleProceedAfterSuccess}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Open Client Dashboard
            </button>
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Work Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-submit-login"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/10 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Credentials...
                </span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUpSubmit} className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Apex Freight Logistics"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Work Email</label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="elena@apexfreight.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Industry / Niche</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
                >
                  <option value="B2B Software & SaaS">B2B Software & SaaS</option>
                  <option value="Logistics & Freight Brokerage">Logistics & Freight Brokerage</option>
                  <option value="Commercial Solar & Clean Energy">Commercial Solar & Clean Energy</option>
                  <option value="Real Estate & Acquisitions">Real Estate & Acquisitions</option>
                  <option value="Healthcare & High-Ticket Clinics">Healthcare & High-Ticket Clinics</option>
                  <option value="Financial Services & Insurance">Financial Services & Insurance</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Strategy Call & Setup Time (Optional)</label>
              <input
                type="datetime-local"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-submit-signup"
              className="w-full py-3 mt-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Fleet in Database...
                </span>
              ) : (
                <>
                  <span>Create Account & Start Pilot</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
