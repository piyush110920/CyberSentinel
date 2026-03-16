import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 w-full">
      <div className="relative mb-8">
        <ShieldAlert className="w-32 h-32 text-orange-500 animate-pulse-slow relative z-10" />
        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
      </div>
      
      <h1 className="text-7xl font-bold font-orbitron mb-4 text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-500">
        404
      </h1>
      
      <h2 className="text-2xl font-bold text-slate-300 mb-4">
        Simulation Target Not Found
      </h2>
      
      <p className="text-slate-400 max-w-md mb-8">
        The simulation environment you tried to navigate to does not exist. Please return to the launchpad.
      </p>
      
      <Link 
        to="/" 
        className="glass-panel-hover flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:text-accent font-semibold transition-all"
      >
        <Home className="w-5 h-5" />
        Return to Simulator
      </Link>
    </div>
  );
}

export default NotFound;
