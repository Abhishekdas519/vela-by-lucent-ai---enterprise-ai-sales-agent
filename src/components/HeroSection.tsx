import React, { useState, useEffect } from 'react';
import { PhoneCall, CheckCircle2, ArrowRight, Bot, Activity, Calendar, Play, Clock, Zap } from 'lucide-react';

interface HeroSectionProps {
  onTryDemo: () => void;
  onOpenSignUp: () => void;
  onOpenScheduler: () => void;
}

const STATS = [
  { value: '1.2M+', label: 'Calls Executed', color: 'text-cyan-600' },
  { value: '< 450ms', label: 'Voice Latency', color: 'text-emerald-600' },
  { value: '89%', label: 'Cost Reduction', color: 'text-amber-600' },
  { value: '3.4×', label: 'Conversion Lift', color: 'text-purple-600' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onTryDemo,
  onOpenSignUp,
  onOpenScheduler,
}) => {
  const [liveCount, setLiveCount] = useState(1247);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(c => c + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-slate-50 border-b border-slate-200/80">
      {/* Background atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-400/10 blur-[160px] rounded-full" />
        <div className="absolute top-1/2 right-0 w-[600px] h-[500px] bg-indigo-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-purple-500/10 blur-[120px] rounded-full" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-16 pb-20 md:pt-24 md:pb-28">

        {/* Top announcement badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-600">Vela 3.5 Engine Live</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-600">Sub-450ms Latency · Cartesia Sonic HD · GPT-4o Mini</span>
          </div>
        </div>

        {/* Main two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left Column: Copy & CTAs */}
          <div className="space-y-7">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-bold text-cyan-700">
                <Bot className="w-3.5 h-3.5 text-cyan-600" />
                <span>Vela by Lucent AI — Enterprise Autonomous Voice Force</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Replace Your Entire
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600">
                  Call Center Fleet
                </span>
                <br />
                with Vela by Lucent AI.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                <strong>Vela by Lucent AI</strong> autonomously dials thousands of qualified B2B leads daily with <strong className="text-slate-900 font-bold">human-grade sub-450ms voice latency</strong>, resolves objections effortlessly, and books qualified meetings directly into your calendar. Guaranteed <strong className="text-cyan-700 font-bold">10% lower pricing</strong> than manual call centers.
              </p>
            </div>

            {/* Value checklist */}
            <div className="space-y-2.5">
              {[
                'Upload a CSV and start dialing in under 3 minutes',
                'Beats Retell, VAPI solo setups, and traditional BPOs',
                'Real-time transcript, sentiment & conversion scoring',
                'Automated 12-hour follow-up pipeline per call',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                id="btn-hero-book-strategy"
                onClick={onOpenScheduler}
                className="group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-cyan-100 group-hover:scale-110 transition-transform" />
                <span>Book Your Strategy Call</span>
                <ArrowRight className="w-4 h-4 text-cyan-200" />
              </button>

              <button
                id="btn-hero-portal-login"
                onClick={onOpenSignUp}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-cyan-600" />
                Client Portal Login
              </button>
            </div>

            {/* Social proof counter */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex -space-x-2">
                {['AC', 'NB', 'SF', 'CC', 'VT'].map((abbr, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-sm">
                    {abbr}
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                <span className="text-slate-900 font-bold">{liveCount.toLocaleString()}</span> calls executed today across all clients
              </div>
            </div>
          </div>

          {/* Right Column: Live Call Intelligence Panel */}
          <div className="space-y-4">

            {/* Main Terminal Window */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <Bot className="w-48 h-48" />
              </div>
              
              <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Call Intelligence
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center border border-cyan-100 shadow-sm">
                      <PhoneCall className="w-4.5 h-4.5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Calling: VP of Operations</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        +1 (415) 890-4321
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ml-1">Outbound</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</div>
                    <div className="font-mono text-cyan-600 font-bold">04:12</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-600" />
                    Real-time Transcript
                  </div>
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex gap-2">
                      <span className="font-bold text-cyan-600 shrink-0">Vela:</span>
                      <span className="text-slate-700">Hi John, it's Vela with Apex. I'm calling because we just helped a similar logistics firm cut freight spend by 28%. Have 30 seconds?</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-900 shrink-0">Prospect:</span>
                      <span className="text-slate-600">I'm busy right now, and we already have a broker.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-cyan-600 shrink-0">Vela:</span>
                      <span className="text-slate-700">I understand you're busy. Most of our clients kept their brokers but use our autonomous pricing engine to double-check rates. If I send an email with the case study, would you be open to a 10-minute review next Tuesday?</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between shadow-sm">
                    <span className="text-[11px] font-bold text-emerald-700">Objection Handled</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between shadow-sm">
                    <span className="text-[11px] font-bold text-indigo-700">Meeting Probability</span>
                    <span className="font-mono text-sm font-black text-indigo-600">89%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Cards Bottom */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATS.map((stat, i) => (
                <div key={i} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-0.5 transition-transform">
                  <div className={`text-lg font-black font-mono ${stat.color}`}>{stat.value}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 text-center hover:border-slate-300 transition-colors">
              <div className={`text-3xl font-extrabold font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
