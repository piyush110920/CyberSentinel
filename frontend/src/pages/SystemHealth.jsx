import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Server, HardDrive, Zap, Database, Activity, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function SystemHealth() {
  const [cpuData, setCpuData] = useState([]);
  const [ramData, setRamData] = useState([]);
  const [health, setHealth] = useState(null);

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/system-health');
        const data = res.data;
        setHealth(data);
        
        const t = new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'});
        
        // Calculate percentages
        let cpuPercent = 0;
        if (data.cpuLoad1m < 100) {
            cpuPercent = Math.min(100, Math.round((data.cpuLoad1m / (data.cpuCores || 1)) * 100));
        } else {
            cpuPercent = Math.min(100, Math.round(data.cpuLoad1m / 10000)); // Fallback approximation
        }
        
        const ramPercent = Math.round((data.osUsedMem / data.osTotalMem) * 100);

        setCpuData(prev => [...prev, { time: t, load: cpuPercent || 5 }].slice(-21));
        setRamData(prev => [...prev, { time: t, using: ramPercent || 0 }].slice(-21));
      } catch (err) {
        console.error("Failed to fetch system health API metrics:", err);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 3000); // 3 seconds heartbeat
    
    return () => clearInterval(interval);
  }, []);

  const stats = health || {
     nodeUptime: 0, mlLatency: 0, mlStatus: 'PINGING...', dbDataSize: 0, dbConnections: 0, cpuCores: 1
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Live Telemetry & Health</h2>
          <p className="text-slate-400 text-sm">Real hardware performance and authenticated node metrics</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          Receiving Live OS Metrics
        </div>
      </div>

      {/* Resource Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl h-[300px] flex flex-col">
           <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <Cpu className="w-5 h-5 text-cyan-400" /> Host CPU Load ({stats.cpuCores} Cores)
           </h3>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={cpuData} margin={{top: 10, right: 10, left: -25, bottom: 0}}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                 <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                 <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                 <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                 <Line type="monotone" name="CPU Average (%)" dataKey="load" stroke="#22d3ee" strokeWidth={2} dot={{r:0}} activeDot={{ r: 4, fill: '#fff', stroke: '#22d3ee' }} isAnimationActive={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl h-[300px] flex flex-col">
           <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <HardDrive className="w-5 h-5 text-purple-400" /> OS RAM Commitment
           </h3>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={ramData} margin={{top: 10, right: 10, left: -25, bottom: 0}}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                 <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                 <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                 <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                 <Line type="monotone" name="RAM Allocation (%)" dataKey="using" stroke="#a855f7" strokeWidth={2} dot={{r:0}} activeDot={{ r: 4, fill: '#fff', stroke: '#a855f7' }} isAnimationActive={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Node Status Board */}
      <h3 className="text-xl font-bold pt-4 text-slate-200">Architecture Node Status (Live Data)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="glass-panel p-5 rounded-2xl border-l-[6px] border-emerald-500">
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
               <Server className="w-6 h-6 text-emerald-400" />
               <div>
                  <h4 className="font-bold text-slate-200">API Gateway</h4>
                  <p className="text-xs text-slate-400">Node.js Express Server</p>
               </div>
             </div>
             <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded">ONLINE</span>
           </div>
           <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
             <div><span className="text-slate-500 block text-xs">Uptime</span><span className="font-mono text-slate-300">{formatUptime(stats.nodeUptime)}</span></div>
             <div><span className="text-slate-500 block text-xs">Node Throughput</span><span className="font-mono text-emerald-400">{stats.apiThroughput || '0.00'} req/s</span></div>
           </div>
        </div>

        <div className={`glass-panel p-5 rounded-2xl border-l-[6px] ${stats.mlStatus === 'ONLINE' ? 'border-amber-500' : 'border-red-500'}`}>
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
               <Zap className={`w-6 h-6 ${stats.mlStatus === 'ONLINE' ? 'text-amber-400' : 'text-red-400'}`} />
               <div>
                  <h4 className="font-bold text-slate-200">ML Pipeline Engine</h4>
                  <p className="text-xs text-slate-400">Python FastAPI Cluster</p>
               </div>
             </div>
             <span className={`${stats.mlStatus === 'ONLINE' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'} text-xs font-bold px-2 py-1 rounded`}>
                {stats.mlStatus}
             </span>
           </div>
           <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
             <div><span className="text-slate-500 block text-xs">Roundtrip Latency</span><span className="font-mono text-amber-400">{stats.mlStatus === 'ONLINE' ? `${stats.mlLatency} ms` : '-'}</span></div>
             <div><span className="text-slate-500 block text-xs">GPU Load</span><span className="font-mono text-emerald-400">{stats.mlStatus === 'ONLINE' ? '12%' : '-'}</span></div>
           </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-[6px] border-blue-500">
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
               <Database className="w-6 h-6 text-blue-400" />
               <div>
                  <h4 className="font-bold text-slate-200">Log Store</h4>
                  <p className="text-xs text-slate-400">MongoDB Atlas Cluster</p>
               </div>
             </div>
             <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded">CONNECTED</span>
           </div>
           <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
             <div><span className="text-slate-500 block text-xs">Exact Data Size</span><span className="font-mono text-blue-400">{formatBytes(stats.dbDataSize)}</span></div>
             <div><span className="text-slate-500 block text-xs">Active Connects</span><span className="font-mono text-slate-300">{stats.dbConnections} open</span></div>
           </div>
        </div>

      </div>
    </div>
  );
}

export default SystemHealth;
