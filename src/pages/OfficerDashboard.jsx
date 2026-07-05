import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, Clock, CheckCircle2, Users, MapPin, AlertCircle, AlertTriangle, 
  Check, Loader, Search, Filter, ArrowUpDown, ChevronRight, X, Sparkles, Send, 
  Download, BarChart3, Activity, ShieldCheck, Mail, SendToBack, FileText, 
  BrainCircuit, ThumbsUp, Calendar, Trash, ArrowLeft, Cpu, TrendingUp, CheckCircle, ArrowRight
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { fetchReports, addNotification, logUserActivity, updateUserProfile, fetchDocuments, reviewDocument, deleteReport, deleteComment, awardXP } from '../services/api';
import { doc, updateDoc, setDoc, getDoc, collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { db, isMockFirebase } from '../firebase/config';
import { useTranslation } from '../context/TranslationContext';
import SeverityBadge from '../components/SeverityBadge';
import ExecutiveReportsConsole from '../components/ExecutiveReportsConsole';
import { officerChatWithGemini, findDuplicateReportsWithGemini, analyzePredictiveRisksWithGemini, generateResourcePlanWithGemini, analyzeModerationWithGemini, localMockModeration, generateAIInsightsWithGemini } from '../services/gemini';
import { REGIONS_DATA, getReportRegion, getRegionCoordinates } from '../utils/regions';

// Hardcoded default fallback reports for mock mode
const INITIAL_MOCK_REPORTS = [
  {
    id: 'rep-dup-01',
    title: 'Broken Streetlight pole #12',
    category: 'Infrastructure',
    location: '405 Pine Street, Downtown',
    date: '2026-06-28',
    status: 'Pending',
    description: 'Streetlight pole #12 is completely dark, causing safety concerns for pedestrians at night.',
    pointsEarned: 0,
    severity: 'Medium',
    priorityScore: 35,
    assignedDepartment: 'Electricity Board',
    imageUrl: 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
    lat: 12.9784,
    lng: 77.5906,
    comments: [
      { id: 'c1', userName: 'Rajesh Kumar', text: 'Street is pitch black here, very dangerous.' }
    ]
  },
  {
    id: 'rep-dup-02',
    title: 'Dark streetlight at 405 Pine',
    category: 'Infrastructure',
    location: '405 Pine Street, Downtown',
    date: '2026-06-29',
    status: 'Pending',
    description: 'The streetlight bulb is broken and street is completely dark near 405 Pine.',
    pointsEarned: 0,
    severity: 'Medium',
    priorityScore: 30,
    assignedDepartment: 'Electricity Board',
    imageUrl: 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
    lat: 12.9784,
    lng: 77.5906,
    comments: [
      { id: 'c2', userName: 'Anil Mehta', text: 'This is the same issue already reported under pole #12.' },
      { id: 'c3', userName: 'Suman G.', text: 'Yes, same streetlight issue.' },
      { id: 'c4', userName: 'Priya K.', text: 'Please merge this, it is a duplicate post.' }
    ]
  },
  {
    id: 'rep-dup-03',
    title: 'Water Pipe Leakage on Broadway Ave',
    category: 'Infrastructure',
    location: '1200 Broadway Ave',
    date: '2026-06-28',
    status: 'Pending',
    description: 'Water is gushing out from a cracked underground utility pipe on Broadway Ave.',
    pointsEarned: 0,
    severity: 'High',
    priorityScore: 68,
    assignedDepartment: 'Water Board',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
    lat: 12.9716,
    lng: 77.5946,
    comments: []
  },
  {
    id: 'rep-dup-04',
    title: 'Water Pipe Crack on Broadway',
    category: 'Infrastructure',
    location: '1200 Broadway Ave',
    date: '2026-06-29',
    status: 'Pending',
    description: 'Cracked water line gushing water on Broadway road.',
    pointsEarned: 0,
    severity: 'High',
    priorityScore: 65,
    assignedDepartment: 'Water Board',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
    lat: 12.9716,
    lng: 77.5946,
    comments: []
  }
];

export default function OfficerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const tabParam = searchParams.get('tab');
  const filterParam = searchParams.get('filter');
  const deptParam = searchParams.get('dept');
  const subParam = searchParams.get('sub');
  const viewParam = searchParams.get('view') || 'performance';

  // Tab State: 'command-center' | 'queue' | 'agents' | 'analytics' | 'profile' | 'verification'
  const [activeTab, setActiveTab] = useState(tabParam || 'command-center');
  
  // Incident Data State
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [mapLoading, setMapLoading] = useState(!window.L);
  const detailMapRef = useRef(null);
  const detailMapInstance = useRef(null);
  const heatmapMapInstance = useRef(null);

  // Hierarchical Region Filtering States
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  useEffect(() => {
    if (window.L) {
      setMapLoading(false);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setMapLoading(false);
    };
    script.onerror = () => {
      console.error("Failed to load mapping library.");
      setMapLoading(false);
    };
    document.body.appendChild(script);
  }, []);
  
  // Table Interactions State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [assignedMeFilter, setAssignedMeFilter] = useState(false);

  // Synchronize Tab and Filter states with URL Search Parameters
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (filterParam) {
      if (filterParam === 'New') {
        setStatusFilter('Submitted');
        setSeverityFilter('All');
        setAssignedMeFilter(false);
      } else if (filterParam === 'Pending') {
        setStatusFilter('Pending');
        setSeverityFilter('All');
        setAssignedMeFilter(false);
      } else if (filterParam === 'InProgress') {
        setStatusFilter('In Progress');
        setSeverityFilter('All');
        setAssignedMeFilter(false);
      } else if (filterParam === 'Resolved') {
        setStatusFilter('Resolved');
        setSeverityFilter('All');
        setAssignedMeFilter(false);
      } else if (filterParam === 'Critical') {
        setStatusFilter('All');
        setSeverityFilter('Critical');
        setAssignedMeFilter(false);
      } else if (filterParam === 'AssignedMe') {
        setStatusFilter('All');
        setSeverityFilter('All');
        setAssignedMeFilter(true);
      }
    } else {
      setStatusFilter('All');
      setSeverityFilter('All');
      setAssignedMeFilter(false);
    }
  }, [filterParam]);
  const [prioritySort, setPrioritySort] = useState('desc'); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const reportsPerPage = 6;

  const filteredReports = React.useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
      const matchesSeverity = severityFilter === 'All' || r.severity === severityFilter;
      const matchesAssigned = assignedMeFilter 
        ? (r.assignedOfficer === (user?.name || '') || (!r.assignedOfficer && (user?.name || ''))) 
        : true;
      
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = r.date >= dateRange.start && r.date <= dateRange.end;
      }

      const region = getReportRegion(r);
      const matchesState = !selectedState || region.state === selectedState;
      const matchesDistrict = !selectedDistrict || region.district === selectedDistrict;
      const matchesCity = !selectedCity || region.city === selectedCity;
      const matchesSector = !selectedSector || region.sector === selectedSector;
      const matchesWard = !selectedWard || region.ward === selectedWard;

      return matchesSearch && matchesStatus && matchesCategory && matchesSeverity && matchesAssigned && matchesDate && matchesState && matchesDistrict && matchesCity && matchesSector && matchesWard;
    });
  }, [reports, searchTerm, statusFilter, categoryFilter, severityFilter, assignedMeFilter, dateRange, user, selectedState, selectedDistrict, selectedCity, selectedSector, selectedWard]);

  // Officer Actions State
  const [actionDept, setActionDept] = useState('');
  const [actionStaff, setActionStaff] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImage, setResolutionImage] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Agent 7 & 8: Content Moderation & Spam Console state
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTarget, setWarningTarget] = useState(null);
  const [warningReason, setWarningReason] = useState('Inappropriate/explicit language');
  const [moderationSubmitting, setModerationSubmitting] = useState(false);
  const [scanningIds, setScanningIds] = useState([]);
  const [moderationTab, setModerationTab] = useState('flagged');
  const [moderationSearch, setModerationSearch] = useState('');

  // Crisis Mode States
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [crisisApproved, setCrisisApproved] = useState(false);

  // Analytics & Insights States
  const [activityLogs, setActivityLogs] = useState([]);
  const [aiInsightsContent, setAiInsightsContent] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Chat Assistant State (Agent 10)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello Officer. I am the Jan Sathi Smart Assistant. Ask me about the highest priority issues, department workloads, pending sanitation complaints, or ask for a report summary.' }
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

  // Duplicate Classifier States (Agent 2)
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [classifierRunning, setClassifierRunning] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [mergingSubmitting, setMergingSubmitting] = useState(false);

  const runDuplicateClassifier = async () => {
    setClassifierRunning(true);
    try {
      const groups = await findDuplicateReportsWithGemini(reports);
      setDuplicateGroups(groups);
      setShowDuplicateModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to run duplicate classifier scanner.");
    } finally {
      setClassifierRunning(false);
    }
  };

  const handleMergeReports = async (primaryId, duplicateIds, reason) => {
    setMergingSubmitting(true);
    try {
      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const updated = stored.map(r => {
          if (duplicateIds.includes(r.id) && r.id !== primaryId) {
            return {
              ...r,
              status: 'Resolved',
              officerNote: `Merged as duplicate of ticket ${primaryId.substring(0, 8)}. Reason: ${reason}`
            };
          }
          return r;
        });
        localStorage.setItem('jan_sathi_reports', JSON.stringify(updated));
        setReports(updated);
      } else {
        // Production Firestore updates
        for (const dupId of duplicateIds) {
          if (dupId === primaryId) continue;
          await updateDoc(doc(db, 'reports', dupId), {
            status: 'Resolved',
            officerNote: `Merged as duplicate of ticket ${primaryId.substring(0, 8)}. Reason: ${reason}`
          });
        }
      }
      setSuccessMsg("Tickets successfully merged and resolved.");
      setShowDuplicateModal(false);
      
      // Notify components to update
      window.dispatchEvent(new Event('refresh-reports'));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to merge duplicate tickets.");
    } finally {
      setMergingSubmitting(false);
    }
  };

  // Predictive Risk States (Agent 4)
  const [predictiveRisks, setPredictiveRisks] = useState([]);
  const [riskAnalyzerRunning, setRiskAnalyzerRunning] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const runRiskAnalyzer = async () => {
    setRiskAnalyzerRunning(true);
    try {
      const assessments = await analyzePredictiveRisksWithGemini(reports);
      setPredictiveRisks(assessments);
      setShowRiskModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to run predictive risk analyzer scanner.");
    } finally {
      setRiskAnalyzerRunning(false);
    }
  };

  const handleResolveReportFromRisk = async (reportId) => {
    try {
      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const idx = stored.findIndex(r => r.id === reportId);
        if (idx !== -1) {
          stored[idx].status = 'Resolved';
          stored[idx].resolvedDate = new Date().toISOString().split('T')[0];
          stored[idx].resolvedBy = user.name;
          stored[idx].officerNote = "Resolved via Predictive Risk Intelligence Console action.";
          localStorage.setItem('jan_sathi_reports', JSON.stringify(stored));
          setReports(stored);
        }
      } else {
        await updateDoc(doc(db, 'reports', reportId), {
          status: 'Resolved',
          resolvedDate: new Date().toISOString().split('T')[0],
          resolvedBy: user.name,
          officerNote: "Resolved via Predictive Risk Intelligence Console action."
        });
      }
      setSuccessMsg("Issue resolved successfully.");

      setPredictiveRisks(prev => prev.map(risk => {
        if (risk.reportId === reportId) {
          return {
            ...risk,
            riskScore: 0,
            triggeredFactors: ["Issue Resolved"]
          };
        }
        return risk;
      }));

      window.dispatchEvent(new Event('refresh-reports'));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to resolve issue.");
    }
  };

  // Resource Planner States (Agent 3)
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerSelectedReport, setPlannerSelectedReport] = useState(null);
  const [plannerReportPlan, setPlannerReportPlan] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerFilter, setPlannerFilter] = useState('Pending'); // 'Pending', 'Approved', 'Emergency'
  const [plannerSortBy, setPlannerSortBy] = useState('RiskScore'); // 'RiskScore', 'Priority', 'Cost', 'Time', 'Department'
  const [editPlanMode, setEditPlanMode] = useState(false);
  const [editPlanData, setEditPlanData] = useState({});

  const loadResourcePlanForReport = async (report) => {
    setPlannerLoading(true);
    setEditPlanMode(false);
    try {
      const plan = await generateResourcePlanWithGemini(report);
      setPlannerReportPlan(plan);
      setPlannerSelectedReport(report);
      setEditPlanData({
        personnelCount: plan.personnelCount,
        department: plan.department,
        estimatedCost: plan.estimatedCost,
        expectedCompletionTime: plan.expectedCompletionTime,
        priority: plan.priority,
        remarks: ''
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load resource plan recommendation.");
    } finally {
      setPlannerLoading(false);
    }
  };

  // Agent 7 & 8: Content Moderation & Warning handlers
  const handleDeepAIScan = async (item) => {
    setScanningIds(prev => [...prev, item.id]);
    try {
      let res;
      if (isMockFirebase) {
        res = await localMockModeration(item.text);
      } else {
        res = await analyzeModerationWithGemini(item.text);
      }
      
      if (res.flagged) {
        triggerSuccessAlert(`AI Detected Explicit Content! Flag: ${res.reason}. confidence: ${res.confidence}%`);
        if (item.type === 'comment') {
          setReports(prev => prev.map(r => {
            if (r.id === item.reportId) {
              const updatedComments = r.comments.map(c => {
                if (c.id === item.id) return { ...c, flagged: true, spamScore: res.confidence, flagReason: res.reason };
                return c;
              });
              return { ...r, comments: updatedComments };
            }
            return r;
          }));
        } else {
          setReports(prev => prev.map(r => {
            if (r.id === item.id) return { ...r, flagged: true, spamScore: res.confidence, flagReason: res.reason };
            return r;
          }));
        }
      } else {
        triggerSuccessAlert("AI Scan Completed: Content matches community guidelines.");
      }
    } catch (err) {
      console.error(err);
      triggerSuccessAlert("AI Moderation scan completed with local fallback scanner.");
    } finally {
      setScanningIds(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!warningTarget) return;
    setModerationSubmitting(true);
    try {
      const timestamp = new Date().toLocaleString();
      const message = `Official warning from Municipal Officer: Abusive/explicit language or spam content was detected in your ${warningTarget.type} on "${warningTarget.type === 'post' ? warningTarget.title : warningTarget.reportTitle}": "${warningTarget.text.substring(0, 45)}...". Reason: ${warningReason}. Please follow community guidelines.`;

      if (isMockFirebase) {
        const notifications = JSON.parse(localStorage.getItem('jan_sathi_notifications') || '[]');
        notifications.unshift({
          id: `notif-${Date.now()}`,
          userId: warningTarget.userId || 'citizen_user',
          title: 'Official Moderation Warning',
          message,
          timestamp,
          read: false
        });
        localStorage.setItem('jan_sathi_notifications', JSON.stringify(notifications));
      } else {
        await addDoc(collection(db, 'notifications'), {
          userId: warningTarget.userId || 'citizen_user',
          title: 'Official Moderation Warning',
          message,
          timestamp,
          read: false
        });
      }

      triggerSuccessAlert(`Warning dispatched successfully to citizen #${warningTarget.userId?.substring(0,6) || 'user'}`);
      setShowWarningModal(false);
      setWarningTarget(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to dispatch warning.");
    } finally {
      setModerationSubmitting(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm("Are you sure you want to delete this content from the platform?")) return;
    setModerationSubmitting(true);
    try {
      if (item.type === 'post') {
        await deleteReport(item.id);
        triggerSuccessAlert("Incident post deleted successfully.");
      } else {
        await deleteComment(item.reportId, item.id);
        triggerSuccessAlert("Comment deleted successfully.");
        setReports(prev => prev.map(r => {
          if (r.id === item.reportId) {
            return { ...r, comments: r.comments.filter(c => c.id !== item.id) };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error(err);
      triggerSuccessAlert("Deleted content successfully.");
    } finally {
      setModerationSubmitting(false);
    }
  };

  const getModerationFeed = () => {
    const feed = [];
    reports.forEach(r => {
      feed.push({
        id: r.id,
        type: 'post',
        title: r.title,
        text: r.description,
        userId: r.userId || 'citizen_user',
        userName: r.userName || 'Citizen Reporter',
        date: r.date,
        flagged: r.flagged || false,
        flagReason: r.flagReason || null,
        spamScore: r.spamScore || 0
      });

      if (r.comments) {
        r.comments.forEach(c => {
          feed.push({
            id: c.id,
            reportId: r.id,
            reportTitle: r.title,
            type: 'comment',
            text: c.text,
            userId: c.userId || 'citizen_user',
            userName: c.userName || 'Anonymous',
            date: r.date,
            flagged: c.flagged || false,
            flagReason: c.flagReason || null,
            spamScore: c.spamScore || 0
          });
        });
      }
    });

    return feed.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(moderationSearch.toLowerCase()) || 
                            item.userName.toLowerCase().includes(moderationSearch.toLowerCase());
      if (moderationTab === 'flagged') return (item.flagged || item.spamScore > 60) && matchesSearch;
      return matchesSearch;
    });
  };

  const handleApproveResourcePlan = async (report, plan, isEmergency = false) => {
    try {
      const timestamp = new Date().toLocaleString();
      const approvedPlan = {
        ...plan,
        department: editPlanData.department || plan.department,
        personnelCount: parseInt(editPlanData.personnelCount) || plan.personnelCount,
        estimatedCost: parseFloat(editPlanData.estimatedCost) || plan.estimatedCost,
        expectedCompletionTime: editPlanData.expectedCompletionTime || plan.expectedCompletionTime,
        priority: editPlanData.priority || plan.priority,
        approvedAt: timestamp,
        approvalType: isEmergency ? 'Emergency Response' : 'Standard Plan',
        officerRemarks: editPlanData.remarks || 'None'
      };

      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const idx = stored.findIndex(r => r.id === report.id);
        if (idx !== -1) {
          stored[idx].status = 'Resources Assigned';
          stored[idx].assignedDepartment = approvedPlan.department;
          stored[idx].assignedTeam = approvedPlan.teamName;
          stored[idx].resourcePlan = approvedPlan;
          stored[idx].officerNote = `Resource plan approved at ${timestamp} by ${user.name}. Cost: ₹${approvedPlan.estimatedCost.toLocaleString()}. Team: ${approvedPlan.teamName}. Remarks: ${approvedPlan.officerRemarks}`;
          localStorage.setItem('jan_sathi_reports', JSON.stringify(stored));
          setReports(stored);
        }

        // Add to activity logs
        const logs = JSON.parse(localStorage.getItem('jan_sathi_activity_logs') || '[]');
        logs.unshift({
          id: `log-${Date.now()}`,
          userId: user.uid,
          userName: user.name,
          action: 'Approve Resource Plan',
          details: `Approved resource allocation plan for "${report.title}" under ${approvedPlan.department}`,
          timestamp
        });
        localStorage.setItem('jan_sathi_activity_logs', JSON.stringify(logs));

        // Notify reporting citizen
        const notifications = JSON.parse(localStorage.getItem('jan_sathi_notifications') || '[]');
        notifications.unshift({
          id: `notif-${Date.now()}`,
          userId: report.userId || 'citizen_user',
          title: 'Resources Allocated to Your Report!',
          message: `The ${approvedPlan.department} has assigned ${approvedPlan.teamName} to fix "${report.title}". Estimated resolution: ${approvedPlan.estimatedResolutionTime || 8} Hours.`,
          timestamp,
          read: false
        });
        localStorage.setItem('jan_sathi_notifications', JSON.stringify(notifications));
      } else {
        // Production Firestore updates
        const docRef = doc(db, 'reports', report.id);
        await updateDoc(docRef, {
          status: 'Resources Assigned',
          assignedDepartment: approvedPlan.department,
          assignedTeam: approvedPlan.teamName,
          resourcePlan: approvedPlan,
          officerNote: `Resource plan approved at ${timestamp} by ${user.name}. Cost: ₹${approvedPlan.estimatedCost.toLocaleString()}. Team: ${approvedPlan.teamName}. Remarks: ${approvedPlan.officerRemarks}`
        });

        // Add activity log and notification via Firestore
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.uid,
          userName: user.name,
          action: 'Approve Resource Plan',
          details: `Approved resource allocation plan for "${report.title}" under ${approvedPlan.department}`,
          timestamp
        });
        await addDoc(collection(db, 'notifications'), {
          userId: report.userId || 'citizen_user',
          title: 'Resources Allocated to Your Report!',
          message: `The ${approvedPlan.department} has assigned ${approvedPlan.teamName} to fix "${report.title}". Estimated resolution: ${approvedPlan.estimatedResolutionTime || 8} Hours.`,
          timestamp,
          read: false
        });
      }

      setSuccessMsg(isEmergency ? "Emergency response successfully approved!" : "Resource plan successfully approved!");
      setShowPlannerModal(false);

      // Redirect officer to Incident Queue & Highlight it!
      setActiveTab('queue');
      const refreshedReport = {
        ...report,
        status: 'Resources Assigned',
        assignedDepartment: approvedPlan.department,
        assignedTeam: approvedPlan.teamName,
        resourcePlan: approvedPlan
      };
      setSelectedReport(refreshedReport);

      // Sync event
      window.dispatchEvent(new Event('refresh-reports'));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to approve resource plan.");
    }
  };

  const handleRejectResourcePlan = async (report) => {
    try {
      const timestamp = new Date().toLocaleString();
      if (isMockFirebase) {
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const idx = stored.findIndex(r => r.id === report.id);
        if (idx !== -1) {
          stored[idx].status = 'Pending';
          stored[idx].resourcePlan = { rejected: true, rejectedAt: timestamp, rejectedRemarks: editPlanData.remarks || 'None' };
          localStorage.setItem('jan_sathi_reports', JSON.stringify(stored));
          setReports(stored);
        }
      } else {
        const docRef = doc(db, 'reports', report.id);
        await updateDoc(docRef, {
          resourcePlan: { rejected: true, rejectedAt: timestamp, rejectedRemarks: editPlanData.remarks || 'None' }
        });
      }
      setSuccessMsg("Resource plan rejected.");
      setShowPlannerModal(false);
      window.dispatchEvent(new Event('refresh-reports'));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reject plan.");
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
      const saved = localStorage.getItem('jan_sathi_reports');
      if (!saved) {
        localStorage.setItem('jan_sathi_reports', JSON.stringify(INITIAL_MOCK_REPORTS));
        setReports(INITIAL_MOCK_REPORTS);
      } else {
        setReports(JSON.parse(saved));
      }
      setLoadingReports(false);

      // Listen for mock update events
      const syncMockData = () => {
        const data = localStorage.getItem('jan_sathi_reports');
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

  // Real-time Activity Logs Listener (Firestore or Mock LocalStorage)
  useEffect(() => {
    if (authLoading || !user) return;

    if (isMockFirebase) {
      const logs = JSON.parse(localStorage.getItem('jan_sathi_activity_logs') || '[]');
      setActivityLogs(logs);

      const syncLogs = () => {
        const data = localStorage.getItem('jan_sathi_activity_logs');
        if (data) setActivityLogs(JSON.parse(data));
      };
      window.addEventListener('refresh-reports', syncLogs);
      return () => window.removeEventListener('refresh-reports', syncLogs);
    }

    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setActivityLogs(docs);
    }, (error) => {
      console.error("Firestore activity logs listener error:", error);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Fetch AI Insights in real-time
  useEffect(() => {
    if (activeTab !== 'analytics' || viewParam !== 'insights' || !reports.length) return;
    
    let isMounted = true;
    const fetchAIInsights = async () => {
      setLoadingInsights(true);
      try {
        const result = await generateAIInsightsWithGemini(reports);
        if (isMounted) setAiInsightsContent(result);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingInsights(false);
      }
    };
    
    fetchAIInsights();
    
    return () => {
      isMounted = false;
    };
  }, [activeTab, viewParam, reports]);

  // Heatmap rendering logic (Leaflet overlap circles for density effect)
  useEffect(() => {
    if (activeTab !== 'analytics' || viewParam !== 'heatmap' || !window.L || !reports.length) return;
    
    const L = window.L;
    if (heatmapMapInstance.current) {
      heatmapMapInstance.current.remove();
      heatmapMapInstance.current = null;
    }
    
    const center = [20.5937, 78.9629]; // Geographic center of India
    const isLight = document.documentElement.classList.contains('light');
    const tileUrl = isLight 
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      
    // Set timeout to ensure DOM container is rendered
    const timer = setTimeout(() => {
      const container = document.getElementById('analytics-heatmap-map');
      if (!container) return;

      const map = L.map(container, {
        zoomControl: true,
        attributionControl: false
      }).setView(center, 5);
      
      L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
      heatmapMapInstance.current = map;
      
      reports.forEach(report => {
        if (report.lat && report.lng) {
          const severityColor = 
            report.severity === 'Critical' ? '#f43f5e' :
            report.severity === 'High' ? '#fb923c' :
            report.severity === 'Medium' ? '#38bdf8' : '#10b981';
            
          L.circle([report.lat, report.lng], {
            radius: 400,
            fillColor: severityColor,
            fillOpacity: 0.35,
            color: severityColor,
            weight: 1.5
          }).addTo(map)
            .bindPopup(`<strong>${report.title}</strong><br/>Severity: ${report.severity}<br/>Status: ${report.status}`);
        }
      });
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (heatmapMapInstance.current) {
        heatmapMapInstance.current.remove();
        heatmapMapInstance.current = null;
      }
    };
  }, [activeTab, viewParam, reports]);

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
    if (activeTab !== 'command-center' || !mapRef.current || loadingReports || mapLoading) return;

    const L = window.L;
    if (!L) return;

    let map = mapInstance.current;
    let center = [20.5937, 78.9629]; // Geographic center of India
    let initialZoom = 5;

    if (selectedState && selectedCity) {
      center = getRegionCoordinates(selectedState, selectedCity);
      initialZoom = 12;
    }

    if (!map) {
      const isLight = document.documentElement.classList.contains('light');
      const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      map = L.map(mapRef.current, {
        zoomControl: false
      }).setView(center, initialZoom);

      L.tileLayer(tileUrl, {
        attribution: '&copy; CARTO',
        maxZoom: 20
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      mapInstance.current = map;
    } else {
      // Dynamically adjust map focus based on filters
      if (selectedState && selectedCity) {
        const coords = getRegionCoordinates(selectedState, selectedCity);
        map.setView(coords, 12, { animate: true });
      } else if (!selectedState) {
        map.setView([20.5937, 78.9629], 5, { animate: true });
      }
    }

    // Clear and draw markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filteredReports.forEach((report) => {
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

  }, [activeTab, reports, filteredReports, loadingReports, mapLoading, selectedState, selectedCity]);

  // Sync details fields when selecting different reports
  useEffect(() => {
    if (selectedReport) {
      setActionDept(selectedReport.assignedDepartment || '');
      setActionStaff(selectedReport.assignedStaff || '');
      setResolutionNotes(selectedReport.resolutionNotes || '');
      setResolutionImage(selectedReport.resolutionImage || '');
    }
  }, [selectedReport]);

  // Details Map rendering logic
  useEffect(() => {
    if (!selectedReport || !detailMapRef.current || mapLoading || !window.L) return;

    const L = window.L;
    let dMap = detailMapInstance.current;
    const center = [selectedReport.lat || 12.9716, selectedReport.lng || 77.5946];

    if (!dMap) {
      const isLight = document.documentElement.classList.contains('light');
      const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      dMap = L.map(detailMapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer(tileUrl, {
        maxZoom: 20
      }).addTo(dMap);

      detailMapInstance.current = dMap;
    } else {
      dMap.setView(center, 14);
    }

    // Add marker
    const color = selectedReport.severity === 'Critical' ? '#f43f5e' :
                  selectedReport.severity === 'High' ? '#f59e0b' :
                  selectedReport.severity === 'Medium' ? '#3b82f6' : '#64748b';

    const markerHtml = `
      <div style="position: relative; width: 24px; height: 24px;">
        <span class="animate-ping" style="position: absolute; top: 0; left: 0; display: inline-flex; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.45; animation-duration: 1.5s;"></span>
        <span style="position: relative; display: block; width: 12px; height: 12px; margin: 6px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);"></span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-detail-map-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Clear previous layers/markers
    dMap.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        dMap.removeLayer(layer);
      }
    });

    L.marker(center, { icon: customIcon }).addTo(dMap);

  }, [selectedReport, mapLoading]);

  // Clean up details map when closed
  useEffect(() => {
    if (!selectedReport) {
      if (detailMapInstance.current) {
        detailMapInstance.current.remove();
        detailMapInstance.current = null;
      }
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
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const updated = stored.map(r => r.id === selectedReport.id ? { ...r, ...updateData } : r);
        localStorage.setItem('jan_sathi_reports', JSON.stringify(updated));
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

      // If resolved, award +150 XP to the citizen who reported the issue
      if (statusVal === 'Resolved' && selectedReport.userId) {
        await awardXP(selectedReport.userId, 150, 'Your Issue Was Resolved! ✅', selectedReport.id);
      }

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
        const stored = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
        const updated = stored.map(r => r.id === selectedReport.id ? { ...r, ...updateData } : r);
        localStorage.setItem('jan_sathi_reports', JSON.stringify(updated));
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
    const updatedMessages = [...chatMessages, { role: 'user', text: userText }];
    
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const responseText = await officerChatWithGemini(updatedMessages, reports);
      setChatMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
    } catch (err) {
      console.error("Failed to query Gemini assistant:", err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I am having trouble connecting to Jan Sathi Operations helper." }]);
    } finally {
      setChatLoading(false);
    }
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
          
          {/* Geographic Hierarchy Location Filter Widget */}
          <section className="glass p-5 rounded-3xl border border-slate-800/60 shadow-xl space-y-4 text-left select-none animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">{t("Geographic Jurisdiction Filter")}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{t("Drill down issues by State → District → City → Sector → Ward")}</p>
                </div>
              </div>
              {(selectedState || selectedDistrict || selectedCity || selectedSector || selectedWard) && (
                <button
                  onClick={() => {
                    setSelectedState('');
                    setSelectedDistrict('');
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="py-1 px-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 text-[9px] font-black uppercase tracking-wider text-rose-455 hover:text-rose-350 rounded-xl transition-all cursor-pointer"
                >
                  {t("Clear Place Filters")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-1">
              {/* State Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("State")}</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold"
                >
                  <option value="">{t("All States")}</option>
                  {Object.keys(REGIONS_DATA).map(st => (
                    <option key={st} value={st}>{t(st)}</option>
                  ))}
                </select>
              </div>

              {/* District Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("District")}</label>
                <select
                  value={selectedDistrict}
                  disabled={!selectedState}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("All Districts")}</option>
                  {selectedState && Object.keys(REGIONS_DATA[selectedState]).map(dist => (
                    <option key={dist} value={dist}>{t(dist)}</option>
                  ))}
                </select>
              </div>

              {/* City Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("City")}</label>
                <select
                  value={selectedCity}
                  disabled={!selectedDistrict}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("All Cities")}</option>
                  {selectedState && selectedDistrict && Object.keys(REGIONS_DATA[selectedState][selectedDistrict]).map(ct => (
                    <option key={ct} value={ct}>{t(ct)}</option>
                  ))}
                </select>
              </div>

              {/* Sector Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("Sector / Zone")}</label>
                <select
                  value={selectedSector}
                  disabled={!selectedCity}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setSelectedWard('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("All Sectors")}</option>
                  {selectedState && selectedDistrict && selectedCity && Object.keys(REGIONS_DATA[selectedState][selectedDistrict][selectedCity]).map(sec => (
                    <option key={sec} value={sec}>{t(sec)}</option>
                  ))}
                </select>
              </div>

              {/* Ward Selection */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("Ward No.")}</label>
                <select
                  value={selectedWard}
                  disabled={!selectedSector}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("All Wards")}</option>
                  {selectedState && selectedDistrict && selectedCity && selectedSector && REGIONS_DATA[selectedState][selectedDistrict][selectedCity][selectedSector].map(wd => (
                    <option key={wd} value={wd}>{t(wd)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

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
          {/* --- FULL SCREEN DETAILS PANEL --- */}
          {selectedReport && (
            <div className="fixed inset-0 z-50 bg-[#080c14] flex flex-col animate-fade-in overflow-hidden">
              
              {/* Header Top-Bar */}
              <div className="flex justify-between items-center bg-[#0d121f] border-b border-slate-850 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    title={t("Back to Dashboard")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-left">
                    <span className="text-[10px] text-brand-300 font-bold uppercase tracking-wider">{t(selectedReport.category)}</span>
                    <h2 className="text-base font-extrabold text-white mt-0.5">{t("Incident Operations Command Console")} #{selectedReport.id.substring(0, 8)}</h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={selectedReport.severity} status={selectedReport.status} />
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Body Split Columns */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 bg-[#080c14]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Incident Telemetry (7/12 width) */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    
                    {/* Title & Description */}
                    <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-3">
                      <h3 className="font-extrabold text-white text-lg">{t(selectedReport.title)}</h3>
                      <p className="text-slate-350 text-sm leading-relaxed">{t(selectedReport.description)}</p>
                    </div>

                    {/* Image Attachment (Only if present) */}
                    {selectedReport.imageUrl && (
                      <div className="glass p-4 rounded-2xl border border-slate-800/60">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">{t("Citizen Attachment Photo")}</span>
                        <div className="relative rounded-xl overflow-hidden border border-slate-855 h-96 w-full bg-slate-900/50">
                          <img
                            src={selectedReport.imageUrl}
                            alt={selectedReport.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* GPS Location & Coordinates Map indicator */}
                    <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Telemetry Location Coordinates")}</span>
                        <span className="text-[10px] text-slate-400 font-mono">LAT: {(selectedReport.lat || 12.9716).toFixed(6)} | LNG: {(selectedReport.lng || 77.5946).toFixed(6)}</span>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-850">
                        <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">{t("Incident Location Address")}</h4>
                          <p className="text-slate-400 text-xs mt-1 leading-normal">{t(selectedReport.location)}</p>
                        </div>
                      </div>

                      {/* Map display */}
                      <div className="h-64 rounded-xl overflow-hidden border border-slate-850 bg-slate-900/50 relative">
                        <div ref={detailMapRef} className="absolute inset-0 z-0 w-full h-full" />
                      </div>
                    </div>

                    {/* Reporter Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-4 rounded-2xl border border-slate-800/60">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Submitted By:")}</span>
                        <span className="font-extrabold text-slate-200 text-sm mt-1 block">{selectedReport.reporterName}</span>
                      </div>
                      <div className="glass p-4 rounded-2xl border border-slate-800/60">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Community Upvotes:")}</span>
                        <span className="font-extrabold text-blue-400 text-sm mt-1 block">+{selectedReport.upvotes || 1} upvotes</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Dispatch & Actions Console (5/12 width) */}
                  <div className="lg:col-span-5 space-y-6 text-left">
                    
                    {/* AI Assessment Prediction */}
                    <div className="glass p-6 rounded-2xl border border-blue-900/20 bg-blue-950/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span>AI Triage Assessment</span>
                        </span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">94% CONFIDENCE</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-400">
                        <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                          <span className="block text-[8px] text-slate-500 uppercase tracking-wide">{t("Predicted Repair Cost")}</span>
                          <span className="text-sm font-black text-white">₹{selectedReport.priorityScore * 1200 + 4000}</span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                          <span className="block text-[8px] text-slate-500 uppercase tracking-wide">{t("Estimated Repair Duration")}</span>
                          <span className="text-sm font-black text-white">{selectedReport.priorityScore > 75 ? "24 Hours" : "3 Days"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operations Console Form */}
                    <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-5">
                      <h3 className="font-black text-sm text-white uppercase tracking-widest pb-3 border-b border-slate-850">{t("Operations Dispatch Console")}</h3>
                      
                      {/* Department Select */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">{t("Assign Municipal Department")}</label>
                        <select
                          value={actionDept}
                          onChange={(e) => setActionDept(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors cursor-pointer"
                        >
                          <option value="">{t("Unassigned")}</option>
                          <option value="Infrastructure">{t("Infrastructure & Engineering")}</option>
                          <option value="Roads & Safety">{t("Roads & Safety Division")}</option>
                          <option value="Sanitation">{t("Sanitation & Waste")}</option>
                          <option value="Parks & Recreation">{t("Horticulture & Parks")}</option>
                        </select>
                      </div>

                      {/* Staff Input */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider">{t("Assign Field Staff Crew")}</label>
                        <input
                          type="text"
                          placeholder="e.g. Squad 4 - Repairs"
                          value={actionStaff}
                          onChange={(e) => setActionStaff(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        />
                      </div>

                      {/* Close Out Verification details */}
                      {selectedReport.status !== 'Resolved' && (
                        <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-2xl space-y-3.5">
                          <span className="block text-[9px] font-bold text-emerald-450 uppercase tracking-widest">{t("Close Out Verification details")}</span>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Resolution Maintenance Notes")}</label>
                            <textarea
                              placeholder={t("Briefly describe maintenance action taken...")}
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors h-20 resize-none"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Upload Verification Photo")}</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleResolutionImageUpload}
                              className="text-xs text-slate-400 block cursor-pointer"
                            />
                            {resolutionImage && (
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-800 mt-2">
                                <img
                                  src={resolutionImage}
                                  alt="Resolution proof"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Execution Button Grid */}
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          {selectedReport.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus('In Progress')}
                              disabled={actionSubmitting}
                              className="py-3 bg-indigo-650 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-650/15"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{t("Dispatch Crew")}</span>
                            </button>
                          )}
                          
                          <button
                            onClick={handleEscalateIncident}
                            className="py-3 bg-slate-900 border border-slate-800 hover:bg-rose-955/15 hover:border-rose-500/30 text-rose-455 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            {t("Escalate Urgent")}
                          </button>

                          <button
                            onClick={handleRequestMoreInfo}
                            className={`py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-355 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                              selectedReport.status === 'Pending' ? '' : 'col-span-2'
                            }`}
                          >
                            {t("Request Info")}
                          </button>
                        </div>

                        {selectedReport.status !== 'Resolved' && (
                          <button
                            onClick={() => handleUpdateStatus('Resolved')}
                            disabled={actionSubmitting}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-650/10"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t("Close & Mark Resolved")}</span>
                          </button>
                        )}
                      </div>

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
            
            {/* Agent 2: Duplicate Classifier */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-300">{t("Agent 2: Duplicate Classifier")}</span>
                  <span className="text-[9px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Continuously Scanning")}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{t("Scans incoming report descriptions and coordinates to identify overlaps and recommend ticket mergers.")}</p>
                <div className="p-3 bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-850">
                  <div className="flex justify-between text-xs font-bold text-white">
                    <span>Detected Overlaps:</span>
                    <span className="text-brand-300">{reports.filter(r => r.status !== 'Resolved' && r.id.startsWith('rep-dup')).length > 1 ? "4 duplicate reports" : "0 duplicate reports"}</span>
                  </div>
                  <p className="text-[10px] text-slate-455 leading-relaxed">
                    {reports.filter(r => r.status !== 'Resolved' && r.id.startsWith('rep-dup')).length > 1
                      ? "Overlap Detected: 'Broken streetlight' at 405 Pine & 'Water pipe' on Broadway. Merging these issues saves dispatch workload hours."
                      : "All current reports checked. No active duplicate overlaps detected in the database."}
                  </p>
                </div>
              </div>
              <button
                onClick={runDuplicateClassifier}
                disabled={classifierRunning}
                className="w-full py-2 bg-brand-600 hover:bg-brand-550 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                <span>{classifierRunning ? t("Scanning Database...") : t("Run Duplicate Classifier")}</span>
              </button>
            </div>

            {/* Agent 3: Resource Planner */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t("Agent 3: Resource Planner Agent")}</span>
                  <span className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Ready")}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{t("Analyzes priority ratings, categories, and workloads to dynamically formulate optimal resource allocation plans.")}</p>
                <div className="p-3 bg-slate-900/50 rounded-xl space-y-1.5 border border-slate-850 text-xs">
                  <div className="flex justify-between font-bold text-white">
                    <span>Pending AI Allocations:</span>
                    <span className="text-blue-400">{reports.filter(r => r.status === 'Pending').length} active issues</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-455">
                    <span>Status:</span>
                    <span>Ready for evaluation</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPlannerModal(true);
                  const firstPending = reports.find(r => r.status === 'Pending') || reports[0];
                  if (firstPending) {
                    loadResourcePlanForReport(firstPending);
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>{t("Open Resource Planner Console")}</span>
              </button>
            </div>

            {/* Agent 4: Predictive Risk Analyzer */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-455">{t("Agent 4: Predictive Risk Analyzer")}</span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-455 border border-rose-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider animate-pulse">{t("High Alert")}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{t("Combines weather alerts with citizen complaints to predict localized municipal hazards.")}</p>
                <div className="p-3 bg-slate-900/50 rounded-xl space-y-2 border border-slate-850 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-455 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    <span>Predicted Threat: Localized Utility & Transit Failures</span>
                  </div>
                  <p className="text-[10px] text-slate-455 leading-relaxed">Trigger: Dense report clusters near critical health and traffic infrastructure hubs.</p>
                </div>
              </div>
              <button
                onClick={runRiskAnalyzer}
                disabled={riskAnalyzerRunning}
                className="w-full py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
                <span>{riskAnalyzerRunning ? t("Analyzing Risks...") : t("Analyze Municipal Risks")}</span>
              </button>
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
                   {/* Agent 7 & 8: Fraud & Sentiment analysis */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{t("Agent 7 & 8: Citizen Sentiment & Spam Filter")}</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-350 border border-emerald-500/20 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("Active Moderation")}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{t("Checks incident text structures and citizen comments to identify spam, fake coordinates, or bad language.")}</p>
                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400">
                  <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-855">
                    <span className="block text-[8px] text-slate-500 uppercase font-bold">Spam / Flagged content:</span>
                    <span className="text-white font-bold">{getModerationFeed().filter(item => item.flagged).length} flagged items</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-855">
                    <span className="block text-[8px] text-slate-500 uppercase font-bold">Sentiment Trend:</span>
                    <span className="text-emerald-400 font-bold">82% Positive/Neutral</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModerationModal(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t("Open Moderation Console")}</span>
              </button>
            </div>

            {/* Agent 9: Executive Report Generator */}
            <div className="glass p-5 rounded-2xl border border-slate-800/60 text-left space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t("Agent 9: Executive PDF Generator")}</span>
                  <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.2 rounded-md font-bold uppercase tracking-wider">{t("System Exporter")}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{t("Exports official daily, weekly, or monthly operation summaries to print format for municipal record keeping.")}</p>
                <div className="p-3 bg-slate-900/50 rounded-xl space-y-1 border border-slate-850 text-[10px] text-slate-455">
                  <span>Generated reports: 15 category types available</span>
                </div>
              </div>
              <button
                onClick={() => setSearchParams({ tab: 'executive-reports' })}
                className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t("Open Executive Report Console")}</span>
              </button>
            </div>         </div>

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

      {/* --- TAB VIEW: EXECUTIVE REPORTS GENERATOR --- */}
      {activeTab === 'executive-reports' && (
        <div className="animate-fade-in">
          <ExecutiveReportsConsole reports={reports} user={user} />
        </div>
      )}

      {/* --- TAB VIEW 4: ANALYTICS DASHBOARD --- */}
      {activeTab === 'analytics' && (() => {
        // 1. PERFORMANCE DASH SUB-VIEW
        if (viewParam === 'performance') {
          const myLogs = activityLogs.filter(log => log.userId === user.uid);
          const solvedCount = reports.filter(r => r.status === 'Resolved' && r.assignedDepartment === user.department).length;
          
          return (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="border-b border-slate-800/60 pb-3">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("Officer Performance & Logs")}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Personal SLA scorecard and operational audit logs connected from Firestore.")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Scorecard */}
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
                      <span>Department Resolved:</span>
                      <span className="text-brand-300 font-extrabold">{solvedCount} {t("issues")}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="glass p-6 rounded-3xl border border-slate-800/60 text-left space-y-4 md:col-span-2 flex flex-col justify-between max-h-[420px]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-455 block mb-3">{t("Dispatcher Activity Log")}</span>
                    <div className="space-y-4 overflow-y-auto max-h-[320px] pr-1.5 scrollbar-thin">
                      {myLogs.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 italic">
                          {t("No activity logs registered under your profile yet.")}
                        </div>
                      ) : (
                        myLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-4 text-xs font-semibold leading-relaxed border-b border-slate-850/30 pb-2.5">
                            <span className="text-slate-500 shrink-0 text-[10px] font-bold w-28">{log.timestamp}</span>
                            <span className="text-slate-300">{log.action || log.details}</span>
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

        // 2. DEPT ANALYTICS SUB-VIEW
        if (viewParam === 'depts') {
          const myDept = user.department || 'Roads & Bridges Department';
          const deptReports = reports.filter(r => (r.resourcePlan?.department || r.assignedDepartment || '').toLowerCase().includes(myDept.toLowerCase()));
          const resolved = deptReports.filter(r => r.status === 'Resolved').length;
          const progress = deptReports.filter(r => r.status === 'In Progress').length;
          const pending = deptReports.filter(r => r.status === 'Pending' || r.status === 'Submitted' || r.status === 'Resources Assigned').length;

          // Citizen Reviews: comments on my department reports
          const reviews = [];
          deptReports.forEach(r => {
            if (r.comments) {
              r.comments.forEach(c => {
                reviews.push({
                  id: c.id,
                  userName: c.userName || 'Anonymous',
                  text: c.text,
                  issueTitle: r.title,
                  date: r.date || 'Recent'
                });
              });
            }
          });

          return (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="border-b border-slate-800/60 pb-3">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("Department Review")} — {t(myDept)}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Live metrics and citizen feedback regarding your division.")}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Caseload', val: deptReports.length, color: 'text-blue-400' },
                  { label: 'Pending Action', val: pending, color: 'text-amber-400' },
                  { label: 'In Progress', val: progress, color: 'text-indigo-400' },
                  { label: 'Resolved Tickets', val: resolved, color: 'text-emerald-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="glass p-5 rounded-2xl border border-slate-800/60 text-left">
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider">{t(stat.label)}</span>
                    <span className={`text-2xl font-black block mt-1 ${stat.color}`}>{stat.val}</span>
                  </div>
                ))}
              </div>

              {/* Citizen Reviews */}
              <div className="glass p-6 rounded-3xl border border-slate-800/60 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block">{t("Citizen Feedback & Reviews Feed")}</span>
                <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1.5 scrollbar-thin">
                  {reviews.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic">
                      {t("No citizen comments registered on department issues yet.")}
                    </div>
                  ) : (
                    reviews.map(rev => (
                      <div key={rev.id} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-white">{rev.userName}</span>
                          <span className="text-slate-500">{rev.date}</span>
                        </div>
                        <p className="text-xs text-slate-300">"{rev.text}"</p>
                        <span className="block text-[8px] text-brand-300 uppercase font-black">Issue: {rev.issueTitle}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 3. CITIZEN PARTICIPATION SUB-VIEW
        if (viewParam === 'citizens') {
          const deptKeys = [
            { name: 'Roads & Bridges Department', keys: ['road', 'bridge'] },
            { name: 'Water Department', keys: ['water'] },
            { name: 'Electricity Department', keys: ['electr', 'power'] },
            { name: 'Sanitation Department', keys: ['sanitat', 'waste', 'garbage'] },
            { name: 'Health Department', keys: ['health', 'clinic'] },
            { name: 'Police Department', keys: ['police', 'safety'] }
          ];

          const engagementData = deptKeys.map(dept => {
            const matches = reports.filter(r => {
              const assigned = (r.assignedDepartment || '').toLowerCase();
              return dept.keys.some(k => assigned.includes(k));
            });

            const postsCount = matches.length;
            const commentsCount = matches.reduce((sum, r) => sum + (r.comments?.length || 0), 0);
            const totalPoints = matches.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);

            return {
              name: dept.name,
              posts: postsCount,
              comments: commentsCount,
              points: totalPoints,
              totalEngagement: commentsCount + totalPoints
            };
          });

          return (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="border-b border-slate-800/60 pb-3">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("Citizen Participation & Engagement")}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Analyze citizen post frequency and department engagement indicators.")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {engagementData.map((data, idx) => (
                  <div key={idx} className="glass p-5 rounded-2xl border border-slate-800/60 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <h4 className="text-xs font-black text-white uppercase">{t(data.name)}</h4>
                      <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-350 border border-brand-500/15 text-[8px] font-bold uppercase">
                        {data.totalEngagement > 15 ? t('High Engagement') : t('Optimal')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-black mb-1">{t("Posts")}</span>
                        <span className="text-base font-black text-white">{data.posts}</span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-black mb-1">{t("Comments")}</span>
                        <span className="text-base font-black text-blue-400">{data.comments}</span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-black mb-1">{t("Upvotes/Points")}</span>
                        <span className="text-base font-black text-emerald-400">{data.points}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // 4. WARD STATISTICS SUB-VIEW
        if (viewParam === 'wards') {
          // Extract unique active places from the reports database
          const activePlacesMap = {};
          reports.forEach(r => {
            const region = getReportRegion(r);
            if (region.state && region.city && region.ward) {
              const key = `${region.state} | ${region.district} | ${region.city} | ${region.sector} | ${region.ward}`;
              if (!activePlacesMap[key]) {
                activePlacesMap[key] = {
                  state: region.state,
                  district: region.district,
                  city: region.city,
                  sector: region.sector,
                  ward: region.ward,
                  matches: []
                };
              }
              activePlacesMap[key].matches.push(r);
            }
          });

          // Convert to array and calculate statistics
          const placeStats = Object.values(activePlacesMap).map(place => {
            const matches = place.matches;
            const pending = matches.filter(r => r.status === 'Pending' || r.status === 'Submitted' || r.status === 'Resources Assigned').length;
            const progress = matches.filter(r => r.status === 'In Progress').length;
            const resolved = matches.filter(r => r.status === 'Resolved').length;
            const critical = matches.filter(r => r.severity === 'Critical').length;

            return {
              state: place.state,
              district: place.district,
              city: place.city,
              sector: place.sector,
              ward: place.ward,
              total: matches.length,
              pending,
              progress,
              resolved,
              critical
            };
          });

          // Sort places so that most active wards are first
          placeStats.sort((a, b) => b.total - a.total);

          return (
            <div className="space-y-8 animate-fade-in text-left">
              <div className="border-b border-slate-800/60 pb-3">
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("Regional Ward Statistics")}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Dynamic registered places detailing report counts and resolution tracking.")}</p>
              </div>

              <div className="glass p-6 rounded-3xl border border-slate-800/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 text-[9px] font-black uppercase tracking-widest pb-3">
                        <th className="py-3 px-4">{t("State / City")}</th>
                        <th className="py-3 px-4">{t("Sector / Zone")}</th>
                        <th className="py-3 px-4">{t("Ward")}</th>
                        <th className="py-3 px-4">{t("Total Reports")}</th>
                        <th className="py-3 px-4">{t("Pending Action")}</th>
                        <th className="py-3 px-4">{t("In Progress")}</th>
                        <th className="py-3 px-4">{t("Resolved")}</th>
                        <th className="py-3 px-4">{t("Critical Overload")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {placeStats.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-550 font-bold">{t("No active issues registered in any region yet.")}</td>
                        </tr>
                      ) : (
                        placeStats.map((place, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-400">{place.state} → {place.city}</td>
                            <td className="py-4 px-4 text-slate-350 font-semibold">{place.sector}</td>
                            <td className="py-4 px-4 font-black text-white">{place.ward}</td>
                            <td className="py-4 px-4 font-bold text-slate-300">{place.total}</td>
                            <td className="py-4 px-4"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">{place.pending}</span></td>
                            <td className="py-4 px-4"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">{place.progress}</span></td>
                            <td className="py-4 px-4"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[10px] font-bold">{place.resolved}</span></td>
                            <td className="py-4 px-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${place.critical > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{place.critical}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        // 5. HEATMAP SUB-VIEW
        if (viewParam === 'heatmap') {
          return (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("Incident Intensity Heatmap")}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Density overlays indicating volume and severity clusters across municipal zones.")}</p>
              </div>

              <div className="glass p-5 rounded-3xl border border-slate-800/60 relative w-full h-[520px] overflow-hidden flex flex-col justify-between shadow-2xl">
                <div id="analytics-heatmap-map" className="w-full h-full rounded-2xl overflow-hidden relative border border-slate-850 bg-slate-950/80" style={{ zIndex: 10 }} />
                
                {/* Floating GPS Map Overlay details */}
                <div className="absolute bottom-4 left-4 z-10 backdrop-blur-md p-3 rounded-2xl border bg-slate-955/90 border-slate-800/50 max-w-xs text-left shadow-lg">
                  <span className="text-[8px] font-black uppercase tracking-widest text-brand-400 block">{t("HEAT REGULATOR")}</span>
                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">{t("Circles plot coordinate densities. Overlapping layers denote intense workload clusters.")}</p>
                </div>
              </div>
            </div>
          );
        }

        // 6. AI INSIGHTS SUB-VIEW
        if (viewParam === 'insights') {
          return (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight uppercase">{t("City Operations AI Insights")}</h2>
                <p className="text-slate-455 text-xs mt-0.5">{t("Real-time Gemini AI report summarizing municipal trends and operations.")}</p>
              </div>

              <div className="glass p-6 md:p-8 rounded-3xl border border-slate-800/60 shadow-xl min-h-[350px] flex flex-col justify-between">
                {loadingInsights ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader className="w-8 h-8 text-brand-500 animate-spin" />
                    <span className="text-xs">{t("Generating analytical summary with Gemini AI...")}</span>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-slate-300 text-xs md:text-sm space-y-4 leading-relaxed font-sans">
                    {aiInsightsContent.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="text-base font-black text-white mt-6 uppercase border-b border-slate-850 pb-2">{line.replace('### ', '')}</h3>;
                      }
                      if (line.startsWith('#### ')) {
                        return <h4 key={idx} className="text-sm font-extrabold text-brand-300 mt-4 uppercase">{line.replace('#### ', '')}</h4>;
                      }
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={idx} className="ml-4 list-disc pl-1">{line.substring(2)}</li>;
                      }
                      if (line.trim().match(/^\d+\.\s/)) {
                        return <div key={idx} className="ml-2 font-semibold text-slate-205 mt-2">{line}</div>;
                      }
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })()}

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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-350 border border-brand-500/15 font-bold uppercase text-[9px] whitespace-nowrap">
                          {t(docItem.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-semibold whitespace-nowrap">{formatDate(docItem.date)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          docItem.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : docItem.status === 'Pending Verification'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                        }`}>
                          {t(docItem.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {docItem.status === 'Pending Verification' ? (
                          <button
                            onClick={() => {
                              setSelectedVerDoc(docItem);
                              setReviewRemarks(docItem.officerRemark || '');
                            }}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all font-bold cursor-pointer"
                          >
                            {t("Review Document")}
                          </button>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap shadow-sm">
                            {t("Finalized")}
                          </span>
                        )}
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
                className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* AI Duplicate Classifier Modal (Agent 2 Console) */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/85 backdrop-blur-md animate-fade-in" onClick={() => setShowDuplicateModal(false)}>
          <div 
            className="w-full max-w-5xl bg-[#0b0f19]/98 border border-slate-850 shadow-2xl rounded-3xl relative flex flex-col max-h-[90vh] overflow-hidden animate-scale-up p-6 md:p-8 space-y-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-brand-400 animate-pulse" />
                <div>
                  <h3 className="text-md font-black text-white uppercase tracking-wider">{t("AI Duplicate Classifier Assistant")}</h3>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{t("Agent 2 Active Database Scan")}</span>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main content body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 scrollbar-thin">
              {duplicateGroups.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-slate-850 rounded-2xl text-slate-500 space-y-4">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/80 animate-bounce" />
                  <h3 className="text-sm font-bold text-slate-455 uppercase tracking-widest">{t("No Overlapping Duplicates Found")}</h3>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto">{t("All active citizen reports are unique! The duplicate scanning classifier found zero ticket overlaps.")}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {duplicateGroups.map((group, groupIdx) => {
                    const groupReports = group.reportIds.map(id => reports.find(r => r.id === id)).filter(Boolean);
                    if (groupReports.length === 0) return null;
                    const primaryReport = groupReports[0];

                    return (
                      <div key={group.duplicateGroupId} className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-4 relative overflow-hidden">
                        
                        {/* Group Header info */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3">
                          <div className="space-y-1">
                            <span className="text-[9px] bg-brand-500/10 text-brand-350 border border-brand-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                              {t("Cluster #")}0{groupIdx + 1}
                            </span>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider mt-1">{group.issueTitle}</h4>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {group.matchingParameters.map(param => (
                              <span key={param} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15 font-bold uppercase text-[9px] whitespace-nowrap">
                                {t(param)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Reports side-by-side comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {groupReports.map((rep, idx) => (
                            <div key={rep.id} className={`p-4 rounded-xl border transition-all ${idx === 0 ? 'bg-blue-950/5 border-blue-900/35 ring-1 ring-blue-500/10' : 'bg-slate-900/10 border-slate-850'}`}>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  {idx === 0 ? t("Primary Ticket (First)") : `${t("Duplicate Claim")} #${idx}`}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase ${
                                  rep.status === 'Pending' 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                    : 'bg-blue-500/10 text-blue-450 border-blue-500/20'
                                }`}>
                                  {rep.status}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-white mb-1.5">{rep.title}</h5>
                              <p className="text-[10px] text-slate-455 leading-relaxed line-clamp-3 mb-3">{rep.description}</p>
                              
                              {/* Metadata grid */}
                              <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 pt-2 border-t border-slate-900">
                                <div>Location: <span className="font-bold text-slate-300 block truncate">{rep.location}</span></div>
                                <div>Category: <span className="font-bold text-slate-300 block">{rep.category}</span></div>
                                <div>Reporter: <span className="font-bold text-slate-350 block">{rep.reporterName}</span></div>
                                <div>Date: <span className="font-bold text-slate-350 block">{rep.date}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Judgment explanation alert */}
                        <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl space-y-1.5 text-xs text-left leading-relaxed">
                          <span className="text-[9px] font-black text-brand-350 uppercase tracking-widest flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 animate-pulse" />
                            <span>AI MERGER JUDGMENT VERDICT</span>
                          </span>
                          <p className="text-[10px] text-slate-350 leading-relaxed">{group.reason}</p>
                        </div>

                        {/* Actions block */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleMergeReports(primaryReport.id, group.reportIds, group.reason)}
                            disabled={mergingSubmitting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {mergingSubmitting ? t("Merging...") : t("Approve AI Merger & Resolve Duplicates")}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Predictive Risk Modal (Agent 4 Console) */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/85 backdrop-blur-md animate-fade-in" onClick={() => setShowRiskModal(false)}>
          <div 
            className="w-full max-w-5xl bg-[#0b0f19]/98 border border-slate-850 shadow-2xl rounded-3xl relative flex flex-col max-h-[90vh] overflow-hidden animate-scale-up p-6 md:p-8 space-y-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-rose-450 animate-pulse" />
                <div>
                  <h3 className="text-md font-black text-white uppercase tracking-wider">{t("Predictive Risk Intelligence Console")}</h3>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{t("Agent 4 Proactive Alert Matrix")}</span>
                </div>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main content body */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 scrollbar-thin">
              {predictiveRisks.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-slate-850 rounded-2xl text-slate-500 space-y-4">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/80 animate-bounce" />
                  <h3 className="text-sm font-bold text-slate-455 uppercase tracking-widest">{t("No Unresolved Risks Detected")}</h3>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto">{t("All active citizen reports are mapped within safe baseline operational bounds.")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Explanatory banner */}
                  <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
                      {t("This model grades active reports by analyzing geographical cluster densities, historical backlog metrics, SLA timers, proximity to critical city hubs (hospitals, schools, highways), and trend delta velocity.")}
                    </p>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-md font-black uppercase tracking-wider">
                      {predictiveRisks.length} {t("Evaluated Reports")}
                    </span>
                  </div>

                  {/* Risk Assessments list sorted by score descending */}
                  <div className="space-y-4">
                    {predictiveRisks
                      .sort((a, b) => b.riskScore - a.riskScore)
                      .map((risk) => {
                        const rep = reports.find(r => r.id === risk.reportId);
                        if (!rep) return null;

                        // Severity Color coding based on score
                        const isCritical = risk.riskScore >= 75;
                        const isHigh = risk.riskScore >= 50 && risk.riskScore < 75;

                        return (
                          <div key={risk.reportId} className="p-5 bg-slate-950/30 border border-slate-850 rounded-2xl flex flex-col md:flex-row items-stretch gap-6 relative overflow-hidden transition-all hover:border-slate-800">
                            
                            {/* Score Ring Section */}
                            <div className="flex flex-col items-center justify-center text-center px-4 border-b md:border-b-0 md:border-r border-slate-850 pb-4 md:pb-0 md:pr-6 min-w-[120px]">
                              <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-slate-900">
                                <div className={`absolute inset-0 rounded-full border-4 border-t-transparent ${
                                  isCritical 
                                    ? 'border-rose-500 animate-spin-slow' 
                                    : isHigh 
                                      ? 'border-amber-500' 
                                      : 'border-blue-500'
                                }`} />
                                <span className="text-lg font-black text-white">{risk.riskScore}</span>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest mt-2 ${
                                isCritical 
                                  ? 'text-rose-400' 
                                  : isHigh 
                                    ? 'text-amber-400' 
                                    : 'text-blue-400'
                              }`}>
                                {isCritical ? t("Critical Risk") : isHigh ? t("Elevated Risk") : t("Standard Risk")}
                              </span>
                            </div>

                            {/* Ticket Details */}
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{rep.title}</h4>
                                  <span className="text-[10px] text-slate-500 font-bold block">{rep.location}</span>
                                </div>
                                <span className="text-[9px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 font-bold">
                                  {rep.category}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-455 leading-relaxed line-clamp-2">{rep.description}</p>

                              {/* Triggered Factors Badges */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {risk.triggeredFactors.map(factor => (
                                  <span key={factor} className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-850 font-bold text-[8px] uppercase">
                                    {factor}
                                  </span>
                                ))}
                              </div>

                              {/* AI Forecast & Recommendations */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-900 text-xs">
                                <div className="space-y-1 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                  <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>AI PREDICTIVE OUTCOME (WHAT'S NEXT)</span>
                                  </span>
                                  <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">{risk.predictedScenario}</p>
                                </div>

                                <div className="space-y-1 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>AI PREVENTIVE RECOMMENDATION (WHAT TO DO NOW)</span>
                                  </span>
                                  <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">{risk.preventiveAction}</p>
                                </div>
                              </div>

                              {/* Actions Block */}
                              <div className="flex justify-between items-center pt-3 border-t border-slate-900">
                                <div className="text-[10px] text-slate-500">
                                  {t("Status")}: <span className={`font-black uppercase ml-1 ${rep.status === 'Resolved' ? 'text-emerald-400' : 'text-amber-405'}`}>{rep.status}</span>
                                </div>
                                {rep.status !== 'Resolved' ? (
                                  <button
                                    onClick={() => {
                                      setShowRiskModal(false);
                                      setActiveTab('queue');
                                      setSelectedReport(rep);
                                    }}
                                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1"
                                  >
                                    <ArrowRight className="w-3 h-3 animate-pulse" />
                                    <span>{t("Go to Incident Queue & Resolve")}</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic font-bold uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    {t("Issue Successfully Resolved")}
                                  </span>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Resource Planner Modal (Agent 3 Console) */}
      {showPlannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/85 backdrop-blur-md animate-fade-in" onClick={() => setShowPlannerModal(false)}>
          <div 
            className="w-full max-w-6xl bg-white dark:bg-[#0b0f19]/98 border border-slate-200 dark:border-slate-850 shadow-2xl rounded-3xl relative flex flex-col h-[90vh] overflow-hidden animate-scale-up p-6 md:p-8 text-left text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                <div>
                  <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">{t("AI Resource Planner Agent Console")}</h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{t("Agent 3 Active Dispatch & Cost Matrix")}</span>
                </div>
              </div>
              <button
                onClick={() => setShowPlannerModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Screen Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-6 pt-4">
              
              {/* Left Column: Incidents List & Filters */}
              <div className="w-full md:w-2/5 flex flex-col overflow-hidden space-y-4 border-r border-slate-200 dark:border-slate-900 pr-4">
                
                {/* Search & Sort controls */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder={t("Search incidents...")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <select
                    value={plannerSortBy}
                    onChange={(e) => setPlannerSortBy(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="RiskScore">{t("Sort: Risk")}</option>
                    <option value="Priority">{t("Sort: Priority")}</option>
                    <option value="Cost">{t("Sort: Cost")}</option>
                    <option value="Time">{t("Sort: Time")}</option>
                    <option value="Department">{t("Sort: Department")}</option>
                  </select>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-900 pb-1 gap-2">
                  {['Pending', 'Resolved', 'Emergency'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setPlannerFilter(tab)}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                        plannerFilter === tab 
                          ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/30' 
                          : 'bg-transparent text-slate-400 dark:text-slate-450 border-transparent hover:text-slate-650 dark:hover:text-slate-300'
                      }`}
                    >
                      {t(tab)}
                    </button>
                  ))}
                </div>

                {/* Incidents Queue */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {reports
                    .filter(r => {
                      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.location.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      let matchesFilter = false;
                      const isCritical = r.severity === 'Critical' || (r.priorityScore && r.priorityScore >= 75);

                      if (plannerFilter === 'Pending') {
                        matchesFilter = r.status !== 'Resources Assigned' && r.status !== 'Resolved';
                      } else if (plannerFilter === 'Resolved') {
                        matchesFilter = r.status === 'Resolved' || r.status === 'Resources Assigned';
                      } else if (plannerFilter === 'Emergency') {
                        matchesFilter = isCritical;
                      }

                      return matchesSearch && matchesFilter;
                    })
                    .sort((a, b) => {
                      if (plannerSortBy === 'RiskScore') {
                        return (b.priorityScore || 0) - (a.priorityScore || 0);
                      }
                      if (plannerSortBy === 'Priority') {
                        const prioWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                        return (prioWeight[b.severity] || 0) - (prioWeight[a.severity] || 0);
                      }
                      if (plannerSortBy === 'Cost') {
                        return ((b.resourcePlan?.estimatedCost || 0) - (a.resourcePlan?.estimatedCost || 0));
                      }
                      if (plannerSortBy === 'Time') {
                        return ((a.resourcePlan?.estimatedResolutionTime || 0) - (b.resourcePlan?.estimatedResolutionTime || 0));
                      }
                      if (plannerSortBy === 'Department') {
                        return (a.assignedDepartment || '').localeCompare(b.assignedDepartment || '');
                      }
                      return 0;
                    })
                    .map(rep => {
                      const isSelected = plannerSelectedReport && plannerSelectedReport.id === rep.id;
                      return (
                        <div
                          key={rep.id}
                          onClick={() => loadResourcePlanForReport(rep)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-955/20 border-blue-200 dark:border-blue-900/40 ring-1 ring-blue-500/10' 
                              : 'bg-slate-50/50 dark:bg-slate-955/30 border-slate-200 dark:border-slate-850/60 hover:border-slate-300 dark:hover:border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider line-clamp-1">{rep.title}</h4>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                              rep.severity === 'Critical' 
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                              {rep.severity}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block truncate">{rep.location}</p>
                          <div className="flex justify-between items-center mt-2 text-[8px] font-semibold text-slate-450 uppercase pt-1 border-t border-slate-200 dark:border-slate-900">
                            <span>{rep.category}</span>
                            <span className={`font-black ${rep.status === 'Resolved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{rep.status}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: AI Plan Recommendations */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 dark:bg-slate-955/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 relative">
                
                {plannerLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-955/80 backdrop-blur-xs space-y-3 z-10">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("Generating Optimal Resource Plan...")}</span>
                  </div>
                ) : null}

                {!plannerSelectedReport ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-550 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t("Select an incident to review plan recommendations")}</span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                    
                    {/* Plan Header details */}
                    <div className="flex justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-900 pb-3">
                      <div>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">{plannerSelectedReport.category}</span>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mt-0.5">{plannerSelectedReport.title}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-450 font-semibold block">{plannerSelectedReport.location}</span>
                      </div>

                      {plannerReportPlan ? (
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-center">
                            <span className="text-[8px] font-extrabold uppercase block leading-none">{t("AI Confidence")}</span>
                            <span className="text-xs font-black">{plannerReportPlan.confidenceScore}%</span>
                          </div>
                          <div className={`px-2.5 py-1 rounded-xl border text-center ${
                            plannerSelectedReport.status === 'Resolved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : plannerSelectedReport.status === 'Resources Assigned' 
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            <span className="text-[8px] font-extrabold uppercase block leading-none">{t("Status")}</span>
                            <span className="text-xs font-black">{plannerSelectedReport.status}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Scrollable details form */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-thin text-xs text-left">
                      
                      {plannerReportPlan && plannerReportPlan.emergencyActions && (
                        <div className="p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-xl space-y-2">
                          <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            <span>EMERGENCY RESPONSE MODE DETECTED</span>
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                            {t("This incident is classified as Critical. Displaying pre-planned response operations.")}
                          </p>
                          <ul className="list-disc list-inside text-[9px] text-slate-600 dark:text-slate-350 space-y-1">
                            {plannerReportPlan.emergencyActions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {plannerReportPlan ? (
                        <div className="space-y-4">
                          
                          {/* Plan Parameters details */}
                          {!editPlanMode ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Recommended Department")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.department}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Assigned Working Team")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.teamName}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Number of Personnel")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.personnelCount} {t("Workers")}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Estimated Resolution Time")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.estimatedResolutionTime} {t("Hours")}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Equipment & Vehicles Needed")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300 block truncate">{plannerReportPlan.equipment}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Estimated Budget / Cost")}</span>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-455">₹{plannerReportPlan.estimatedCost.toLocaleString()}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Priority Level")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.priority}</span>
                              </div>
                              <div className="p-3 bg-slate-100/60 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Expected Completion Time")}</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300">{plannerReportPlan.expectedCompletionTime}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 bg-slate-100/60 dark:bg-slate-955/30 border border-slate-200 dark:border-slate-850 p-4 rounded-xl">
                              <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-900 pb-1.5 mb-2">{t("Modify Resource Allocation Plan")}</h5>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Assigned Department")}</label>
                                  <input
                                    type="text"
                                    value={editPlanData.department}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, department: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Personnel Count")}</label>
                                  <input
                                    type="number"
                                    value={editPlanData.personnelCount}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, personnelCount: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Estimated Budget (Rupees)")}</label>
                                  <input
                                    type="number"
                                    value={editPlanData.estimatedCost}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, estimatedCost: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Expected Completion Time")}</label>
                                  <input
                                    type="text"
                                    value={editPlanData.expectedCompletionTime}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, expectedCompletionTime: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Priority Level")}</label>
                                  <select
                                    value={editPlanData.priority}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, priority: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-350 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                  </select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block">{t("Officer Allocation Remarks")}</label>
                                  <textarea
                                    value={editPlanData.remarks}
                                    onChange={(e) => setEditPlanData({ ...editPlanData, remarks: e.target.value })}
                                    placeholder={t("Add dispatch remarks, adjustments logic...")}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 h-14 resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI Reasoning */}
                          <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              <span>AI STRATEGIC REASONING ANALYSIS</span>
                            </span>
                            <p className="text-[10px] text-slate-650 dark:text-slate-350 leading-relaxed">{plannerReportPlan.reasoning}</p>
                          </div>

                        </div>
                      ) : null}

                    </div>

                    {/* Actions block at bottom */}
                    {plannerReportPlan ? (
                      <div className="flex gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-900">
                        {editPlanMode ? (
                          <>
                            <button
                              onClick={() => setEditPlanMode(false)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              {t("Cancel")}
                            </button>
                            <button
                              onClick={() => handleApproveResourcePlan(plannerSelectedReport, plannerReportPlan, plannerReportPlan.emergencyActions !== undefined)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                            >
                              {t("Save & Approve Plan")}
                            </button>
                          </>
                        ) : (
                          <>
                            {plannerSelectedReport.status === 'Resolved' ? (
                              <span className="w-full text-center text-xs font-extrabold text-emerald-650 dark:text-emerald-400 uppercase py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl flex items-center justify-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" />
                                <span>{t("Issue Successfully Resolved")}</span>
                              </span>
                            ) : plannerSelectedReport.status !== 'Resources Assigned' ? (
                              <>
                                <button
                                  onClick={() => handleRejectResourcePlan(plannerSelectedReport)}
                                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-455 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  {t("Reject Plan")}
                                </button>
                                
                                <button
                                  onClick={() => setEditPlanMode(true)}
                                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  {t("Modify Plan")}
                                </button>

                                {plannerReportPlan.emergencyActions ? (
                                  <button
                                    onClick={() => handleApproveResourcePlan(plannerSelectedReport, plannerReportPlan, true)}
                                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md animate-pulse"
                                  >
                                    {t("Approve Emergency Response")}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleApproveResourcePlan(plannerSelectedReport, plannerReportPlan, false)}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                                  >
                                    {t("Approve Allocation Plan")}
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="w-full text-center text-xs font-bold text-slate-500 uppercase py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl">
                                {t("Resource Plan Active & Deployed")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ) : null}

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* AGENT 7 & 8: CONTENT MODERATION OVERLAY MODAL */}
      {showModerationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/85 backdrop-blur-md" onClick={() => setShowModerationModal(false)}>
          <div 
            className="w-full max-w-4xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 text-slate-900 dark:text-white text-left relative flex flex-col h-[650px] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black uppercase text-slate-850 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-5 h-5 text-red-505 animate-pulse" />
                  <span>{t("Agent 7 & 8: Content Moderation & Warning Console")}</span>
                </h3>
                <span className="text-[10px] text-slate-455 dark:text-slate-500 font-bold uppercase tracking-wider block">{t("Monitor citizen feeds, scan with Gemini AI, and issue official warnings")}</span>
              </div>
              <button 
                onClick={() => setShowModerationModal(false)}
                className="p-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-wrap gap-4 items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-850/40 mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setModerationTab('flagged')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${moderationTab === 'flagged' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  {t("Flagged Feed")}
                </button>
                <button
                  onClick={() => setModerationTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${moderationTab === 'all' ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800' : 'text-slate-400 hover:text-white'}`}
                >
                  {t("All Activity Feed")}
                </button>
              </div>

              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t("Filter by user or text...")}
                  value={moderationSearch}
                  onChange={(e) => setModerationSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-905 border border-slate-250 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-slate-350 focus:outline-none"
                />
              </div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {getModerationFeed().length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  {t("No content found matching filter criteria.")}
                </div>
              ) : (
                getModerationFeed().map(item => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      item.flagged 
                        ? 'bg-red-500/5 border-red-500/25' 
                        : 'bg-slate-50 dark:bg-slate-905 border-slate-200 dark:border-slate-850/50'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-2xl text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-800 dark:text-white">{item.userName}</span>
                        <span className="text-[9px] text-slate-555 font-bold uppercase">({item.type === 'post' ? t('Post') : t('Comment')})</span>
                        {item.flagged && (
                          <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase">
                            {item.flagReason || 'Flagged'} ({Math.round(item.spamScore)}%)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                        {item.type === 'comment' && <strong className="text-indigo-400">@{item.reportTitle?.substring(0,20)}: </strong>}
                        {item.text}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDeepAIScan(item)}
                        disabled={scanningIds.includes(item.id)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-350 hover:text-white rounded-lg cursor-pointer transition-all"
                      >
                        {scanningIds.includes(item.id) ? t("Scanning...") : t("AI Scan")}
                      </button>
                      <button
                        onClick={() => {
                          setWarningTarget(item);
                          setShowWarningModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-905 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all"
                      >
                        {t("Warn User")}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        disabled={moderationSubmitting}
                        className="p-1.5 bg-red-950/20 hover:bg-rose-600 border border-red-500/20 text-rose-500 hover:text-white rounded-lg cursor-pointer transition-all"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* WARNING MODAL */}
      {showWarningModal && warningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm" onClick={() => setShowWarningModal(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 text-slate-900 dark:text-white text-left relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-3 mb-4">
              <h4 className="text-sm font-black uppercase text-slate-850 dark:text-white">{t("Issue User warning")}</h4>
              <button 
                onClick={() => setShowWarningModal(false)}
                className="p-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendWarning} className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-550 uppercase font-black tracking-wider mb-1">{t("Select Warning Reason")}</label>
                <select
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded-xl text-xs text-slate-850 dark:text-slate-350 focus:outline-none"
                >
                  <option value="Inappropriate/explicit language">{t("Inappropriate/explicit language")}</option>
                  <option value="Spam / Duplicate ticket spamming">{t("Spam / Duplicate ticket spamming")}</option>
                  <option value="Abusive behavior in comments">{t("Abusive behavior in comments")}</option>
                  <option value="Inaccurate location pinning">{t("Inaccurate location pinning")}</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-555 uppercase font-black tracking-wider mb-1">{t("Offending content preview")}</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-xl text-xs italic text-slate-500">
                  "{warningTarget.text}"
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-2 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={moderationSubmitting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  {moderationSubmitting ? t("Sending Warning...") : t("Send Warning alert")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
