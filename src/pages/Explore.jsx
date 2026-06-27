import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { fetchMissions, joinMission } from '../services/api';

const CATEGORIES = ['All', 'Environment', 'Education', 'Social Help', 'Animal Welfare'];

export default function Explore() {
  const [missions, setMissions] = useState([]);
  const [filteredMissions, setFilteredMissions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);

  useEffect(() => {
    async function loadMissions() {
      try {
        const data = await fetchMissions();
        setMissions(data);
        setFilteredMissions(data);
      } catch (error) {
        console.error("Failed to load missions:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMissions();
  }, []);

  useEffect(() => {
    let result = missions;

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(m => m.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.location.toLowerCase().includes(query) ||
        m.organizer.toLowerCase().includes(query)
      );
    }

    setFilteredMissions(result);
  }, [selectedCategory, searchQuery, missions]);

  const handleJoinMission = async (missionId) => {
    setJoiningId(missionId);
    try {
      const res = await joinMission(missionId);
      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message || `Mission joined successfully! See you there.`
        });
        // Update spots locally
        setMissions(prevMissions => 
          prevMissions.map(m => {
            if (m.id === missionId && m.spotsFilled < m.spotsTotal) {
              return { ...m, spotsFilled: m.spotsFilled + 1, joined: true };
            }
            return m;
          })
        );
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Could not register for this mission.'
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Could not register for this mission. Please try again.'
      });
    } finally {
      setJoiningId(null);
      // Auto-hide notification after 4s
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 animate-slide-in ${
          notification.type === 'success' 
            ? 'glass border-emerald-500/30 text-emerald-400 bg-emerald-950/20' 
            : 'glass border-rose-500/30 text-rose-400 bg-rose-950/20'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Active Missions</h1>
        <p className="text-slate-400 max-w-xl">
          Browse campaigns and events looking for volunteers. Register to contribute and earn Hero XP.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search missions, locations, or organizers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : filteredMissions.length === 0 ? (
        <div className="glass p-12 text-center rounded-2xl border border-slate-800/60">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h3 className="font-bold text-lg text-white">No Missions Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or browse other volunteering categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMissions.map((mission) => {
            const isFull = mission.spotsFilled >= mission.spotsTotal;
            return (
              <div
                key={mission.id}
                className="group glass flex flex-col rounded-2xl overflow-hidden shadow-xl border border-slate-800/60 hover:border-brand-500/30 transition-all duration-300 hover:translate-y-[-4px]"
              >
                {/* Image */}
                <div
                  onClick={() => setSelectedMission(mission)}
                  className="relative h-48 w-full overflow-hidden cursor-pointer"
                >
                  <img
                    src={mission.imageUrl}
                    alt={mission.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full glass border border-white/10 text-xs font-semibold text-white">
                    {mission.category}
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-brand-500/90 text-xs font-bold text-white shadow-md">
                    +{mission.xpReward} XP
                  </div>
                </div>

                {/* Content */}
                <div
                  onClick={() => setSelectedMission(mission)}
                  className="p-6 flex-1 flex flex-col justify-between space-y-4 cursor-pointer"
                >
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase">
                      Organized by {mission.organizer}
                    </span>
                    <h3 className="font-bold text-lg text-white group-hover:text-brand-300 transition-colors">
                      {mission.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                      {mission.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/40 text-xs text-slate-300 text-left">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{mission.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{mission.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{mission.time}</span>
                    </div>
                  </div>

                  {/* Spot Tracker */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Volunteers Filled</span>
                      <span className="text-brand-300">{mission.spotsFilled} / {mission.spotsTotal} spots</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(mission.spotsFilled / mission.spotsTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinMission(mission.id);
                    }}
                    disabled={mission.joined || isFull || joiningId === mission.id}
                    className={`w-full py-3 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      mission.joined
                        ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                        : isFull
                        ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                        : joiningId === mission.id
                        ? 'bg-brand-600/40 text-brand-300'
                        : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:scale-[1.02] shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20'
                    }`}
                  >
                    {joiningId === mission.id ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : mission.joined ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Registered</span>
                      </>
                    ) : isFull ? (
                      <span>Mission Full</span>
                    ) : (
                      <span>Join Mission</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mission Detail Modal */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-lg w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Image */}
            <div className="relative h-56 w-full">
              <img
                src={selectedMission.imageUrl}
                alt={selectedMission.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full glass border border-white/10 text-xs font-semibold text-white">
                {selectedMission.category}
              </div>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-brand-500 text-xs font-bold text-white shadow-md">
                +{selectedMission.xpReward} XP
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedMission(null)}
                className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-left">
              <div className="space-y-2">
                <span className="text-[10px] text-brand-300 font-bold tracking-wider uppercase">
                  Organized by {selectedMission.organizer}
                </span>
                <h2 className="text-xl font-extrabold text-white leading-tight">
                  {selectedMission.title}
                </h2>
                
                {/* Joined Status Badge */}
                {selectedMission.joined && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Registered / Joined</span>
                  </span>
                )}
              </div>

              <p className="text-slate-300 text-xs leading-relaxed max-h-36 overflow-y-auto pr-2 scrollbar-thin">
                {selectedMission.description}
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/40 text-[10px] text-slate-355 font-semibold">
                <div className="p-2.5 bg-slate-900/50 border border-slate-800/40 rounded-xl space-y-1">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider">Location</span>
                  <span className="block text-white truncate">{selectedMission.location}</span>
                </div>
                <div className="p-2.5 bg-slate-900/50 border border-slate-800/40 rounded-xl space-y-1">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider">Date</span>
                  <span className="block text-white">{selectedMission.date}</span>
                </div>
                <div className="p-2.5 bg-slate-900/50 border border-slate-800/40 rounded-xl space-y-1">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider">Time</span>
                  <span className="block text-white truncate">{selectedMission.time}</span>
                </div>
              </div>

              {/* Progress and Actions */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Volunteers Filled</span>
                    <span className="text-brand-300">{selectedMission.spotsFilled} / {selectedMission.spotsTotal} spots</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(selectedMission.spotsFilled / selectedMission.spotsTotal) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedMission(null)}
                    className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 text-slate-355 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      handleJoinMission(selectedMission.id);
                      setSelectedMission(prev => prev ? { ...prev, spotsFilled: Math.min(prev.spotsTotal, prev.spotsFilled + 1), joined: true } : null);
                    }}
                    disabled={selectedMission.joined || selectedMission.spotsFilled >= selectedMission.spotsTotal || joiningId === selectedMission.id}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      selectedMission.joined
                        ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                        : selectedMission.spotsFilled >= selectedMission.spotsTotal
                        ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                        : joiningId === selectedMission.id
                        ? 'bg-brand-600/40 text-brand-300'
                        : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:scale-[1.01] shadow-lg'
                    }`}
                  >
                    {joiningId === selectedMission.id ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : selectedMission.joined ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Registered</span>
                      </>
                    ) : selectedMission.spotsFilled >= selectedMission.spotsTotal ? (
                      <span>Mission Full</span>
                    ) : (
                      <span>Register for Mission</span>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
