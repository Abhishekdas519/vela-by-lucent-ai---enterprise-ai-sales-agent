import React, { useState, useEffect } from 'react';
import { Phone, Radio, Activity } from 'lucide-react';

const INDUSTRIES = ['Logistics', 'SaaS', 'Solar', 'Real Estate', 'Healthcare', 'Finance'];
const COMPANIES = ['Apex Cloud', 'NovaBridge', 'StellarQ', 'PeakRevenue', 'OmniFleet', 'SolarForce', 'FrontierMed', 'ClearCapital', 'VastTech', 'AlphaEdge'];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface ActiveCall {
  id: string;
  company: string;
  industry: string;
  duration: number;
  sentiment: 'positive' | 'neutral';
}

export const LiveCallTicker: React.FC = () => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [todayCount, setTodayCount] = useState(randomBetween(847, 1240));
  const [callsThisHour, setCallsThisHour] = useState(randomBetween(43, 127));

  // Initialize with 3–5 fake active calls
  useEffect(() => {
    const initial: ActiveCall[] = Array.from({ length: randomBetween(3, 5) }, (_, i) => ({
      id: `call-${i}`,
      company: COMPANIES[randomBetween(0, COMPANIES.length - 1)],
      industry: INDUSTRIES[randomBetween(0, INDUSTRIES.length - 1)],
      duration: randomBetween(12, 185),
      sentiment: Math.random() > 0.3 ? 'positive' : 'neutral',
    }));
    setActiveCalls(initial);
  }, []);

  // Tick durations every second
  useEffect(() => {
    const tick = setInterval(() => {
      setActiveCalls(prev =>
        prev.map(c => ({ ...c, duration: c.duration + 1 }))
      );
      // Occasionally update today's count
      if (Math.random() < 0.1) {
        setTodayCount(p => p + randomBetween(1, 3));
        setCallsThisHour(p => p + 1);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Randomly add / remove calls to simulate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCalls(prev => {
        let updated = [...prev];
        // Remove old calls
        if (updated.length > 0 && Math.random() < 0.4) {
          updated = updated.filter((_, i) => i !== 0);
        }
        // Add new call
        if (updated.length < 7 && Math.random() < 0.5) {
          updated.push({
            id: `call-${Date.now()}`,
            company: COMPANIES[randomBetween(0, COMPANIES.length - 1)],
            industry: INDUSTRIES[randomBetween(0, INDUSTRIES.length - 1)],
            duration: randomBetween(3, 18),
            sentiment: Math.random() > 0.3 ? 'positive' : 'neutral',
          });
        }
        return updated;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200 py-3 px-4 overflow-hidden relative">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Left badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="text-xs font-mono font-bold text-emerald-700 whitespace-nowrap">
            {activeCalls.length} LIVE CALLS
          </span>
          <span className="hidden sm:block text-xs text-slate-300 font-mono">•</span>
          <span className="hidden sm:block text-xs text-slate-500 font-mono whitespace-nowrap">
            {todayCount.toLocaleString()} dials today
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-300 flex-shrink-0" />

        {/* Scrolling call ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center gap-5 animate-[slide_20s_linear_infinite] whitespace-nowrap">
            {activeCalls.map(call => (
              <div key={call.id} className="flex items-center gap-2 text-xs flex-shrink-0">
                <Phone className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                <span className="text-slate-900 font-medium">{call.company}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{call.industry}</span>
                <span className="text-slate-300">•</span>
                <span className={`font-mono font-semibold ${call.sentiment === 'positive' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatDuration(call.duration)}
                </span>
              </div>
            ))}
            {/* Repeat for seamless loop */}
            {activeCalls.map(call => (
              <div key={`dup-${call.id}`} className="flex items-center gap-2 text-xs flex-shrink-0">
                <Phone className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                <span className="text-slate-900 font-medium">{call.company}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{call.industry}</span>
                <span className="text-slate-300">•</span>
                <span className={`font-mono font-semibold ${call.sentiment === 'positive' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatDuration(call.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right stat */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span className="text-xs font-mono text-slate-500">
            <span className="text-cyan-700 font-bold">{callsThisHour}</span> this hour
          </span>
        </div>
      </div>

      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
