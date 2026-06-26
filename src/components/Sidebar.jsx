import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Shield, Home, Compass, User, LogOut, LogIn, Menu, X, Sparkles, Award, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMobileMenu = () => setMobileOpen(!mobileOpen);
  const closeMobileMenu = () => setMobileOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore Missions', icon: Compass },
    ...(user ? (
      user.role === 'officer' ? [
        { to: '/officer-dashboard', label: 'Officer Dashboard', icon: FileText }
      ] : [
        { to: '/citizen-dashboard', label: 'Citizen Dashboard', icon: FileText },
        { to: '/report-issue', label: 'Report an Issue', icon: AlertTriangle },
        { to: '/profile', label: 'Hero Profile', icon: User }
      ]
    ) : [])
  ];

  const xpPercent = user ? Math.min((user.xp / user.nextLevelXp) * 100, 100) : 0;

  // Sidebar Contents (reusable for desktop sidebar and mobile drawer)
  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-6">
      
      {/* Top Section */}
      <div className="space-y-8">
        
        {/* Branding Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" onClick={closeMobileMenu}>
          <div className="p-2 bg-brand-500/10 rounded-xl group-hover:bg-brand-500/20 border border-brand-500/20 group-hover:border-brand-500/40 transition-all duration-300">
            <Shield className="w-5 h-5 text-brand-400 group-hover:text-brand-300 group-hover:scale-105 transition-transform" />
          </div>
          <span className="font-extrabold text-base lg:text-lg tracking-tight text-white group-hover:text-slate-200 transition-colors">
            Jaan<span className="text-brand-400 font-medium">Sathi</span>
          </span>
        </Link>

        {/* Navigation Menu */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1">
            Menu Navigation
          </span>
          
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/10 to-brand-500/5 text-brand-300 border border-brand-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

      </div>

      {/* Bottom Section: Profile card or Portal Sign In */}
      <div className="border-t border-slate-800/80 pt-6">
        {user ? (
          <div className="space-y-4">
            
            {/* User details card */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-500/20"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-brand-500 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900">
                    {user.level}
                  </span>
                </div>
                <div className="text-left overflow-hidden">
                  <span className="block text-xs font-bold text-slate-200 truncate leading-none">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-semibold text-brand-300 tracking-wide mt-0.5 block leading-none">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Level {user.level} Progress</span>
                  <span>{user.xp} XP</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:border-rose-500/30 hover:text-rose-400 text-slate-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out Session</span>
            </button>

          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 text-center space-y-1">
              <Sparkles className="w-5 h-5 text-blue-400 mx-auto animate-pulse" />
              <p className="text-[10px] text-slate-400 font-medium">Join us to access volunteer statistics and achievements.</p>
            </div>
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Portal Sign In</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* --- DESKTOP VIEW SIDEBAR (Sticky on Left) --- */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-[#0c101b] border-r border-slate-800/80 z-40 shrink-0">
        <SidebarContent />
      </aside>

      {/* --- MOBILE VIEW TOP HEADER BAR --- */}
      <header className="md:hidden w-full h-16 bg-[#0c101b] border-b border-slate-800/80 flex items-center justify-between px-4 z-40 sticky top-0">
        <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <div className="p-1.5 bg-brand-500/10 rounded-lg border border-brand-500/20">
            <Shield className="w-4 h-4 text-brand-400" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            Jaan<span className="text-brand-400 font-medium">Sathi</span>
          </span>
        </Link>

        <button
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* --- MOBILE OVERLAY DRAWER PANEL --- */}
      {mobileOpen && (
        <>
          {/* Backdrop Blur overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 md:hidden"
            onClick={closeMobileMenu}
          />
          
          {/* Slide-over panel */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#0c101b] border-r border-slate-800/80 z-50 md:hidden flex flex-col h-full animate-slide-right">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
