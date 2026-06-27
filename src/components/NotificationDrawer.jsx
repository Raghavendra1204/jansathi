import React, { useState, useEffect } from 'react';
import { X, Bell, CheckSquare, Sparkles, AlertCircle, ShieldAlert, Award, Inbox, Loader } from 'lucide-react';
import { fetchNotifications, toggleNotificationRead, markAllNotificationsAsRead } from '../services/api';

const CATEGORIES = [
  'All',
  'Community Updates',
  'Event Invitations',
  'Security Alerts',
  'Verification Updates',
  'AI Recommendations',
  'System Announcements'
];

export default function NotificationDrawer({ isOpen, onClose, onCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      if (onCountChange) {
        const unreadCount = data.filter(n => !n.read).length;
        onCountChange(unreadCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Listen to external triggers to refresh notifications
  useEffect(() => {
    const handleRefresh = () => {
      loadNotifications();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (onCountChange) onCountChange(0);
      
      // Dispatch event to sync other components
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRead = async (id) => {
    // 1. Toggle expansion drop-down
    setExpandedId(prev => prev === id ? null : id);

    // 2. Mark as read if unread
    const target = notifications.find(n => n.id === id);
    if (target && !target.read) {
      try {
        const updated = await toggleNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: updated.read } : n));
        
        // Update unread count
        const updatedNotifs = notifications.map(n => n.id === id ? { ...n, read: updated.read } : n);
        const unreadCount = updatedNotifs.filter(n => !n.read).length;
        if (onCountChange) onCountChange(unreadCount);

        // Dispatch event to sync other components
        window.dispatchEvent(new Event('refresh-notifications'));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Verification Updates':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'Security Alerts':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'AI Recommendations':
        return <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'Community Updates':
      case 'Event Invitations':
        return <Bell className="w-4 h-4 text-brand-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredNotifs = activeCategory === 'All'
    ? notifications
    : notifications.filter(n => n.category === activeCategory);

  const unreadTotal = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md h-full bg-[#0c101b] border-l border-slate-800 shadow-2xl flex flex-col justify-between z-10 animate-slide-left">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-extrabold text-white tracking-tight">Notification Center</h2>
            {unreadTotal > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                {unreadTotal} new
              </span>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer animate-fade-in"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-5 py-3 border-b border-slate-800/60 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-950/20">
          {CATEGORIES.map((cat) => {
            const count = cat === 'All' 
              ? notifications.filter(n => !n.read).length
              : notifications.filter(n => n.category === cat && !n.read).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                    : 'bg-slate-900/50 border border-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat === 'All' ? 'All Alerts' : cat.split(' ')[0]}</span>
                {count > 0 && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-900/40 border border-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-500">
              <Inbox className="w-8 h-8 text-slate-700 mb-3" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Clear</h3>
              <p className="text-[10px] text-slate-550 mt-1 max-w-[200px]">No active notifications under this filter.</p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => handleToggleRead(notif.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer flex gap-3.5 relative overflow-hidden group ${
                  notif.read 
                    ? 'bg-slate-900/15 border-slate-800/40 hover:border-slate-800' 
                    : 'bg-slate-900/45 border-slate-800 hover:border-brand-500/20 shadow-md'
                }`}
              >
                {/* Unread Indicator Bar */}
                {!notif.read && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600" />
                )}

                {/* Category Icon */}
                <div className={`p-2 rounded-lg shrink-0 h-fit ${
                  notif.read ? 'bg-slate-900/60 text-slate-500' : 'bg-slate-950 text-slate-300'
                }`}>
                  {getCategoryIcon(notif.category)}
                </div>

                {/* Content details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[10px] font-bold ${notif.read ? 'text-slate-500' : 'text-brand-300'}`}>
                      {notif.category}
                    </span>
                    <span className="text-[9px] text-slate-500 shrink-0 font-semibold mt-0.5">{notif.time}</span>
                  </div>
                  
                  <h4 className={`text-xs font-extrabold leading-snug truncate ${
                    notif.read ? 'text-slate-400' : 'text-white'
                  }`}>
                    {notif.title}
                  </h4>
                  
                  {/* Collapsible details drop down accordion */}
                  <div className={`transition-all duration-300 overflow-hidden ${
                    expandedId === notif.id ? 'max-h-28 mt-2.5 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <p className={`text-[11px] leading-relaxed ${
                      notif.read ? 'text-slate-500' : 'text-slate-350'
                    }`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800/60 bg-slate-950/20 shrink-0 flex gap-3">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadTotal === 0}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 disabled:text-slate-600 border border-slate-800 disabled:border-slate-900/40 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
