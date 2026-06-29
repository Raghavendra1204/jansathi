import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, MapPin, AlertTriangle, FileText, Cpu, 
  ChevronDown, ChevronUp, Users, Calendar, Sparkles, MessageSquare, 
  Bell, Settings, User, ShieldAlert, LogOut, Radio, BarChart3, 
  Megaphone, Brain, CheckCircle2, Award, Zap, ShieldCheck, LogIn, Menu, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications } from '../services/api';
import { db, isMockFirebase } from '../firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useTranslation } from '../context/TranslationContext';

export default function OfficerSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { t } = useTranslation();
  
  // Real-time Reports for count badges
  const [reports, setReports] = useState([]);

  // Accordion Section states
  const [expandedSections, setExpandedSections] = useState({
    aiOperations: true,
    reportManagement: true,
    departments: false,
    fieldOps: false,
    community: false,
    analytics: false,
    communication: false,
    account: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleMobileMenu = () => setMobileOpen(!mobileOpen);
  const closeMobileMenu = () => setMobileOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  // Listen to reports in real-time for navigation badge counters
  useEffect(() => {
    if (isMockFirebase) {
      const loadMockReports = () => {
        try {
          const stored = localStorage.getItem('mock_reports');
          if (stored) {
            setReports(JSON.parse(stored));
          } else {
            setReports([]);
          }
        } catch (err) {
          console.error(err);
        }
      };
      loadMockReports();
      window.addEventListener('mock-auth-state-change', loadMockReports);
      return () => window.removeEventListener('mock-auth-state-change', loadMockReports);
    } else {
      const q = query(collection(db, 'reports'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReports(fetched);
      }, (error) => {
        console.error("Firestore sidebar reports listener failed:", error);
      });
      return () => unsubscribe();
    }
  }, []);

  // Listen to notifications
  useEffect(() => {
    const loadUnreadNotifications = async () => {
      try {
        const data = await fetchNotifications();
        setUnreadNotifications(data.filter(n => !n.read).length);
      } catch (err) {
        console.error(err);
      }
    };
    loadUnreadNotifications();
    window.addEventListener('refresh-notifications', loadUnreadNotifications);
    return () => window.removeEventListener('refresh-notifications', loadUnreadNotifications);
  }, []);

  // Helper to determine if link is active
  const isLinkActive = (to) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    const linkPath = to.split('?')[0];
    const linkQuery = to.includes('?') ? to.split('?')[1] : '';

    if (currentPath !== linkPath) return false;

    if (linkQuery) {
      const currentParams = new URLSearchParams(currentSearch);
      const linkParams = new URLSearchParams('?' + linkQuery);
      
      // Match key params like tab or filter
      for (const [key, value] of linkParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
    }
    return true;
  };

  // Render link menu helper
  const renderLink = (to, label, Icon, badgeCount = 0, isRed = false) => {
    const active = isLinkActive(to);
    return (
      <Link
        to={to}
        onClick={closeMobileMenu}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer ${
          active
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/25 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-905/35 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
          <span className="truncate">{t(label)}</span>
        </div>
        {badgeCount > 0 && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-extrabold ${
            isRed ? 'bg-rose-500/15 text-rose-455 border border-rose-500/30' : 'bg-blue-600/20 text-blue-450 border border-blue-600/30'
          }`}>
            {badgeCount}
          </span>
        )}
      </Link>
    );
  };

  // Stats computed from reports
  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const inProgressCount = reports.filter(r => r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const criticalCount = reports.filter(r => r.severity === 'Critical').length;
  const assignedMeCount = reports.filter(r => r.assignedOfficer === (user?.name || '') && r.status !== 'Resolved').length;
  const newReportsCount = reports.filter(r => r.status === 'Submitted' || !r.status).length;

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-4 space-y-4">
      
      {/* Scrollable Navigation section */}
      <div className="space-y-4.5 overflow-y-auto shrink-0 pr-1 scrollbar-thin max-h-[82vh] text-left">
        
        {/* Branding Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0 px-1" onClick={closeMobileMenu}>
          <div className="p-2 bg-blue-600/10 rounded-xl group-hover:bg-blue-600/20 border border-blue-500/20 group-hover:border-blue-500/40 transition-all duration-300">
            <Shield className="w-5 h-5 text-blue-400 group-hover:text-blue-300 group-hover:scale-105 transition-transform" />
          </div>
          <span className="font-extrabold text-base lg:text-lg tracking-tight text-white group-hover:text-slate-200 transition-colors">
            Jaan<span className="text-blue-400 font-medium">Sathi</span>
            <span className="ml-1.5 text-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Gov</span>
          </span>
        </Link>

        {/* AI STATUS CARD */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/20 to-slate-900/30 border border-blue-900/30 space-y-2 select-none">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-blue-400 animate-spin-slow" />
              <span>AI STATUS</span>
            </span>
            <span className="flex items-center gap-1.5 text-[8px] text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gemini AI
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-400">
            <div className="bg-slate-950/30 border border-slate-900/50 p-2 rounded-lg space-y-0.5">
              <span className="block text-[8px] text-slate-500 uppercase">Sys Health</span>
              <span className="text-xs font-black text-slate-200">98%</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-900/50 p-2 rounded-lg space-y-0.5">
              <span className="block text-[8px] text-slate-500 uppercase">Today's Posts</span>
              <span className="text-xs font-black text-blue-400">{reports.length + 27}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-900/50 p-2 rounded-lg space-y-0.5">
              <span className="block text-[8px] text-slate-500 uppercase">Critical alerts</span>
              <span className="text-xs font-black text-rose-455">{criticalCount}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-900/50 p-2 rounded-lg space-y-0.5">
              <span className="block text-[8px] text-slate-500 uppercase">Risks Predicted</span>
              <span className="text-xs font-black text-amber-500">3</span>
            </div>
          </div>
        </div>

        {/* ACCORDION CATEGORIES */}
        <div className="space-y-3">
          
          {/* SECTION 1: AI OPERATIONS */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('aiOperations')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("AI Operations")}</span>
              {expandedSections.aiOperations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.aiOperations && (
              <div className="space-y-0.5 pl-1.5 transition-all duration-300 animate-fade-in">
                {renderLink('/', 'Government Home', ShieldCheck)}
                {renderLink('/officer-dashboard?tab=command-center', 'Dashboard', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=verification', 'Document Verification', FileText)}
              </div>
            )}
          </div>

          {/* SECTION 2: REPORT MANAGEMENT */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('reportManagement')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Report Management")}</span>
              {expandedSections.reportManagement ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.reportManagement && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/officer-dashboard?tab=queue&filter=New', 'New Reports', Radio, newReportsCount)}
                {renderLink('/officer-dashboard?tab=queue&filter=Pending', 'Pending Reports', FileText, pendingCount)}
                {renderLink('/officer-dashboard?tab=queue&filter=InProgress', 'In Progress', Sparkles, inProgressCount)}
                {renderLink('/officer-dashboard?tab=queue&filter=Resolved', 'Resolved', CheckCircle2, resolvedCount)}
                {renderLink('/officer-dashboard?tab=queue&filter=Critical', 'Critical Issues', AlertTriangle, criticalCount, true)}
                {renderLink('/officer-dashboard?tab=queue&filter=AssignedMe', 'Assigned To Me', User, assignedMeCount)}
              </div>
            )}
          </div>

          {/* SECTION 4: DEPARTMENTS */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('departments')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Departments")}</span>
              {expandedSections.departments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.departments && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/officer-dashboard?tab=analytics&dept=roads', 'Road Department', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=analytics&dept=water', 'Water Department', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=analytics&dept=electricity', 'Electricity Dept.', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=analytics&dept=sanitation', 'Sanitation Dept.', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=analytics&dept=health', 'Health Department', LayoutDashboard)}
                {renderLink('/officer-dashboard?tab=analytics&dept=police', 'Police Department', LayoutDashboard)}
              </div>
            )}
          </div>

          {/* SECTION 5: FIELD OPERATIONS */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('fieldOps')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Field Operations")}</span>
              {expandedSections.fieldOps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.fieldOps && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/officer-dashboard?tab=command-center&sub=staff', 'Field Staff', Users)}
                {renderLink('/officer-dashboard?tab=command-center&sub=assign', 'Assignments', FileText)}
                {renderLink('/officer-dashboard?tab=command-center&sub=status', 'Live Team Status', Radio)}
                {renderLink('/officer-dashboard?tab=command-center&sub=tracking', 'Response Tracking', MapPin)}
              </div>
            )}
          </div>

          {/* SECTION 6: COMMUNITY */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('community')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Community")}</span>
              {expandedSections.community ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.community && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/explore', 'Community Partners', Users)}
                {renderLink('/explore', 'NGOs', Award)}
                {renderLink('/explore', 'Volunteer Campaigns', Zap)}
                {renderLink('/explore', 'Events', Calendar)}
                {renderLink('/explore', 'Citizen Engagement', MessageSquare)}
              </div>
            )}
          </div>

          {/* SECTION 7: ANALYTICS */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('analytics')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Analytics")}</span>
              {expandedSections.analytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.analytics && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/officer-dashboard?tab=analytics', 'Performance Dash', BarChart3)}
                {renderLink('/officer-dashboard?tab=analytics&view=depts', 'Dept Analytics', BarChart3)}
                {renderLink('/officer-dashboard?tab=analytics&view=citizens', 'Citizen Participation', Users)}
                {renderLink('/officer-dashboard?tab=analytics&view=wards', 'Ward Statistics', BarChart3)}
                {renderLink('/officer-dashboard?tab=command-center', 'Heatmaps', MapPin)}
                {renderLink('/officer-dashboard?tab=agents', 'AI Insights', Cpu)}
              </div>
            )}
          </div>

          {/* SECTION 8: COMMUNICATION */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('communication')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Communication")}</span>
              {expandedSections.communication ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.communication && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/profile?tab=messages', 'Messages', MessageSquare)}
                {renderLink('/profile?tab=notifications', 'Notifications', Bell, unreadNotifications)}
                {renderLink('/profile?tab=messages&sub=announcements', 'Announcements', Megaphone)}
                {renderLink('/profile?tab=messages&sub=broadcast', 'Broadcast Center', Radio)}
              </div>
            )}
          </div>

          {/* SECTION 9: ACCOUNT */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('account')}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              <span>{t("Account Settings")}</span>
              {expandedSections.account ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedSections.account && (
              <div className="space-y-0.5 pl-1.5 animate-fade-in">
                {renderLink('/officer-dashboard?tab=profile', 'Officer Profile', User)}
                {renderLink('/profile?tab=settings', 'Settings', Settings)}
                {renderLink('/profile?tab=security', 'Security', Shield)}
                {renderLink('/officer-dashboard?tab=profile&sub=logs', 'Audit Logs', FileText)}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* OFFICER PROFILE CARD & LOGOUT */}
      <div className="border-t border-slate-800/80 pt-3.5 shrink-0 select-none">
        {user ? (
          <div className="space-y-3">
            
            {/* Officer details card */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/85 space-y-2.5 text-left">
              <div className="flex items-center gap-2.5 text-left">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                />
                <div className="overflow-hidden min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-200 truncate leading-none">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-semibold text-blue-300 tracking-wide mt-0.5 block leading-none truncate uppercase">
                    {t(user.designation || 'Operations Officer')}
                  </span>
                </div>
              </div>

              {/* Stats & Progress indicators */}
              <div className="space-y-1.5 text-[9px] font-bold text-slate-400 border-t border-slate-850/50 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID / Dept:</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{user.employeeId || 'K-9831'} / {t(user.department || 'Urban Works')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Perf. Score:</span>
                  <span className="text-emerald-450">{user.performanceScore || '94%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Cases:</span>
                  <span className="text-blue-400">{resolvedCount + 54} Resolved</span>
                </div>
                
                {/* Monthly Target Progress */}
                <div className="space-y-1 pt-1.5 border-t border-slate-900/50">
                  <div className="flex justify-between text-[8px] font-bold text-slate-500">
                    <span>Monthly Target</span>
                    <span>{resolvedCount + 42} / 50 Resolved</span>
                  </div>
                  <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(((resolvedCount + 42) / 50) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-slate-900 border border-slate-800/60 hover:bg-rose-955/20 hover:border-rose-500/30 hover:text-rose-455 text-slate-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{t("Logout")}</span>
            </button>

          </div>
        ) : (
          <div className="space-y-3">
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
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-[#070b13] border-r border-slate-850/80 z-40 shrink-0">
        {SidebarContent()}
      </aside>

      {/* --- MOBILE VIEW TOP HEADER BAR --- */}
      <header className="md:hidden w-full h-16 bg-[#070b13] border-b border-slate-850/80 flex items-center justify-between px-4 z-40 sticky top-0 shrink-0">
        <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <div className="p-1.5 bg-blue-600/10 rounded-lg border border-blue-500/20">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            Jaan<span className="text-blue-400 font-medium">Sathi</span>
          </span>
        </Link>

        <button
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="p-2 bg-slate-900 border border-slate-850 rounded-xl hover:bg-slate-800 text-slate-350 hover:text-white transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="w-4 h-4 text-slate-300" /> : <Menu className="w-4 h-4 text-slate-350" />}
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
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#070b13] border-r border-slate-850/80 z-50 md:hidden flex flex-col h-full animate-slide-right">
            {SidebarContent()}
          </aside>
        </>
      )}
    </>
  );
}
