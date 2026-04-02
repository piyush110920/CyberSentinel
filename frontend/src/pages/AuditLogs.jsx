import React, { useState, useEffect } from 'react';
import { ScrollText, TerminalSquare, Copy, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const [auditRes, trafficRes] = await Promise.all([
          axios.get(`${API_URL}/audit-logs`),
          axios.get(`${API_URL}/logs`)
        ]);
        
        const systemAudits = auditRes.data.map(l => ({
          id: l.id,
          time: l.time,
          type: l.type,
          message: l.message,
          user: l.user,
          isThreat: false
        }));

        const trafficData = trafficRes.data.slice(0, 50).map((l) => ({
          id: `TR-${l._id.slice(-6).toUpperCase()}`,
          time: l.timestamp,
          type: l.is_threat ? 'THREAT_DETECTED' : 'TRAFFIC_PASS',
          message: `${l.is_threat ? 'Blocked' : 'Allowed'} traffic from ${l.source_ip} to ${l.destination_ip || 'Local Gateway'}. Payload: ${l.attack_type || 'None'}.`,
          user: l.is_threat ? 'POLICY_ENGINE' : 'FIREWALL',
          isThreat: l.is_threat
        }));
        
        // Merge and sort
        const merged = [...systemAudits, ...trafficData];
        // deduplicate by id
        const unique = merged.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
        setLogs(unique.sort((a,b) => new Date(b.time) - new Date(a.time)));
      } catch (err) {
        console.error("Error fetching logs for audit", err);
      }
    };
    fetchAllLogs();
    
    // Poll new logs
    const interval = setInterval(fetchAllLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    const logText = logs.map(l => `${l.id} | ${new Date(l.time).toISOString()} | [${l.type}] | ${l.message} | USER: ${l.user}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-emerald-400" />
            Audit Logs
          </h2>
          <p className="text-slate-400 text-sm">Immutable ledger of system events, configuration changes, and active traffic.</p>
        </div>
      </div>

      <div className="glass-panel p-1 rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-slate-400" />
              <span className="font-mono text-sm text-slate-300">/var/log/cybersentinel/audit_combined.log</span>
            </div>
            <button 
              onClick={handleCopy}
              className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium" 
              title="Copy to clipboard"
            >
              {copied ? <><Check className="w-4 h-4 text-green-400"/> Copied!</> : <><Copy className="w-4 h-4" /> Copy Buffer</>}
            </button>
        </div>
        <div className="p-4 bg-[#0a0f18] font-mono text-sm overflow-y-auto h-[600px] flex flex-col gap-1 custom-scrollbar">
            {logs.map(log => (
                <div key={log.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 py-1.5 hover:bg-slate-800/40 rounded px-2 transition-colors group">
                    <span className="text-slate-600 whitespace-nowrap w-24 select-none">{log.id}</span>
                    <span className="text-blue-500/80 whitespace-nowrap w-48">{new Date(log.time).toISOString().replace('T', ' ').replace('Z', '')}</span>
                    <span className={`whitespace-nowrap w-40 font-bold ${
                      log.type.includes('SUCCESS') || log.type.includes('PASS') ? 'text-emerald-500' : 
                      log.type.includes('THREAT') || log.type.includes('DISCONNECT') ? 'text-red-500' : 
                      log.type.includes('SYSTEM') ? 'text-purple-400' : 'text-amber-400'
                    }`}>
                        [{log.type}]
                    </span>
                    <span className={`flex-1 ${log.isThreat ? 'text-red-200' : 'text-slate-300'}`}>{log.message}</span>
                    <span className="text-slate-500 whitespace-nowrap flex items-center gap-1 text-xs">
                        <span className="opacity-40">USER:</span> <span className="group-hover:text-amber-100 transition-colors">{log.user}</span>
                    </span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default AuditLogs;
