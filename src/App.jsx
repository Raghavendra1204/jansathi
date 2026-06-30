import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import OfficerSidebar from './components/OfficerSidebar';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportIssue from './pages/ReportIssue';
import OfficerDashboard from './pages/OfficerDashboard';
import EventDetail from './pages/EventDetail';
import ReportDetail from './pages/ReportDetail';
import Chatbot from './components/Chatbot';
import NotificationDrawer from './components/NotificationDrawer';
import { TranslationProvider } from './context/TranslationContext';

export default function App() {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [splashActive, setSplashActive] = useState(true);

  const syncTheme = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
      const themePreference = currentUser.preferences?.theme || 'dark';
      
      let activeTheme = themePreference;
      if (themePreference === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = prefersDark ? 'dark' : 'light';
      }

      setTheme(activeTheme);

      // Set class on documentElement
      if (activeTheme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    } catch {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  useEffect(() => {
    syncTheme();
    window.addEventListener('mock-auth-state-change', syncTheme);
    window.addEventListener('open-notifications-panel', () => setNotificationsOpen(true));
    
    const timer = setTimeout(() => {
      setSplashActive(false);
    }, 2800);
    
    return () => {
      window.removeEventListener('mock-auth-state-change', syncTheme);
      window.removeEventListener('open-notifications-panel', () => setNotificationsOpen(true));
      clearTimeout(timer);
    };
  }, []);

  return (
    <TranslationProvider>
      {splashActive && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b13] animate-fade-in text-center p-6 select-none">
          <div className="flex flex-col items-center space-y-6">
            <img 
              src="/logo.png" 
              alt="Jan Sathi" 
              className="w-32 h-32 md:w-40 md:h-40 object-contain animate-scale-up drop-shadow-[0_0_25px_rgba(59,130,246,0.3)]" 
            />
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-wider animate-slide-up">
                JAN <span className="text-blue-500 font-medium">SATHI</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm tracking-widest uppercase font-bold animate-pulse">
                जन सेवा, हमारा संकल्प
              </p>
            </div>
            <div className="w-48 bg-slate-900 h-1 rounded-full overflow-hidden mt-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full animate-loading-progress" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
      <Router>
      <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
        theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0b0f19] text-slate-100'
      }`}>
        {/* Responsive Dashboard Sidebar */}
        {user?.role === 'officer' ? <OfficerSidebar /> : <Sidebar />}

        {/* Floating AI Assistant Chatbot */}
        <Chatbot />

        {/* Global Notifications Drawer Overlay */}
        <NotificationDrawer 
          isOpen={notificationsOpen} 
          onClose={() => setNotificationsOpen(false)} 
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/report/:id" element={<ReportDetail />} />
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
          <footer className={`w-full border-t py-8 text-center text-xs mt-auto transition-colors duration-300 ${
            theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-550' : 'bg-[#070b13] border-slate-900 text-slate-500'
          }`}>
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                &copy; {new Date().getFullYear()} Jan Sathi Platform. All rights reserved.
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
  </TranslationProvider>
);
}
