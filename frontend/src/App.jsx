import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex flex-col items-center gap-2 border-b border-slate-800">
          <Shield className="w-12 h-12 text-accent glow-text" />
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent text-center">
            Cyber Sentinel
          </h1>
          <p className="text-xs text-slate-400 font-medium">SOC Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link 
            to="/" 
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium",
              location.pathname === '/' ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
