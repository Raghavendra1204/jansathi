import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Clock, CheckCircle, Award, 
  MapPin, AlertTriangle, AlertCircle, PlusCircle, 
  Settings, Compass, Home as HomeIcon, MessageSquare, X 
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

const MOCK_REPORTS = [
  {
    id: 'rep-01',
    title: 'Broken Streetlight',
    category: 'Infrastructure',
    location: '405 Pine Street, Downtown',
    date: '2026-06-25',
    status: 'Resolved',
    description: 'Streetlight pole #12 is completely dark, causing safety concerns for pedestrians at night.',
    pointsEarned: 50,
    statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'rep-02',
    title: 'Pothole in Right Lane',
    category: 'Roads & Safety',
    location: '1200 Broadway Ave',
    date: '2026-06-22',
    status: 'Pending',
    description: 'Large, deep pothole in the right lane of Broadway causing cars to swerve abruptly.',
    pointsEarned: 0,
    statusColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  },
  {
    id: 'rep-03',
    title: 'Overflowing Dumpster',
    category: 'Sanitation',
    location: 'Oak Park Recreation Field',
    date: '2026-06-18',
    status: 'Resolved',
    description: 'Trash has accumulated around the dumpster, attracting animals and creating odor issues.',
    pointsEarned: 50,
    statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'rep-04',
    title: 'Damaged Guardrail',
    category: 'Roads & Safety',
    location: 'Highway 10 Exit 4 Ramp',
    date: '2026-06-12',
    status: 'Submitted',
    description: 'A portion of the metal guardrail is bent outwards, exposing a sharp edge.',
    pointsEarned: 0,
    statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  }
];

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'report', 'messages', 'settings'

  // Submit report modal simulation
  const [isReporting, setIsReporting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Infrastructure');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreateReport = (e) => {
    e.preventDefault();
    if (!newTitle || !newLocation || !newDesc) return;
    
    const newReport = {
      id: `rep-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      location: newLocation,
      date: new Date().toISOString().split('T')[0],
      status: 'Submitted',
      description: newDesc,
      pointsEarned: 0,
      statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    };

    setReports([newReport, ...reports]);
    setNewTitle('');
    setNewLocation('');
    setNewDesc('');
    setIsReporting(false);
  };

  const getStats = () => {
    const total = reports.length + 8; // Including old archived reports
    const resolved = reports.filter(r => r.status === 'Resolved').length + 8;
    const pending = reports.filter(r => r.status === 'Pending' || r.status === 'Submitted').length;
    const points = user ? user.xp : 2450;
    return { total, pending, resolved, points };
  };

  const stats = getStats();

  return (
    <div className="relative pb-24 md:pb-6 space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* Welcome Banner */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500/20"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name.split(' ')[0] || 'Hero'}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Thank you for keeping our municipality clean and safe. Track your active reports below.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics Cards (Grid of 4) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reports Submitted */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-blue-500/20 transition-all">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submitted</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.total}</span>
          </div>
        </div>

        {/* Pending */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-amber-500/20 transition-all">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.pending}</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-emerald-500/20 transition-all">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resolved</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.resolved}</span>
          </div>
        </div>

        {/* Community Points */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-purple-500/20 transition-all">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Points</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.points}</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Reports List & Submit Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reports Timeline List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Recent Activity</h2>
              <p className="text-slate-400 text-xs mt-0.5">Municipal reports posted by you</p>
            </div>
            <button
              onClick={() => navigate('/report-issue')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02] hidden sm:flex"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <div 
                key={report.id}
                className="glass p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700/60 transition-all space-y-3.5"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] text-brand-300 font-bold tracking-wider uppercase">{report.category}</span>
                    <h3 className="font-bold text-base text-white mt-0.5">{report.title}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase shrink-0 ${report.statusColor}`}>
                    {report.status}
                  </span>
                </div>

                <p className="text-slate-350 text-xs leading-relaxed">{report.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/40 text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{report.location}</span>
                    </span>
                    <span>•</span>
                    <span>{formatDate(report.date)}</span>
                  </div>
                  {report.pointsEarned > 0 && (
                    <span className="text-emerald-400">+{report.pointsEarned} Community Points Earned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Submit Report Side Card (Desktop Only) */}
        <section className="hidden lg:block lg:col-span-1">
          <div className="glass p-6 rounded-2xl border border-slate-800/60 sticky top-24 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Submit Civic Report</span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Help fix infrastructure or safety problems. Enter the details below to notify city managers.
              </p>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken Water Pipe"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors"
                >
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Roads & Safety">Roads & Safety</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Public Space">Public Space</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corner of Elm and 5th"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide precise details to help officers locate and verify..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Report</span>
              </button>
            </form>
          </div>
        </section>

      </div>

      {/* Simulated Mobile Form Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:hidden">
          <div className="glass w-full max-w-sm rounded-3xl p-6 border border-slate-800/80 space-y-4 animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-white">Submit Civic Report</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Alert officers of local service disruptions</p>
              </div>
              <button onClick={() => setIsReporting(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReport} className="space-y-3 pt-2">
              <input
                type="text"
                required
                placeholder="Issue Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="Infrastructure">Infrastructure</option>
                <option value="Roads & Safety">Roads & Safety</option>
                <option value="Sanitation">Sanitation</option>
              </select>
              <input
                type="text"
                required
                placeholder="Location / Address"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
              />
              <textarea
                required
                rows="2"
                placeholder="Detailed description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 resize-none"
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MOBILE VIEW FLOATING BOTTOM NAV BAR --- */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
        <div className="glass rounded-2xl py-3 px-6 shadow-2xl border border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'dashboard' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[9px]">Dashboard</span>
          </button>

          {/* Tab 2: New Report (Triggers Modal directly) */}
          <button
            onClick={() => { setActiveTab('report'); navigate('/report-issue'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'report' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[9px]">Report</span>
          </button>

          {/* Tab 3: Explore/Missions */}
          <button
            onClick={() => { setActiveTab('explore'); navigate('/explore'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'explore' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px]">Missions</span>
          </button>

          {/* Tab 4: Settings/Profile */}
          <button
            onClick={() => { setActiveTab('settings'); navigate('/profile'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'settings' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px]">Settings</span>
          </button>

        </div>
      </div>

    </div>
  );
}
