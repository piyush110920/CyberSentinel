import React, { useState } from 'react';
import axios from 'axios';
import { Crosshair, AlertOctagon, Terminal, Globe, FileWarning, ShieldOff, SearchCode, Database } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

const ATTACK_TYPES = [
  {
    id: 'bruteforce',
    name: 'Brute Force Login',
    severity: 'High',
    description: 'Multiple failed login attempts detected in quick succession from the same source IP.',
    icon: <SearchCode className="w-8 h-8 text-orange-500" />
  },
  {
    id: 'sqli',
    name: 'SQL Injection',
    severity: 'Critical',
    description: 'Malicious SQL fragment detected in login query parameter.',
    icon: <Database className="w-8 h-8 text-red-500" />
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    severity: 'Medium',
    description: 'Suspicious script tag attempt detected in search input field.',
    icon: <Terminal className="w-8 h-8 text-yellow-400" />
  },
  {
    id: 'ddos',
    name: 'DDoS Traffic',
    severity: 'Critical',
    description: 'Anomalous surge in volumetric traffic requests indicating a denial of service attack.',
    icon: <Globe className="w-8 h-8 text-red-500" />
  },
  {
    id: 'malware',
    name: 'Malware File Upload',
    severity: 'High',
    description: 'File upload bypassed signature check; potential trojan detected.',
    icon: <FileWarning className="w-8 h-8 text-orange-500" />
  },
  {
    id: 'unauth_access',
    name: 'Unauthorized File Access',
    severity: 'Medium',
    description: 'Access attempted to restricted /etc/passwd path via directory traversal.',
    icon: <ShieldOff className="w-8 h-8 text-yellow-400" />
  },
  {
    id: 'portscan',
    name: 'Port Scanning Attempt',
    severity: 'Low',
    description: 'Sequential TCP SYN packets directed at various ports.',
    icon: <AlertOctagon className="w-8 h-8 text-blue-400" />
  }
];

function generateRandomIP() {
  return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
}

export default function Simulation() {
  const [status, setStatus] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

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
      // clear status after 4 seconds
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <main className="max-w-6xl w-full space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Crosshair className="text-accent" />
          Attack Scenarios
        </h2>
        <p className="text-slate-400 max-w-3xl">
          Trigger simulated cyber security events to test the SOC dashboard, IDS visualization, and alerting pipeline. 
          High and Critical severities will automatically trigger email alerts.
        </p>
      </div>

      {status && (
        <div className={cn(
          "p-4 rounded-xl border font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-between",
          status.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ATTACK_TYPES.map((attack) => (
          <div key={attack.id} className="glass-panel p-6 rounded-2xl flex flex-col group hover:border-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-800/50 rounded-xl group-hover:scale-110 transition-transform">
                {attack.icon}
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold",
                attack.severity === 'Critical' ? 'bg-red-500/20 text-red-500' :
                attack.severity === 'High' ? 'bg-orange-500/20 text-orange-500' :
                attack.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              )}>
                {attack.severity}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-200 mb-2">{attack.name}</h3>
            <p className="text-sm text-slate-400 mb-6 flex-1">{attack.description}</p>
            
            <button
              onClick={() => simulateAttack(attack)}
              disabled={loadingId === attack.id}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-slate-700 hover:border-accent/50 group-hover:bg-slate-700/80"
            >
              {loadingId === attack.id ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-accent rounded-full animate-spin"></div>
              ) : (
                <>Launch Simulation</>
              )}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
