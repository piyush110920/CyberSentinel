import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, Check, Terminal, ExternalLink, Activity, Info, X } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

function getPlaybook(attackType, sourceIp) {
    const type = attackType?.toLowerCase() || '';
    if (type.includes('ddos') || type.includes('dos')) {
        return {
            title: "Volumetric Attack Mitigation",
            severity: "Critical",
            description: "A sudden influx of high-volume traffic designed to overwhelm network bandwidth or application endpoints.",
            command: `iptables -A INPUT -s ${sourceIp} -j DROP\niptables-save > /etc/iptables/rules.v4`,
            steps: ["1. Null-route the offending IP prefix.", "2. Enable rate-limiting on gateway routers.", "3. Notify upstream ISP for BGP blackholing if traffic exceeds 10Gbps."]
        };
    }
    if (type.includes('brute') || type.includes('auth')) {
       return {
            title: "Authentication Hardening",
            severity: "High",
            description: "Repeated failed login attempts aiming to bypass identity access controls.",
            command: `fail2ban-client set sshd banip ${sourceIp}\npasswd -l compromised_user`,
            steps: ["1. Ban source IP across all external listening ports.", "2. Force password resets on affected accounts.", "3. Enable mandatory MFA for the targeted service."]
        };
    }
    if (type.includes('sql') || type.includes('injection')) {
       return {
            title: "WAF Rule Deployment",
            severity: "Critical",
            description: "Attempts to manipulate application backend databases via malicious input vectors.",
            command: `waf-cli rule add --ip ${sourceIp} --pattern "SQLi" --action BLOCK`,
            steps: ["1. Instantly block IP dynamically at the WAF layer.", "2. Escalate to AppSec team to review the un-sanitized endpoint.", "3. Run database integrity checks on the last 24h of writes."]
        };
    }
    return {
        title: "Standard Anomaly Response",
        severity: "Medium",
        description: "Uncategorized hostile traffic flagged by the AI inference engine.",
        command: `ufw deny from ${sourceIp}\nlogger "SOC: Auto-blocked ${sourceIp}"`,
        steps: ["1. Deny FW access for internal subnets.", "2. Isolate target machine if internal lateral movement is suspected.", "3. Add threat signature to global ignore lists."]
    };
}

function Incidents() {
  const [logs, setLogs] = useState([]);
  const [resolvedIds, setResolvedIds] = useState(() => {
    const saved = localStorage.getItem('resolvedIncidents');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/logs`);
        setLogs(res.data);
      } catch (err) {
        console.error("Error fetching logs for incidents", err);
      }
    };
    fetchLogs();
    
    // Poll every 5 seconds for fast IR
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (id, e) => {
    if (e) e.stopPropagation();
    setResolvedIds(prev => {
      const newResolved = [...prev, id];
      localStorage.setItem('resolvedIncidents', JSON.stringify(newResolved));
      return newResolved;
    });
    if (selectedIncident && selectedIncident._id === id) {
        setSelectedIncident(null);
    }
  };

  const handleCommandCopy = (cmd) => {
      navigator.clipboard.writeText(cmd);
      // Optional: Add toast here
  };

  // Filter logs to find High/Critical threats
  const allIncidents = useMemo(() => {
    return logs.filter(log => (log.severity === 'Critical' || log.severity === 'High') && log.is_threat);
  }, [logs]);

  const activeIncidents = allIncidents.filter(log => !resolvedIds.includes(log._id)).slice(0, 50);
  const resolvedCount = allIncidents.filter(log => resolvedIds.includes(log._id)).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Incident Operations Center</h2>
          <p className="text-slate-400 text-sm">Interactive playbooks, triage analysis, and automated mitigation</p>
        </div>
        <div className="flex gap-4 text-sm font-semibold">
           <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 border-red-500/30 text-red-500">
               <Activity className="w-4 h-4 animate-pulse" />
               DEFCON 2
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center border border-slate-800">
          <div className="text-3xl font-bold text-red-500 mb-1 font-mono">{activeIncidents.length}</div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Open Incidents</p>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center border border-slate-800">
          <div className="text-3xl font-bold text-orange-400 mb-1 font-mono">{activeIncidents.length > 0 ? 1 : 0}</div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Under Investigation</p>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center border border-slate-800">
          <div className="text-3xl font-bold text-emerald-400 mb-1 font-mono">{resolvedCount}</div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Mitigated</p>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center border border-slate-800">
          <div className="text-3xl font-bold text-accent mb-1 font-mono">14m</div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">MTTR (Mean Time to Resolve)</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-[700px]">
        {/* Incident Queue */}
        <div className={cn("glass-panel rounded-2xl p-6 transition-all duration-300 flex flex-col", selectedIncident ? "xl:w-1/2 w-full" : "w-full")}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" /> Triage Queue
          </h3>
          
          {activeIncidents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-400 opacity-60" />
              </div>
              <h4 className="text-lg font-bold text-slate-200">Inbox Zero</h4>
              <p className="text-slate-400 max-w-sm mt-2 text-sm">All escalated flags have been handled. Standing by for ML pipeline alerts.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
               {activeIncidents.map(incident => (
                  <div 
                     key={incident._id} 
                     onClick={() => setSelectedIncident(incident)}
                     className={cn(
                        "p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden",
                        selectedIncident?._id === incident._id ? "bg-slate-800/80 border-accent" : "bg-slate-900 border-slate-800 hover:border-slate-600"
                     )}
                  >
                     <div className={cn("absolute left-0 top-0 bottom-0 w-1", incident.severity === 'Critical' ? 'bg-red-500' : 'bg-orange-500')}></div>
                     <div className="flex justify-between items-start mb-2 ml-2">
                        <div className="flex items-center gap-2">
                           <span className={cn("text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded", incident.severity === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400')}>
                              {incident.severity}
                           </span>
                           <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3"/> {new Date(incident.timestamp).toLocaleTimeString()}
                           </span>
                        </div>
                        <button onClick={(e) => handleResolve(incident._id, e)} className="text-xs text-slate-500 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 font-medium bg-slate-800 px-2 py-1 rounded">
                           <Check className="w-3 h-3" /> Resolve
                        </button>
                     </div>
                     <div className="ml-2">
                         <h4 className="font-bold text-slate-200 text-sm mb-1">{incident.attack_type || 'Unclassified Signature'}</h4>
                         <div className="flex justify-between items-center w-full">
                            <span className="text-blue-400 font-mono text-xs">{incident.source_ip} {`->`} {incident.destination_ip || 'Gateway'}</span>
                            <span className="text-accent text-xs font-mono">{(incident.threat_probability*100).toFixed(0)}% AI CONF</span>
                         </div>
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Dynamic Response Playbook Panes */}
        {selectedIncident && (
           <div className="xl:w-1/2 w-full glass-panel rounded-2xl flex flex-col border border-accent/30 overflow-hidden animate-fade-in-right relative">
              
              <div className="bg-gradient-to-r from-slate-900 to-[#0b1220] p-6 border-b border-slate-800 relative overflow-hidden">
                 <div className="absolute right-4 top-4 opacity-10">
                    <ShieldAlert className="w-48 h-48" />
                 </div>
                 <button onClick={() => setSelectedIncident(null)} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors z-20">
                     <X className="w-5 h-5" />
                 </button>
                 
                 <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-3">
                         <span className="bg-accent/20 text-accent px-2 py-1 rounded text-xs font-bold font-mono border border-accent/20">IR-PLAYBOOK</span>
                         <span className="text-slate-400 text-xs font-mono">{selectedIncident._id}</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white mb-2">{getPlaybook(selectedIncident.attack_type, selectedIncident.source_ip).title}</h3>
                     <p className="text-slate-400 text-sm max-w-[85%]">{getPlaybook(selectedIncident.attack_type, selectedIncident.source_ip).description}</p>
                 </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0b1220] p-4 rounded-xl border border-slate-800">
                         <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Hostile Origin</p>
                         <p className="text-blue-400 font-mono text-sm">{selectedIncident.source_ip}</p>
                      </div>
                      <div className="bg-[#0b1220] p-4 rounded-xl border border-slate-800">
                         <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target Endpoint</p>
                         <p className="text-emerald-400 font-mono text-sm">{selectedIncident.destination_ip || 'Core Gateway / LAN'}</p>
                      </div>
                      <div className="bg-[#0b1220] p-4 rounded-xl border border-slate-800">
                         <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">AI Conviction Score</p>
                         <p className="text-accent font-mono text-sm">{(selectedIncident.threat_probability*100).toFixed(2)}% MATCH</p>
                      </div>
                      <div className="bg-[#0b1220] p-4 rounded-xl border border-slate-800">
                         <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Detected Vector</p>
                         <p className="text-orange-400 font-mono text-sm uppercase">{selectedIncident.attack_type || 'SIGNATURE_OBFUSCATED'}</p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="font-bold text-slate-300 flex items-center gap-2 text-sm"><Terminal className="w-4 h-4 text-purple-400"/> Recommended Mitigation Steps</h4>
                      <div className="bg-[#030712] rounded-xl p-4 border border-slate-800 space-y-2">
                           {getPlaybook(selectedIncident.attack_type, selectedIncident.source_ip).steps.map((step, i) => (
                               <p key={i} className="text-slate-400 text-sm">{step}</p>
                           ))}
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="font-bold text-slate-300 flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-400"/> Firewall Execution Script</h4>
                      <div className="relative group">
                          <pre className="bg-[#030712] text-green-400 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto">
                              {getPlaybook(selectedIncident.attack_type, selectedIncident.source_ip).command}
                          </pre>
                          <button 
                             onClick={() => handleCommandCopy(getPlaybook(selectedIncident.attack_type, selectedIncident.source_ip).command)}
                             className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             Copy String
                          </button>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Info className="w-3 h-3"/> Run these commands in your edge router terminal to instantly mitigate.</p>
                  </div>
              </div>

              <div className="bg-slate-900 border-t border-slate-800 p-4 shrink-0 flex justify-end gap-3">
                  <button onClick={() => setSelectedIncident(null)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button 
                     onClick={() => handleResolve(selectedIncident._id)}
                     className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                  >
                     <CheckCircle className="w-4 h-4" /> Close Incident
                  </button>
              </div>
           </div>
        )}
      </div>

    </div>
  );
}

export default Incidents;
