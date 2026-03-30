import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, Globe, Settings as SettingsIcon, ChevronLeft, ChevronRight, AlertTriangle, Network, ScrollText, ShieldBan, Cpu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ThreatIntel from './pages/ThreatIntel';
import Settings from './pages/Settings';
import Incidents from './pages/Incidents';
import NetworkMap from './pages/NetworkMap';
import AuditLogs from './pages/AuditLogs';
import FirewallRules from './pages/FirewallRules';
import SystemHealth from './pages/SystemHealth';
import NotFound from './pages/NotFound';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Layout({ children }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 border-r border-slate-800 flex flex-col relative transition-all duration-300",
        isCollapsed ? "w-full md:w-20" : "w-full md:w-64"
      )}>
        {/* Collapse Toggle Button (Desktop only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white z-50 hidden md:flex items-center justify-center glow-cyan hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={cn("flex flex-col items-center gap-2 border-b border-slate-800 transition-all", isCollapsed ? "p-4" : "p-6")}>
          <Shield className={cn("text-accent glow-text transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-12 h-12")} />
          
          <div className={cn("flex flex-col items-center overflow-hidden transition-all duration-300", isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100")}>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent text-center whitespace-nowrap">
              Cyber Sentinel
            </h1>
            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">SOC Dashboard</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <Link 
            to="/" 
            title={isCollapsed ? "Dashboard" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
          </Link>
          <Link 
            to="/reports" 
            title={isCollapsed ? "Analysis Reports" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/reports' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Analysis Reports</span>}
          </Link>
          <Link 
            to="/incidents" 
            title={isCollapsed ? "Incidents" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/incidents' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Incidents</span>}
          </Link>
          <Link 
            to="/network" 
            title={isCollapsed ? "Network Map" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/network' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <Network className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Network Map</span>}
          </Link>
          <Link 
            to="/intel" 
            title={isCollapsed ? "Threat Intel" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/intel' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Threat Intel</span>}
          </Link>
          <Link 
            to="/firewall" 
            title={isCollapsed ? "Firewall Rules" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/firewall' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <ShieldBan className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Firewall Rules</span>}
          </Link>
          <Link 
            to="/health" 
            title={isCollapsed ? "System Health" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/health' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <Cpu className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">System Health</span>}
          </Link>
          <Link 
            to="/audit" 
            title={isCollapsed ? "Audit Logs" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/audit' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <ScrollText className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Audit Logs</span>}
          </Link>
          <Link 
            to="/settings" 
            title={isCollapsed ? "Settings" : ""}
            className={cn(
              "flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium mt-auto",
              isCollapsed ? "px-0 justify-center" : "px-4",
              location.pathname === '/settings' ? "bg-accent/10 text-accent border border-accent/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
            )}
          >
            <SettingsIcon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/network" element={<NetworkMap />} />
          <Route path="/intel" element={<ThreatIntel />} />
          <Route path="/firewall" element={<FirewallRules />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
