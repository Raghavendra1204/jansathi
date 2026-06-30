import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchReports, voteReport, addComment, fetchTopHeroes, updateReport, updateComment, deleteReport 
} from '../services/api';
import { 
  ChevronUp, ChevronDown, MessageSquare, Share2, 
  MapPin, AlertCircle, Award, Sparkles, Send, 
  User, CheckCircle2, Landmark, ShieldAlert, Edit3, X, Trash2 
} from 'lucide-react';
import { formatDate, formatCompactNumber } from '../utils/helpers';
import { useTranslation } from '../context/TranslationContext';
import SeverityBadge from '../components/SeverityBadge';
import { isMockFirebase } from '../firebase/config';

const CATEGORIES = ['Infrastructure', 'Roads & Safety', 'Sanitation', 'Public Space', 'Other'];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeDept, setActiveDept] = useState(null);
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const isLight = document.documentElement.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    };
    window.addEventListener('mock-auth-state-change', handleThemeChange);
    return () => {
      window.removeEventListener('mock-auth-state-change', handleThemeChange);
    };
  }, []);
  
  // Data states
  const [reports, setReports] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive UI states
  const [expandedComments, setExpandedComments] = useState({}); // maps { reportId: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // maps { reportId: string }
  const [toastMsg, setToastMsg] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Editing Report States (Feature 9)
  const [editingReport, setEditingReport] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Roads & Safety');
  const [editLocation, setEditLocation] = useState('');
  const [editSeverity, setEditSeverity] = useState('Low');
  const [editDescription, setEditDescription] = useState('');
  const [updatingReportLoading, setUpdatingReportLoading] = useState(false);

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

  // Real-time Feed Listener
  useEffect(() => {
    let unsubscribe = null;

    async function setupFeedData() {
      // Fetch top heroes once
      try {
        const heroesData = await fetchTopHeroes();
        setHeroes(heroesData);
      } catch (err) {
        console.error("Failed to load heroes:", err);
      }

      if (isMockFirebase) {
        // Initial reports load
        try {
          const reportsData = await fetchReports();
          setReports(reportsData);
        } catch (error) {
          console.error("Failed to load feed reports:", error);
        } finally {
          setLoading(false);
        }

        // Listen for updates dispatched from api.js
        const handleUpdate = async () => {
          try {
            const reportsData = await fetchReports();
            setReports(reportsData);
          } catch (error) {
            console.error("Failed to reload feed reports:", error);
          }
        };
        window.addEventListener('mock-auth-state-change', handleUpdate);
        unsubscribe = () => window.removeEventListener('mock-auth-state-change', handleUpdate);
      } else {
        // Production Firestore real-time reports listener
        try {
          const { db } = await import('../firebase/config');
          const { collection, query, onSnapshot, orderBy } = await import('firebase/firestore');
          const q = query(collection(db, 'reports'), orderBy('date', 'desc'));
          unsubscribe = onSnapshot(q, (snapshot) => {
            const live = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setReports(live);
            setLoading(false);
          }, (err) => {
            console.error('Home reports snapshot error:', err);
            setLoading(false);
          });
        } catch (err) {
          console.error('Failed to setup Home reports listener:', err);
          const reportsData = await fetchReports();
          setReports(reportsData);
          setLoading(false);
        }
      }
    }

    setupFeedData();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!editingReport) return;
    setUpdatingReportLoading(true);
    try {
      await updateReport(editingReport.id, {
        title: editTitle,
        category: editCategory,
        location: editLocation,
        severity: editSeverity,
        description: editDescription
      });
      
      setReports(prev => prev.map(r => r.id === editingReport.id ? {
        ...r,
        title: editTitle,
        category: editCategory,
        location: editLocation,
        severity: editSeverity,
        description: editDescription,
        edited: true,
        editedAt: new Date().toISOString()
      } : r));

      setEditingReport(null);
      triggerToast('Report updated successfully!');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update report.');
    } finally {
      setUpdatingReportLoading(false);
    }
  };

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
      
      // Update local reports list immediately in mock mode only
      if (isMockFirebase) {
        setReports(prev => prev.map(r => {
          if (r.id === reportId) {
            return {
              ...r,
              comments: [...(r.comments || []), newComment]
            };
          }
          return r;
        }));
      }

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

  const handleEditCommentSubmit = async (e, reportId, commentId) => {
    e.preventDefault();
    if (!editingCommentText || !editingCommentText.trim()) return;
    try {
      await updateComment(reportId, commentId, editingCommentText);
      
      // Update local reports list immediately in mock mode only
      if (isMockFirebase) {
        setReports(prev => prev.map(r => {
          if (r.id === reportId) {
            return {
              ...r,
              comments: (r.comments || []).map(c => c.id === commentId ? {
                ...c,
                text: editingCommentText,
                edited: true,
                editedAt: new Date().toISOString()
              } : c)
            };
          }
          return r;
        }));
      }

      setEditingCommentId(null);
      triggerToast(t('Comment updated successfully!'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(t('Are you sure you want to delete this civic report? This action cannot be undone.'))) return;
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      triggerToast(t('Report deleted successfully!'));
    } catch (err) {
      console.error("Failed to delete report:", err);
      triggerToast(t('Failed to delete report.'));
    }
  };

  // Compute metrics from reports
  const getOverviewStats = () => {
    const total = reports.length + 8;
    const resolved = reports.filter(r => r.status === 'Resolved').length + 8;
    const pending = reports.filter(r => r.status !== 'Resolved').length;
    return { total, resolved, pending };
  };
  const overviewStats = getOverviewStats();

  const departments = [
    {
      id: 'sanitation',
      name: t('Sanitation & Environment'),
      category: 'Sanitation',
      officer: 'Director Ramesh Prasad',
      avgTime: '12 Hours',
      contact: 'sanitation-ops@JanSathi.gov.in',
      status: 'Optimal Operation'
    },
    {
      id: 'roads',
      name: t('Roads & Traffic Safety'),
      category: 'Roads & Safety',
      officer: 'Chief Engineer Sandeep Kumar',
      avgTime: '24 Hours',
      contact: 'roads-help@JanSathi.gov.in',
      status: 'Moderate Workload'
    },
    {
      id: 'infrastructure',
      name: t('Public Infrastructure'),
      category: 'Infrastructure',
      officer: 'Director Anita Sen',
      avgTime: '36 Hours',
      contact: 'infra-ops@JanSathi.gov.in',
      status: 'High Workload'
    },
    {
      id: 'parks',
      name: t('Horticulture & Public Parks'),
      category: 'Public Space',
      officer: 'Officer Vinay Rao',
      avgTime: '18 Hours',
      contact: 'parks-maint@JanSathi.gov.in',
      status: 'Optimal Operation'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 animate-fade-in relative space-y-8">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-rose-500/30 text-rose-455 bg-rose-955/20 glass animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{t(toastMsg)}</span>
          <Link to="/login" className="text-xs font-bold text-blue-400 hover:underline pl-2 shrink-0">{t("Sign In")}</Link>
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
              <span>{t("Got a neighborhood issue? Report it here...")}</span>
            </Link>
          </div>

          {/* Feed Title & Filter Controls */}
          <div className="border-b border-slate-800/60 pb-3 space-y-4 text-left">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{t("Neighborhood Feed")}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{t("Real-time civic postings and discussions from citizens")}</p>
              </div>
            </div>

            {/* Interactive Filters Panel */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">{t("Status:")}</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800/60 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                  >
                    <option value="all">{t("All Statuses")}</option>
                    <option value="Pending">{t("Workers Not Assigned")}</option>
                    <option value="Assigned">{t("Workers Assigned")}</option>
                    <option value="Resolved">{t("Resolved")}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Category:")}</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800/60 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                  >
                    <option value="all">{t("All Categories")}</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{t(cat)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Sort By:")}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800/60 rounded-xl px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value="newest">{t("Newest Uploaded")}</option>
                  <option value="oldest">{t("Oldest Uploaded")}</option>
                  <option value="urgency">{t("Urgency / Importance")}</option>
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
            <div className="glass p-12 text-center rounded-3xl border border-slate-800/60 animate-fade-in text-slate-500">
              <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-base text-white">{t("No reports match filter criteria")}</h3>
              <p className="text-slate-400 text-xs mt-1">{t("Try adjusting your status filters or sorting options.")}</p>
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
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-slate-550 font-semibold">{formatDate(report.date)}</span>
                                {report.edited && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-750 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                                    {t("Edited")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-bold text-brand-300">
                              {t(report.category)}
                            </span>
                            
                            <SeverityBadge severity={report.severity} status={report.status} />
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2 text-left">
                          <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                            <Link to={`/report/${report.id}`} className="hover:text-blue-400 transition-colors">
                              {t(report.title)}
                            </Link>
                          </h3>
                          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed">
                            {t(report.description)}
                          </p>
                        </div>

                        {/* Post Image */}
                        {report.imageUrl && (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-800/60 h-56 sm:h-72 bg-slate-900/50">
                            <img
                              src={report.imageUrl}
                              alt={report.title}
                              className="w-full h-full object-cover hover:scale-[1.005] transition-transform duration-300"
                            />
                          </div>
                        )}

                        {/* Location Coordinate */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold text-left">
                          <MapPin className="w-3.5 h-3.5 text-slate-550" />
                          <span>{t(report.location)}</span>
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
                            title={t("Upvote")}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <span className={`text-[10px] font-black tracking-tight min-w-[14px] text-center ${
                            netVotes > 0 ? 'text-blue-400' : netVotes < 0 ? 'text-rose-455' : 'text-slate-400'
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
                            title={t("Downvote")}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => toggleComments(report.id)}
                          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4.5 h-4.5 text-slate-500" />
                          <span>{report.comments?.length || 0} {t("Comments")}</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const postUrl = `${window.location.origin}/report/${report.id}`;
                            navigator.clipboard.writeText(postUrl);
                            triggerToast(t("Copied direct link to clipboard!"));
                          }}
                          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4.5 h-4.5 text-slate-500" />
                          <span>{t("Share")}</span>
                        </button>

                        {/* Edit & Delete Buttons for report owner */}
                        {user && report.userId === user.uid && (
                          <div className="flex items-center gap-3.5 ml-auto">
                            {report.status !== 'Resolved' && (
                              <button
                                onClick={() => {
                                  setEditingReport(report);
                                  setEditTitle(report.title);
                                  setEditCategory(report.category);
                                  setEditLocation(report.location);
                                  setEditSeverity(report.severity || 'Low');
                                  setEditDescription(report.description);
                                }}
                                className="flex items-center gap-1.5 text-blue-450 hover:text-blue-350 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>{t("Edit")}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              className="flex items-center gap-1.5 text-rose-455 hover:text-rose-350 transition-colors cursor-pointer"
                              title={t("Delete Report")}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{t("Delete")}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expanded Comments Thread */}
                      {showComments && (
                        <div className="bg-slate-900/40 p-6 space-y-4 animate-slide-down">
                          
                          {/* Comments List */}
                          <div className="space-y-4">
                            {report.comments?.length === 0 ? (
                              <p className="text-xs text-slate-500 italic text-left">{t("No comments yet. Write one below to start the discussion!")}</p>
                            ) : (
                              <div className="space-y-4">
                                  {report.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 text-left">
                                      <img
                                        src={comment.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                                        alt={comment.authorName}
                                        className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
                                      />
                                      <div className="space-y-1 overflow-hidden flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-[10px] font-bold">
                                          <span className="text-slate-200">{comment.authorName}</span>
                                          <span className="text-slate-500 font-normal">{formatDate(comment.date)}</span>
                                        </div>

                                        {editingCommentId === comment.id ? (
                                          <form 
                                            onSubmit={(e) => handleEditCommentSubmit(e, report.id, comment.id)} 
                                            className="flex items-center gap-2 mt-1 w-full"
                                          >
                                            <input
                                              type="text"
                                              required
                                              value={editingCommentText}
                                              onChange={(e) => setEditingCommentText(e.target.value)}
                                              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-[11px] text-white focus:outline-none focus:border-blue-600 transition-colors"
                                            />
                                            <button
                                              type="submit"
                                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                            >
                                              {t("Save")}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingCommentId(null)}
                                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-355 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                            >
                                              {t("Cancel")}
                                            </button>
                                          </form>
                                        ) : (
                                          <div className="flex justify-between items-start group">
                                            <div className="space-y-0.5 flex-1 min-w-0">
                                              <p className="text-slate-350 text-[11px] leading-relaxed break-words">{t(comment.text)}</p>
                                              {comment.edited && (
                                                <span className="text-[8px] text-slate-550 italic font-semibold">({t("edited")})</span>
                                              )}
                                            </div>
                                            
                                            {user && (user.name === comment.authorName || user.email === comment.authorName) && (
                                              <button
                                                onClick={() => {
                                                  setEditingCommentId(comment.id);
                                                  setEditingCommentText(comment.text);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400 text-slate-500 transition-all cursor-pointer shrink-0 ml-2"
                                                title={t("Edit Comment")}
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        )}
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
                              placeholder={t("Write a comment...")}
                              value={commentInputs[report.id] || ''}
                              onChange={(e) => handleCommentInputChange(report.id, e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={!commentInputs[report.id]?.trim()}
                              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-555 rounded-xl shadow-lg transition-colors cursor-pointer shrink-0"
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
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 text-left">
          
          {/* Municipality Overview Stats */}
          <div className={`glass p-6 rounded-2xl border shadow-lg space-y-4 transition-colors duration-300 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800/60'
          }`}>
            <h3 className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-b pb-3 ${
              theme === 'light' ? 'text-slate-800 border-slate-100' : 'text-white border-slate-800/60'
            }`}>
              <Landmark className="w-4 h-4 text-blue-400" />
              <span>{t("Municipal Overview")}</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 border rounded-xl transition-all duration-300 ${
                theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800'
              }`}>
                <span className="block text-[8px] text-slate-400 font-bold uppercase">{t("Submitted")}</span>
                <span className={`text-base font-extrabold block mt-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{overviewStats.total}</span>
              </div>
              <div className={`p-3 border rounded-xl transition-all duration-300 ${
                theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800'
              }`}>
                <span className="block text-[8px] text-slate-400 font-bold uppercase">{t("Pending")}</span>
                <span className={`text-base font-extrabold block mt-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{overviewStats.pending}</span>
              </div>
              <div className={`p-3 border rounded-xl transition-all duration-300 ${
                theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-800'
              }`}>
                <span className="block text-[8px] text-slate-400 font-bold uppercase">{t("Resolved")}</span>
                <span className={`text-base font-extrabold block mt-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{overviewStats.resolved}</span>
              </div>
            </div>

            {/* Department-wise Interactive List */}
            <div className="space-y-2.5 pt-2">
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider text-left">{t("Interactive Departments")}</span>
              
              <div className="space-y-2">
                {departments.map((dept) => {
                  const activeComplaints = reports.filter(r => r.category === dept.category && r.status !== 'Resolved').length;
                  const pendingCases = reports.filter(r => r.category === dept.category && r.status === 'Pending').length;
                  const resolvedToday = reports.filter(r => r.category === dept.category && r.status === 'Resolved').length + 2;
                  
                  const isExpanded = activeDept === dept.id;

                  return (
                    <div
                      key={dept.id}
                      onMouseEnter={() => window.innerWidth > 768 && setActiveDept(dept.id)}
                      onMouseLeave={() => window.innerWidth > 768 && setActiveDept(null)}
                      onClick={() => window.innerWidth <= 768 && setActiveDept(isExpanded ? null : dept.id)}
                      className={`p-3 border rounded-xl text-left cursor-pointer transition-all duration-300 ${
                        theme === 'light' 
                          ? `bg-slate-50 hover:bg-slate-100/80 border-slate-200/60 ${isExpanded ? 'ring-2 ring-blue-500/10' : ''}` 
                          : `bg-slate-900/30 hover:bg-slate-850/40 border-slate-800/80 ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                          {dept.name}
                        </span>
                        <span className={`text-[8px] font-bold px-2 py-0.2 rounded-full border ${
                          dept.status === 'High Workload'
                            ? 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-455 border-emerald-500/20'
                        }`}>
                          {t(dept.status)}
                        </span>
                      </div>

                      {/* Dropdown panel showing details on hover/tap */}
                      <div
                        className={`transition-all duration-500 overflow-hidden ${
                          isExpanded 
                            ? 'max-h-60 opacity-100 mt-2.5 pt-2.5 border-t border-slate-250 dark:border-slate-800/60' 
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-slate-400 leading-normal">
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Officer In Charge")}</span>
                            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{dept.officer}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Department Contact")}</span>
                            <span className="font-semibold text-blue-400 select-all">{dept.contact}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Active / Pending Cases")}</span>
                            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{activeComplaints} / {pendingCases}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Resolved Today")}</span>
                            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{resolvedToday}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Avg Resolution Time")}</span>
                            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{dept.avgTime}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wide">{t("Last Updated")}</span>
                            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>{t("5 minutes ago")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scoreboard Leaderboard Widget */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Award className="w-4 h-4 text-blue-400" />
              <span>{t("Weekly Scoreboard")}</span>
            </h3>

            {loading ? (
              <div className="h-40 animate-pulse bg-slate-900/40 rounded-xl" />
            ) : (
              <div className="divide-y divide-slate-800/40">
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
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-800"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-white">{hero.name}</span>
                        <span className="text-[9px] text-brand-300 font-semibold">{t(hero.badge)}</span>
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
              <span>{t("Department Directory")}</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-400 text-left font-semibold">
              <div className="flex justify-between items-center py-1">
                <span>🛣️ {t("Roads & Safety dispatch")}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{t("Active")}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>🌳 {t("Parks & Recreation")}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{t("Active")}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>🗑️ {t("Sanitation Department")}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{t("Active")}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Report Dialog Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm animate-fade-in" onClick={() => setEditingReport(null)}>
          <form 
            onSubmit={handleUpdateReport}
            className="w-full max-w-lg bg-[#0b0f19]/95 border border-slate-850 shadow-2xl rounded-3xl relative flex flex-col overflow-hidden animate-scale-up p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-455" />
                <span>{t("Edit Incident Submission Details")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="p-1 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t("Issue Title")}</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t("Category")}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors font-semibold"
                  >
                    <option value="Roads & Safety">{t("Roads & Safety")}</option>
                    <option value="Sanitation">{t("Sanitation")}</option>
                    <option value="Infrastructure">{t("Infrastructure")}</option>
                    <option value="Public Space">{t("Public Space")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{t("Severity Level")}</label>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors font-semibold"
                  >
                    <option value="Low">{t("Low")}</option>
                    <option value="Medium">{t("Medium")}</option>
                    <option value="High">{t("High")}</option>
                    <option value="Critical">{t("Critical")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">{t("Location Address")}</label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-855 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">{t("Issue Description Details")}</label>
                <textarea
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-955 border border-slate-855 rounded-xl text-xs text-white focus:outline-none focus:border-blue-600 transition-colors h-24 resize-none leading-relaxed font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t("Cancel")}
              </button>

              <button
                type="submit"
                disabled={updatingReportLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-md text-center"
              >
                {updatingReportLoading ? t("Updating...") : t("Save Changes")}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
