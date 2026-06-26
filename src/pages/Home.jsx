import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchReports, voteReport, addComment, fetchTopHeroes 
} from '../services/api';
import { 
  ChevronUp, ChevronDown, MessageSquare, Share2, 
  MapPin, AlertCircle, Award, Sparkles, Send, 
  User, CheckCircle2, Landmark, ShieldAlert 
} from 'lucide-react';
import { formatDate, formatCompactNumber } from '../utils/helpers';

const CATEGORIES = ['Infrastructure', 'Roads & Safety', 'Sanitation', 'Public Space', 'Other'];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data states
  const [reports, setReports] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive UI states
  const [expandedComments, setExpandedComments] = useState({}); // maps { reportId: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // maps { reportId: string }
  const [toastMsg, setToastMsg] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filter and sort reports dynamically based on selection
  const processedReports = useMemo(() => {
    let list = [...reports];

    // Filter by worker assignment/status
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter);
    }

    // Sort by criteria
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    } else if (sortBy === 'urgency') {
      // Sort by urgency/priorityScore descending
      list.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    }

    return list;
  }, [reports, sortBy, statusFilter, categoryFilter]);

  useEffect(() => {
    async function loadFeedData() {
      try {
        const [reportsData, heroesData] = await Promise.all([
          fetchReports(),
          fetchTopHeroes()
        ]);
        setReports(reportsData);
        setHeroes(heroesData);
      } catch (error) {
        console.error("Failed to load feed data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFeedData();
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleVote = async (reportId, type) => {
    if (!user) {
      triggerToast("Please Sign In to vote on civic reports!");
      return;
    }

    try {
      const updatedReport = await voteReport(reportId, user.uid, type);
      setReports(prev => prev.map(r => r.id === reportId ? updatedReport : r));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = (reportId) => {
    setExpandedComments(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const handleCommentSubmit = async (e, reportId) => {
    e.preventDefault();
    const commentText = commentInputs[reportId];
    if (!commentText || !commentText.trim()) return;

    if (!user) {
      triggerToast("Please Sign In to comment on civic reports!");
      return;
    }

    try {
      const authorAvatar = user.avatar || null;
      const newComment = await addComment(reportId, commentText, user.name, authorAvatar);
      
      // Update local reports list immediately
      setReports(prev => prev.map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            comments: [...r.comments, newComment]
          };
        }
        return r;
      }));

      // Clear input
      setCommentInputs(prev => ({
        ...prev,
        [reportId]: ''
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentInputChange = (reportId, text) => {
    setCommentInputs(prev => ({
      ...prev,
      [reportId]: text
    }));
  };

  // Compute metrics from reports
  const getOverviewStats = () => {
    const total = reports.length + 8;
    const resolved = reports.filter(r => r.status === 'Resolved').length + 8;
    const pending = reports.filter(r => r.status !== 'Resolved').length;
    return { total, resolved, pending };
  };
  const overviewStats = getOverviewStats();

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 animate-fade-in relative space-y-8">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-rose-500/30 text-rose-450 bg-rose-950/20 glass animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
          <Link to="/login" className="text-xs font-bold text-blue-400 hover:underline pl-2 shrink-0">Sign In</Link>
        </div>
      )}

      {/* Grid: Feed Left, Widgets Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Post Feed (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Post Composer */}
          <div className="glass p-5 rounded-2xl border border-slate-800/60 shadow-lg flex items-center gap-4">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
            />
            <Link
              to="/report-issue"
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800/80 rounded-xl text-xs sm:text-sm text-slate-400 hover:text-slate-350 hover:bg-slate-800/40 text-left transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Got a neighborhood issue? Report it here...</span>
            </Link>
          </div>

          {/* Feed Title & Filter Controls */}
          <div className="border-b border-slate-800/60 pb-3 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Neighborhood Feed</h2>
                <p className="text-slate-400 text-xs mt-0.5">Real-time civic postings and discussions from citizens</p>
              </div>
            </div>

            {/* Interactive Filters Panel */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-850">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Workers Not Assigned</option>
                    <option value="Assigned">Workers Assigned</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value="newest">Newest Uploaded</option>
                  <option value="oldest">Oldest Uploaded</option>
                  <option value="urgency">Urgency / Importance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loader */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="glass h-[320px] rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : processedReports.length === 0 ? (
            <div className="glass p-12 text-center rounded-3xl border border-slate-800/60 animate-fade-in">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-base text-white">No reports match filter criteria</h3>
              <p className="text-slate-400 text-xs mt-1">Try adjusting your status filters or sorting options.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {processedReports.map((report) => {
                const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
                const userVote = user ? report.votedUsers?.[user.uid] : null;
                const showComments = !!expandedComments[report.id];

                return (
                  <div
                    key={report.id}
                    className="glass rounded-3xl border border-slate-800/60 shadow-xl overflow-hidden flex flex-col hover:border-slate-700/60 transition-all"
                  >
                    {/* Post Content */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="p-6 space-y-4">
                        {/* Post Header */}
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={report.reporterAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                              alt={report.reporterName}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-800"
                            />
                            <div className="text-left leading-none">
                              <span className="block text-xs font-bold text-slate-200">{report.reporterName}</span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">{formatDate(report.date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-bold text-brand-300">
                              {report.category}
                            </span>
                            
                            {report.severity && (
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${
                                report.severity === 'Critical' ? 'bg-rose-500/10 text-rose-455 border-rose-500/30 animate-pulse' :
                                report.severity === 'High' ? 'bg-amber-500/10 text-amber-455 border-amber-500/30' :
                                report.severity === 'Medium' ? 'bg-blue-500/10 text-blue-455 border-blue-500/30' :
                                'bg-slate-800 text-slate-405 border-slate-700'
                              }`}>
                                {report.severity}
                              </span>
                            )}

                            {report.status && (
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${
                                report.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                report.status === 'Assigned' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                'bg-slate-900/60 text-slate-400 border-slate-800'
                              }`}>
                                {report.status === 'Assigned' ? 'Workers Assigned' : report.status === 'Pending' ? 'Workers Not Assigned' : report.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2 text-left">
                          <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                            {report.title}
                          </h3>
                          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed">
                            {report.description}
                          </p>
                        </div>

                        {/* Post Image */}
                        {report.imageUrl && (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-850 h-56 sm:h-72 bg-slate-900/50">
                            <img
                              src={report.imageUrl}
                              alt={report.title}
                              className="w-full h-full object-cover hover:scale-[1.005] transition-transform duration-300"
                            />
                          </div>
                        )}

                        {/* Location Coordinate */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-455 font-semibold text-left">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{report.location}</span>
                        </div>
                      </div>

                      {/* Post Action Footer */}
                      <div className="px-6 py-3 bg-slate-900/20 flex items-center gap-4 text-[10px] sm:text-xs text-slate-400 font-bold">
                        {/* Vote Pill */}
                        <div className="flex items-center bg-slate-950/45 rounded-full px-2 py-0.5 gap-1 shrink-0">
                          <button
                            onClick={() => handleVote(report.id, 'up')}
                            className={`p-1 rounded-full transition-colors cursor-pointer ${
                              userVote === 'up' 
                                ? 'bg-blue-600/20 text-blue-400' 
                                : 'text-slate-500 hover:text-slate-200'
                            }`}
                            title="Upvote"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <span className={`text-[10px] font-black tracking-tight min-w-[14px] text-center ${
                            netVotes > 0 ? 'text-blue-400' : netVotes < 0 ? 'text-rose-450' : 'text-slate-400'
                          }`}>
                            {netVotes}
                          </span>
                          <button
                            onClick={() => handleVote(report.id, 'down')}
                            className={`p-1 rounded-full transition-colors cursor-pointer ${
                              userVote === 'down' 
                                ? 'bg-rose-600/20 text-rose-455' 
                                : 'text-slate-500 hover:text-slate-200'
                            }`}
                            title="Downvote"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => toggleComments(report.id)}
                          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4.5 h-4.5" />
                          <span>{report.comments?.length || 0} Comments</span>
                        </button>
                        
                        <button 
                          onClick={() => triggerToast("Copied link to clipboard!")}
                          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4.5 h-4.5" />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Expanded Comments Thread */}
                      {showComments && (
                        <div className="bg-slate-900/40 p-6 space-y-4 animate-slide-down">
                          
                          {/* Comments List */}
                          <div className="space-y-4">
                            {report.comments?.length === 0 ? (
                              <p className="text-xs text-slate-500 italic text-left">No comments yet. Write one below to start the discussion!</p>
                            ) : (
                              <div className="space-y-4">
                                {report.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-3 text-left">
                                    <img
                                      src={comment.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                                      alt={comment.authorName}
                                      className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
                                    />
                                    <div className="space-y-1 overflow-hidden">
                                      <div className="flex items-center gap-2 text-[10px] font-bold">
                                        <span className="text-slate-200">{comment.authorName}</span>
                                        <span className="text-slate-500 font-normal">{formatDate(comment.date)}</span>
                                      </div>
                                      <p className="text-slate-350 text-[11px] leading-relaxed break-words">{comment.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Write Comment Form */}
                          <form 
                            onSubmit={(e) => handleCommentSubmit(e, report.id)}
                            className="flex items-center gap-2 pt-2"
                          >
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentInputs[report.id] || ''}
                              onChange={(e) => handleCommentInputChange(report.id, e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={!commentInputs[report.id]?.trim()}
                              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 text-white disabled:text-slate-550 rounded-xl shadow-lg transition-colors cursor-pointer shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Column: Widgets Sidebar (Col 4) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* Municipality Overview Stats */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Landmark className="w-4 h-4 text-blue-400" />
              <span>Municipal Overview</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase">Reported</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{overviewStats.total}</span>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase">Pending</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{overviewStats.pending}</span>
              </div>
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase">Resolved</span>
                <span className="text-base font-extrabold text-white block mt-0.5">{overviewStats.resolved}</span>
              </div>
            </div>
          </div>

          {/* Scoreboard Leaderboard Widget */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Award className="w-4 h-4 text-blue-400" />
              <span>Weekly Scoreboard</span>
            </h3>

            {loading ? (
              <div className="h-40 animate-pulse bg-slate-900/40 rounded-xl" />
            ) : (
              <div className="divide-y divide-slate-850/40">
                {heroes.map((hero, index) => (
                  <div key={hero.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        index === 0 ? 'bg-amber-500/20 text-amber-450 border border-amber-500/40' :
                        index === 1 ? 'bg-slate-300/20 text-slate-350 border border-slate-300/40' :
                        'bg-amber-800/20 text-amber-600 border border-amber-800/40'
                      }`}>
                        {index + 1}
                      </span>
                      <img
                        src={hero.avatar}
                        alt={hero.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-850"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-white">{hero.name}</span>
                        <span className="text-[9px] text-brand-300 font-semibold">{hero.badge}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{formatCompactNumber(hero.xp)} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Directory Widget */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              <span>Department Directory</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-400 text-left font-semibold">
              <div className="flex justify-between items-center py-1">
                <span>🛣️ Roads & Safety dispatch</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Active</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>🌳 Parks & Recreation</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Active</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>🗑️ Sanitation Department</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Active</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
