import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "What is Vela by Lucent AI?",
    answer: "Vela by Lucent AI is an autonomous, enterprise-grade B2B AI voice sales agent that replaces manual outbound call center seats. Vela dials qualified contact lists, engages prospects in real-time conversational phone calls with sub-450ms latency, answers objections naturally, and automatically schedules meetings on your team's calendar."
  },
  {
    question: "How does Vela handle interruptions and live sales objections?",
    answer: "Vela features instant interruption handling (barge-in capability). When a prospect speaks mid-sentence, Vela immediately ceases speech, listens actively to the objection (such as 'I'm busy', 'Too expensive', or 'We already have a solution'), and delivers concise, human-grade conversational responses tailored to your custom value proposition."
  },
  {
    question: "How do I upload leads and launch an outbound campaign?",
    answer: "Simply log into your verified Client Portal, upload your contact CSV list with names, company names, and phone numbers, and configure your target calling window. Vela's autonomous engine will distribute dials across your dedicated concurrent lines and log real-time transcripts, sentiment scores, and follow-up drafts directly to your dashboard."
  },
  {
    question: "How does Vela ensure data security and privacy?",
    answer: "Every organization on Vela operates in an isolated cryptographic data silo backed by Supabase PostgreSQL and TLS 1.3 encryption. Your contact lists, proprietary system prompts, and customer call recordings are strictly protected with role-based JWT authentication and never shared across clients or used for public training."
  },
  {
    question: "How does pricing compare to hiring human SDRs or overseas call centers?",
    answer: "Vela delivers guaranteed 10% lower pricing than legacy solutions and saves up to 80% compared to traditional SDR hiring and overseas BPO seats. There are zero setup surcharges, seat license fees, or equipment overhead."
  },
  {
    question: "How can I get started with Vela by Lucent AI?",
    answer: "Click 'Book Your Strategy Call' on our homepage to schedule an executive architecture consultation with Abhishek Das (CEO, Lucent AI). We will configure your industry persona, provision your dedicated Twilio virtual lines, and deploy your live portal."
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section id="faq-section" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-700">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-600" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Know About Vela
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Get clear answers about autonomous outbound dialing, telephony integration, data security, and implementation timelines.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen ? 'bg-white border-cyan-300 shadow-md ring-1 ring-cyan-200' : 'bg-white/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="font-bold text-slate-900 text-base sm:text-lg">
                    {faq.question}
                  </span>
                  <div className={`p-1.5 rounded-full transition-transform duration-200 ${isOpen ? 'bg-cyan-50 text-cyan-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
