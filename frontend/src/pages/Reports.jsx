import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, BarChart2, PieChart as PieIcon, Activity, 
  Crosshair, Target, Shield, Network, BrainCircuit, Globe, Database 
} from 'lucide-react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line, 
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4'];

function Reports() {
  const [logs, setLogs] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Advanced Table States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/logs`);
        setLogs(res.data);
      } catch (err) {
        console.error("Error fetching logs for reports", err);
      }
    };
    fetchLogs();
  }, []);

  const totalThreats = logs.filter(l => l.is_threat).length;

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    setIsExporting(true);
    
    // Create CSV content
    const headers = ['Timestamp', 'Source IP', 'Destination IP', 'Attack Type', 'Severity', 'Action Taken', 'CICIDS Prob', '5G-NIDD Prob', 'Final Threat Prob'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.source_ip || '',
      log.destination_ip || '',
      log.attack_type || (log.is_threat ? 'Unknown' : 'Normal'),
      log.severity || '',
      log.action_taken || '',
      log.model1_probability || 0,
      log.model2_probability || 0,
      log.threat_probability || 0
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `threat_analytics_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setIsExporting(false), 1000);
  };

  // -------------------------
  // Data Processors (Optimized via useMemo)
  // -------------------------

  const severityData = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    logs.filter(l => l.is_threat).forEach(l => { counts[l.severity || 'Low']++; });
    return Object.entries(counts).filter(([_,v])=>v>0).map(([name, value]) => ({name, value}));
  }, [logs]);

  const attackData = useMemo(() => {
    const counts = {};
    logs.filter(l=>l.is_threat).forEach(l => {
       const type = l.attack_type || 'Unknown';
       counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value).slice(0, 5); 
  }, [logs]);
  
  const destData = useMemo(() => {
    const counts = {};
    logs.filter(l=>l.is_threat).forEach(l => {
       if(l.destination_ip) counts[l.destination_ip] = (counts[l.destination_ip] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value).slice(0, 5);
  }, [logs]);

  const actionData = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
       const action = l.action_taken || (l.is_threat ? 'Logged' : 'Allowed');
       counts[action] = (counts[action] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({name, value}));
  }, [logs]);

  const protocolData = useMemo(() => {
    const counts = {};
    logs.filter(l=>l.is_threat).forEach(l => {
       let proto = l.protocol ? l.protocol.toUpperCase() : null;
       if (!proto) {
          const type = (l.attack_type || '').toLowerCase();
          if (type.includes('web') || type.includes('xss') || type.includes('sql') || type.includes('brute')) proto = 'HTTP';
          else if (type.includes('dos') || type.includes('ddos')) proto = 'UDP';
          else if (type.includes('ping') || type.includes('icmp')) proto = 'ICMP';
          else proto = 'TCP';
       }
       counts[proto] = (counts[proto] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({name, value}));
  }, [logs]);

  const timeData = useMemo(() => {
    const reversed = [...logs].reverse().slice(-50);
    return reversed.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}),
      threatLevel: Math.round((log.threat_probability || 0) * 100),
    }));
  }, [logs]);

  const topIPs = useMemo(() => {
    const counts = {};
    logs.filter(l=>l.is_threat).forEach(l => {
       if(l.source_ip) counts[l.source_ip] = (counts[l.source_ip] || 0) + 1;
    });
    return Object.entries(counts).map(([ip, count]) => ({ip, count})).sort((a,b)=>b.count-a.count).slice(0, 5);
  }, [logs]);

  // New Data: Model Comparison Scatter
  const modelComparisonData = useMemo(() => {
    return logs.filter(l => l.is_threat).slice(-100).map(l => ({
      name: l.attack_type || 'Unknown',
      model1: Math.round((l.model1_probability || l.threat_probability) * 100),
      model2: Math.round((l.model2_probability || l.threat_probability) * 100),
      severity: l.severity || 'Medium'
    }));
  }, [logs]);

  // New Data: Geographical Mock Distributions
  const geoData = useMemo(() => {
    const regions = ['United States', 'Russia', 'China', 'Brazil', 'North Korea', 'Iran', 'Unknown Entity'];
    const counts = {};
    logs.filter(l => l.is_threat).forEach(l => {
       const hash = String(l.source_ip).split('.').reduce((a,b)=>a+parseInt(b), 0);
       const region = regions[(hash || 0) % regions.length];
       counts[region] = (counts[region] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value).slice(0, 5);
  }, [logs]);


  // Table Pagination
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      return (log.source_ip?.includes(searchTerm) || log.attack_type?.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [logs, searchTerm]);

  const currentTableData = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);


  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">Detailed Analysis Reports</h2>
          <p className="text-slate-400 text-sm">Comprehensive multi-dimensional threat analytics and raw log explorer</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={logs.length === 0 || isExporting}
          className="flex items-center gap-2 bg-accent/20 hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed text-accent px-6 py-2 rounded-lg font-bold transition-colors border border-accent/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        >
          <Download className="w-5 h-5" />
          {isExporting ? 'Compiling Master CSV...' : 'Export Master CSV'}
        </button>
      </div>

      {/* Row 1: Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Basic summary */}
        <div className="md:col-span-1 glass-panel p-6 rounded-2xl flex flex-col justify-between border-t-2 border-t-accent/50">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <BarChart2 className="w-5 h-5 text-accent" /> Data Lake
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Total Analysed</span>
                <span className="font-bold text-slate-200">{logs.length} pkg</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Threat Signatures</span>
                <span className="font-bold text-red-400">{totalThreats} seq</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Clean Traffic</span>
                <span className="font-bold text-emerald-400">{logs.length - totalThreats} pkg</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Malicious Variance</span>
                <span className="font-bold text-amber-400">
                  {logs.length > 0 ? ((totalThreats / logs.length) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-col gap-1">
             <div className="text-xs text-slate-500">Earliest Payload Record:</div>
             <div className="font-mono text-[11px] text-slate-300">
                {logs.length > 0 ? new Date(logs[logs.length-1].timestamp).toLocaleString() : 'N/A'}
             </div>
          </div>
        </div>

        {/* AI Consensus Scatter */}
        <div className="md:col-span-3 glass-panel p-6 rounded-2xl h-[280px]">
           <h3 className="text-lg font-bold mb-2 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <BrainCircuit className="w-5 h-5 text-pink-400" /> AI Consensus Matrix (CICIDS v. 5G-NIDD)
           </h3>
           <div className="w-full h-[200px]">
             {modelComparisonData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                   <XAxis type="number" dataKey="model1" name="CICIDS Prob" unit="%" stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                   <YAxis type="number" dataKey="model2" name="5G-NIDD Prob" unit="%" stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                   <ZAxis dataKey="severity" range={[60, 100]} name="Severity" />
                   <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                   <Scatter name="Threat Vectors" data={modelComparisonData} fill="#ec4899">
                      {modelComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.severity === 'Critical' ? '#ef4444' : entry.severity === 'High' ? '#f97316' : '#ec4899'} />
                      ))}
                   </Scatter>
                 </ScatterChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500">Awaiting comparative model data</div>}
           </div>
        </div>
      </div>

      {/* Row 2: Distribution Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl h-[260px] flex flex-col">
           <h3 className="text-sm font-bold mb-2 flex items-center gap-2 border-b border-slate-700/50 pb-2 text-orange-400">
              <PieIcon className="w-4 h-4" /> Severity Risk
           </h3>
           <div className="flex-1 w-full min-h-0">
             {severityData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={severityData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                     {severityData.map((e, i) => <Cell key={i} fill={e.name==='Critical'?'#ef4444':e.name==='High'?'#f97316':e.name==='Medium'?'#eab308':'#22c55e'} />)}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', zIndex: 100 }} />
                   <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No data</div>}
           </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl h-[260px] flex flex-col">
           <h3 className="text-sm font-bold mb-2 flex items-center gap-2 border-b border-slate-700/50 pb-2 text-emerald-400">
              <Shield className="w-4 h-4" /> Policy Enforcement
           </h3>
           <div className="flex-1 w-full min-h-0">
             {actionData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={actionData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value">
                     {actionData.map((e, i) => <Cell key={i} fill={e.name.includes('Block')?'#ef4444':e.name.includes('Log')?'#eab308':'#22c55e'} />)}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                   <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No data</div>}
           </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl h-[260px] flex flex-col">
           <h3 className="text-sm font-bold mb-2 flex items-center gap-2 border-b border-slate-700/50 pb-2 text-indigo-400">
              <Network className="w-4 h-4" /> Network L4 Protocols
           </h3>
           <div className="flex-1 w-full min-h-0">
             {protocolData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={protocolData} cx="50%" cy="50%" innerRadius={0} outerRadius={60} dataKey="value">
                     {protocolData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                   <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No data</div>}
           </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl h-[260px] flex flex-col">
           <h3 className="text-sm font-bold mb-2 flex items-center gap-2 border-b border-slate-700/50 pb-2 text-cyan-400">
              <Globe className="w-4 h-4" /> Estimated Geo-Origin
           </h3>
           <div className="flex-1 w-full min-h-0">
             {geoData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={geoData} layout="vertical" margin={{top: 5, right: 10, left: 15, bottom: 5}}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={60} axisLine={false} tickLine={false} />
                   <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', zIndex: 100 }} wrapperStyle={{zIndex: 100}} />
                   <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No data</div>}
           </div>
        </div>
      </div>

      {/* Row 3: Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attack Types Bar */}
        <div className="glass-panel p-6 rounded-2xl h-[300px]">
           <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <Crosshair className="w-4 h-4 text-purple-400" /> Prevalent Attack Signatures
           </h3>
           <div className="w-full h-[200px]">
             {attackData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={attackData} layout="vertical" margin={{top: 5, right: 20, left: 20, bottom: 5}}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                   <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={90} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15)+'...' : val} />
                   <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                   <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500">No threat data</div>}
           </div>
        </div>

        {/* Top Targeted Destinations Bar */}
        <div className="glass-panel p-6 rounded-2xl h-[300px]">
           <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
              <Target className="w-4 h-4 text-rose-400" /> Internal Destinations Under Fire
           </h3>
           <div className="w-full h-[200px]">
             {destData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={destData} layout="vertical" margin={{top: 5, right: 20, left: 20, bottom: 5}}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                   <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                   <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                   <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 10 }} />
                 </BarChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-slate-500">No destination data</div>}
           </div>
        </div>
      </div>

       {/* Advanced Log Explorer Table */}
       <div className="glass-panel rounded-2xl p-6 mt-8 shadow-2xl shadow-accent/5">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-accent" /> Advanced Log Explorer
          </h3>
          <div className="w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search Source IP or Attack Array..." 
              className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-4 py-2 w-full md:w-80 focus:outline-none focus:border-accent/50 transition-colors"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-[#0a0f18] rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Source IP</th>
                <th className="px-4 py-3">Destination IP</th>
                <th className="px-4 py-3">Malicious Signature</th>
                <th className="px-4 py-3 text-center">CICIDS%</th>
                <th className="px-4 py-3 text-center">NIDD%</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Enforcement</th>
              </tr>
            </thead>
            <tbody>
              {currentTableData.length > 0 ? currentTableData.map(log => (
                <tr key={log._id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}</td>
                  <td className="px-4 py-2.5 font-mono text-blue-400 font-bold group-hover:text-blue-300">{log.source_ip}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{log.destination_ip || 'N/A'}</td>
                  <td className="px-4 py-2.5 text-slate-200">{log.attack_type || (log.is_threat ? 'Unknown Class' : 'Normal Traffic')}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-pink-400">
                     {log.is_threat ? Math.round(log.model1_probability * 100) + '%' : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono text-purple-400">
                     {log.is_threat ? Math.round(log.model2_probability * 100) + '%' : '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.is_threat ? (
                       <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                        log.severity === 'Critical' ? 'bg-red-500/20 text-red-500' :
                        log.severity === 'High' ? 'bg-orange-500/20 text-orange-500' :
                        log.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                      )}>
                        {log.severity}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px] uppercase font-bold">Clear</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">
                    {log.action_taken || (log.is_threat ? 'Logged' : 'Permit')}
                  </td>
                </tr>
              )) : (
                 <tr>
                   <td colSpan="8" className="px-4 py-8 text-center text-slate-500">No telemetry matches your query parameters.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Control */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
            <span>Showing {(currentPage - 1) * logsPerPage + 1} - {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} events</span>
            <div className="flex gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30">Prev</button>
              <span className="px-2 py-1">{currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Reports;
