import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchReportById, updateReport, voteReport, addComment, updateComment, deleteReport 
} from '../services/api';
import { 
  ArrowLeft, Calendar, MapPin, MessageSquare, Share2, 
  Edit3, X, AlertCircle, CheckCircle2, ChevronUp, 
  ChevronDown, Send, User, Loader, Trash2 
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { useTranslation } from '../context/TranslationContext';
import SeverityBadge from '../components/SeverityBadge';
import { isMockFirebase } from '../firebase/config';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Editing States
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSeverity, setEditSeverity] = useState('Low');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    };
    window.addEventListener('mock-auth-state-change', handleThemeChange);
    return () => {
      window.removeEventListener('mock-auth-state-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribe = null;

    async function setupReportListener() {
      if (isMockFirebase) {
        try {
          const data = await fetchReportById(id);
          setReport(data);
          setEditTitle(data.title);
          setEditCategory(data.category);
          setEditLocation(data.location);
          setEditSeverity(data.severity || 'Low');
          setEditDescription(data.description);
        } catch (err) {
          console.error(err);
          setErrorMsg(t("Report not found or database sync failed."));
        } finally {
          setLoading(false);
        }

        // Listen for updates on mock auth state changes
        const handleUpdate = async () => {
          try {
            const data = await fetchReportById(id);
            setReport(data);
          } catch (err) {
            console.error(err);
          }
        };
        window.addEventListener('mock-auth-state-change', handleUpdate);
        unsubscribe = () => window.removeEventListener('mock-auth-state-change', handleUpdate);
      } else {
        // Firestore real-time individual report document listener
        try {
          const { db } = await import('../firebase/config');
          const { doc, onSnapshot } = await import('firebase/firestore');
          const docRef = doc(db, 'reports', id);
          unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() };
              setReport(data);
              setEditTitle(data.title);
              setEditCategory(data.category);
              setEditLocation(data.location);
              setEditSeverity(data.severity || 'Low');
              setEditDescription(data.description);
            } else {
              setErrorMsg(t("Report not found."));
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore onSnapshot detail error:", err);
            setLoading(false);
          });
        } catch (err) {
          console.error('Failed to setup report detail listener:', err);
          // Fallback load
          try {
            const data = await fetchReportById(id);
            setReport(data);
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
          }
        }
      }
    }

    setupReportListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [id]);

  // Leaflet map renderer
  useEffect(() => {
    if (!report || !mapContainerRef.current) return;
    
    const L = window.L;
    if (!L) {
      // Dynamically load Leaflet if not present
      if (!document.getElementById('leaflet-css-detail')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.id = 'leaflet-css-detail';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js-detail')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.id = 'leaflet-js-detail';
        script.onload = () => initMap();
        document.head.appendChild(script);
      }
    } else {
      initMap();
    }

    function initMap() {
      const L = window.L;
      if (!L || !mapContainerRef.current) return;

      const lat = report.lat || 12.9716;
      const lng = report.lng || 77.5946;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: false,
          attributionControl: false
        });

        const isDark = document.documentElement.classList.contains('dark');
        const tileUrl = isDark 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl).addTo(mapInstanceRef.current);

        const color = report.severity === 'Critical' ? '#f43f5e' :
                      report.severity === 'High' ? '#f59e0b' :
                      report.severity === 'Medium' ? '#3b82f6' :
                      '#64748b';

        const markerHtml = `
          <div style="position: relative; width: 24px; height: 24px;">
            <span class="animate-ping" style="position: absolute; top: 0; left: 0; display: inline-flex; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.45; animation-duration: 1.5s;"></span>
            <span style="position: relative; display: block; width: 12px; height: 12px; margin: 6px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);"></span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-map-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current)
          .bindPopup(`<div class="text-[11px] font-bold text-slate-800">${report.title}</div><div class="text-[9px] text-slate-500">${report.location}</div>`)
          .openPopup();
      } else {
        mapInstanceRef.current.setView([lat, lng], 14);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [report, theme]);

  const handleVote = async (type) => {
    if (!user) {
      triggerToast(t("Please Sign In to vote on civic reports!"));
      return;
    }
    try {
      const updatedReport = await voteReport(report.id, user.uid, type);
      setReport(updatedReport);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText || !commentText.trim() || !user) return;
    setCommentSubmitting(true);
    try {
      const authorAvatar = user.avatar || null;
      const newComment = await addComment(report.id, commentText, user.name, authorAvatar, user.uid);
      // Only update local report list immediately in mock mode
      if (isMockFirebase) {
        setReport(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));
      }
      setCommentText('');
      triggerToast(t('Comment posted successfully!'));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleEditCommentSubmit = async (e, reportId, commentId) => {
    e.preventDefault();
    if (!editingCommentText || !editingCommentText.trim()) return;
    try {
      await updateComment(reportId, commentId, editingCommentText);
      
      // Update local state in mock mode only
      if (isMockFirebase) {
        setReport(prev => ({
          ...prev,
          comments: (prev.comments || []).map(c => c.id === commentId ? {
            ...c,
            text: editingCommentText,
            edited: true,
            editedAt: new Date().toISOString()
          } : c)
        }));
      }

      setEditingCommentId(null);
      triggerToast(t('Comment updated successfully!'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateReport(report.id, {
        title: editTitle,
        category: editCategory,
        location: editLocation,
        severity: editSeverity,
        description: editDescription
      });
      
      setReport(prev => ({
        ...prev,
        title: editTitle,
        category: editCategory,
        location: editLocation,
        severity: editSeverity,
        description: editDescription,
        edited: true,
        editedAt: new Date().toISOString()
      }));

      setEditing(false);
      triggerToast(t('Post updated successfully!'));
      window.dispatchEvent(new Event('mock-auth-state-change'));
    } catch (err) {
      console.error(err);
      setErrorMsg(t('Failed to save changes.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('Are you sure you want to delete this civic report? This action cannot be undone.'))) return;
    try {
      await deleteReport(report.id);
      triggerToast(t('Report deleted successfully!'));
      setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (err) {
      console.error(err);
      triggerToast(t('Failed to delete report.'));
    }
  };

  const triggerToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/report/${report.id}`;
    navigator.clipboard.writeText(postUrl);
    triggerToast(t("Copied direct link to clipboard!"));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass p-12 text-center rounded-3xl border border-slate-800/60 max-w-md mx-auto mt-12 animate-fade-in text-slate-500">
        <AlertCircle className="w-12 h-12 text-rose-455 mx-auto mb-4" />
        <h3 className="font-bold text-xl text-white">{t("Report Not Found")}</h3>
        <p className="text-slate-400 text-sm mt-2">{t("This post might have been removed or the ID is incorrect.")}</p>
        <Link to="/" className="mt-6 inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg">
          {t("Return Home")}
        </Link>
      </div>
    );
  }

  const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
  const userVote = user ? report.votedUsers?.[user.uid] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in text-left">
      
      {/* Toast Alert Banners */}
      {successMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 glass animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-rose-500/30 text-rose-455 bg-rose-955/20 glass animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Back Navigation & Edit/Share Headers */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors bg-slate-900/30 border border-slate-800 px-3.5 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("Back")}</span>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare} 
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors bg-slate-900/30 border border-slate-800 px-3.5 py-1.5 rounded-xl"
          >
            <Share2 className="w-4 h-4" />
            <span>{t("Share Link")}</span>
          </button>

          {user && report.userId === user.uid && (
            <div className="flex items-center gap-3">
              {report.status !== 'Resolved' && (
                <button 
                  onClick={() => setEditing(true)} 
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors bg-slate-900/30 border border-blue-950 px-3.5 py-1.5 rounded-xl"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t("Edit Details")}</span>
                </button>
              )}
              <button 
                onClick={handleDelete} 
                className="flex items-center gap-1.5 text-xs font-bold text-rose-455 hover:text-rose-350 cursor-pointer transition-colors bg-slate-900/30 border border-rose-950 px-3.5 py-1.5 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t("Delete Report")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Report Details Main Card (Col 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl border border-slate-800/60 shadow-xl overflow-hidden p-6 space-y-6">
            
            {/* Header details */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3 text-left">
                <img
                  src={report.reporterAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                  alt={report.reporterName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
                />
                <div className="leading-none">
                  <span className="block text-sm font-extrabold text-slate-200">{report.reporterName}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-550 font-semibold">{formatDate(report.date)}</span>
                    {report.edited && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-750 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                        {t("Edited")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-brand-300 uppercase tracking-wider">
                  {t(report.category)}
                </span>
                <SeverityBadge severity={report.severity} status={report.status} />
              </div>
            </div>

            {/* Post Content */}
            <div className="space-y-4 text-left">
              <h2 className="font-black text-xl sm:text-2xl text-white leading-tight">
                {t(report.title)}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {t(report.description)}
              </p>
            </div>

            {/* Post Image */}
            {(report.imageUrl || report.fileData) && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800/60 max-h-[360px] bg-slate-950/50">
                <img
                  src={report.imageUrl || report.fileData}
                  alt={report.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Location Address */}
            <div className="flex items-start gap-2 text-xs text-slate-400 font-semibold pt-4 border-t border-slate-850">
              <MapPin className="w-4 h-4 text-slate-550 shrink-0 mt-0.5" />
              <span>{t(report.location)}</span>
            </div>

            {/* Voting Section */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center bg-slate-950/45 rounded-full px-3 py-1 gap-2 border border-slate-850">
                <button
                  onClick={() => handleVote('up')}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    userVote === 'up' 
                      ? 'bg-blue-600/20 text-blue-400' 
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <span className={`text-xs font-black tracking-tight min-w-[20px] text-center ${
                  netVotes > 0 ? 'text-blue-400' : netVotes < 0 ? 'text-rose-455' : 'text-slate-400'
                }`}>
                  {netVotes}
                </span>
                <button
                  onClick={() => handleVote('down')}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    userVote === 'down' 
                      ? 'bg-rose-600/20 text-rose-455' 
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>

          {/* Comments Section */}
          <div className="glass rounded-3xl border border-slate-800/60 shadow-xl p-6 space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-850 pb-3">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>{t("Comments Thread")} ({(report.comments || []).length})</span>
            </h3>

            {/* Comments List */}
            <div className="space-y-5">
              {(!report.comments || report.comments.length === 0) ? (
                <p className="text-xs text-slate-550 italic">{t("No comments yet. Write one below to start the discussion!")}</p>
              ) : (
                <div className="space-y-4">
                  {report.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-left border-b border-slate-900/40 pb-3 last:border-0 last:pb-0">
                      <img
                        src={comment.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-800 shrink-0 animate-fade-in"
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
                              className="flex-1 px-3 py-1.5 bg-slate-955 border border-slate-850 rounded-lg text-[11px] text-white focus:outline-none focus:border-blue-650 transition-colors"
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
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              {t("Cancel")}
                            </button>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start group">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <p className="text-slate-350 text-[11px] leading-relaxed break-words whitespace-pre-line">{t(comment.text)}</p>
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
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400 text-slate-555 transition-all cursor-pointer shrink-0 ml-2"
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
            {user ? (
              <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2">
                <input
                  type="text"
                  required
                  placeholder={t("Write a comment...")}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-650 transition-colors font-semibold"
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-550 rounded-xl shadow-lg transition-colors cursor-pointer shrink-0"
                >
                  {commentSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl text-center text-xs text-slate-500">
                {t("Please")} <Link to="/login" className="text-blue-400 hover:underline">{t("Sign In")}</Link> {t("to participate in comments.")}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: GIS Location Venues Card (Col 1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-5 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-3">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>{t("GIS Coordinates")}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>{t("Latitude")}</span>
                <span className="font-mono text-white">{(report.lat || 12.9716).toFixed(5)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>{t("Longitude")}</span>
                <span className="font-mono text-white">{(report.lng || 77.5946).toFixed(5)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>{t("Audit Status")}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                  {t("Logged")}
                </span>
              </div>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef} 
              id="leaflet-detail-map"
              className="h-44 w-full bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden shadow-inner relative z-10"
            />
          </div>
        </div>

      </div>

      {/* Edit Details Popup Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(false)}>
          <form 
            onSubmit={handleUpdate}
            className="w-full max-w-lg bg-[#0b0f19]/95 border border-slate-850 shadow-2xl rounded-3xl relative flex flex-col overflow-hidden animate-scale-up p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-455" />
                <span>{t("Edit Report Details")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
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
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t("Cancel")}
              </button>

              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-md text-center"
              >
                {savingEdit ? t("Saving...") : t("Save Changes")}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
