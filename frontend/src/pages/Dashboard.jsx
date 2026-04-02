import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { ShieldAlert, Activity, Server, Clock, AlertTriangle, Search, Filter, Globe, Target, Cpu, TerminalSquare, CheckCircle } from 'lucide-react';
import { 
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
    AreaChart, Area, ScatterChart, Scatter, ZAxis, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar 
} from 'recharts';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SOCKET_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3000/api';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-lg shadow-xl shadow-black/50 z-50 min-w-[150px]">
        <p className="font-bold text-slate-200 mb-1">{data.name}</p>
        <p className="text-accent font-mono text-sm">{data.value} Hits</p>
        {data.othersList && data.othersList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
             <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold">Grouped Vectors ({data.othersList.length}):</p>
             <ul className="text-xs text-slate-300 space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
               {data.othersList.map((item, i) => (
                   <li key={i} className="flex justify-between gap-4">
                       <span className="truncate max-w-[200px]" title={item.name}>• {item.name}</span>
                       <span className="text-slate-500 font-mono text-[10px]">{item.value}x</span>
                   </li>
               ))}
             </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ 
    total_analyzed: 0, total_threats: 0, recent_threats: 0, risk_level: 'Low',
    high_severity: 0, medium_severity: 0, low_severity: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('up');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;
  
  const terminalRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/logs`),
          axios.get(`${API_URL}/stats`)
        ]);
        setLogs(logsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Error fetching initial data.", err);
      }
    };
    fetchData();

    const socket = io(SOCKET_URL);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('new_threat_log', (newLog) => {
      setLogs(prev => {
        const updated = [newLog, ...prev].slice(0, 1000); 
        return updated;
      });
      
      setStats(prev => {
        const isHigh = newLog.severity === 'High' || newLog.severity === 'Critical';
        const isMed = newLog.severity === 'Medium';
        const isLow = newLog.severity === 'Low' || !newLog.severity;
        
        if (isHigh) {
          setIsAlarmActive(true);
          setTimeout(() => setIsAlarmActive(false), 5000);
        }
        
        return {
          ...prev,
          total_analyzed: prev.total_analyzed + 1,
          total_threats: newLog.is_threat ? prev.total_threats + 1 : prev.total_threats,
          recent_threats: newLog.is_threat ? prev.recent_threats + 1 : prev.recent_threats,
          high_severity: isHigh && newLog.is_threat ? prev.high_severity + 1 : prev.high_severity,
          medium_severity: isMed && newLog.is_threat ? prev.medium_severity + 1 : prev.medium_severity,
          low_severity: isLow && newLog.is_threat ? prev.low_severity + 1 : prev.low_severity
        };
      });
    });

    return () => {
      socket.off('new_threat_log');
      socket.disconnect();
    };
  }, []);

  // Poll Simulation Health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${API_URL}/health/simulation`);
        setSimulationStatus(res.data.status === 'down' ? 'down' : 'up');
      } catch (err) {
        setSimulationStatus('error');
      }
    };
    const interval = setInterval(checkHealth, 10000);
    checkHealth();
    return () => clearInterval(interval);
  }, []);

  const [chartData, setChartData] = useState([]);

  // Reference to logs for the interval to read latest without re-binding
  const logsRef = useRef([]);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  useEffect(() => {
    // Continuous Real-time Sweeping Graph
    const interval = setInterval(() => {
      const now = Date.now();
      const newChart = [];
      
      // Look back exactly 60 seconds, bucketed by 1-second intervals
      for (let i = 59; i >= 0; i--) {
        const bucketTime = now - (i * 1000);
        const bucketStart = bucketTime - 1000;
        const bucketEnd = bucketTime;
        
        // Find logs that happened exactly within this 1-second window
        const bucketLogs = logsRef.current.filter(l => {
          const t = new Date(l.timestamp).getTime();
          return t > bucketStart && t <= bucketEnd;
        });

        if (bucketLogs.length > 0) {
          // If there are multiple events in one second, take the highest severity/threat
          const maxLog = bucketLogs.reduce((prev, current) => 
            ((prev.threat_probability || 0) > (current.threat_probability || 0)) ? prev : current
          );
          
          newChart.push({
            time: new Date(bucketTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            threat: (maxLog.threat_probability || 0) * 100,
            model1: (maxLog.model1_probability || maxLog.threat_probability || 0) * 100,
            model2: (maxLog.model2_probability || maxLog.threat_probability || 0) * 100,
            epochSecs: (bucketTime / 1000) % 86400,
            severityWeight: maxLog.severity === 'Critical' ? 100 : maxLog.severity === 'High' ? 70 : maxLog.severity === 'Medium' ? 40 : 10,
            type: maxLog.attack_type || 'Unknown'
          });
        } else {
          // Zeroed baseline for continuous flat line when no events occur
          newChart.push({
            time: new Date(bucketTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            threat: 0,
            model1: 0,
            model2: 0,
            epochSecs: (bucketTime / 1000) % 86400,
            severityWeight: 0,
            type: 'None'
          });
        }
      }
      setChartData(newChart);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Advanced Metric Compilations
  const advancedMetrics = useMemo(() => {
     if (logs.length === 0) return { uniqueIPs: 0, avgConfidence: 0, topTarget: 'N/A' };
     
     const ips = new Set();
     const targets = {};
     let totalConf = 0;
     let threatCount = 0;

     logs.forEach(l => {
         if (l.source_ip) ips.add(l.source_ip);
         if (l.is_threat) {
             threatCount++;
             totalConf += (l.threat_probability || 0);
             const dst = l.destination_ip || 'Local Gateway';
             targets[dst] = (targets[dst] || 0) + 1;
         }
     });

     let topTgt = 'N/A';
     let maxT = 0;
     for (const [ip, c] of Object.entries(targets)) {
         if (c > maxT) { maxT = c; topTgt = ip; }
     }

     return {
         uniqueIPs: ips.size,
         avgConfidence: threatCount > 0 ? ((totalConf / threatCount) * 100).toFixed(1) : 0,
         topTarget: topTgt
     };
  }, [logs]);

  // Attack Type Distribution
  const attackTypeData = useMemo(() => {
    const counts = {};
    const threshold = Date.now() - 60000;
    logs.filter(l => l.is_threat && new Date(l.timestamp).getTime() >= threshold).forEach(l => {
      const type = l.attack_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
    
    if (sorted.length <= 5) return sorted;
    
    const top5 = sorted.slice(0, 5);
    const othersCount = sorted.length - 5;
    const othersList = sorted.slice(5);
    const othersSum = othersList.reduce((acc, curr) => acc + curr.value, 0);
    
    return [...top5, { name: `+ ${othersCount} More`, value: othersSum, othersList }];
  }, [logs, chartData]);

  // Top Attacker IPs Bar Chart
  const topAttackers = useMemo(() => {
    const counts = {};
    const threshold = Date.now() - 60000;
    logs.filter(l => l.is_threat && new Date(l.timestamp).getTime() >= threshold).forEach(l => {
       const ip = l.source_ip || 'Hidden';
       counts[ip] = (counts[ip] || 0) + 1;
    });
    return Object.entries(counts).map(([ip, hits]) => ({ ip, hits })).sort((a,b)=>b.hits-a.hits).slice(0, 5);
  }, [logs, chartData]);

  // Distributed Target Ports Radar Chart data (Simulated structurally)
  const portRadarData = useMemo(() => {
      const portHits = { "Port 80 (HTTP)": 0, "Port 443 (HTTPS)": 0, "Port 22 (SSH)": 0, "Port 53 (DNS)": 0, "Port 3306 (DB)": 0, "Port 8080 (RPC)": 0 };
      const threshold = Date.now() - 60000;
      let activeHits = false;
      logs.filter(l => l.is_threat && new Date(l.timestamp).getTime() >= threshold).forEach(l => {
          activeHits = true;
          const charCode = (l.source_ip || '').charCodeAt(0) || 0;
          if (l.attack_type?.toLowerCase().includes('ddos')) portHits["Port 80 (HTTP)"] += 5;
          else if (l.attack_type?.toLowerCase().includes('sql')) portHits["Port 3306 (DB)"] += 4;
          else if (l.attack_type?.toLowerCase().includes('brute')) portHits["Port 22 (SSH)"] += 3;
          else if (charCode % 5 === 0) portHits["Port 53 (DNS)"] += 1;
          else if (charCode % 2 === 0) portHits["Port 8080 (RPC)"] += 1;
          else portHits["Port 443 (HTTPS)"] += 2;
      });
      // if no recent hits, return empty so chart says "Awaiting active targeting"
      if (!activeHits) return [];
      
      return Object.entries(portHits).map(([subject, hits]) => ({ subject, hits, fullMark: Math.max(...Object.values(portHits)) + 5 }));
  }, [logs, chartData]);

  // Filter & Paginate
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = log.source_ip?.includes(searchTerm) || log.attack_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSeverity = severityFilter === 'All' ? true : log.severity === severityFilter || (severityFilter === 'Low' && !log.severity);
      return matchSearch && matchSeverity;
    });
  }, [logs, searchTerm, severityFilter]);

  const currentTableData = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Auto-scroll terminal
  useEffect(() => {
      if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
  }, [logs.length]);

  return (
    <div className={`space-y-6 p-1 rounded-sm transition-all duration-300 ${isAlarmActive ? "alarm-pulse relative before:absolute before:inset-0 before:bg-red-500/10 before:pointer-events-none" : ""}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent via-cyan-400 to-blue-500 bg-clip-text text-transparent">NOC Security Overview</h2>
          <p className="text-slate-400 text-sm">Real-time threat monitoring, ML inference tracking, and granular network telemetry</p>
        </div>
        <div className="flex gap-4">
            <div className={cn("glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-all", simulationStatus === 'up' ? "text-emerald-400" : "text-red-500 bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse")}>
              {simulationStatus === 'up' ? <Globe className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {simulationStatus === 'up' ? "Sim Active" : "Sim Offline"}
            </div>
            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold border-amber-500/30 text-amber-500">
                <Cpu className="w-4 h-4 animate-pulse" />
                ML Engine Active
            </div>
            <div className={cn("glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold border-transparent", isConnected ? "text-green-400" : "text-red-500")}>
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
              {isConnected ? "Socket Connected" : "Connection Lost"}
            </div>
        </div>
      </div>

      {/* Primary Data Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MiniStat label="Total Scanned" val={stats.total_analyzed} icon={<Activity />} color="text-blue-400" />
        <MiniStat label="Total Threats" val={stats.total_threats} icon={<ShieldAlert />} color="text-red-400" />
        <MiniStat label="Critical Risk" val={stats.high_severity} icon={<AlertTriangle />} color="text-orange-500" />
        <MiniStat label="Medium Risk" val={stats.medium_severity} icon={<Clock />} color="text-yellow-400" />
        <MiniStat label="Low Risk" val={stats.low_severity} icon={<Server />} color="text-green-400" />
        <MiniStat label="Unique IPs Origin" val={advancedMetrics.uniqueIPs} icon={<Globe />} color="text-purple-400" />
        <MiniStat label="Avg ML Conf." val={`${advancedMetrics.avgConfidence}%`} icon={<Target />} color="text-cyan-400" />
        <MiniStat label="Top Victim" val={advancedMetrics.topTarget} icon={<RadarIcon />} color="text-emerald-400" textSmall />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Graph Section */}
        <div className="lg:col-span-3 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Real-time Probability Plot */}
                <div className="glass-panel rounded-2xl p-6 h-[300px] flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
                  <h3 className="text-[13px] font-bold mb-4 flex justify-between items-center z-10 text-slate-300">
                    <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> AI Inference Probability Telemetry</span>
                  </h3>
                  <div className="flex-1 w-full min-h-0 z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorM1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorM2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                        <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                        <Area type="monotone" name="CICIDS-2017" dataKey="model1" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorM1)" activeDot={{ r: 4, fill: '#22d3ee' }} isAnimationActive={false} />
                        <Area type="monotone" name="5G-NIDD" dataKey="model2" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorM2)" activeDot={{ r: 4, fill: '#ef4444' }} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Machine Learning Scatter Anomaly Matrix */}
                <div className="glass-panel rounded-2xl p-6 h-[300px] flex flex-col relative overflow-hidden">
                  <h3 className="text-[13px] font-bold mb-4 flex justify-between items-center z-10 text-slate-300">
                    <span className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> Deep Learning Anomaly Clustering Matrix</span>
                  </h3>
                  <div className="flex-1 w-full min-h-0 z-10">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" dataKey="epochSecs" name="Time (s)" stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickFormatter={() => ''} tickLine={false} />
                            <YAxis type="number" dataKey="threat" name="Confidence %" stroke="#64748b" fontSize={10} domain={[0, 100]} />
                            <ZAxis type="number" dataKey="severityWeight" range={[10, 150]} name="Impact" />
                            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} formatter={(value, name) => [value, name]}/>
                            <Scatter name="Anomalies" data={chartData.filter(d => d.threat > 0)}>
                                {chartData.filter(d => d.threat > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.severityWeight === 100 ? '#ef4444' : entry.severityWeight === 70 ? '#f97316' : '#a855f7'} fillOpacity={0.6} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-600 text-[11px]">Awaiting telemetry for scatter map.</div>}
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-6">
                {/* Distribution Pie (Large) */}
                <div className="glass-panel rounded-2xl p-6 h-[380px] flex flex-col">
                  <h3 className="text-[14px] font-bold mb-4 text-slate-400 uppercase tracking-widest text-center">Threat Signatures Overview</h3>
                  <div className="flex-1 w-full min-h-0">
                    {attackTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={attackTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value" stroke="#0a0f18" strokeWidth={2}>
                            {attackTypeData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} cursor={false} />
                          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', lineHeight: '28px', paddingLeft: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-600 text-xs">Awaiting signatures...</div>}
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar Targeted Ports */}
                <div className="glass-panel rounded-2xl p-6 h-[280px] flex flex-col">
                  <h3 className="text-[12px] font-bold mb-2 text-slate-400 uppercase tracking-widest text-center">Service Port Targeting</h3>
                  <div className="flex-1 w-full min-h-0 -ml-2">
                    {portRadarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={portRadarData}>
                          <PolarGrid stroke="#334155" strokeDasharray="3 3"/>
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }} />
                          <RechartsRadar name="Packet Drops" dataKey="hits" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-600 text-xs">No active targeting...</div>}
                  </div>
                </div>

                {/* Top Attackers Bar */}
                <div className="glass-panel rounded-2xl p-6 h-[280px] flex flex-col">
                  <h3 className="text-[12px] font-bold mb-4 text-slate-400 uppercase tracking-widest text-center">Highest Volume Hostiles</h3>
                  <div className="flex-1 w-full min-h-0">
                    {topAttackers.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topAttackers} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="ip" type="category" stroke="#94a3b8" fontSize={10} width={80} tickFormatter={(val) => val.length > 12 ? val.substring(0,12)+'..' : val} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }} cursor={{fill: '#1e293b'}} />
                          <Bar dataKey="hits" name="Payload Hits" fill="#f97316" radius={[0, 4, 4, 0]} barSize={12}>
                            {topAttackers.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-600 text-xs">No hostile origins mapped.</div>}
                  </div>
                </div>

            </div>
            
        </div>

        {/* Right Sidebar Split: Critical Alerts & Raw Feed */}
        <div className="flex flex-col gap-6 h-[605px]">
            {/* 5. Critical Alerts Panel */}
            <div className="glass-panel rounded-2xl flex flex-col flex-1 overflow-hidden border-2 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] relative">
                <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
                <div className="bg-gradient-to-r from-red-950/80 to-[#0b1220] p-3 border-b border-red-500/30 flex items-center justify-between z-10">
                    <h3 className="font-bold text-[13px] flex items-center gap-2 text-red-400 uppercase tracking-widest">
                        <AlertTriangle className="w-4 h-4" /> Priority Alerts
                    </h3>
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded animate-pulse font-bold tracking-wider">CRIT-ONLY</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar z-10">
                    {logs.filter(l => l.severity === 'Critical' || l.severity === 'High').slice(0, 50).map((log, i) => (
                        <div key={i} className={cn("border p-2.5 rounded-lg flex flex-col gap-1.5 transition-colors cursor-default", log.severity === 'Critical' ? "bg-red-500/10 border-red-500/40 hover:bg-red-500/20" : "bg-orange-500/10 border-orange-500/40 hover:bg-orange-500/20")}>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className={cn("uppercase tracking-wider", log.severity === 'Critical' ? "text-red-400" : "text-orange-400")}>{log.attack_type || 'Unknown Vector'}</span>
                                <span className="text-slate-400 bg-slate-900 px-1 rounded">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-slate-200 text-[11px] font-mono mt-1 mb-1 bg-[#0b1220]/50 p-1 rounded border border-slate-700/50 flex flex-col">
                                <span className="text-blue-400">Src: {log.source_ip}</span>
                                <span className="text-red-400 border-t border-slate-700/30 pt-1 mt-1">Dst: {log.destination_ip || 'Internal Network'}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                                Immediate mitigation recommended. AI Match: <span className="text-white font-bold px-1 bg-red-500/30 rounded">{log.model1_probability ? (log.model1_probability*100).toFixed(0) : '99'}%</span>.
                            </p>
                        </div>
                    ))}
                    {logs.filter(l => l.severity === 'Critical' || l.severity === 'High').length === 0 && (
                        <div className="flex h-full items-center justify-center text-slate-400 text-xs gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 opacity-80" /> No Critical Threats Found.
                        </div>
                    )}
                </div>
            </div>

            {/* Standard Raw Attack Feed */}
            <div className="glass-panel rounded-2xl flex flex-col flex-1 overflow-hidden border border-slate-800">
                <div className="bg-[#0b1220] p-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-slate-300 uppercase tracking-widest">
                        <TerminalSquare className="w-4 h-4 text-slate-400" /> Global Feed
                    </h3>
                </div>
                <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[9px] sm:text-[10px] scroll-smooth bg-[#030712]">
                    {logs.filter(l=>l.is_threat).slice(0, 100).reverse().map((log, i) => (
                        <div key={i} className="border-l-2 pl-2 flex flex-col gap-1 border-opacity-50 break-all" 
                             style={{ borderColor: log.severity === 'Critical' ? '#ef4444' : log.severity === 'High' ? '#f97316' : '#eab308' }}>
                            <div className="flex justify-between text-slate-500">
                                <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-slate-400 font-bold">{(log.threat_probability*100).toFixed(1)}%</span>
                            </div>
                            <div className="text-slate-300">
                               <span className="text-blue-400">{log.source_ip}</span> {'>'} <span className="text-emerald-400">{log.destination_ip || 'WAN_GW'}</span>
                            </div>
                        </div>
                    ))}
                    {logs.filter(l=>l.is_threat).length === 0 && <div className="text-slate-600 text-center mt-6">Waiting for packets...</div>}
                </div>
            </div>
        </div>

      </div>

      {/* Advanced Granular Logs Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-800 pb-4">
          <div>
              <h3 className="text-lg font-bold">Deep Packet Inspection Table</h3>
              <p className="text-xs text-slate-500">Forensic AI inference and strict routing layer lookup</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search IPv4/v6 or Pattern..." className="bg-[#0b1120] border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 w-full md:w-64 focus:outline-none focus:border-accent/50 text-slate-300" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
            </div>
            <div className="relative flex items-center">
              <Filter className="w-4 h-4 text-slate-500 absolute left-3" />
              <select className="bg-[#0b1120] border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 appearance-none focus:outline-none focus:border-accent/50 text-slate-300" value={severityFilter} onChange={(e) => {setSeverityFilter(e.target.value); setCurrentPage(1);}}>
                <option value="All">All Tiers</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-[10px] text-slate-400 uppercase bg-[#0b1120] rounded-lg tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Time Vector</th>
                <th className="px-4 py-3 font-semibold">Network Routing (Src {'>'} Dst)</th>
                <th className="px-4 py-3 font-semibold">TTP Identification</th>
                <th className="px-4 py-3 font-semibold">Neural Net Consensus (M1 / M2)</th>
                <th className="px-4 py-3 font-semibold">Classification Class</th>
                <th className="px-4 py-3 font-semibold">Policy Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {currentTableData.length > 0 ? (
                currentTableData.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">{log.source_ip}</span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">{log.destination_ip || 'Core Gateway'}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-300 text-xs">{log.attack_type || (log.is_threat ? 'Unknown Heuristic' : 'Benign Traffic')}</td>
                    <td className="px-4 py-3">
                        {log.is_threat ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                                <span className="text-cyan-400">{log.model1_probability ? (log.model1_probability*100).toFixed(0) : (log.threat_probability*100).toFixed(0)}%</span>
                                <span className="text-slate-600 mx-1">/</span>
                                <span className="text-purple-400">{log.model2_probability ? (log.model2_probability*100).toFixed(0) : (log.threat_probability*100).toFixed(0)}%</span>
                            </div>
                        ) : <span className="text-slate-600 text-[10px] font-mono">{'< 0.1% / < 0.1%'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border", log.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : log.severity === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : log.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30')}>
                        {log.severity || (log.is_threat ? 'Low' : 'Secure')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{log.action_taken || 'Logged to Disk Array'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">No telemetry packets matching your heuristic filter criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 text-xs text-slate-400 bg-[#0b1120] p-3 rounded-lg border border-slate-800 text-center">
            <span>Showing {(currentPage - 1) * logsPerPage + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} intercepted events</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-20 transition-colors">Previous Packet</button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-20 transition-colors">Next Packet</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, val, icon, color, textSmall }) {
    return (
        <div className="glass-panel p-3 flex flex-col items-center justify-center text-center gap-1 border border-slate-800 shadow-md rounded-xl hover:border-slate-600 transition-colors">
            {React.cloneElement(icon, { className: cn("w-5 h-5 mb-1", color) })}
            <span className={cn("font-mono font-bold text-slate-200", textSmall ? "text-xs" : "text-lg")}>{val}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
        </div>
    );
}

// ArrowRight icon definition
function ArrowRight(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

// Radar icon definition
function RadarIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><path d="M15 15h.01"/><path d="M11.2 12.8A2 2 0 1 0 12.8 11.2"/><path d="M12 12v6"/>
    </svg>
  );
}

export default Dashboard;
