import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle,
  FileCheck,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClientProfile, MinutePackage } from '../types';
import { MINUTE_PACKAGES } from '../data/initialData';

interface BuyMinutesModalProps {
  isOpen: boolean;
  client: ClientProfile | null;
  selectedPresetPackage?: MinutePackage | null;
  onClose: () => void;
  onMinutesPurchased: (addedMinutes: number) => void;
}

export const BuyMinutesModal: React.FC<BuyMinutesModalProps> = ({
  isOpen,
  client,
  selectedPresetPackage,
  onClose,
}) => {
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    selectedPresetPackage?.id || MINUTE_PACKAGES[1].id
  );
  const [customMinutes, setCustomMinutes] = useState(3000);
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen || !client) return null;

  const currentPkg = MINUTE_PACKAGES.find(p => p.id === selectedPkgId) || MINUTE_PACKAGES[1];
  const activeMinutes = isCustom ? customMinutes : currentPkg.minutes;
  const activePrice = isCustom 
    ? Math.round(customMinutes * 0.11) 
    : currentPkg.price;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('vela_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/db/talktime-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId: client.id,
          minutesRequested: activeMinutes,
          amountDue: activePrice,
          notes: notes.trim() || undefined
        })
      });

      // Broadcast notification event so admin views update in real time
      window.dispatchEvent(new Event('lucent_notification_event'));
    } catch (err) {
      console.warn('API sync warning:', err);
    }

    setIsProcessing(false);
    setIsSuccess(true);

    // Confetti celebration
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 relative overflow-hidden text-slate-900">
        
        {/* Close Button */}
        <button
          id="btn-close-buy-minutes"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-slate-900">Top-Up Request Submitted!</h3>
              <p className="text-sm text-cyan-700 font-mono font-bold">
                +{activeMinutes.toLocaleString()} minutes (${activePrice} USD)
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Pending CEO Review
              </div>
              <p className="text-slate-500 leading-relaxed">
                Your order has been routed to <strong>Abhishek Das (CEO, Lucent AI)</strong>. Minutes will be credited to <strong>{client.companyName}</strong> upon invoice confirmation.
              </p>
            </div>
            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-700">
                <Zap className="w-3.5 h-3.5 text-cyan-600" />
                <span>Talk-Time Refill Request</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Request Calling Minutes
              </h3>
              <p className="text-xs text-slate-500">
                Organization: <strong className="text-slate-700">{client.companyName}</strong> (Current Balance: {(client.talktimeMinutesTotal - client.talktimeMinutesUsed).toLocaleString()} mins)
              </p>
            </div>

            {/* Package Selector */}
            <div className="grid grid-cols-3 gap-2.5">
              {MINUTE_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  id={`btn-modal-pkg-${pkg.id}`}
                  onClick={() => {
                    setSelectedPkgId(pkg.id);
                    setIsCustom(false);
                  }}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    !isCustom && selectedPkgId === pkg.id
                      ? 'bg-cyan-50/80 border-cyan-400 text-slate-900 shadow-sm ring-1 ring-cyan-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold block text-slate-600">{pkg.name}</span>
                  <span className="text-base font-extrabold text-cyan-700 font-mono block">
                    {pkg.minutes.toLocaleString()}m
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 block">${pkg.price}</span>
                </button>
              ))}
            </div>

            {/* Custom slider toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className={`font-semibold text-xs cursor-pointer ${isCustom ? 'text-cyan-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {isCustom ? '✓ Custom Minutes Range' : '+ Need a custom minute volume?'}
                </button>
                {isCustom && (
                  <span className="font-mono font-bold text-cyan-700">
                    {customMinutes.toLocaleString()} mins (${Math.round(customMinutes * 0.11)})
                  </span>
                )}
              </div>

              {isCustom && (
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="500"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                />
              )}
            </div>

            {/* Form Details */}
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Purchase Order Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Q3 Outbound Campaign Refill / PO #4892"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* SLA Notice */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100">
                <div className="flex items-center gap-1.5 text-cyan-800">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                  <span>Reviewed & credited directly by CEO within 24 hours</span>
                </div>
              </div>

              {/* Total and Submit */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Due</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">${activePrice} USD</span>
                </div>

                <button
                  type="submit"
                  id="btn-confirm-talktime-purchase"
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Submitting Order...</span>
                  ) : (
                    <>
                      <span>Submit Topup Request ({activeMinutes.toLocaleString()} Mins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};
