import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Brain, 
  Heart, 
  Dna, 
  FlaskConical, 
  Scale, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Send,
  Loader2,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FileDown,
  Printer,
  Grid,
  X
} from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  LineChart,
  Line,
  Cell
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { 
  AgentRole, 
  AGENTS, 
  DiscussionPoint, 
  getAgentResponse, 
  getChairmanSynthesis 
} from './services/councilService';

// Types
interface CouncilState {
  topic: string;
  history: DiscussionPoint[];
  isDeliberating: boolean;
  currentAgent: AgentRole | null;
  synthesis: any | null;
  currentStream?: string;
}

export default function App() {
  const [topic, setTopic] = useLocalStorage("medcouncil_topic", "");
  const [session, setSession] = useLocalStorage<CouncilState>("medcouncil_session", {
    topic: "",
    history: [],
    isDeliberating: false,
    currentAgent: null,
    synthesis: null
  });
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = React.useState<string>(AgentRole.DIAGNOSTICIAN);
  const [isHeatmapOpen, setIsHeatmapOpen] = React.useState(false);

  const exportToJSON = () => {
    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `council-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Mock Disagreement Data for Heatmap
  const heatmapData = [
    { x: 'Dr. Diagnosis', y: 'Risk', score: 85, caseType: 'Oncology' },
    { x: 'Dr. Diagnosis', y: 'Treatment', score: 30, caseType: 'Cardiology' },
    { x: 'Dr. Diagnosis', y: 'Evidence', score: 60, caseType: 'Neurology' },
    { x: 'Risk', y: 'Treatment', score: 95, caseType: 'Pharmacology' },
    { x: 'Risk', y: 'Evidence', score: 40, caseType: 'Oncology' },
    { x: 'Treatment', y: 'Evidence', score: 75, caseType: 'Neurology' }
  ];

  const startDeliberation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || session.isDeliberating) return;

    const currentTopic = input;
    setTopic(currentTopic);
    setActiveTab(AgentRole.DIAGNOSTICIAN);
    setSession({
      topic: currentTopic,
      history: [],
      isDeliberating: true,
      currentAgent: null,
      synthesis: null,
      currentStream: ""
    });
    setInput("");

    // Sequence of deliberation
    const specialistOrder = [
      AgentRole.DIAGNOSTICIAN,
      AgentRole.RISK_EVALUATOR,
      AgentRole.TREATMENT_PLANNER,
      AgentRole.EVIDENCE_REVIEWER
    ];

    let currentHistory: DiscussionPoint[] = [];

    for (const role of specialistOrder) {
      setSession(prev => ({ ...prev, currentAgent: role, currentStream: "" }));
      try {
        const res = await getAgentResponse(role, currentTopic, currentHistory, (chunk) => {
          setSession(prev => ({ ...prev, currentStream: prev.currentStream + chunk }));
        });
        const newPoint: DiscussionPoint = {
          id: Math.random().toString(36).substr(2, 9),
          agentRole: role,
          summary: res.summary,
          content: res.content,
          thinking: res.thinking,
          metrics: res.metrics,
          timestamp: Date.now()
        };
        currentHistory = [...currentHistory, newPoint];
        setSession(prev => ({ 
          ...prev, 
          history: currentHistory 
        }));
      } catch (err) {
        console.error("Agent failed", err);
      }
    }

    // Chairman synthesized final
    setSession(prev => ({ ...prev, currentAgent: AgentRole.CHAIRMAN, currentStream: "" }));
    try {
      const synRes = await getChairmanSynthesis(currentTopic, currentHistory, (chunk) => {
        setSession(prev => ({ ...prev, currentStream: (prev.currentStream || "") + chunk }));
      });
      setSession(prev => ({ 
        ...prev, 
        synthesis: synRes,
        isDeliberating: false,
        currentAgent: null,
        currentStream: ""
      }));
      setActiveTab('Final Decision');
    } catch (err) {
      console.error("Chairman failed", err);
      setSession(prev => ({ ...prev, isDeliberating: false, currentAgent: null }));
    }
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.history, session.currentAgent]);

  const getAgentIcon = (role: AgentRole) => {
    switch (role) {
      case AgentRole.DIAGNOSTICIAN: return <Dna className="w-5 h-5 text-blue-500" />;
      case AgentRole.RISK_EVALUATOR: return <Heart className="w-5 h-5 text-red-500" />;
      case AgentRole.TREATMENT_PLANNER: return <Brain className="w-5 h-5 text-purple-500" />;
      case AgentRole.EVIDENCE_REVIEWER: return <FlaskConical className="w-5 h-5 text-emerald-500" />;
      case AgentRole.CHAIRMAN: return <Scale className="w-5 h-5 text-amber-500" />;
    }
  };

  const chartData = session.history.map(h => ({
    name: AGENTS[h.agentRole].name,
    confidence: h.metrics?.confidence || 0,
    evidence: h.metrics?.evidenceStrength || 0,
    urgency: h.metrics?.urgency || 0
  }));

  const renderTabContent = () => {
    if (!session.topic && !session.isDeliberating) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-12">
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-semibold uppercase tracking-wider mb-4">Council Chamber Silent</span>
          <p className="text-sm text-slate-500 mt-2">Submit a clinical case study or medical query to begin.</p>
        </div>
      );
    }

    if (activeTab === 'Final Decision') {
      if (!session.synthesis) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p className="text-sm font-medium">Awaiting specialized analyses before synthesis...</p>
            {session.currentAgent === AgentRole.CHAIRMAN && session.currentStream && (
              <div className="mt-8 p-4 w-full max-w-3xl text-xs font-mono bg-slate-900 text-green-400 rounded-lg overflow-x-hidden whitespace-pre-wrap whitespace-break-spaces text-left opacity-80 h-64 overflow-y-auto custom-scrollbar">
                {session.currentStream}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <h2 className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Final Actionable Recommendation</h2>
            <div className="text-slate-900 text-2xl leading-relaxed font-bold tracking-tight">
              {session.synthesis.decision}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Scale className="w-3 h-3 text-blue-500" /> Synthesis & Rationale
              </h2>
              <div className="text-slate-700 text-sm leading-relaxed">
                {session.synthesis.synthesis}
              </div>
            </div>
            
            {session.synthesis.actionPlan && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-emerald-500" /> Action Plan
                </h2>
                <ul className="space-y-3">
                  {session.synthesis.actionPlan.map((step: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700 items-start">
                      <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i+1}</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflicts & Safety in Final Tab mapped to Risk/Safety features */}
            {(session.synthesis.conflicts?.length > 0 || session.synthesis.safetyAlerts?.length > 0) && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {session.synthesis.conflicts && session.synthesis.conflicts.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm">
                    <h2 className="text-[10px] font-bold text-rose-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Conflicts Detected
                    </h2>
                    <div className="space-y-3">
                      {session.synthesis.conflicts.map((c: any, i: number) => (
                        <div key={i} className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                          <div className="text-[10px] font-bold text-rose-700 mb-1">{c.parties}</div>
                          <div className="text-sm text-rose-900 leading-relaxed">{c.issue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {session.synthesis.safetyAlerts && session.synthesis.safetyAlerts.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm">
                    <h2 className="text-[10px] font-bold text-amber-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3" /> Safety Alerts
                    </h2>
                    <div className="space-y-3">
                      {session.synthesis.safetyAlerts.map((alert: string, i: number) => (
                        <div key={i} className="flex gap-3 items-start text-sm text-amber-900 bg-amber-50 border border-amber-100 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    const point = session.history.find(p => p.agentRole === activeTab);
    if (!point) {
      if (session.currentAgent === activeTab || (session.isDeliberating && !session.synthesis && activeTab !== 'Final Decision')) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />
            <p className="text-sm font-medium">Awaiting analysis from this specialist...</p>
            {session.currentAgent === activeTab && session.currentStream && (
              <div className="mt-8 p-4 w-full max-w-3xl text-xs font-mono bg-slate-900 text-green-400 rounded-lg overflow-x-hidden whitespace-pre-wrap whitespace-break-spaces text-left opacity-80 h-64 overflow-y-auto custom-scrollbar">
                {session.currentStream}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
          <p className="text-sm font-medium">No data available for this section.</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="flex-1">
              <h2 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Primary Finding</h2>
              <div className="text-slate-900 text-lg leading-relaxed font-semibold">
                {point.summary}
              </div>
            </div>
            {point.metrics && (
              <div className="flex gap-6 shrink-0 md:pl-6 md:border-l border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Confidence</span>
                  <span className="font-mono font-bold text-emerald-600 text-base">{point.metrics.confidence}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Urgency</span>
                  <span className="font-mono font-bold text-rose-600 text-base">{point.metrics.urgency}%</span>
                </div>
              </div>
            )}
          </div>
          
          <h2 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Detailed Analysis</h2>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
            <ReactMarkdown>{point.content}</ReactMarkdown>
          </div>
        </div>

        {point.thinking && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
              <Info className="w-3 h-3 text-slate-400" /> Internal Reasoning Model
            </h2>
            <div className="text-sm text-slate-600 font-mono italic leading-relaxed bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
              {point.thinking}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 w-full shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <Activity className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">MedCouncil AI <span className="text-slate-400 font-normal ml-2">| Research Phase</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-3 text-sm font-medium text-slate-500">
            <button onClick={() => setIsHeatmapOpen(true)} className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"><Grid className="w-3.5 h-3.5"/> Map</button>
            <button onClick={exportToJSON} disabled={!session.topic} className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-transparent"><FileDown className="w-3.5 h-3.5"/> JSON</button>
            <button onClick={handlePrint} disabled={!session.topic} className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"><Printer className="w-3.5 h-3.5"/> PDF</button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden w-full relative">
        
        {/* Left Panel: Council Info & Stats */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-2">
              <Layers className="w-3 h-3" /> The Council
            </h2>
            <div className="space-y-3">
              {Object.values(AGENTS).map((agent) => (
                <div key={agent.role} className="p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-lg shrink-0">
                    {agent.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{agent.name}</div>
                    <div className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded inline-block uppercase mt-1 w-fit">{agent.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {session.synthesis && (
            <div className="mb-6">
              <h2 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Clinical Metrics
              </h2>
              
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Agreement Score</span>
                  <span className="font-bold text-slate-800">{session.synthesis.clinicalMetrics.agreementScore}%</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Uncertainty</span>
                  <span className={`font-bold ${session.synthesis.clinicalMetrics.uncertainty === 'High' ? 'text-rose-500' : 'text-slate-800'}`}>
                    {session.synthesis.clinicalMetrics.uncertainty}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Evidence Strength</span>
                  <span className="font-bold text-slate-800">{session.synthesis.clinicalMetrics.evidenceStrength}</span>
                </div>
                <div className={`p-3 rounded-lg flex justify-between items-center text-sm border font-medium
                  ${session.synthesis.clinicalMetrics.riskFlag ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <span>Risk Flag</span>
                  <span className="flex items-center gap-1">
                    {session.synthesis.clinicalMetrics.riskFlag ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {session.synthesis.clinicalMetrics.riskFlag ? 'Present' : 'Clear'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-slate-100">
             <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                   <AlertCircle className="w-3 h-3 text-slate-500" />
                   <span className="text-[11px] text-slate-500 font-medium italic underline">Research Note:</span>
                </div>
                <p className="text-[11px] text-slate-600 font-bold uppercase leading-relaxed">
                   AI-driven deliberation.<br/>Verify with human practitioners.
                </p>
             </div>
          </div>
        </aside>

        {/* Center Panel: Tabbed Decison Flow */}
        <section className="flex-1 flex flex-col bg-slate-50 z-10 w-full">
          <div className="shrink-0 bg-white border-b border-slate-200">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                  Ongoing Session
                </div>
                <p className="text-sm font-semibold truncate max-w-md text-slate-800">
                  {session.topic || "Awaiting research prompt..."}
                </p>
              </div>
              {session.isDeliberating && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold shrink-0">Agents debating...</span>
                </div>
              )}
            </div>

            {/* TAB SYSTEM */}
            {(session.topic || session.isDeliberating) && (
              <div className="flex px-4 pt-1 pb-3 overflow-x-auto custom-scrollbar gap-2">
                {[
                  { id: AgentRole.DIAGNOSTICIAN, label: "Dr. Diagnosis" },
                  { id: AgentRole.RISK_EVALUATOR, label: "Risk" },
                  { id: AgentRole.TREATMENT_PLANNER, label: "Treatment" },
                  { id: AgentRole.EVIDENCE_REVIEWER, label: "Evidence" },
                  { id: 'Final Decision', label: "Final Decision" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-[13px] font-semibold whitespace-nowrap rounded-lg transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-blue-50 text-blue-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-blue-600/10' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Form */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={startDeliberation} className="relative w-full max-w-4xl mx-auto">
              <input 
                type="text"
                placeholder="Direct the council or ask a follow-up..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={session.isDeliberating}
                className="w-full bg-slate-100/80 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 text-slate-900 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!input.trim() || session.isDeliberating}
                className="absolute right-2 top-0 bottom-0 my-auto h-8 aspect-square bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Heatmap Modal */}
      <AnimatePresence>
        {isHeatmapOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold tracking-tight">
                   <Grid className="w-5 h-5 text-blue-500" />
                   Disagreement Heatmap
                </div>
                <button onClick={() => setIsHeatmapOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 mb-6">Historical divergence between agent pairs across case types.</p>
                <div className="grid gap-4">
                  {heatmapData.map((data, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                       <div className="w-48 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                         {data.x} vs {data.y}
                       </div>
                       <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative group cursor-pointer">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${data.score}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className={`h-full ${data.score > 70 ? 'bg-rose-500' : data.score > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          />
                          <div className="absolute inset-0 flex items-center px-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-[10px] font-bold">
                             {data.caseType} Cases
                          </div>
                       </div>
                       <div className="w-12 text-sm font-mono font-bold text-slate-600 shrink-0">
                         {data.score}%
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print View: Consolidated PDF Report */}
      <div className="hidden print:block p-8 max-w-4xl mx-auto text-black bg-white min-h-screen">
         <div className="border-b-2 border-slate-900 pb-4 mb-8">
            <h1 className="text-3xl font-black mb-2">MedCouncil Clinical Report</h1>
            <p className="text-sm text-slate-600 font-mono">Session ID: {Date.now()} | Auto-generated via AI Deliberation</p>
         </div>

         <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Clinical Prompt</h2>
            <p className="font-medium text-lg leading-relaxed">{session.topic || "N/A"}</p>
         </div>

         {session.synthesis && (
           <div className="mb-12 break-inside-avoid shadow-sm border border-slate-200 rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="p-6 bg-blue-50/30">
                 <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Final Actionable Recommendation</h2>
                 <p className="text-xl font-bold mb-6">{session.synthesis.decision}</p>
                 
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Synthesis Context</h3>
                 <p className="text-sm leading-relaxed mb-6">{session.synthesis.synthesis}</p>

                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Action Plan</h3>
                 <ul className="list-decimal pl-5 space-y-2 text-sm">
                   {session.synthesis.actionPlan.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                   ))}
                 </ul>
              </div>
           </div>
         )}

         <h2 className="text-2xl font-bold border-b border-slate-200 pb-4 mb-6 mt-12 break-after-avoid">Specialist Sub-Analyses</h2>
         <div className="space-y-8">
            {session.history.map(point => (
               <div key={point.id} className="break-inside-avoid border-l-4 border-slate-300 pl-6 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{point.agentRole}</div>
                  <div className="text-lg font-bold mb-3">{AGENTS[point.agentRole].name}</div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Primary Finding</div>
                     <p className="font-semibold text-sm">{point.summary}</p>
                  </div>
                  
                  <div className="prose prose-sm max-w-none text-slate-700">
                     <ReactMarkdown>{point.content}</ReactMarkdown>
                  </div>
               </div>
            ))}
         </div>
      </div>

      <style>{`
        @media print {
          body {
            background-color: white !important;
          }
          .custom-scrollbar {
             display: none !important;
          }
          .bg-slate-50 {
             background-color: white !important;
          }
          aside, header, section {
             display: none !important;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
