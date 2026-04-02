import React, { useState } from 'react';
import axios from 'axios';
import { Crosshair, AlertOctagon, Terminal, Globe, ShieldOff, Activity } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ATTACK_CATEGORIES } from '../data/attacks';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

const ICONS = {
    'Globe': Globe,
    'Terminal': Terminal,
    'ShieldOff': ShieldOff
};

function generateRandomIP() {
  return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
}

export default function Simulation() {
  const [status, setStatus] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(ATTACK_CATEGORIES[0].id);

  const simulateCrash = async () => {
    try {
      const res = await axios.post(`${API_URL}/health/toggle-sim-crash`);
      const isDown = res.data.is_down;
      setStatus({ type: isDown ? 'error' : 'success', message: `Server Crash Simulation is now ${isDown ? 'ACTIVE (Backend sending 404s)' : 'INACTIVE (Normal Mode)'}. Check the main SOC Dashboard!` });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to toggle crash simulation.' });
    } finally {
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const simulateAttack = async (attack) => {
    setLoadingId(attack.id);
    setStatus(null);
    try {
      const payload = {
        attack_type: attack.name,
        source_ip: generateRandomIP(),
        severity: attack.severity,
        description: attack.description,
        timestamp: new Date().toISOString()
      };
      await axios.post(`${API_URL}/simulate`, payload);
      setStatus({ type: 'success', message: `${attack.name} simulated successfully. Threat event sent to IDS.` });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to simulate attack. Is the backend running?' });
    } finally {
      setLoadingId(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const activeData = ATTACK_CATEGORIES.find(c => c.id === activeCategory);
  const ActiveIcon = ICONS[activeData?.iconName] || Activity;

  return (
    <main className="max-w-7xl w-full space-y-6 mx-auto pb-12">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
             <Crosshair className="text-accent w-8 h-8" />
             <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-accent bg-clip-text text-transparent">Enterprise Threat Simulation</h2>
                <p className="text-slate-400 text-sm">Select from {ATTACK_CATEGORIES.reduce((acc, cat) => acc + cat.attacks.length, 0)}+ live payloads.</p>
             </div>
          </div>
          <button 
            onClick={simulateCrash}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:scale-105 border border-red-500/30 rounded-xl font-bold transition-all shadow-lg shadow-red-500/10"
          >
            <AlertOctagon className="w-5 h-5" />
            Toggle Server Crash (404)
          </button>
        </div>
      </div>

      {status && (
        <div className={cn(
          "p-4 rounded-xl border font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-between",
          status.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {status.message}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-4">
        {ATTACK_CATEGORIES.map(category => {
           const Icon = ICONS[category.iconName] || Activity;
           const isActive = activeCategory === category.id;
           return (
             <button
               key={category.id}
               onClick={() => setActiveCategory(category.id)}
               className={cn(
                 "flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold transition-colors border-b-2",
                 isActive ? "bg-slate-800/80 border-accent text-accent" : "bg-transparent border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
               )}
             >
               <Icon className="w-5 h-5" />
               {category.title} <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded-full text-xs font-mono">{category.attacks.length}</span>
             </button>
           );
        })}
      </div>

      {/* Active Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up">
        {activeData?.attacks.map((attack) => (
          <div key={attack.id} className="glass-panel p-5 rounded-2xl flex flex-col group hover:border-slate-600 transition-colors bg-[#0a0f18] min-h-[220px]">
             
             <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-3">
               <div className="p-2 bg-slate-800/50 rounded-lg group-hover:scale-110 transition-transform">
                 <ActiveIcon className={cn(
                   "w-6 h-6",
                   attack.severity === 'Critical' ? 'text-red-500' :
                   attack.severity === 'High' ? 'text-orange-500' :
                   attack.severity === 'Medium' ? 'text-yellow-400' : 'text-blue-400'
                 )} />
               </div>
               <span className={cn(
                 "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                 attack.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                 attack.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                 attack.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                 'bg-blue-500/10 text-blue-400 border-blue-500/30'
               )}>
                 {attack.severity}
               </span>
             </div>
             
             <h3 className="text-sm font-bold text-slate-200 mb-2 leading-tight">{attack.name}</h3>
             <p className="text-xs text-slate-400 mb-4 flex-1 line-clamp-3 leading-relaxed">{attack.description}</p>
             
             <button
               onClick={() => simulateAttack(attack)}
               disabled={loadingId === attack.id}
               className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto group-hover:border-slate-500 border border-transparent"
             >
               {loadingId === attack.id ? (
                 <div className="w-4 h-4 border-2 border-slate-400 border-t-accent rounded-full animate-spin"></div>
               ) : (
                 <>Deploy Payload <Crosshair className="w-3 h-3 opacity-50" /></>
               )}
             </button>
             
          </div>
        ))}
      </div>
    </main>
  );
}
