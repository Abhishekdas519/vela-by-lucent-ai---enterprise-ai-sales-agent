import React from 'react';
import { 
  Check, 
  Percent,
  ArrowRight
} from 'lucide-react';
import { PRICING_PLANS } from '../data/initialData';
import { PricingPlan } from '../types';

interface CompetitivePricingProps {
  onSelectPlan: (plan: PricingPlan) => void;
}

export const CompetitivePricing: React.FC<CompetitivePricingProps> = ({
  onSelectPlan,
}) => {
  return (
    <section id="pricing-section" className="py-20 bg-slate-950 border-b border-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-xs font-semibold text-emerald-300">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guaranteed 10% Lower Than Direct Competitors</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Predictable, High-Volume Sales Pricing
          </h2>
          <p className="text-slate-300 text-base">
            No hidden setup surcharges or seat licensing fees. Deploy autonomous AI voice fleets at market-leading rates.
          </p>
        </div>

        {/* Subscription Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition relative ${
                plan.popular
                  ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-cyan-500 shadow-2xl shadow-cyan-950/60'
                  : 'bg-slate-900/50 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-extrabold shadow-md uppercase tracking-wider">
                  Most Popular for High-Growth Sales
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white font-mono">
                      ${plan.monthlyPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">/month</span>
                  </div>
                  
                  {/* Competitor Price Comparison Badge */}
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 line-through font-mono">Market: ${plan.competitorPrice}/mo</span>
                    <span className="text-emerald-400 font-semibold font-mono bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Save 10% (${plan.competitorPrice - plan.monthlyPrice}/mo)
                    </span>
                  </div>
                </div>

                {/* Included Minutes Meter */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Included High-Def Voice:</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {plan.includedMinutes.toLocaleString()} mins/mo
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Overage: <strong className="text-slate-300 font-mono">${plan.overageRatePerMinute}/min</strong>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 pt-2 text-xs text-slate-300">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                id={`btn-select-plan-${plan.id}`}
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                  plan.popular
                    ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
                }`}
              >
                <span>Deploy {plan.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
