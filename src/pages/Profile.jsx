import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Award, Clock, Shield, Sparkles, CheckCircle2, History, AlertCircle, Loader } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function Profile() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass p-12 text-center rounded-2xl max-w-md mx-auto border border-slate-800/60 mt-12 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="font-bold text-xl text-white">Access Denied</h3>
        <p className="text-slate-400 text-sm mt-1">Please log in to view your Hero Profile.</p>
      </div>
    );
  }

  const xp = user.xp || 0;
  const nextLevelXp = user.nextLevelXp || 1000;
  const xpPercent = Math.min((xp / nextLevelXp) * 100, 100);
  const level = user.level || 1;
  const completedMissions = user.completedMissions || 0;
  const hoursVolunteered = user.hoursVolunteered || 0;
  const badges = user.badges || [];
  const impactTimeline = user.impactTimeline || [];
  const avatar = user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Profile Card */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
        {/* Glow behind card */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
          {/* Avatar with Ring */}
          <div className="relative">
            <img
              src={avatar}
              alt={user.name}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-4 ring-brand-500/30"
            />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
              {level}
            </div>
          </div>

          {/* Profile text and XP progress */}
          <div className="flex-1 text-center md:text-left space-y-4 w-full">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Level {level} {user.role || 'Citizen'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{user.name}</h1>
              <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1 max-w-md mx-auto md:mx-0">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>XP Progress</span>
                <span className="text-brand-300">{xp} / {nextLevelXp} XP</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-sky-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Metrics Panel, Badges Catalog, History Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Badges */}
        <div className="md:col-span-1 space-y-8">
          
          {/* Stats List */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              <span>Hero Stats</span>
            </h2>

            <div className="grid grid-cols-3 md:grid-cols-1 gap-4 divide-x md:divide-x-0 md:divide-y divide-slate-800/40">
              <div className="text-center md:text-left md:pb-3.5">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total XP</span>
                <span className="text-xl md:text-2xl font-extrabold text-white mt-1 block">
                  {xp + 1000} {/* Combined XP estimation */}
                </span>
              </div>
              
              <div className="text-center md:text-left pt-0 pl-4 md:pl-0 md:py-3.5">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Missions Done</span>
                <span className="text-xl md:text-2xl font-extrabold text-white mt-1 block flex items-center justify-center md:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{completedMissions}</span>
                </span>
              </div>

              <div className="text-center md:text-left pt-0 pl-4 md:pl-0 md:pt-3.5">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Impact Hours</span>
                <span className="text-xl md:text-2xl font-extrabold text-white mt-1 block flex items-center justify-center md:justify-start gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{hoursVolunteered}h</span>
                </span>
              </div>
            </div>
          </div>

          {/* Badges List */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-400" />
              <span>Unlocked Badges</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {badges.length === 0 ? (
                <span className="col-span-2 text-xs text-slate-500 italic text-center py-2">No badges unlocked yet</span>
              ) : (
                badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all hover:scale-[1.03] ${badge.color}`}
                  >
                    <span className="text-2xl mb-1.5">{badge.icon}</span>
                    <span className="text-[10px] font-bold tracking-tight">{badge.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-2">
          <div className="glass p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-lg space-y-6 h-full">
            <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-400" />
              <span>Contribution Timeline</span>
            </h2>

            <div className="relative border-l-2 border-slate-800 pl-6 ml-3 space-y-8 py-2 text-left">
              {impactTimeline.length === 0 ? (
                <span className="text-xs text-slate-500 italic block py-2">No contributions logged yet</span>
              ) : (
                impactTimeline.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-[31px] top-1 bg-brand-500 w-3.5 h-3.5 rounded-full border-4 border-slate-900 group-hover:scale-110 group-hover:bg-sky-400 transition-all duration-300" />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-[11px] text-slate-400">{formatDate(item.date)}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm shrink-0">
                        +{item.xpReward} XP
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
