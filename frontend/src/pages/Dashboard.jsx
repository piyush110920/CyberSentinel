import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { ShieldAlert, Activity, Server, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SOCKET_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3000/api';

const COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#f97316'];

function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ 
    total_analyzed: 0, total_threats: 0, recent_threats: 0, risk_level: 'Low',
    high_severity: 0, medium_severity: 0, low_severity: 0
  });
  const [chartData, setChartData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  // Table filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/logs`),
          axios.get(`${API_URL}/stats`)
        ]);
        setLogs(logsRes.data);
        setStats(statsRes.data);
        processChartData(logsRes.data);
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
        const updated = [newLog, ...prev].slice(0, 500); // Keep more in memory for table
        processChartData(updated);
        return updated;
      });
      
      setStats(prev => {
        const isHigh = newLog.severity === 'High' || newLog.severity === 'Critical';
        const isMed = newLog.severity === 'Medium';
        const isLow = newLog.severity === 'Low' || !newLog.severity;
        
        // Trigger Visual Alarm
        if (isHigh) {
          setIsAlarmActive(true);
          // Reset alarm after 5 seconds
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

    return () => socket.disconnect();
  }, []);

  const processChartData = (data) => {
    const reversed = [...data].reverse().slice(-50);
    const chart = reversed.map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      threat: log.threat_probability * 100,
      model1: (log.model1_probability || log.threat_probability) * 100, // Fallback for old logs
      model2: (log.model2_probability || log.threat_probability) * 100  // Fallback for old logs
    }));
    setChartData(chart);
  };

  // Process data for Pie Chart
  const attackTypeData = useMemo(() => {
    const counts = {};
    logs.filter(l => l.is_threat).forEach(l => {
      const type = l.attack_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  // Process data for Bar Chart (last 7 days simplified to daily counts)
  const dailyThreats = useMemo(() => {
    const counts = {};
    logs.filter(l => l.is_threat).forEach(l => {
      const date = new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).reverse().slice(-7);
  }, [logs]);

  // Filter & Paginate Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = log.source_ip?.includes(searchTerm) || log.attack_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSeverity = severityFilter === 'All' ? true : log.severity === severityFilter || (severityFilter === 'Low' && !log.severity);
      return matchSearch && matchSeverity;
    });
  }, [logs, searchTerm, severityFilter]);

  const currentTableData = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <div className={`space-y-6 p-1 rounded-sm transition-all duration-300 ${isAlarmActive ? "alarm-pulse bg-red-950/40" : ""}`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">Security Overview</h2>
          <p className="text-slate-400 text-sm">Real-time threat monitoring and network analysis</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold">
          <div className={cn("w-2.5 h-2.5 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
          {isConnected ? "System Online" : "Disconnected"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Threats" value={stats.total_threats} icon={<ShieldAlert className="text-accent" />} />
        <StatCard title="High Severity" value={stats.high_severity} valueColor="text-red-500" icon={<Activity className="text-red-500" />} />
        <StatCard title="Medium" value={stats.medium_severity} valueColor="text-yellow-400" icon={<Clock className="text-yellow-400" />} />
        <StatCard title="Low" value={stats.low_severity} valueColor="text-green-400" icon={<Server className="text-green-400" />} />
        <StatCard 
          title="System Status" 
          value={isConnected ? 'Up' : 'Down'} 
          icon={<AlertTriangle className={isConnected ? "text-green-400" : "text-red-500"} />} 
          valueColor={isConnected ? "text-green-400" : "text-red-500"}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold mb-4">Threat Probability Over Time</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" name="CICIDS (Standard)" dataKey="model1" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a' }} />
                <Line type="monotone" name="5G-NIDD (IoT/5G)" dataKey="model2" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a855f7', stroke: '#0f172a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-panel rounded-2xl p-6 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold mb-4">Threat Distribution</h3>
          <div className="flex-1 w-full min-h-0">
            {attackTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attackTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-500">No threat data yet.</div>}
          </div>
        </div>
      </div>

      {/* Logs Table Area */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-bold">Threat Logs</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search IP or Attack..." 
                className="bg-slate-900 border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 w-full md:w-64 focus:outline-none focus:border-accent/50"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
            <div className="relative flex items-center">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3" />
              <select 
                className="bg-slate-900 border border-slate-700 text-sm rounded-lg pl-9 pr-3 py-2 appearance-none focus:outline-none focus:border-accent/50"
                value={severityFilter}
                onChange={(e) => {setSeverityFilter(e.target.value); setCurrentPage(1);}}
              >
                <option value="All">All Severities</option>
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
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 rounded-lg">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Timestamp</th>
                <th className="px-4 py-3">Attack Type</th>
                <th className="px-4 py-3">Source IP</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3 rounded-tr-lg">Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {currentTableData.length > 0 ? (
                currentTableData.map((log) => (
                  <tr key={log._id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{log.attack_type || (log.is_threat ? 'Unknown Threat' : 'Normal')}</td>
                    <td className="px-4 py-3 text-blue-400 font-mono">{log.source_ip}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-semibold",
                        log.severity === 'Critical' ? 'bg-red-500/20 text-red-500' :
                        log.severity === 'High' ? 'bg-orange-500/20 text-orange-500' :
                        log.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      )}>
                        {log.severity || (log.is_threat ? 'Low' : 'None')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{log.action_taken || 'Logged'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No logs found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 text-sm text-slate-400">
            <span>Showing {(currentPage - 1) * logsPerPage + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} entries</span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, valueColor = "text-white" }) {
  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
        {React.cloneElement(icon, { className: "w-24 h-24" })}
      </div>
      <div className="flex justify-between items-start mb-3 relative z-10">
        <h3 className="text-slate-400 font-medium text-xs lg:text-sm">{title}</h3>
        <div className="p-1.5 bg-slate-800/50 rounded-lg backdrop-blur-md border border-slate-700/50">
          {icon}
        </div>
      </div>
      <p className={cn("text-2xl font-bold tracking-tight relative z-10", valueColor)}>
        {value}
      </p>
    </div>
  );
}

export default Dashboard;
