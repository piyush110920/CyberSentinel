import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Simulation from './pages/Simulation';
import NotFound from './pages/NotFound';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-darkBg text-slate-100 font-sans flex flex-col items-center py-10 px-4">
      <header className="max-w-6xl w-full flex items-center gap-4 mb-10 pb-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-4 group">
          <Shield className="w-10 h-10 text-accent glow-text group-hover:scale-105 transition-transform" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-300 transition-all">
              Cyber Threat Simulator
            </h1>
            <p className="text-sm text-slate-400 font-medium">Standalone Testing Interface</p>
          </div>
        </Link>
      </header>
      
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Simulation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
