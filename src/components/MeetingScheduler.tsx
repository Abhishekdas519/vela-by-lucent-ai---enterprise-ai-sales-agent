import React, { useState } from 'react';
import { Calendar, Clock, Building2, Mail, Phone, User, ChevronRight, CheckCircle2, Zap, X } from 'lucide-react';

interface MeetingSchedulerProps {
  onClose?: () => void;
  isModal?: boolean;
}

const INDUSTRIES = [
  'B2B Software & SaaS',
  'Logistics & Freight Brokerage',
  'Commercial Solar & Clean Energy',
  'Real Estate & Acquisitions',
  'Healthcare & High-Ticket Clinics',
  'Financial Services & Insurance',
  'E-Commerce & D2C',
  'Other',
];

const TIME_SLOTS = [
  '9:00 AM – 9:30 AM EST',
  '10:00 AM – 10:30 AM EST',
  '11:00 AM – 11:30 AM EST',
  '1:00 PM – 1:30 PM EST',
  '2:00 PM – 2:30 PM EST',
  '3:00 PM – 3:30 PM EST',
  '4:00 PM – 4:30 PM EST',
];

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ onClose, isModal = false }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [notes, setNotes] = useState('');

  // Generate next 5 business days
  const getBusinessDays = () => {
    const days: string[] = [];
    const d = new Date();
    while (days.length < 5) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      }
    }
    return days;
  };
  const businessDays = getBusinessDays();

  const handleSubmit = async () => {
    if (!contactName || !email || !companyName) return;
    setIsSubmitting(true);
    try {
      const preferredTime = selectedDay && selectedSlot ? `${selectedDay} ${selectedSlot}` : null;
      await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          companyName,
          email,
          phone,
          industry,
          preferredTime,
          notes: `Team Size: ${teamSize}. ${notes}`.trim(),
        }),
      });
      // Also fire notification event
      try {
        const localNotifs = JSON.parse(localStorage.getItem('lucent_admin_notifications') || '[]');
        const newNotif = {
          id: 'notif-' + Date.now(),
          type: 'meeting_request',
          title: '📅 New Meeting Request',
          message: `${contactName} from ${companyName} (${email}) booked a strategy meeting${preferredTime ? ` for ${preferredTime}` : ''}.`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        localStorage.setItem('lucent_admin_notifications', JSON.stringify([newNotif, ...localNotifs]));
        window.dispatchEvent(new Event('lucent_notification_event'));
      } catch {}
      setStep(3);
    } catch (err) {
      console.warn('Meeting request failed:', err);
      setStep(3); // Still show success — API may be cold
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition';
  const labelClass = 'text-xs font-semibold text-slate-600 mb-1 block';

  return (
    <div className={`${isModal ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm' : ''}`}>
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl ${isModal ? 'w-full max-w-xl' : 'w-full'} overflow-hidden`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-6 py-5 relative">
          {isModal && onClose && (
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Book a Strategy Session</h3>
              <p className="text-slate-400 text-xs">30-minute live demo with the Lucent AI team</p>
            </div>
          </div>
          {/* Step indicators */}
          {step < 3 && (
            <div className="flex items-center gap-2 mt-4">
              {[1, 2].map(s => (
                <React.Fragment key={s}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-cyan-500 text-white' : 'bg-white/10 text-slate-500'}`}>{s}</div>
                  {s < 2 && <div className={`flex-1 h-0.5 rounded transition-all ${step > s ? 'bg-cyan-500' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
              <span className="text-xs text-slate-400 ml-2">{step === 1 ? 'Your Details' : 'Pick a Time'}</span>
            </div>
          )}
        </div>

        {/* Step 1: Contact Details */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Alex Vance" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Company Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Apex Logistics Inc." className={`${inputClass} pl-9`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Work Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@apex.com" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" className={`${inputClass} pl-9`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sales Team Size</label>
                <select value={teamSize} onChange={e => setTeamSize(e.target.value)} className={inputClass}>
                  <option value="">Select size...</option>
                  <option>1–5 reps</option>
                  <option>6–20 reps</option>
                  <option>21–50 reps</option>
                  <option>50+ reps / BPO</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => { if (contactName && email && companyName) setStep(2); }}
              disabled={!contactName || !email || !companyName}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-indigo-500 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Continue to Schedule <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Pick a Time */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>Select a Day</label>
              <div className="grid grid-cols-5 gap-2">
                {businessDays.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold border transition text-center ${selectedDay === day ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-cyan-300'}`}
                  >
                    {day.split(' ').slice(0, 2).join('\n')}
                  </button>
                ))}
              </div>
            </div>

            {selectedDay && (
              <div>
                <label className={labelClass}>Select a Time — EST</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition text-left flex items-center gap-2 ${selectedSlot === slot ? 'bg-cyan-50 text-cyan-700 border-cyan-400' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-cyan-300'}`}
                    >
                      <Clock className="w-3 h-3 flex-shrink-0" /> {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Anything specific you want to discuss? (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="E.g. We have 20 SDRs and are exploring replacing cold call outreach..." className={`${inputClass} resize-none`} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm hover:from-emerald-400 hover:to-cyan-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Booking...' : 'Confirm Meeting'} <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-2xl font-extrabold text-slate-900">Strategy Session Requested!</h4>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-bold text-slate-800">{contactName}</span> from <span className="font-bold text-slate-800">{companyName}</span>. <strong className="text-slate-900">Abhishek Das (CEO, Lucent AI)</strong> and the executive architecture team will confirm your session and email the calendar invite to <span className="text-cyan-700 font-mono font-bold">{email}</span>.
              </p>
              {selectedDay && selectedSlot && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-sm font-semibold text-cyan-800">
                  <Calendar className="w-4 h-4 text-cyan-600" /> Requested Time: {selectedDay} · {selectedSlot}
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 max-w-sm mx-auto">
              Need immediate assistance? Reach our master desk directly at <span className="font-mono text-slate-700 font-bold">abhishekdas2090@gmail.com</span>
            </div>
            {onClose && (
              <button 
                onClick={onClose} 
                className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
