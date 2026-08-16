import React from 'react';
import { ShieldCheck, Lock, Database, Key, CheckCircle, Server } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const SECURITY_PILLARS = [
    {
      icon: Lock,
      title: 'End-to-End TLS 1.3 Encryption',
      desc: 'All voice streams, CSV lead uploads, and telephony payloads are encrypted in transit using industry-standard TLS 1.3.'
    },
    {
      icon: Database,
      title: 'Isolated Client Data Silos',
      desc: 'Each organization operates in dedicated, isolated database partitions with strict JWT cryptographic row-level access control.'
    },
    {
      icon: Key,
      title: 'Bcrypt-Hashed Authentication',
      desc: 'Zero plaintext passwords. All administrative and client credentials use salted 10-round bcrypt cryptography with HMAC SHA-256 tokens.'
    },
    {
      icon: Server,
      title: 'SOC 2 Type II Architecture',
      desc: 'Hosted across hardened, enterprise-grade cloud facilities with automated health monitoring and zero shared memory state.'
    },
    {
      icon: ShieldCheck,
      title: 'Zero-Knowledge Lead Protection',
      desc: 'Your uploaded B2B lead lists, contact phone numbers, and call transcripts belong 100% to you and are never shared or trained on.'
    },
    {
      icon: CheckCircle,
      title: 'Regulatory & TCPA Compliance',
      desc: 'Automated DNC filtering, customizable calling hours by prospect timezone, and instant opt-out webhook dispatching.'
    }
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Enterprise-Grade Trust & Compliance
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for High-Growth Sales Teams with Stringent Security
          </h2>
          <p className="mt-3 text-slate-600 text-base leading-relaxed">
            Every lead list, telephony route, and voice transcript is protected by bank-level data isolation and cryptographic session security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {SECURITY_PILLARS.map((pillar, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                <pillar.icon className="w-5 h-5 text-cyan-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{pillar.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
