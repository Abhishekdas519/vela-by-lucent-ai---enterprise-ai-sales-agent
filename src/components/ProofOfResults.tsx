import React, { useState } from 'react';
import { Target, BarChart3, TrendingUp, DollarSign, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

export const ProofOfResults: React.FC<{ onOpenSignUp: () => void }> = ({ onOpenSignUp }) => {
  const [repsCount, setRepsCount] = useState(5);
  const [hourlyWage, setHourlyWage] = useState(25);
  const [callVolume, setCallVolume] = useState(2500);

  // Math for ROI Calculator
  const humanMonthlyCost = repsCount * hourlyWage * 160; // 160 hours/month
  const humanAnnualCost = humanMonthlyCost * 12;

  const estimatedVelaMinutes = Math.round(callVolume * 0.25 * 2.2);
  const velaMonthlyCost = 629 + (Math.max(0, estimatedVelaMinutes - 5000) * 0.10);
  const velaAnnualCost = velaMonthlyCost * 12;

  const annualSavings = Math.max(0, humanAnnualCost - velaAnnualCost);
  const savingsPercent = humanAnnualCost > 0 ? Math.round((annualSavings / humanAnnualCost) * 100) : 0;

  return (
    <section id="roi-section" className="py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: ROI Calculator */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-12 shadow-xl">
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-600 text-xs font-bold uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  Cost Analysis
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Calculate Your Annual Savings
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Current Call Center Reps / SDRs:</span>
                  <span className="text-cyan-600 font-mono font-bold text-sm">{repsCount} Reps</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={repsCount}
                  onChange={(e) => setRepsCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Average Rep Hourly Wage:</span>
                  <span className="text-cyan-600 font-mono font-bold text-sm">${hourlyWage}/hour</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm font-semibold text-slate-700">
                  <span>Leads to dial per month</span>
                  <span className="text-cyan-600 font-mono text-lg">{callVolume.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={callVolume}
                  onChange={(e) => setCallVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-sm font-semibold text-slate-500 mb-2">Traditional Call Center Cost</div>
                  <div className="text-3xl font-mono text-slate-400 line-through decoration-rose-400/50 decoration-2">
                    ${Math.round(humanAnnualCost).toLocaleString()}
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-cyan-50 border border-cyan-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-[0.05]">
                    <Zap className="w-16 h-16 text-cyan-600" />
                  </div>
                  <div className="text-sm font-bold text-cyan-800 mb-2">Vela AI Cost</div>
                  <div className="text-4xl font-black font-mono text-cyan-600">
                    ${Math.round(velaAnnualCost).toLocaleString()}
                  </div>
                  <div className="mt-3 inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    {savingsPercent}% Savings
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Social Proof & Metrics */}
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">The numbers speak for themselves.</h3>
              <p className="mt-4 text-slate-600">
                Don't just take our word for it. Here is the aggregated performance across our enterprise fleet this month.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-black font-mono text-slate-900 mb-1">3.4×</div>
                <div className="text-sm font-semibold text-slate-600">Higher contact rate than human reps</div>
              </div>
              
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-black font-mono text-slate-900 mb-1">14%</div>
                <div className="text-sm font-semibold text-slate-600">Average conversion to booked meeting</div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button 
                onClick={onOpenSignUp}
                className="group flex items-center gap-2 text-cyan-600 font-bold hover:text-cyan-700 transition-colors"
              >
                Start deploying your agent today
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
