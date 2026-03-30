import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Save } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Settings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cybersentinel_settings');
    return saved ? JSON.parse(saved) : {
      emailCritical: true,
      emailHigh: false,
      autoBlock: true,
      dataRetention: '30'
    };
  });
  const [isSaved, setIsSaved] = useState(false);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = () => {
    localStorage.setItem('cybersentinel_settings', JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Configuration</h2>
          <p className="text-slate-400 text-sm">Manage SOC Dashboard preferences and AI tolerances</p>
        </div>
        <button 
          onClick={saveSettings}
          className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-6 py-2 rounded-lg font-medium transition-colors border border-emerald-500/20"
        >
          <Save className="w-4 h-4" />
          {isSaved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-700/50 pb-2">
            <Bell className="w-5 h-5 text-accent" /> Alerting Policy
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Administrator Email</label>
              <input type="text" className="w-full bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-300 pointer-events-none opacity-70" value="cybersentinel.contact@gmail.com" readOnly />
              <p className="text-xs text-slate-500 mt-1">Configured securely via environment variables.</p>
            </div>
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSetting('emailCritical')}>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Email on Critical Threats (&gt;90%)</span>
              <div className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", settings.emailCritical ? "bg-accent" : "bg-slate-700")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.emailCritical ? "right-1" : "left-1")}></div>
              </div>
            </div>
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSetting('emailHigh')}>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Email on High Threats (&gt;75%)</span>
              <div className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", settings.emailHigh ? "bg-accent" : "bg-slate-700")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.emailHigh ? "right-1" : "left-1")}></div>
              </div>
            </div>
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSetting('autoBlock')}>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Auto-Block Critical Threats (Firewall)</span>
              <div className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", settings.autoBlock ? "bg-red-500" : "bg-slate-700")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300", settings.autoBlock ? "right-1" : "left-1")}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-700/50 pb-2">
            <Shield className="w-5 h-5 text-emerald-400" /> AI Engine Constants
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/30 rounded-lg">
              <span className="block text-sm font-bold text-slate-200">Model 1 (CICIDS2017)</span>
              <span className="text-xs text-slate-400">XGBoost Classifier - Strict Protocol Checking</span>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg">
              <span className="block text-sm font-bold text-slate-200">Model 2 (5G-NIDD)</span>
              <span className="text-xs text-slate-400">LightGBM Classifier - 30 Feature Mapping</span>
            </div>
            <p className="text-xs text-amber-500/80 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              Note: Model hyperparameters are locked during active runtime. Halt the Python API server to re-train.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
