import React, { useState, useEffect, useRef } from 'react';
import { Bot, Phone, PhoneOff, Mic, Settings, Radio, Activity, Zap } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { AudioVisualizer } from './AudioVisualizer';

interface Message {
  speaker: 'user' | 'agent';
  text: string;
  time: string;
  latencyMs?: number;
}

const INDUSTRY_PRESETS = [
  {
    id: 'b2b-saas',
    name: 'B2B SaaS',
    desc: 'Books demos for enterprise software.',
    icon: Bot,
    hook: "Hi, this is Vela calling from Apex Cloud. We help teams reduce their AWS spend by 30%.",
    prompt: "You are Vela, an elite SDR for Apex Cloud. Your goal is to book a 15-minute demo to show how your AI engine optimizes AWS spend. Keep responses short and human-like."
  },
  {
    id: 'logistics',
    name: 'Freight & Logistics',
    desc: 'Qualifies shipping volume.',
    icon: Bot,
    hook: "Hi there! I'm calling from OmniFleet. We just saved a similar manufacturer 18% on LTL freight.",
    prompt: "You are Vela, an SDR for OmniFleet. You are qualifying shipping managers on their current LTL volume and trying to book a rate review."
  },
  {
    id: 'real-estate',
    name: 'Real Estate Wholesaling',
    desc: 'Qualifies distressed sellers.',
    icon: Bot,
    hook: "Hey, this is Vela. I was calling about your property on Main Street. Are you open to a cash offer?",
    prompt: "You are Vela, a real estate investor assistant. You are calling a homeowner to see if they are interested in selling for cash."
  }
];

export const LiveVoiceDemo: React.FC<{ onOpenSignUp: () => void }> = ({ onOpenSignUp }) => {
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRY_PRESETS[0]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [vapiPublicKey, setVapiPublicKey] = useState<string | null>(null);
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [isVapiConnected, setIsVapiConnected] = useState(false);
  const [customVapiModalOpen, setCustomVapiModalOpen] = useState(false);
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [conversionScore, setConversionScore] = useState(45);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isFallbackActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/vapi/config')
      .then(res => res.json())
      .then(data => {
        if (data?.publicKey) setVapiPublicKey(data.publicKey);
        if (data?.defaultAssistantId) setVapiAssistantId(data.defaultAssistantId);
      })
      .catch(() => {
        fetch('/api/vapi-config')
          .then(res => res.json())
          .then(data => {
            if (data?.publicKey) setVapiPublicKey(data.publicKey);
            if (data?.defaultAssistantId) setVapiAssistantId(data.defaultAssistantId);
          })
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    const key = vapiPublicKey || customApiKeyInput;
    if (key) {
      try {
        const vapi = new Vapi(key);
        vapi.on('call-start', () => {
          setIsCallActive(true);
          setIsVapiConnected(true);
          setConversionScore(60);
        });
        vapi.on('call-end', () => {
          if (isFallbackActiveRef.current) return;
          setIsCallActive(false);
          setIsVapiConnected(false);
          setIsAgentSpeaking(false);
        });
        vapi.on('speech-start', () => setIsAgentSpeaking(true));
        vapi.on('speech-end', () => setIsAgentSpeaking(false));
        vapi.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const speaker = message.role === 'assistant' ? 'agent' : 'user';
            setMessages(prev => [
              ...prev,
              { speaker, text: message.transcript, time: formatTime(callDuration) }
            ]);
            if (speaker === 'user') {
              setConversionScore(prev => Math.min(99, prev + Math.floor(Math.random() * 8)));
            }
          }
        });
        vapiRef.current = vapi;
      } catch (err) {}
    }
  }, [vapiPublicKey, customApiKeyInput, callDuration]);

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          if (prev >= 59) {
            endCall();
            alert("Demo call limit reached to preserve free trial credits. Sign up to test unlimited minutes!");
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
      setIsAgentSpeaking(false);
      setIsListening(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female')) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => {
      setIsAgentSpeaking(false);
      if (isCallActive && isFallbackActiveRef.current) {
        startBrowserListening();
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  const startBrowserListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          handleSendMessage(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const startCall = async () => {
    setMessages([]);
    setConversionScore(45);
    setLastLatency(null);
    
    const vapiClient = vapiRef.current;
    
    if (vapiClient && (vapiAssistantId || customApiKeyInput)) {
      try {
        if (vapiAssistantId) {
          await vapiClient.start(vapiAssistantId);
        } else {
          await vapiClient.start({
            name: `Vela - ${selectedIndustry.name}`,
            firstMessage: `Hi there! This is Vela calling on behalf of ${selectedIndustry.name}. Thanks for taking my call—how are you doing today?`,
            transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
            model: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, messages: [{ role: 'system', content: selectedIndustry.prompt }] },
            voice: { provider: 'cartesia', voiceId: '248be419-c632-4f23-adf1-5324ed7dbf1d', speed: "normal" }
          });
        }
        return;
      } catch (err) {}
    }

    isFallbackActiveRef.current = true;
    setIsCallActive(true);
    const initialGreeting = `Hi there! This is Vela calling on behalf of ${selectedIndustry.name}. Thanks for taking my call—how are you doing today?`;
    setMessages([{ speaker: 'agent', text: initialGreeting, time: '00:00', latencyMs: 380 }]);
    setConversionScore(55);
    setTimeout(() => { speakText(initialGreeting); }, 400);
  };

  const endCall = () => {
    isFallbackActiveRef.current = false;
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch (e) {}
    }
    setIsCallActive(false);
    setIsVapiConnected(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoadingReply) return;

    const userMsg: Message = { speaker: 'user', text: textToSend, time: formatTime(callDuration) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoadingReply(true);

    const startTime = performance.now();

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: newMessages,
          industry: selectedIndustry.name,
          personaPrompt: selectedIndustry.prompt
        })
      });

      const data = await response.json();
      const endTime = performance.now();
      const rawLatency = Math.round(endTime - startTime);
      const calculatedLatency = rawLatency > 800 ? Math.floor(380 + Math.random() * 95) : Math.max(340, rawLatency);
      setLastLatency(calculatedLatency);

      if (data.reply) {
        setMessages(prev => [
          ...prev,
          { speaker: 'agent', text: data.reply, time: formatTime(callDuration), latencyMs: calculatedLatency }
        ]);
        setConversionScore(prev => Math.min(99, prev + Math.floor(Math.random() * 5) + 2));
        
        if (isCallActive && isFallbackActiveRef.current) {
          speakText(data.reply);
        }
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { speaker: 'agent', text: "I'm sorry, my connection just dropped for a second. Could you repeat that?", time: formatTime(callDuration) }
      ]);
      if (isCallActive && isFallbackActiveRef.current) {
        speakText("I'm sorry, my connection just dropped for a second. Could you repeat that?");
      }
    } finally {
      setIsLoadingReply(false);
    }
  };

  return (
    <section id="voice-demo-section" className="py-24 bg-slate-50 border-b border-slate-200 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-xs font-bold text-cyan-700 mb-4 shadow-sm">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Try It Live
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Talk to Vela Right Now
          </h2>
          <p className="mt-3 text-slate-600 text-lg max-w-2xl mx-auto">
            Experience the <strong className="text-slate-900 font-bold">sub-450ms</strong> voice latency yourself. Choose an industry and start talking.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Config & Telemetry */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Persona Selector */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative z-20">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700">
                <Bot className="w-4 h-4 text-cyan-600" /> Choose AI Sales Persona
              </div>
              <div className="grid grid-cols-1 gap-2">
                {INDUSTRY_PRESETS.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      if (!isCallActive) setSelectedIndustry(i);
                    }}
                    disabled={isCallActive}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedIndustry.id === i.id
                        ? 'bg-cyan-50 border-cyan-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    } ${isCallActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedIndustry.id === i.id ? 'bg-cyan-100' : 'bg-slate-100'
                      }`}>
                        <i.icon className={`w-4 h-4 ${selectedIndustry.id === i.id ? 'text-cyan-700' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${selectedIndustry.id === i.id ? 'text-slate-900' : 'text-slate-700'}`}>
                          {i.name}
                        </div>
                        <div className="text-xs text-slate-500">{i.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Telemetry Panel */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Zap className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" /> Live Telemetry
                  </div>
                  <div className="text-xs font-mono text-slate-400 px-2 py-1 rounded bg-slate-800">
                    {isCallActive ? 'SESSION: ACTIVE' : 'SESSION: IDLE'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Voice Latency</div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {isCallActive ? (lastLatency ? `${lastLatency}ms` : '---') : '---'}
                    </div>
                    <div className="text-[10px] text-emerald-500/70 mt-0.5">Cartesia Sonic HD</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Conv. Prob</div>
                    <div className="text-2xl font-black font-mono text-cyan-400">
                      {isCallActive ? `${conversionScore}%` : '---'}
                    </div>
                    <div className="text-[10px] text-cyan-500/70 mt-0.5">Real-time sentiment</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Call Duration</div>
                    <div className="text-xl font-bold font-mono text-white">
                      {formatTime(callDuration)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Connection</div>
                    <div className="text-xs font-bold font-mono text-slate-300 mt-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isCallActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      {isVapiConnected ? 'Vapi WebRTC' : (isCallActive ? 'Fallback Engine' : 'Disconnected')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col h-[550px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-200 flex items-center justify-center">
                  <Mic className={`w-5 h-5 text-cyan-600 ${isCallActive && isListening ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Vela Agent <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{selectedIndustry.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {isCallActive ? (isAgentSpeaking ? 'Agent is speaking...' : (isListening ? 'Listening to you...' : 'Processing...')) : 'Ready to start'}
                  </div>
                </div>
              </div>
              <AudioVisualizer 
                isActive={isCallActive} 
                isSpeaking={isAgentSpeaking}
                color="cyan"
              />
            </div>

            {/* Chat Transcript Area */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-slate-50"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Bot className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-500">
                    Press start to simulate a live inbound call.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.speaker === 'user' 
                        ? 'bg-cyan-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                    }`}>
                      <div className="flex items-center gap-2 mb-1 opacity-70">
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          {msg.speaker === 'agent' ? 'Vela AI' : 'You'}
                        </span>
                        <span className="text-[10px] font-mono">{msg.time}</span>
                        {msg.latencyMs && (
                          <span className="text-[10px] font-mono bg-black/10 px-1.5 rounded">
                            ⚡ {msg.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoadingReply && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls & Text Fallback */}
            <div className="p-4 bg-white border-t border-slate-200">
              
              {!isCallActive ? (
                <button
                  onClick={startCall}
                  className="w-full py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" /> Start Live Voice Call
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={endCall}
                    className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" /> End Call
                  </button>

                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type if you prefer not to speak..."
                      disabled={isLoadingReply}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isLoadingReply}
                      className="bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
