import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, Clock, CheckCircle2, Users, MapPin, AlertCircle, AlertTriangle, 
  Check, Loader, Search, Filter, ArrowUpDown, ChevronRight, X, Sparkles, Send, 
  Download, BarChart3, Activity, ShieldCheck, Mail, SendToBack, FileText, 
  BrainCircuit, ThumbsUp, Calendar, Trash
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { fetchReports, addNotification, logUserActivity, updateUserProfile, fetchDocuments, reviewDocument } from '../services/api';
import { doc, updateDoc, setDoc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isMockFirebase } from '../firebase/config';
import { useTranslation } from '../context/TranslationContext';
import SeverityBadge from '../components/SeverityBadge';

// Hardcoded default fallback reports for mock mode
const INITIAL_MOCK_REPORTS = [];

export default function OfficerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Tab State: 'command-center' | 'queue' | 'agents' | 'analytics' | 'profile'
  const [activeTab, setActiveTab] = useState('command-center');
  
  // Incident Data State
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Table Interactions State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [prioritySort, setPrioritySort] = useState('desc'); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const reportsPerPage = 6;

  // Officer Actions State
  const [actionDept, setActionDept] = useState('');
  const [actionStaff, setActionStaff] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImage, setResolutionImage] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Crisis Mode States
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [crisisApproved, setCrisisApproved] = useState(false);

  // Chat Assistant State (Agent 10)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello Officer. I am the Jaan Sathi Smart Assistant. Ask me about the highest priority issues, department workloads, pending sanitation complaints, or ask for a report summary.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Document Verification States (Feature 7)
  const [verifications, setVerifications] = useState([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [selectedVerDoc, setSelectedVerDoc] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'verification' && user) {
      loadVerifications();
    }
  }, [activeTab, user]);

  const loadVerifications = async () => {
    setVerificationsLoading(true);
    try {
      const data = await fetchDocuments();
      setVerifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerificationsLoading(false);
    }
  };

  const handleReviewDocSubmit = async (status) => {
    if (!selectedVerDoc || !reviewRemarks.trim()) {
      alert("Please provide review remarks.");
      return;
    }
    setReviewSubmitting(true);
    try {
      await reviewDocument(selectedVerDoc.id, status, reviewRemarks, user.name);
      setSuccessMsg(`Document reviewed successfully: Marked as ${status}`);
      setSelectedVerDoc(null);
      setReviewRemarks('');
      loadVerifications();
    } catch (err) {
      setErrorMsg("Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Access Control Redirect Check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'officer')) {
      navigate('/citizen-dashboard');
    }
  }, [user, authLoading, navigate]);

  // Real-time Database Listener (Firestore or Mock LocalStorage)
  useEffect(() => {
    if (authLoading || !user || user.role !== 'officer') return;

    if (isMockFirebase) {
      // Seed Mock Data in LocalStorage if not present
      const saved = localStorage.getItem('jaan_sathi_reports');
      if (!saved) {
        localStorage.setItem('jaan_sathi_reports', JSON.stringify(INITIAL_MOCK_REPORTS));
        setReports(INITIAL_MOCK_REPORTS);
      } else {
        setReports(JSON.parse(saved));
      }
      setLoadingReports(false);

      // Listen for mock update events
      const syncMockData = () => {
        const data = localStorage.getItem('jaan_sathi_reports');
        if (data) setReports(JSON.parse(data));
      };
      window.addEventListener('refresh-reports', syncMockData);
      return () => window.removeEventListener('refresh-reports', syncMockData);
    }

    // Production Firebase Collection listener
    setLoadingReports(true);
    const q = query(collection(db, 'reports'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setReports(docs);
      setLoadingReports(false);
    }, (error) => {
      console.error("Firestore reports listener error:", error);
      // Fallback to mock data if Firestore security rules block or connection fails
      setReports(INITIAL_MOCK_REPORTS);
      setLoadingReports(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Autonomous Crisis Mode Scan
  useEffect(() => {
    if (reports.length < 3) return;

    // Scan for a cluster of unresolved reports close to each other
    // Threshold: Lat/Lng delta within 0.04 (approx 4km) and created within 3 days of each other
    const pendingReports = reports.filter(r => r.status === 'Pending' || r.status === 'In Progress');
    let foundCluster = null;

    for (let i = 0; i < pendingReports.length; i++) {
      const origin = pendingReports[i];
      const cluster = [origin];

      for (let j = 0; j < pendingReports.length; j++) {
        if (i === j) continue;
        const target = pendingReports[j];
        
        const latDiff = Math.abs(origin.lat - target.lat);
        const lngDiff = Math.abs(origin.lng - target.lng);
        
        if (latDiff < 0.04 && lngDiff < 0.04) {
          cluster.push(target);
        }
      }

      if (cluster.length >= 3) {
        foundCluster = cluster;
        break;
      }
    }

    if (foundCluster) {
      setCrisisAlert({
        name: `Cluster Alert: Sanitation & Infrastructure Outage`,
        affectedArea: `${foundCluster[0].location.split(',')[1] || 'Central Area'} Zone`,
        severity: 'Critical',
        confidence: 94,
        reportsCount: foundCluster.length,
        suggestedResponse: 'Declare localized maintenance dispatch. Re-route Sanitation Truck Squad C and deploy 2 structural repair units.',
        resources: '1 Sanitation Inspector, 3 Maintenance Engineers, 1 Vacuum Refuse Truck',
        checklist: [
          'Verify structural integrity of grid lines in the local zone',
          'Deploy regional alerts to neighborhood citizen feeds',
          'Coordinate dispatch of emergency sanitation crew'
        ]
      });
    } else {
      setCrisisAlert(null);
    }
  }, [reports]);

  // Leaflet Map Initialization & Sync
  useEffect(() => {
    if (activeTab !== 'command-center' || !mapRef.current || loadingReports) return;

    const L = window.L;
    if (!L) return;

    let map = mapInstance.current;
    const center = [12.9716, 77.5946]; // Default Bengaluru Center

    if (!map) {
      const isLight = document.documentElement.classList.contains('light');
      const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      map = L.map(mapRef.current, {
        zoomControl: false
      }).setView(center, 12);

      L.tileLayer(tileUrl, {
        attribution: '&copy; CARTO',
        maxZoom: 20
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      mapInstance.current = map;
    }

    // Clear and draw markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (!report.lat || !report.lng) return;

      const color = report.severity === 'Critical' ? '#f43f5e' :
                    report.severity === 'High' ? '#f59e0b' :
                    report.severity === 'Medium' ? '#3b82f6' : '#64748b';

      const markerHtml = `
        <div style="position: relative; width: 24px; height: 24px; pointer-events: auto;">
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

      const marker = L.marker([report.lat, report.lng], { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedReport(report);
      });

      marker.bindTooltip(`
        <div style="padding: 4px 8px; font-family: sans-serif; font-size: 11px; font-weight: bold; border-radius: 6px;">
          ${report.title} (${report.severity})
        </div>
      `, { direction: 'top', offset: [0, -10] });

      markersRef.current.push(marker);
    });

  }, [activeTab, reports, loadingReports]);

  // Sync details fields when selecting different reports
  useEffect(() => {
    if (selectedReport) {
      setActionDept(selectedReport.assignedDepartment || '');
      setActionStaff(selectedReport.assignedStaff || '');
      setResolutionNotes(selectedReport.resolutionNotes || '');
      setResolutionImage(selectedReport.resolutionImage || '');
    }
  }, [selectedReport]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'officer') {
    return null;
  }

  // --- MATH METRICS FOR CARDS ---
  const totalClaims = reports.length;
  const pendingClaims = reports.filter(r => r.status === 'Pending').length;
  const inProgressClaims = reports.filter(r => r.status === 'In Progress').length;
  const resolvedClaims = reports.filter(r => r.status === 'Resolved').length;
  const criticalClaims = reports.filter(r => r.severity === 'Critical').length;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayClaims = reports.filter(r => r.date === todayDateStr).length;

  // --- ACTIONS HANDLERS ---
  const triggerSuccessAlert = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerErrorAlert = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleUpdateStatus = async (statusVal) => {
    if (!selectedReport) return;
    setActionSubmitting(true);
    
    const updateData = {
      status: statusVal,
      assignedDepartment: actionDept || null,
      assignedStaff: actionStaff || null
    };

    if (statusVal === 'Resolved') {
      updateData.resolutionNotes = resolutionNotes;
      updateData.resolutionImage = resolutionImage;
      updateData.resolvedDate = new Date().toISOString().split('T')[0];
    }

    try {
      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jaan_sathi_reports') || '[]');
        const updated = stored.map(r => r.id === selectedReport.id ? { ...r, ...updateData } : r);
        localStorage.setItem('jaan_sathi_reports', JSON.stringify(updated));
        window.dispatchEvent(new Event('refresh-reports'));
      } else {
        const docRef = doc(db, 'reports', selectedReport.id);
        await updateDoc(docRef, updateData);
      }

      // Add dispatch logs to user timeline & notifications
      await addNotification(
        'System Announcements',
        `Incident Dispatch Resolution`,
        `Your team updated status for Report #${selectedReport.id.substring(0, 6)} to "${statusVal}" under ${actionDept || 'Unassigned'}.`
      );

      // Award XP to officer
      await logUserActivity(user.uid, `Dispatched/Resolved issue #${selectedReport.id.substring(0, 6)}`, 20);

      triggerSuccessAlert(`Incident status successfully marked as "${statusVal}"!`);
      setSelectedReport(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      console.error(err);
      triggerErrorAlert('Failed to update incident details.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleResolutionImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setResolutionImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEscalateIncident = async () => {
    if (!selectedReport) return;
    try {
      const updateData = { severity: 'Critical', priorityScore: 99 };
      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jaan_sathi_reports') || '[]');
        const updated = stored.map(r => r.id === selectedReport.id ? { ...r, ...updateData } : r);
        localStorage.setItem('jaan_sathi_reports', JSON.stringify(updated));
        window.dispatchEvent(new Event('refresh-reports'));
      } else {
        const docRef = doc(db, 'reports', selectedReport.id);
        await updateDoc(docRef, updateData);
      }

      await addNotification(
        'System Announcements',
        'EMERGENCY ALERT: Municipal Escalation',
        `Dispatcher escalated incident #${selectedReport.id.substring(0, 6)} to Emergency Response Unit due to critical community safety hazard.`
      );

      triggerSuccessAlert('Incident successfully escalated to emergency levels.');
      setSelectedReport(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      triggerErrorAlert('Escalation request failed.');
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedReport) return;
    try {
      await addNotification(
        'Community Updates',
        'Information Requested',
        `A dispatcher has requested additional clarity or photographs for your report "${selectedReport.title}".`
      );
      triggerSuccessAlert('Information request sent to citizen portal feed.');
    } catch {
      triggerErrorAlert('Request failed.');
    }
  };

  // --- SEARCH, FILTERS, PAGINATION GRID LOGIC ---
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      matchesDate = r.date >= dateRange.start && r.date <= dateRange.end;
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (prioritySort === 'desc') {
      return b.priorityScore - a.priorityScore;
    } else {
      return a.priorityScore - b.priorityScore;
    }
  });

  // Paginated List
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReportsList = sortedReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(sortedReports.length / reportsPerPage);

  const handlePageChange = (pageNo) => {
    if (pageNo >= 1 && pageNo <= totalPages) {
      setCurrentPage(pageNo);
    }
  };

  // --- SMART ASSISTANT AGENT RESPONSE (Agent 10) ---
  const handleSmartQuerySubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    setTimeout(() => {
      const query = userText.toLowerCase();
      let responseText = '';

      if (query.includes('priority') || query.includes('highest')) {
        const highest = [...reports].sort((a, b) => b.priorityScore - a.priorityScore)[0];
        if (highest) {
          responseText = `The highest priority issue currently is "${highest.title}" in ${highest.location} with a safety risk rating of ${highest.priorityScore}/100. Category: ${highest.category}.`;
        } else {
          responseText = "I couldn't find any pending issues in the database right now.";
        }
      } else if (query.includes('workload') || query.includes('departments')) {
        const counts = reports.reduce((acc, r) => {
          const dept = r.assignedDepartment || 'Unassigned';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {});
        
        responseText = `Current workload counts: ` + Object.entries(counts)
          .map(([d, c]) => `${d}: ${c} active issues`).join(', ') + '.';
      } else if (query.includes('sanitation') || query.includes('trash') || query.includes('garbage')) {
        const sanitationIssues = reports.filter(r => r.category === 'Sanitation' && r.status !== 'Resolved');
        responseText = `There are currently ${sanitationIssues.length} pending sanitation issues. ` + 
          (sanitationIssues.length > 0 ? `Nearest one is at "${sanitationIssues[0].location}".` : "The sanitation queue is clear!");
      } else if (query.includes('summary') || query.includes('overview')) {
        responseText = `Jaan Sathi Executive Summary: We have ${reports.length} total registered reports. ${pendingClaims} are awaiting dispatch review, ${inProgressClaims} are actively in progress, and ${resolvedClaims} have been resolved successfully. AI has predicted a high priority for Ward 17.`;
      } else {
        responseText = "I can read your database in real time. Try asking: 'What is the highest priority issue?', 'Show department workloads', 'How many sanitation complaints are pending?', or 'Give me a summary report'.";
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
      setChatLoading(false);
    }, 600);
  };

  // --- EXECUTIVE REPORT PDF GENERATOR (Agent 9) ---
  const handlePrintExecutiveReport = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in relative text-left">
      
      {/* Toast Alert Banners */}
      {successMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 glass animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{t(successMsg)}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-rose-500/30 text-rose-455 bg-rose-955/20 glass animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{t(errorMsg)}</span>
        </div>
      )}

      {/* --- HEADER OPERATIONS BANNER --- */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 text-left">
            <div className="p-4 bg-slate-900 border border-slate-800 text-blue-400 rounded-2xl shadow-inner shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-brand-300 border border-blue-500/20 text-[10px] font-bold tracking-wider uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t(user.department || "Operations Control")} • {t("MUNICIPAL OFFICIAL")}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t("Welcome, Officer ")}{user.name.split(' ')[0]}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-lg">
                {t("Operations Dashboard Command Center. Real-time GIS alerts, agentic resource dispatches, and emergency response.")}
              </p>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-2xl border border-slate-800/50">
            <div className="text-right">
              <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Current Shift")}</span>
              <span className="block text-[10px] text-slate-300 font-semibold">{new Date().toDateString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- DASHBOARD TAB CONTROLLERS --- */}
      <div className="flex border-b border-slate-800/60 pb-1 scrollbar-none overflow-x-auto gap-2">
        {[
          { id: 'command-center', label: 'Command Center', icon: Activity },
          { id: 'queue', label: 'Incident Queue', icon: FileText },
          { id: 'verification', label: 'Document Verification', icon: ShieldCheck },
          { id: 'agents', label: 'AI Agents Hub', icon: BrainCircuit },
          { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
          { id: 'profile', label: 'Officer Profile', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-brand-600/10 to-brand-500/5 text-brand-300 border border-brand-500/20 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.label)}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB VIEW 1: COMMAND CENTER (LIVE OPERATIONS) --- */}
      {activeTab === 'command-center' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* 1. TOP METRICS BLOCK */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Incidents', val: totalClaims, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Pending Dispatch', val: pendingClaims, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'In Progress', val: inProgressClaims, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Total Resolved', val: resolvedClaims, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            ].map((stat, idx) => (
              <div 
                key={idx}
                className="glass p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700/60 transition-all flex items-center gap-4 relative overflow-hidden"
              >
                <div className={`p-3 rounded-xl shrink-0 ${stat.bg} ${stat.color}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t(stat.label)}</span>
                  <span className="text-xl md:text-2xl font-black text-white block mt-0.5">{stat.val}</span>
                </div>
              </div>
            ))}
          </section>

          {/* 2. AUTONOMOUS CRISIS MODE BANNER */}
          {crisisAlert && (
            <div className={`glass p-6 rounded-3xl border border-rose-500/30 bg-rose-955/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden ${crisisApproved ? 'border-emerald-500/30 bg-emerald-955/10' : ''}`}>
              <div className="absolute top-0 right-0 p-3 text-[70px] text-rose-500/5 font-black uppercase tracking-widest select-none pointer-events-none">CRISIS</div>
              
              <div className="space-y-3 relative z-10 text-left">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${crisisApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20 animate-pulse'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {crisisApproved ? t("Crisis Handled / Dispatched") : t("Autonomous Crisis Detection Override")}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Confidence: {crisisAlert.confidence}%</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">{t(crisisAlert.name)}</h3>
                <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">{t("Impact Zone:")} <strong className="text-slate-100">{crisisAlert.affectedArea}</strong> • {t(crisisAlert.suggestedResponse)}</p>
                
                {/* Crisis Checklist */}
                <div className="space-y-1.5 pt-2">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">{t("Emergency Response Checklist:")}</span>
                  {crisisAlert.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-350 font-medium">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${crisisApproved ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                        {idx + 1}
                      </div>
                      <span>{t(item)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto relative z-10">
                <button
                  onClick={() => {
                    setCrisisApproved(true);
                    triggerSuccessAlert("Emergency crisis dispatch units deployed successfully!");
                  }}
                  disabled={crisisApproved}
                  className={`px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${crisisApproved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10 hover:shadow-rose-650/20'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{crisisApproved ? t("Dispatch Authorized") : t("Authorize Emergency Dispatch")}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. GIS MAP AND TODAY'S AI SUMMARY HEADER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GIS MAP CONTAINER */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-base font-extrabold text-white tracking-tight">{t("Operations GIS Map Overview")}</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{t("Pin colors represent hazard severity")}</span>
              </div>
              
              <div className="glass p-4 rounded-3xl border border-slate-800/60 relative w-full h-[450px] overflow-hidden flex flex-col justify-between shadow-2xl">
                <div ref={mapRef} className="absolute inset-0 z-0 w-full h-full bg-[#070b13]" />
                
                {/* Floating GPS Map Overlay details */}
                <div className="absolute bottom-4 left-4 z-10 backdrop-blur-md p-3 rounded-2xl border bg-slate-950/80 border-slate-800/50 max-w-xs text-left shadow-lg">
                  <span className="text-[8px] font-black uppercase tracking-widest text-brand-400 block">{t("MAP CONTROL")}</span>
                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">{t("Real-time GPS Dispatch pinpoints active citizen reports in the Bengaluru Metropolitan bounds.")}</p>
                </div>
              </div>
            </div>

            {/* TODAY'S AI SUMMARY PANEL */}
            <div className="space-y-4 text-left">
              <h3 className="text-base font-extrabold text-white tracking-tight px-1">{t("Today's AI Summary")}</h3>
              
              <div className="glass p-6 rounded-3xl border border-slate-800/60 shadow-xl space-y-5 h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t("Incident Triage Agent")}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-blue-500/5 px-2.5 py-0.5 rounded border border-blue-500/10">🤖 Active</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold leading-relaxed">
                      <strong>{totalClaims}</strong> {t("reports registered across city wards.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold leading-relaxed">
                      <strong>{pendingClaims}</strong> {t("reports are currently pending initial dispatcher approval.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold leading-relaxed">
                      <strong>{criticalClaims}</strong> {t("high-risk incidents detected causing community safety hazards.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-semibold leading-relaxed">
                      {t("Workload stress for")} <strong>{user.department || "Public Works"}</strong> {t("is currently flagged as")} <strong className="text-amber-450 uppercase">{pendingClaims > 5 ? "High" : "Optimal"}</strong>.
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2 text-left">
                  <span className="block text-[8px] text-blue-400 font-bold uppercase tracking-wider">{t("Recommended Action Planner:")}</span>
                  <span className="block text-xs font-bold text-white leading-snug">{t("Focus dispatch units on Ward 17")}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{t("Reason: Sanitation reports are clustered within 1km. Merging duplicates will save an estimated 14 work hours.")}</p>
                  <div className="flex justify-between items-center pt-1 text-[9px] font-bold text-blue-300">
                    <span>Confidence Score: 96%</span>
                    <span>Ref: Agent 5</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB VIEW 2: INCIDENT QUEUE (REPORT TABLE & DRAWER) --- */}
      {activeTab === 'queue' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* SEARCH & FILTERS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 justify-between items-stretch">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("Search by ID, title, or location...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
            {/* Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="All">{t("All Statuses")}</option>
                <option value="Pending">{t("Pending")}</option>
                <option value="In Progress">{t("In Progress")}</option>
                <option value="Resolved">{t("Resolved")}</option>
              </select>
            </div>
            {/* Category */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="All">{t("All Categories")}</option>
                <option value="Infrastructure">{t("Infrastructure")}</option>
                <option value="Roads & Safety">{t("Roads & Safety")}</option>
                <option value="Sanitation">{t("Sanitation")}</option>
                <option value="Public Space">{t("Public Space")}</option>
                <option value="Other">{t("Other")}</option>
              </select>
            </div>
            {/* Priority Sort Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setPrioritySort(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex-1 flex items-center justify-center gap-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-355 hover:text-white transition-all cursor-pointer font-bold"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{prioritySort === 'desc' ? t("Priority: High to Low") : t("Priority: Low to High")}</span>
              </button>
            </div>
          </div>

          {/* DATE RANGE FILTER */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/20 p-3 rounded-2xl border border-slate-800/40 text-xs">
            <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">{t("Filter by Date Range:")}</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 text-[10px]"
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 text-[10px]"
            />
            {(dateRange.start || dateRange.end) && (
              <button 
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-[10px] font-bold text-rose-455 hover:underline cursor-pointer"
              >{t("Clear Dates")}</button>
            )}
          </div>

          {/* ADVANCED INCIDENT TABLE */}
          {loadingReports ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="glass p-16 text-center rounded-3xl border border-slate-800/60 text-slate-500">
              <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-base text-white">{t("No Incidents Found")}</h3>
              <p className="text-slate-455 text-xs mt-1">{t("Try adjusting your search queries or workspace filters.")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-3xl border border-slate-800/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800/60 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                        <th className="p-4">{t("ID / Date")}</th>
                        <th className="p-4">{t("Incident Details")}</th>
                        <th className="p-4">{t("Priority")}</th>
                        <th className="p-4">{t("Citizen Reporter")}</th>
                        <th className="p-4">{t("Assigned Division")}</th>
                        <th className="p-4">{t("Status")}</th>
                        <th className="p-4 text-center">{t("Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {currentReportsList.map((report) => (
                        <tr 
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className="hover:bg-slate-800/10 transition-colors cursor-pointer"
                        >
                          <td className="p-4 whitespace-nowrap">
                            <span className="block font-bold text-slate-205">#${report.id.substring(0, 6)}</span>
                            <span className="block text-[9px] text-slate-500 font-medium mt-0.5">{report.date}</span>
                          </td>
                          <td className="p-4 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <img
                                src={report.imageUrl}
                                alt={report.title}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                              />
                              <div className="overflow-hidden min-w-0">
                                <span className="block font-bold text-white truncate leading-snug">{t(report.title)}</span>
                                <span className="block text-[9px] text-brand-300 font-semibold tracking-wider uppercase mt-0.5">{t(report.category)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-blue-450">{report.priorityScore}</span>
                              <SeverityBadge severity={report.severity} status={report.status} />
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="block font-medium text-slate-205">{report.reporterName}</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">{t("Votes:")} +{report.upvotes || 1}</span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="block font-semibold text-slate-300">{t(report.assignedDepartment || "Unassigned")}</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">{t("Staff:")} {report.assignedStaff || t("None")}</span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                              report.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              report.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                            }`}>
                              {t(report.status)}
                            </span>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION NUMBERS */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 bg-slate-900 border border-slate-850 rounded-lg text-xs font-bold text-slate-450 hover:text-white disabled:opacity-50 cursor-pointer"
                  >
                    {t("Prev")}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-slate-900 border border-slate-850 rounded-lg text-xs font-bold text-slate-450 hover:text-white disabled:opacity-50 cursor-pointer"
                  >
                    {t("Next")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- SIDE DETAILS DRAWER PANE --- */}
          {selectedReport && (
            <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
              <div 
                className="fixed inset-0 cursor-pointer"
                onClick={() => setSelectedReport(null)}
              />
              
              <div className="glass w-full max-w-lg h-full bg-[#0b0f19]/95 border-l border-slate-850 shadow-2xl relative z-10 flex flex-col justify-between overflow-y-auto animate-slide-left p-6 space-y-6">
                
                {/* Drawer Header */}
                <div className="flex justify-between items-center border-b border-slate-850 pb-4 shrink-0">
                  <div className="text-left">
                    <span className="text-[10px] text-brand-300 font-bold uppercase tracking-wider">{t(selectedReport.category)}</span>
                    <h2 className="text-base font-extrabold text-white mt-0.5">{t("Incident Details")} #${selectedReport.id.substring(0, 6)}</h2>
                    <div className="mt-1">
                      <SeverityBadge severity={selectedReport.severity} status={selectedReport.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Body Scroll */}
                <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin text-left">
                  
                  {/* Large Image Attachment */}
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-850 shadow-lg shrink-0">
                    <img
                      src={selectedReport.imageUrl}
                      alt={selectedReport.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full glass border border-white/10 text-[9px] font-bold text-white uppercase">
                      {t("Citizen Attachment")}
                    </div>
                  </div>

                  {/* Incident Text Block */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-sm">{t(selectedReport.title)}</h3>
                    <p className="text-slate-350 text-xs leading-relaxed">{t(selectedReport.description)}</p>
                  </div>

                  {/* Citizen Metadata Info */}
                  <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Submitted By:")}</span>
                      <span className="font-bold text-slate-205">{selectedReport.reporterName}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider text-right">{t("Community Upvotes:")}</span>
                      <span className="font-extrabold text-brand-300 text-right block">+{selectedReport.upvotes || 1}</span>
                    </div>
                  </div>

                  {/* Leaflet GPS Coordinates locator */}
                  <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-xs space-y-1">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Incident Location:")}</span>
                    <div className="flex items-center gap-1 font-semibold text-slate-205">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{t(selectedReport.location)}</span>
                    </div>
                    <span className="block text-[8px] text-slate-650 mt-1">Coordinates: {selectedReport.lat.toFixed(5)}, {selectedReport.lng.toFixed(5)}</span>
                  </div>

                  {/* AI Prediction Insight Box (Agent 1: Incident Triage) */}
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-blue-400">
                      <span>🤖 Agent 1: Triage Assessment</span>
                      <span>94% Confidence</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Est. Repair Cost:")}</span>
                        <span className="font-extrabold text-white">₹{selectedReport.priorityScore * 1200 + 4000}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Est. Labor Duration:")}</span>
                        <span className="font-extrabold text-white">{selectedReport.priorityScore > 75 ? "24 Hours" : "3 Days"}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- OFFICER DISPATCH ACTIONS FORM --- */}
                  <div className="border-t border-slate-850 pt-4 space-y-4">
                    <h3 className="font-black text-sm text-white uppercase tracking-wider">{t("Operations Dispatch Console")}</h3>
                    
                    {/* Select Department */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("Assign Municipal Department")}</label>
                      <select
                        value={actionDept}
                        onChange={(e) => setActionDept(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-brand-500"
                      >
                        <option value="">{t("Unassigned")}</option>
                        <option value="Infrastructure">{t("Infrastructure & Engineering")}</option>
                        <option value="Roads & Safety">{t("Roads & Safety Division")}</option>
                        <option value="Sanitation">{t("Sanitation & Waste")}</option>
                        <option value="Parks & Recreation">{t("Horticulture & Parks")}</option>
                      </select>
                    </div>

                    {/* Staff Assignment */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("Assign Field Staff Crew")}</label>
                      <input
                        type="text"
                        placeholder="e.g. Squad 4 - Repairs"
                        value={actionStaff}
                        onChange={(e) => setActionStaff(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Resolution inputs: only shown if status will be marked Resolved */}
                    {selectedReport.status !== 'Resolved' && (
                      <div className="p-3 bg-slate-900/20 border border-slate-850 rounded-2xl space-y-3">
                        <span className="block text-[9px] font-bold text-emerald-450 uppercase tracking-wider">{t("Close Out Verification details")}</span>
                        <div className="space-y-1.5">
                          <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Resolution Maintenance Notes")}</label>
                          <textarea
                            placeholder={t("Briefly describe maintenance action taken...")}
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-brand-500 h-16 resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Upload Verification Photo")}</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleResolutionImageUpload}
                            className="text-xs text-slate-400"
                          />
                          {resolutionImage && (
                            <img
                              src={resolutionImage}
                              alt="Resolution proof"
                              className="w-16 h-16 rounded object-cover border border-slate-850 mt-1"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Execution buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {selectedReport.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateStatus('In Progress')}
                          disabled={actionSubmitting}
                          className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-650/10"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t("Dispatch Crew")}</span>
                        </button>
                      )}
                      
                      {selectedReport.status !== 'Resolved' && (
                        <button
                          onClick={() => handleUpdateStatus('Resolved')}
                          disabled={actionSubmitting}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 col-span-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t("Close & Mark Resolved")}</span>
                        </button>
                      )}

                      <button
                        onClick={handleEscalateIncident}
                        className="py-2.5 bg-slate-900 border border-slate-800 hover:bg-rose-955/10 hover:border-rose-500/20 text-rose-455 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {t("Escalate Urgent")}
                      </button>

                      <button
                        onClick={handleRequestMoreInfo}
                        className="py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {t("Request Info")}
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* --- TAB VIEW 3: AI AGENTS HUB --- */}
      {activeTab === 'agents' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          <div className="border-b border-slate-800/60 pb-3">
            <h2 className="text-lg font-black text-white tracking-tight">{t("Autonomous AI Agents Dashboard")}</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {t("Real-time telemetry and reports processed by 10 background municipal agents.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Agent 2: Duplicate Detection */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-300">{t("Agent 2: Duplicate Classifier")}</span>
                <span className="text-[9px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Continuously Scanning")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Scans incoming report descriptions and coordinates to identify overlaps and recommend ticket mergers.")}</p>
              <div className="p-3 bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-850">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>Detected Overlaps:</span>
                  <span className="text-brand-300">2 duplicate reports</span>
                </div>
                <p className="text-[10px] text-slate-455 leading-relaxed">Overlap Detected: "Broken street lamp" in Ward 17. Merging these issues saves an estimated 14 dispatcher dispatch hours.</p>
              </div>
            </div>

            {/* Agent 3: Resource Planner */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t("Agent 3: Resource Dispatch Dispatcher")}</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Ready")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Analyzes priority ratings, categories, and active dispatcher teams to recommend optimal maintenance squad dispatches.")}</p>
              <div className="p-3 bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-850 text-xs">
                <div className="flex justify-between font-bold text-white">
                  <span>Best Suggested Squad:</span>
                  <span className="text-blue-400">Squad C - Sanitation Dispatch</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-455">
                  <span>Estimated Arrival time:</span>
                  <span>14 Minutes (GPS optimized)</span>
                </div>
              </div>
            </div>

            {/* Agent 4: Predictive Risk warnings */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-455">{t("Agent 4: Predictive Risk Analyzer")}</span>
                <span className="text-[9px] bg-rose-500/10 text-rose-455 border border-rose-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider animate-pulse">{t("High Alert")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Combines weather alerts with citizen complaints to predict localized municipal hazards.")}</p>
              <div className="p-3 bg-slate-900/50 rounded-xl space-y-2 border border-slate-850 text-xs">
                <div className="flex items-center gap-1.5 text-rose-455 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Predicted Threat: Localized Flash Flood (88% Confidence)</span>
                </div>
                <p className="text-[10px] text-slate-455 leading-relaxed">Trigger: Drainage clog reports in Ward 17 + Met Office heavy rainfall warning (85mm/hr forecast).</p>
              </div>
            </div>

            {/* Agent 5 & 6: Priority & Escalation overview */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t("Agent 5 & 6: Priority Queue Escalator")}</span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Active Monitoring")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Flags unresolved issues exceeding SLA response timers or receiving rapid upvotes from neighborhood citizens.")}</p>
              <div className="p-3 bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-850 text-xs">
                <div className="flex justify-between text-white font-bold">
                  <span>Awaiting Escalation:</span>
                  <span className="text-indigo-400">1 Critical gas leak claim (age 24h)</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-455">
                  <span>Escalation Rule Triggered:</span>
                  <span>SLA Breached (&gt;18 hours for Critical severity)</span>
                </div>
              </div>
            </div>

            {/* Agent 7 & 8: Fraud & Sentiment analysis */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{t("Agent 7 & 8: Citizen Sentiment & Spam Filter")}</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Safe")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Checks incident text structures and citizen comments to identify spam, fake coordinates, or bad language.")}</p>
              <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400">
                <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-855">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Spam Alarms:</span>
                  <span className="text-white font-bold">0 suspicious entries</span>
                </div>
                <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-855">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Sentiment Trend:</span>
                  <span className="text-emerald-400 font-bold">78% Positive/Neutral</span>
                </div>
              </div>
            </div>

            {/* Agent 9: Executive Report Generator */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t("Agent 9: Executive PDF Generator")}</span>
                <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("System Exporter")}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{t("Exports official daily, weekly, or monthly operation summaries to print format for municipal record keeping.")}</p>
              <button
                onClick={handlePrintExecutiveReport}
                className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t("Export Operations Summary PDF")}</span>
              </button>
            </div>

            {/* Agent 10: Interactive Smart Assistant Chatbot widget */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-4 md:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-brand-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{t("Agent 10: Operations Smart Assistant")}</span>
                </div>
                <span className="text-[9px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Realtime Query")}</span>
              </div>

              {/* Chat Log */}
              <div className="flex-1 space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin my-2">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl text-xs max-w-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-900 border border-slate-850 text-slate-205'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("Assistant is reading database...")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSmartQuerySubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("Ask me e.g. 'What is the highest priority issue?', 'Show workloads'...")}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB VIEW 4: ANALYTICS DASHBOARD --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          <div className="border-b border-slate-800/60 pb-3">
            <h2 className="text-lg font-black text-white tracking-tight">{t("Municipal Analytics Dashboard")}</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {t("Visual statistical breakdowns representing municipal performance and resolution metrics.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Resolution speeds */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">{t("Ward Distribution")}</span>
              
              <div className="space-y-3.5">
                {[
                  { ward: 'Ward 17 - Indiranagar', count: totalClaims > 1 ? Math.floor(totalClaims * 0.4) + 1 : 1, pct: 40 },
                  { ward: 'Ward 4 - Koramangala', count: totalClaims > 2 ? Math.floor(totalClaims * 0.3) : 0, pct: 30 },
                  { ward: 'Ward 82 - Whitefield', count: totalClaims > 3 ? Math.floor(totalClaims * 0.2) : 0, pct: 20 },
                  { ward: 'Ward 12 - Malleshwaram', count: totalClaims > 4 ? Math.floor(totalClaims * 0.1) : 0, pct: 10 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-300">{item.ward}</span>
                      <span className="text-brand-300 font-bold">{item.count} {t("claims")} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Trends */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">{t("Issue Categories distribution")}</span>
              
              <div className="space-y-3.5">
                {[
                  { cat: 'Sanitation', count: reports.filter(r => r.category === 'Sanitation').length, pct: reports.filter(r => r.category === 'Sanitation').length / totalClaims * 100 || 0 },
                  { cat: 'Roads & Safety', count: reports.filter(r => r.category === 'Roads & Safety').length, pct: reports.filter(r => r.category === 'Roads & Safety').length / totalClaims * 100 || 0 },
                  { cat: 'Infrastructure', count: reports.filter(r => r.category === 'Infrastructure').length, pct: reports.filter(r => r.category === 'Infrastructure').length / totalClaims * 100 || 0 },
                  { cat: 'Public Space', count: reports.filter(r => r.category === 'Public Space').length, pct: reports.filter(r => r.category === 'Public Space').length / totalClaims * 100 || 0 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-300">{t(item.cat)}</span>
                      <span className="text-blue-400 font-bold">{item.count} {t("items")} ({Math.round(item.pct)}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${item.pct || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Performance */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">{t("Division Resolution Efficiency")}</span>
              
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Sanitation & Waste:</span>
                  <span className="text-emerald-450 font-bold">12 Hours SLA</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Roads & Safety:</span>
                  <span className="text-emerald-450 font-bold">36 Hours SLA</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Infrastructure:</span>
                  <span className="text-amber-400 font-bold">3.5 Days SLA</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Horticulture / Parks:</span>
                  <span className="text-emerald-450 font-bold">24 Hours SLA</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB VIEW 5: OFFICER PROFILE & LOGS --- */}
      {activeTab === 'profile' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Officer Details Card */}
            <div className="glass p-6 rounded-3xl border border-slate-800/60 text-left space-y-4 md:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-300 block">{t("Officer Scorecard")}</span>
              
              <div className="flex flex-col items-center text-center py-4 space-y-2">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                  alt={user.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-brand-500/20 shadow-xl"
                />
                <div>
                  <h3 className="font-extrabold text-white text-base leading-snug">{user.name}</h3>
                  <span className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase block">{t(user.role)}</span>
                </div>
              </div>

              <div className="space-y-3.5 border-t border-slate-850 pt-4 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Employee ID:</span>
                  <span className="text-white font-semibold">JS-OFF-7089</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Division:</span>
                  <span className="text-white font-semibold">{t(user.department || "Operations Control")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Shift Status:</span>
                  <span className="text-emerald-400 font-bold">Active On Duty</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Resolution Score:</span>
                  <span className="text-brand-300 font-extrabold">98.5% SLA Match</span>
                </div>
              </div>
            </div>

            {/* Officer Recent Activity Log */}
            <div className="glass p-6 rounded-3xl border border-slate-800/60 text-left space-y-4 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 block">{t("Dispatcher Activity Log")}</span>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { time: 'Just now', action: 'Declined merging for duplicate issues #rep-101 and #rep-102.' },
                  { time: '34 Minutes ago', action: `Dispatched sanitation crew to Indiranagar for reported garbage pile.` },
                  { time: '2 Hours ago', action: 'Updated display theme parameters to light mode preference.' },
                  { time: 'Yesterday', action: 'Assigned roads and safety crew to Broadway Avenue pothole repairs.' },
                  { time: '2 Days ago', action: 'Authorized 50 Community Points release to reporter Sara Jenkins.' }
                ].map((log, idx) => (
                  <div key={idx} className="flex gap-4 text-xs font-semibold leading-relaxed">
                    <span className="text-slate-500 shrink-0 text-[10px] font-bold w-24">{log.time}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span className="text-slate-300 font-medium">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB VIEW 6: DOCUMENT VERIFICATION QUEUE (Feature 7) --- */}
      {activeTab === 'verification' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4 justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-extrabold text-white tracking-tight">{t("Citizen Verification Queue")}</h2>
            </div>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider bg-slate-900 border border-slate-800/85 px-3 py-1 rounded-xl">
              {verifications.filter(v => v.status === 'Pending Verification').length} {t("Pending Actions")}
            </span>
          </div>

          {verificationsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800/60 rounded-2xl text-slate-500 space-y-3">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-700" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t("No Verification Documents")}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{t("There are currently no verification documents uploaded by citizens.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto select-none">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">{t("Citizen")}</th>
                    <th className="py-3 px-4">{t("Document Name")}</th>
                    <th className="py-3 px-4">{t("Category")}</th>
                    <th className="py-3 px-4">{t("Date Uploaded")}</th>
                    <th className="py-3 px-4">{t("Status")}</th>
                    <th className="py-3 px-4 text-right">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {verifications.map((docItem) => (
                    <tr key={docItem.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{t(docItem.userName || "Anonymous Citizen")}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">{docItem.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-350 border border-brand-500/15 font-bold uppercase text-[9px]">
                          {t(docItem.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-semibold">{formatDate(docItem.date)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                          docItem.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : docItem.status === 'Pending Verification'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                        }`}>
                          {t(docItem.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedVerDoc(docItem);
                            setReviewRemarks(docItem.officerRemark || '');
                          }}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all font-bold cursor-pointer"
                        >
                          {t("Review Document")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Review Dialog overlay Modal */}
      {selectedVerDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedVerDoc(null)}>
          <div 
            className="w-full max-w-lg bg-[#0b0f19]/95 border border-slate-850 shadow-2xl rounded-3xl relative flex flex-col overflow-hidden animate-scale-up p-6 space-y-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-455" />
                <span>{t("Document Verification Review")}</span>
              </h3>
              <button
                onClick={() => setSelectedVerDoc(null)}
                className="p-1 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content preview */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/30 p-3 rounded-xl border border-slate-850">
                <div>Citizen Name: <span className="font-bold text-white block mt-0.5">{selectedVerDoc.userName || "Anonymous"}</span></div>
                <div>Category: <span className="font-bold text-white block mt-0.5">{selectedVerDoc.category}</span></div>
                <div>File Size: <span className="font-bold text-slate-300 block mt-0.5">{selectedVerDoc.size || 'N/A'}</span></div>
                <div>Date Uploaded: <span className="font-bold text-slate-350 block mt-0.5">{selectedVerDoc.date}</span></div>
              </div>

              {/* Document Image Preview or Placeholder */}
              <div className="space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Document Preview / File Reference")}</span>
                
                {selectedVerDoc.fileUrl || selectedVerDoc.fileData ? (
                  <div className="relative h-48 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-850 flex items-center justify-center">
                    {(selectedVerDoc.fileUrl?.endsWith('.pdf') || selectedVerDoc.name?.toLowerCase().endsWith('.pdf') || selectedVerDoc.fileData?.startsWith('data:application/pdf')) ? (
                      <div className="text-center p-6 space-y-2">
                        <FileText className="w-8 h-8 text-blue-400 mx-auto" />
                        <span className="text-[10px] text-slate-400 block font-semibold">{selectedVerDoc.name}</span>
                        <a 
                          href={selectedVerDoc.fileUrl || selectedVerDoc.fileData} 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-1 inline-block px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-all"
                        >
                          View PDF in New Tab
                        </a>
                      </div>
                    ) : (
                      <img 
                        src={selectedVerDoc.fileUrl || selectedVerDoc.fileData} 
                        alt="Verification preview" 
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl text-slate-550 space-y-1.5">
                    <FileText className="w-7 h-7 mx-auto text-slate-650" />
                    <span className="text-[10px] block font-semibold text-slate-400">File Data preview unavailable</span>
                    <span className="text-[9px] text-slate-500 block">No visual url or base64 attached to this submission.</span>
                  </div>
                )}
              </div>

              {/* Remarks Form input */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-slate-450 font-bold uppercase tracking-wider">{t("Officer Remarks / Feedback")}</label>
                <textarea
                  required
                  placeholder={t("Provide feedback, missing fields, or approval reason...")}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-brand-500 transition-colors h-20 resize-none font-semibold leading-relaxed"
                />
              </div>
            </div>

            {/* Review Action Buttons */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => handleReviewDocSubmit('Rejected')}
                disabled={reviewSubmitting || !reviewRemarks.trim()}
                className="flex-1 py-2.5 bg-rose-955 hover:bg-rose-900 border border-rose-900 text-rose-455 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("Reject")}
              </button>
              
              <button
                type="button"
                onClick={() => handleReviewDocSubmit('Request Re-upload')}
                disabled={reviewSubmitting || !reviewRemarks.trim()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("Request Re-upload")}
              </button>

              <button
                type="button"
                onClick={() => handleReviewDocSubmit('Approved')}
                disabled={reviewSubmitting || !reviewRemarks.trim()}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {reviewSubmitting ? t("Submitting...") : t("Approve")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
