import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportIssue from './pages/ReportIssue';
import OfficerDashboard from './pages/OfficerDashboard';
import Chatbot from './components/Chatbot';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col md:flex-row">
        {/* Responsive Dashboard Sidebar */}
        <Sidebar />

        {/* Floating AI Assistant Chatbot */}
        <Chatbot />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/citizen-dashboard" element={<CitizenDashboard />} />
              <Route path="/report-issue" element={<ReportIssue />} />
              <Route path="/officer-dashboard" element={<OfficerDashboard />} />
              <Route path="*" element={
                <div className="glass p-12 text-center rounded-2xl max-w-md mx-auto border border-slate-800/60 mt-12 animate-fade-in">
                  <h3 className="font-bold text-xl text-white">404 - Page Not Found</h3>
                  <p className="text-slate-400 text-sm mt-2">The hero guild could not find this page!</p>
                </div>
              } />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-slate-900 bg-[#070b13] py-8 text-center text-xs text-slate-500 mt-auto">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                &copy; {new Date().getFullYear()} Jaan Sathi Platform. All rights reserved.
              </div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-slate-400 transition-colors">Hero Guidelines</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}
