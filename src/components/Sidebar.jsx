import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, Home, User, LogOut, LogIn, Menu, X, Sparkles, Award, FileText, 
  LayoutDashboard, Users, Calendar, MessageSquare, Bell, Settings 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications } from '../services/api';
import { useTranslation } from '../context/TranslationContext';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  const toggleMobileMenu = () => setMobileOpen(!mobileOpen);
  const closeMobileMenu = () => setMobileOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  const loadUnreadCount = async () => {
    try {
      const data = await fetchNotifications();
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    window.addEventListener('refresh-notifications', loadUnreadCount);
    return () => {
      window.removeEventListener('refresh-notifications', loadUnreadCount);
    };
  }, []);

  const isLinkActive = (link) => {
    if (link.type === 'button') return false;
    
    const currentPath = location.pathname;
    const currentSearch = location.search;

    const linkPath = link.to.split('?')[0];
    const linkQuery = link.to.includes('?') ? link.to.split('?')[1] : '';

    if (currentPath !== linkPath) return false;

    // Special case for profile page tabs
    if (linkPath === '/profile') {
      const currentTab = new URLSearchParams(currentSearch).get('tab') || 'profile';
      const linkTab = new URLSearchParams('?' + linkQuery).get('tab') || 'profile';
      return currentTab === linkTab;
    }

    // Normal link match
    return true;
  };

  const navLinks = user ? [
    { to: '/', label: 'Home Feed', icon: Home },
    { to: user.role === 'officer' ? '/officer-dashboard' : '/citizen-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile?tab=profile', label: 'Profile', icon: User },
    { to: '/profile?tab=communities', label: 'Communities', icon: Users },
    { to: '/explore', label: 'Events', icon: Calendar },
    { to: '/profile?tab=ai', label: 'AI Assistant', icon: Sparkles },
    { to: '/profile?tab=documents', label: 'Documents', icon: FileText },
    { to: '/profile?tab=messages', label: 'Messages', icon: MessageSquare },
    { 
      type: 'button', 
      onClick: () => {
        closeMobileMenu();
        window.dispatchEvent(new Event('open-notifications-panel'));
      }, 
      label: 'Notifications', 
      icon: Bell, 
      badgeCount: unreadCount 
    },
    { to: '/profile?tab=security', label: 'Security', icon: Shield },
    { to: '/profile?tab=settings', label: 'Settings', icon: Settings }
  ] : [
    { to: '/', label: 'Home Feed', icon: Home },
    { to: '/explore', label: 'Explore Missions', icon: Calendar }
  ];

  const xpPercent = user ? Math.min((user.xp / user.nextLevelXp) * 100, 100) : 0;

  // Sidebar Contents (reusable for desktop sidebar and mobile drawer)
  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-6">
      
      {/* Top Section */}
      <div className="space-y-6 overflow-y-auto shrink-0 pr-1 scrollbar-thin max-h-[75vh]">
        
        {/* Branding Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0" onClick={closeMobileMenu}>
          <div className="p-2 bg-brand-500/10 rounded-xl group-hover:bg-brand-500/20 border border-brand-500/20 group-hover:border-brand-500/40 transition-all duration-300">
            <Shield className="w-5 h-5 text-brand-400 group-hover:text-brand-300 group-hover:scale-105 transition-transform" />
          </div>
          <span className="font-extrabold text-base lg:text-lg tracking-tight text-white group-hover:text-slate-200 transition-colors">
            Jaan<span className="text-brand-400 font-medium">Sathi</span>
          </span>
        </Link>

        {/* Navigation Menu */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1 shrink-0">
            {t("Portal Workspace")}
          </span>
          
          {navLinks.map((link, idx) => {
            const Icon = link.icon;
            if (link.type === 'button') {
              return (
                <button
                  key={idx}
                  onClick={link.onClick}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/35 border border-transparent transition-all duration-200 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(link.label)}</span>
                  </div>
                  {link.badgeCount > 0 && (
                    <span className="bg-blue-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full shrink-0">
                      {link.badgeCount}
                    </span>
                  )}
                </button>
              );
            }
            const active = isLinkActive(link);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-brand-600/10 to-brand-500/5 text-brand-300 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t(link.label)}</span>
              </Link>
            );
          })}
        </div>

      </div>

      {/* Bottom Section: Profile card or Portal Sign In */}
      <div className="border-t border-slate-800/80 pt-4 shrink-0">
        {user ? (
          <div className="space-y-3.5">
            
            {/* User details card */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/85 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/20"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-brand-500 text-white font-extrabold text-[7px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                    {user.level || 1}
                  </span>
                </div>
                <div className="text-left overflow-hidden min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-200 truncate leading-none">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-semibold text-brand-300 tracking-wide mt-0.5 block leading-none capitalize">
                    {t(user.role)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-400">
                  <span>{t("Progress")}</span>
                  <span>{user.xp || 0} XP</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
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
              className="w-full py-2.5 bg-slate-900 border border-slate-800/60 hover:bg-rose-955/20 hover:border-rose-500/30 hover:text-rose-455 text-slate-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{t("Logout")}</span>
            </button>

          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
              <Sparkles className="w-5 h-5 text-blue-400 mx-auto animate-pulse" />
              <p className="text-[10px] text-slate-400 font-medium">{t("Join us to access volunteer statistics and achievements.")}</p>
            </div>
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{t("Portal Sign In")}</span>
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
      <header className="md:hidden w-full h-16 bg-[#0c101b] border-b border-slate-800/80 flex items-center justify-between px-4 z-40 sticky top-0 shrink-0">
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
