import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldBan, Plus, Trash2, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:3000/api';

function FirewallRules() {
  const [rules, setRules] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch from Mongo
  useEffect(() => {
    axios.get(`${API_URL}/firewall-rules`).then(res => setRules(res.data)).catch(console.error);
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/firewall-rules`, {
        ip: newIp.trim(),
        reason: newReason.trim() || 'Manual Block via SOC Dashboard'
      });
      setRules(prev => [res.data, ...prev]);
      setNewIp('');
      setNewReason('');
    } catch (err) {
      console.error('Failed to add rule', err);
    }
  };

  const handleRemoveRule = async (id) => {
    try {
      await axios.delete(`${API_URL}/firewall-rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rule', err);
    }
  };

  const filteredRules = rules.filter(r => r.ip.includes(searchTerm) || r.reason.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Firewall Rules & Access Control</h2>
          <p className="text-slate-400 text-sm">Manage Active Blocklists and Traffic Policies</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          {rules.length} Policies Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Add New Rule Form */}
        <div className="glass-panel p-6 rounded-2xl h-fit">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
            <ShieldBan className="w-5 h-5 text-red-500" /> Create Block List Rule
          </h3>
          <form onSubmit={handleAddRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target IPv4 Address</label>
              <input 
                type="text" 
                placeholder="e.g. 10.0.0.50" 
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500/50 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Reason / Notes</label>
              <textarea 
                placeholder="Reason for blocking..." 
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500/50 transition-colors h-24 resize-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-bold transition-colors border border-red-500/30"
            >
              <Plus className="w-5 h-5" /> Enforce Block Rule
            </button>
          </form>

          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-sm text-amber-500/90">
             <AlertTriangle className="w-5 h-5 shrink-0" />
             <p>Policies applied here will instantly command the internal firewall to drop packets from these addresses via iptables routing.</p>
          </div>
        </div>

        {/* Active Rules List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-700/50 pb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Active Routing Denials
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search Blocklist..." 
                className="bg-slate-900 border border-slate-700 text-sm rounded-full pl-9 pr-3 py-1.5 w-full focus:outline-none focus:border-red-500/50 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
             {filteredRules.length > 0 ? filteredRules.map((rule) => (
                <div key={rule.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors gap-4">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                         <ShieldBan className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                         <p className="font-mono font-bold text-slate-200 text-lg">{rule.ip}</p>
                         <p className="text-sm text-slate-400 italic">"{rule.reason}"</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                         <p className="text-xs text-slate-500">Enforced On</p>
                         <p className="text-sm text-slate-300 font-mono">{new Date(rule.date).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveRule(rule.id)}
                        className="p-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove Policy"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                </div>
             )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                   <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-2" />
                   <p className="text-lg">No active block rules</p>
                   <p className="text-sm">Network traffic is flowing freely without manual blocks.</p>
                </div>
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default FirewallRules;
