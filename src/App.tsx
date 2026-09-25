import { useState, useMemo, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction, ChangeEvent } from 'react';
import { sampleConfig } from './config';
import type { Config } from './config';
import { calculateProjection } from './projection';
import { prepareConfig, loadSaved, savePlan, clearSaved, exportPlan, importPlan } from './model';
import { Overview } from './components/Overview';
import { IncomeBreakdown } from './components/IncomeBreakdown';
import { FundingSource } from './components/FundingSource';
import { AccountBalances } from './components/AccountBalances';
import { DataTable } from './components/DataTable';
import { Settings } from './components/Settings';
import { QuickAdjust } from './components/QuickAdjust';
import { Guide } from './components/Guide';
import { formulaById, systemOf } from './formulas';
import { LayoutDashboard, PieChart, Layers, LineChart as LineChartIcon, Settings as SettingsIcon, TableProperties, Menu, X, ChevronRight, ChevronDown, Sliders, BookOpen, Download, Upload, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'overview' | 'income' | 'funding' | 'balances' | 'data' | 'settings' | 'guide';

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || 'RP';

function App() {
  // A saved plan in this browser wins; otherwise the made-up sample shows until the person changes something
  const [saved] = useState(loadSaved);
  const [config, setConfigRaw] = useState<Config>(() => saved ?? sampleConfig);
  const [isSample, setIsSample] = useState(saved === null);
  const [activeTab, setActiveTab] = useState<Tab>(saved === null ? 'guide' : 'overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Any edit makes the plan the person's own, and from then on it's saved in this browser
  const setConfig: Dispatch<SetStateAction<Config>> = (update) => {
    setIsSample(false);
    setConfigRaw(update);
  };
  useEffect(() => { if (!isSample) savePlan(config); }, [config, isSample]);

  const effectiveConfig = useMemo(() => prepareConfig(config), [config]);
  const projection = useMemo(() => calculateProjection(effectiveConfig), [effectiveConfig]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'income', label: 'Income vs Spending', icon: PieChart },
    { id: 'funding', label: 'Funding Source', icon: Layers },
    { id: 'balances', label: 'Account Balances', icon: LineChartIcon },
    { id: 'data', label: 'Data Table', icon: TableProperties },
    { id: 'settings', label: 'Your Numbers', icon: SettingsIcon },
    { id: 'guide', label: 'Guide', icon: BookOpen },
  ] as const;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const goTo = (tab: Tab) => { setActiveTab(tab); setIsSidebarOpen(false); };
  // Open Your Numbers at the pension setup (the header chip and the sample banner)
  const goToPension = () => {
    goTo('settings');
    setTimeout(() => document.getElementById('pension-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Esc closes whichever slide-out panel is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        setIsSettingsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Notices fade after a few seconds
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const onSaveFile = () => {
    exportPlan(config);
    setNotice({ text: 'Plan saved to a file. Keep it somewhere safe; it holds your numbers.' });
    setIsSidebarOpen(false);
  };
  const onOpenFile = () => fileInput.current?.click();
  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const plan = await importPlan(file);
      setConfig(plan);
      setActiveTab('overview');
      setNotice({ text: `Opened "${plan.planName || file.name}".` });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Could not open that file.', error: true });
    }
    setIsSidebarOpen(false);
  };
  const onStartOver = () => {
    if (!window.confirm('Erase your numbers from this browser and go back to the sample? Save to a file first if you want to keep them.')) return;
    clearSaved();
    setConfigRaw(sampleConfig);
    setIsSample(true);
    setActiveTab('guide');
    setIsSidebarOpen(false);
    setNotice({ text: 'Back to the sample plan. Your numbers were erased from this browser.' });
  };

  const totalAssets = effectiveConfig.starting403b + effectiveConfig.startingRoth + effectiveConfig.startingCash;
  const formula = formulaById(config.pensionFormulaId);
  const system = systemOf(formula);
  const formulaLabel = system === 'CalSTRS' ? formula.name : `${formula.category} ${formula.name}`;

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFileChosen} />

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0f172a] text-slate-300 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 shrink-0 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
              {initials(config.planName)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight truncate">{config.planName || 'My Plan'}</h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">CalPERS & CalSTRS Retirement Planner</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Assets at Retirement</p>
            <p className="text-2xl font-bold text-white tracking-tight">${(totalAssets / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 font-semibold border border-blue-500/20 shadow-sm shadow-blue-500/5'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={cn("transition-colors duration-200", isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-400')} />
                  <span className="text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} className="text-blue-500/50" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: plan file */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Plan file</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onSaveFile} className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition-colors">
              <Download size={14} /> Save to file
            </button>
            <button onClick={onOpenFile} className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition-colors">
              <Upload size={14} /> Open file
            </button>
          </div>
          <button onClick={onStartOver} className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs py-1.5 transition-colors">
            <RotateCcw size={12} /> Start over with the sample
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header */}
        <header className="h-16 sm:h-20 bg-white border-b-4 border-[#0072B2] shadow-sm px-3 sm:px-4 lg:px-10 flex items-center justify-between gap-2 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={toggleSidebar}
              aria-label="Open menu"
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 shrink-0"
            >
              <Menu size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-[#15325b] tracking-tight leading-tight truncate">
                <span className="hidden md:inline">CalPERS &amp; CalSTRS </span>Retirement Planner
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-tight truncate">
                <span className="md:hidden">CalPERS · CalSTRS · </span>{navItems.find(n => n.id === activeTab)?.label} · {config.planName || 'My Plan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={goToPension}
              title="Change your pension system and formula"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border border-[#0072B2]/30 bg-[#0072B2]/10 text-[#0072B2] hover:bg-[#0072B2]/15 transition-colors max-w-[9rem] sm:max-w-none"
            >
              <span className="truncate">{system}<span className="hidden lg:inline"> · {formulaLabel}</span></span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-4 py-2 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              <span className={cn("w-2 h-2 rounded-full", isSample ? 'bg-amber-500' : 'bg-emerald-500')}></span>
              {isSample ? 'SAMPLE NUMBERS' : 'SAVED IN THIS BROWSER'}
            </div>
            <button
              onClick={() => setIsSettingsPanelOpen(true)}
              aria-label="Quick Adjust"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <Sliders size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-10 bg-slate-50/50">
          <div className={cn(
            "mx-auto transition-all duration-300 space-y-5",
            activeTab === 'data' ? 'max-w-full' : 'max-w-6xl'
          )}>
            {notice && (
              <div role="status" className={cn("rounded-lg px-4 py-3 text-sm border", notice.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
                {notice.text}
              </div>
            )}

            {isSample && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <span>You're looking at a <b>made-up sample household</b> on CalPERS. Start with <b>Your Numbers</b>: pick CalPERS or CalSTRS first, then put in your own figures.</span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={goToPension} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg">Enter my numbers</button>
                  <button onClick={onOpenFile} className="border border-amber-300 hover:bg-amber-100 font-semibold px-3 py-1.5 rounded-lg">Open a saved plan</button>
                </div>
              </div>
            )}

            {activeTab === 'overview' && <Overview config={effectiveConfig} projection={projection} />}
            {activeTab === 'income' && <IncomeBreakdown config={effectiveConfig} projection={projection} />}
            {activeTab === 'funding' && <FundingSource projection={projection} />}
            {activeTab === 'balances' && <AccountBalances projection={projection} />}
            {activeTab === 'data' && <DataTable config={effectiveConfig} projection={projection} />}
            {activeTab === 'settings' && <Settings config={config} setConfig={setConfig} />}
            {activeTab === 'guide' && <Guide />}

            <footer className="pt-6 pb-2 text-center text-[11px] text-slate-400">
              A planning tool, not financial advice. Confirm your pension with CalPERS or CalSTRS. Your numbers never leave this device.
            </footer>
          </div>
        </main>

        {/* Quick Settings Panel (Overlay) */}
        {isSettingsPanelOpen && (
          <div className="fixed inset-0 bg-slate-900/30 z-[55]" onClick={() => setIsSettingsPanelOpen(false)} />
        )}
        <div className={cn(
          "fixed inset-y-0 right-0 w-80 sm:w-96 max-w-[90vw] bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-out border-l border-slate-200",
          isSettingsPanelOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Quick Adjust</h3>
                <p className="text-xs text-slate-500">Live preview of changes</p>
              </div>
              <button
                onClick={() => setIsSettingsPanelOpen(false)}
                aria-label="Close Quick Adjust"
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <QuickAdjust config={config} setConfig={setConfig} />
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setIsSettingsPanelOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
