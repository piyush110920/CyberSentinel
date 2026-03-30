import React, { useState, useEffect } from 'react';
import { Network, Server, Database, Activity, Globe, Shield, Radio } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

const INTERNAL_NODES = [
  { id: 'web', name: 'WEB-DMZ', icon: Globe, x: 30, y: 30, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  { id: 'db', name: 'DB-CLUSTER', icon: Database, x: 70, y: 30, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
  { id: 'api', name: 'API-GW', icon: Server, x: 25, y: 70, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/50' },
  { id: 'auth', name: 'IAM-AUTH', icon: Shield, x: 75, y: 70, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50' }
];

function NetworkMap() {
  const [logs, setLogs] = useState([]);
  const [activeThreats, setActiveThreats] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/logs`);
        setLogs(res.data);
      } catch (err) {
        console.error("Error fetching logs", err);
      }
    };
    fetchLogs();
    
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logs.length === 0) return;
    
    const uniqueThreats = [];
    const seen = new Set();
    
    for (const log of logs) {
      if (log.is_threat && log.source_ip && !seen.has(log.source_ip)) {
        seen.add(log.source_ip);
        
        const hash = Array.from(log.source_ip).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const theta = (hash % 360) * (Math.PI / 180);
        
        const radius = 40 + (hash % 8); 
        const x = 50 + radius * Math.cos(theta);
        const y = 50 + radius * Math.sin(theta);
        
        const targetNode = INTERNAL_NODES[hash % INTERNAL_NODES.length];

        uniqueThreats.push({
          id: log._id || hash,
          ip: log.source_ip,
          type: log.attack_type || 'Unknown Attack',
          severity: log.severity || 'Medium',
          x,
          y,
          targetNode,
          pulseDelay: `${(hash % 3)}s`
        });
        
        if (uniqueThreats.length >= 12) break;
      }
    }
    setActiveThreats(uniqueThreats);
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-accent bg-clip-text text-transparent">Live Network Topology</h2>
          <p className="text-slate-400 text-sm">Real-time geospatial radial mapping of active attack vectors</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold">
          <Radio className="w-4 h-4 text-accent animate-pulse" />
          Radar Sweeping
        </div>
      </div>

      <div className="glass-panel rounded-2xl min-h-[700px] flex flex-col justify-center items-center relative overflow-hidden bg-[#050B14] shadow-2xl shadow-accent/10 border border-slate-800/80">
        
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
           <div className="absolute w-[80%] h-[80%] border border-slate-700 rounded-full"></div>
           <div className="absolute w-[60%] h-[60%] border border-dashed border-slate-700/50 rounded-full animate-[spin_120s_linear_infinite]"></div>
           <div className="absolute w-[40%] h-[40%] border border-slate-600 rounded-full"></div>
           <div className="absolute w-[20%] h-[20%] border border-accent/20 rounded-full bg-accent/5"></div>
           <div className="absolute w-1/2 h-1 bg-gradient-to-r from-transparent to-accent/40 origin-left animate-[spin_4s_linear_infinite]" style={{ left: '50%' }}></div>
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
           {activeThreats.map((threat) => (
              <line 
                key={`beam-${threat.id}`}
                x1={`${threat.x}%`} 
                y1={`${threat.y}%`} 
                x2={`${threat.targetNode.x}%`} 
                y2={`${threat.targetNode.y}%`} 
                stroke="#ef4444" 
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4 6"
                className="animate-[dash_1s_linear_infinite]"
              />
           ))}

           {INTERNAL_NODES.map((node) => (
             <line 
               key={`core-${node.id}`}
               x1="50%" y1="50%" 
               x2={`${node.x}%`} y2={`${node.y}%`} 
               stroke="#334155" strokeWidth="2"
             />
           ))}
        </svg>

        <div className="absolute z-20 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ top: '50%', left: '50%' }}>
          <div className="relative">
            <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20"></div>
            <div className="bg-slate-900 border-2 border-accent p-4 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <Shield className="w-10 h-10 text-accent" />
            </div>
          </div>
          <span className="mt-3 font-bold text-slate-100 bg-slate-900/80 px-3 py-1 rounded border border-slate-700 text-sm backdrop-blur-md">CORE GATEWAY</span>
        </div>

        {INTERNAL_NODES.map((node) => (
          <div 
            key={node.id} 
            className="absolute z-20 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer group"
            style={{ top: `${node.y}%`, left: `${node.x}%` }}
          >
            <div className={cn("p-3 rounded-xl border backdrop-blur-md shadow-lg transition-colors", node.bg, node.border)}>
               <node.icon className={cn("w-6 h-6", node.color)} />
            </div>
            <div className="mt-2 text-center opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="font-mono text-[10px] font-bold text-slate-300 block bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">{node.name}</span>
            </div>
          </div>
        ))}

        {activeThreats.map((threat) => (
          <div 
            key={threat.id} 
            className="absolute z-30 flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group"
            style={{ 
               top: `${threat.y}%`, 
               left: `${threat.x}%`,
               animationDelay: threat.pulseDelay 
            }}
          >
             <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30"></div>
                <div className="bg-slate-900 border border-red-500/80 p-2 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                   <Activity className="w-4 h-4 text-red-500" />
                </div>
             </div>
             
             <div className="absolute top-10 flex flex-col items-center min-w-[120px] bg-slate-900/95 border border-red-900 rounded-lg p-2 opacity-0 group-hover:opacity-100 group-hover:z-50 transition-all shadow-xl pointer-events-none">
                <span className="font-mono text-[11px] font-bold text-red-400">{threat.ip}</span>
                <span className="text-[9px] uppercase tracking-wider text-red-300 truncate w-full text-center">{threat.type}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NetworkMap;
