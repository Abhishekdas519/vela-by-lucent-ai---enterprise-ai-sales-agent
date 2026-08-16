import React from 'react';
import { Mail, MessageSquare, Linkedin, Clock, CheckCircle2, Rocket, MessageCircle, ArrowRight } from 'lucide-react';

const CHANNELS = [
  {
    title: 'WhatsApp Autopilot',
    desc: 'Instantly follow up via WhatsApp after a call drops or goes to voicemail. High delivery rates.',
    icon: MessageSquare,
    color: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    timeline: 'Coming Q3 2025',
    features: ['Instant follow-ups', 'Rich media support', 'Automated booking links']
  },
  {
    title: 'Cold Email Sequences',
    desc: 'Generative AI email drafting based on call transcripts. Sends highly personalized case studies automatically.',
    icon: Mail,
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
    timeline: 'Coming Q4 2025',
    features: ['Transcript-based drafting', 'Automated follow-up', 'A/B testing']
  },
  {
    title: 'LinkedIn Outreach',
    desc: 'Vela will find the prospect on LinkedIn, send a connection request, and drop a relevant voice note.',
    icon: Linkedin,
    color: 'bg-purple-100',
    iconColor: 'text-purple-600',
    timeline: 'Coming Q1 2026',
    features: ['Multi-touch sequences', 'Automated connection requests', 'Personalization']
  },
];

export const ComingSoonChannels: React.FC = () => {
  return (
    <section className="py-24 bg-white border-b border-slate-200 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-700 mb-4">
            <Rocket className="w-3.5 h-3.5" /> Roadmap
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Vela Is Going <span className="text-cyan-600">Omnichannel</span>
          </h2>
          <p className="text-slate-600 text-base max-w-2xl mx-auto mt-4">
            Voice calls are just the beginning. Vela is expanding to every high-intent outbound channel your prospects use daily.
          </p>
        </div>

        {/* Channel Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {CHANNELS.map((channel, i) => (
            <div 
              key={i} 
              className="group relative rounded-3xl border border-slate-200 bg-slate-50 p-8 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-6 right-6 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                {channel.timeline}
              </div>

              {/* Icon Container */}
              <div className={`w-14 h-14 rounded-2xl ${channel.color} flex items-center justify-center mb-6 shadow-sm`}>
                <channel.icon className={`w-7 h-7 ${channel.iconColor}`} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3">{channel.title}</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                {channel.desc}
              </p>

              {/* Feature List */}
              <ul className="space-y-2.5">
                {channel.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* WhatsApp Highlight Row */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-bold text-slate-900">Are you an enterprise WhatsApp business user?</h4>
            <p className="text-sm text-slate-600 mt-1">We are opening an exclusive beta for early API access.</p>
          </div>
          <button className="whitespace-nowrap px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all active:scale-95">
            Join Waitlist
          </button>
        </div>

      </div>
    </section>
  );
};
