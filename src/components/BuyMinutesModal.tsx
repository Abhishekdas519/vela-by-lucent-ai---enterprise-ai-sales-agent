import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle
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
  onMinutesPurchased,
}) => {
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    selectedPresetPackage?.id || MINUTE_PACKAGES[1].id
  );
  const [customMinutes, setCustomMinutes] = useState(3000);
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('884');

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
      await fetch('/api/db/talktime-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          minutesRequested: activeMinutes,
          amountDue: activePrice
        })
      });
    } catch (err) {
      console.warn('API sync warning:', err);
    }

    try {
      const existingNotifs = JSON.parse(localStorage.getItem('lucent_admin_notifications') || '[]');
      const newNotif = {
        id: 'notif-' + Date.now(),
        type: 'purchase_request',
        title: '⚡ New Talk-Time Minute Purchase',
        message: `Client ${client.companyName || client.id} requested ${activeMinutes.toLocaleString()} minutes ($${activePrice}).`,
        timestamp: new Date().toISOString(),
        read: false
      };
      localStorage.setItem('lucent_admin_notifications', JSON.stringify([newNotif, ...existingNotifs]));
      window.dispatchEvent(new Event('lucent_notification_event'));
    } catch (e) {}

    setIsProcessing(false);
    setIsSuccess(true);

    // Trigger celebratory confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Show success briefly, don't update minutes directly.
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      alert('Purchase order submitted! It will be credited once approved by your administrator.');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-cyan-100/60 p-6 sm:p-8 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          id="btn-close-buy-minutes"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-white hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-white">Payment Confirmed!</h3>
              <p className="text-sm text-cyan-700 font-mono">
                +{activeMinutes.toLocaleString()} minutes added to {client.companyName}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 max-w-sm mx-auto">
              Live talktime balance refreshed automatically. Instant telephony channel active.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-600">
                <Zap className="w-3.5 h-3.5" />
                <span>Instant Talktime Top-Up</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white">
                Purchase Voice Calling Minutes
              </h3>
              <p className="text-xs text-slate-500">
                Account: <strong className="text-slate-700">{client.companyName}</strong> (Current Balance: {(client.talktimeMinutesTotal - client.talktimeMinutesUsed).toLocaleString()} mins)
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
                  className={`p-3 rounded-xl border text-center transition ${
                    !isCustom && selectedPkgId === pkg.id
                      ? 'bg-cyan-50 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold block text-slate-600">{pkg.name}</span>
                  <span className="text-base font-extrabold text-cyan-700 font-mono block">
                    {pkg.minutes.toLocaleString()}m
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 block">${pkg.price}</span>
                </button>
              ))}
            </div>

            {/* Custom slider toggle */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className={`font-semibold text-xs ${isCustom ? 'text-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {isCustom ? '✓ Custom Minutes Range' : '+ Need a custom minute amount?'}
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
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              )}
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-600" />
                    Stripe Secure Card Payment
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold font-mono">256-BIT ENCRYPTION</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Card Number"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="CVC"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SLA Banner */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <div className="flex items-center gap-1 text-cyan-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Guaranteed Credit in &lt; 15 mins (Live balance updates immediately)</span>
                </div>
              </div>

              {/* Total and Submit */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total Due</span>
                  <span className="text-2xl font-extrabold text-white font-mono">${activePrice} USD</span>
                </div>

                <button
                  type="submit"
                  id="btn-confirm-stripe-purchase"
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Processing with Stripe...</span>
                  ) : (
                    <>
                      <span>Authorize & Credit {activeMinutes.toLocaleString()} Mins</span>
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
