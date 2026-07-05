import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Award, Clock, Shield, Sparkles, CheckCircle2, History, AlertCircle, Loader, 
  User, Mail, Phone, MapPin, Edit3, Save, X, ToggleLeft, ToggleRight, Smartphone, 
  Key, Globe, BellRing, Eye, EyeOff, LayoutDashboard, Users, Calendar, 
  MessageSquare, FileText, Settings, ShieldCheck, HelpCircle, Upload, Check, Trash2 
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { 
  fetchNotifications, fetchDocuments, uploadDocument, deleteDocument, updateUserProfile, addNotification, logUserActivity, fetchMissions, fetchReports, updateReport, deleteReport, awardXP
} from '../services/api';
import { useTranslation } from '../context/TranslationContext';
import { isMockFirebase } from '../firebase/config';
import SeverityBadge from '../components/SeverityBadge';
import { getLocationText } from '../utils/regions';

export default function Profile() {
  const { user, loading, refetchUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [joiningCommId, setJoiningCommId] = useState(null);

  // Loading States
  const [saving, setSaving] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Editable Profile Form States
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    avatar: ''
  });

  // Security Form States
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Preference Settings States
  const [prefs, setPrefs] = useState({
    language: 'en',
    theme: 'system',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    announcements: true,
    eventUpdates: true
  });

  // Documents States
  const [documents, setDocuments] = useState([]);
  const [uploadFile, setUploadFile] = useState({ name: '', category: 'Aadhar Card' });
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // My Reports States
  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Editing Report States
  const [editingReport, setEditingReport] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Roads & Safety');
  const [editLocation, setEditLocation] = useState('');
  const [editSeverity, setEditSeverity] = useState('Low');
  const [editDescription, setEditDescription] = useState('');
  const [updatingReportLoading, setUpdatingReportLoading] = useState(false);

  // Active user details
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        avatar: user.avatar || ''
      });
      if (user.preferences) {
        setPrefs(user.preferences);
      }
    }
  }, [user]);

  // Load documents
  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab]);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents();
    }
  }, [activeTab]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await fetchMissions();
      setEvents(data.filter(m => m.joined));
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadMyReports = async () => {
    setReportsLoading(true);
    try {
      const allReports = await fetchReports();
      const filtered = allReports.filter(r => r.userId === user?.uid || r.reporterName === user?.name);
      setMyReports(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && user) {
      loadMyReports();
    }
  }, [activeTab, user]);

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
      
      setMyReports(prev => prev.map(r => r.id === editingReport.id ? {
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
      triggerSuccessAlert('Post updated successfully!');
      window.dispatchEvent(new Event('mock-auth-state-change'));
    } catch (err) {
      console.error(err);
      triggerErrorAlert('Failed to update post.');
    } finally {
      setUpdatingReportLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(t('Are you sure you want to delete this civic report? This action cannot be undone.'))) return;
    try {
      await deleteReport(reportId);
      setMyReports(prev => prev.filter(r => r.id !== reportId));
      triggerSuccessAlert(t('Post deleted successfully!'));
      window.dispatchEvent(new Event('mock-auth-state-change'));
    } catch (err) {
      console.error(err);
      triggerErrorAlert(t('Failed to delete post.'));
    }
  };

  const handleJoinCommunity = async (commId, commName) => {
    if (!user) return;
    setJoiningCommId(commId);
    try {
      await logUserActivity(user.uid, `Joined Community: ${commName}`, 30, 'Community Joined', `Joined civic action group: ${commName}`, 'Completed', commId);
      
      const joined = user.joinedCommunities || [];
      if (!joined.includes(commId)) {
        joined.push(commId);
      }
      
      await updateUserProfile(user.uid, { joinedCommunities: joined });
      if (typeof refetchUser === 'function') {
        refetchUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningCommId(null);
    }
  };

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDocsLoading(false);
    }
  };

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
        <p className="text-slate-400 text-sm mt-1">Please log in to access the Profile Dashboard workspace.</p>
        <button 
          onClick={() => navigate('/login')}
          className="mt-6 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
        >
          Portal Login
        </button>
      </div>
    );
  }

  // Calculate Profile Completion %
  const calculateCompletion = () => {
    let score = 0;
    if (user.avatar) score += 20;
    if (user.name) score += 20;
    if (user.email) score += 20;
    if (user.phone) score += 20;
    if (user.location) score += 20;
    return score;
  };

  const completionPercent = calculateCompletion();
  const xp = user.xp || 0;
  const nextLevelXp = user.nextLevelXp || 1000;
  const xpPercent = Math.min((xp / nextLevelXp) * 100, 100);
  const level = user.level || 1;
  const completedMissions = user.completedMissions || 0;
  const hoursVolunteered = user.hoursVolunteered || 0;
  const reportsSubmitted = user.reportsSubmitted || 0;
  const verifiedStatus = user.verifiedStatus || 'Not Verified';

  // Badge list data
  const ALL_BADGES = [
    { id: 'b-01', name: 'Community Contributor', icon: '✊', description: 'Submitted at least one community hazard report.', unlocked: reportsSubmitted > 0, color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
    { id: 'b-02', name: 'Volunteer Active', icon: '🌱', description: 'Registered and participated in community missions.', unlocked: hoursVolunteered > 0, color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    { id: 'b-03', name: 'Verified Citizen', icon: '🛡️', description: 'Identity and residence documents verified.', unlocked: verifiedStatus === 'OC Verified', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
    { id: 'b-04', name: 'Top Supporter', icon: '⭐️', description: 'Achieved a reputation score above 30.', unlocked: (user.reputationScore || 10) >= 30, color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    { id: 'b-05', name: 'Community Leader', icon: '👑', description: 'Reached Guild Level 5 or higher.', unlocked: level >= 5, color: 'bg-rose-500/10 border-rose-500/30 text-rose-455' }
  ];

  // Simulated Alert Timer Helper
  const triggerSuccessAlert = (message) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(''), 4000);
  };
  const triggerErrorAlert = (message) => {
    setActionError(message);
    setTimeout(() => setActionError(''), 4000);
  };

  // Profile Save Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionSuccess('');
    setActionError('');
    try {
      await updateUserProfile(user.uid, formData);
      await logUserActivity(user.uid, 'Updated Profile Credentials: Name/Contact details', 15);

      // Award +20 XP for completing profile (one-time only)
      const currentData = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
      const isProfileComplete = formData.name && formData.phone && formData.location;
      if (isProfileComplete && !currentData.profileXpAwarded) {
        await awardXP(user.uid, 20, 'Profile Completed ⭐', user.uid);
        await updateUserProfile(user.uid, { profileXpAwarded: true });
      }

      setEditMode(false);
      triggerSuccessAlert('Your profile credentials have been saved successfully.');
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Preference Toggle Handler
  const handlePreferenceToggle = async (key, val) => {
    const updatedPrefs = { ...prefs, [key]: val };
    setPrefs(updatedPrefs);
    try {
      await updateUserProfile(user.uid, { preferences: updatedPrefs });
      if (key === 'language' || key === 'theme') {
        await logUserActivity(user.uid, `Workspace preferences updated: set ${key} to ${val}`, 5);
      }
      triggerSuccessAlert('User workspace preferences updated.');
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Failed to update workspace preferences.');
    }
  };

  // Avatar Upload / Remove Simulator
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result;
        await updateUserProfile(user.uid, { avatar: base64String });
        await logUserActivity(user.uid, 'Updated avatar profile picture', 20);
        setFormData(prev => ({ ...prev, avatar: base64String }));
        triggerSuccessAlert('Profile photo updated.');
        if (refetchUser) await refetchUser();
      } catch (err) {
        triggerErrorAlert('Failed to upload avatar photo.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    setSaving(true);
    try {
      const fallbackUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
      await updateUserProfile(user.uid, { avatar: fallbackUrl });
      await logUserActivity(user.uid, 'Removed avatar profile picture', 5);
      setFormData(prev => ({ ...prev, avatar: fallbackUrl }));
      triggerSuccessAlert('Profile photo removed.');
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Failed to remove avatar photo.');
    } finally {
      setSaving(false);
    }
  };

  // Change Password Mock / Production
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      triggerErrorAlert('Please fill out all password fields.');
      return;
    }
    if (passwords.newPassword.length < 8) {
      triggerErrorAlert('New password must be at least 8 characters long.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      triggerErrorAlert('Confirm password does not match new password.');
      return;
    }
    setSaving(true);
    try {
      if (!isMockFirebase) {
        const { auth } = await import('../firebase/config');
        const { updatePassword } = await import('firebase/auth');
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, passwords.newPassword);
        }
      }
      await logUserActivity(user.uid, 'Security credentials audit: Changed profile login password', 10, 'Security Updated', 'User successfully changed login password');
      triggerSuccessAlert('Account credentials updated successfully.');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      if (refetchUser) await refetchUser();
    } catch (err) {
      console.error("Password update error:", err);
      triggerErrorAlert(err.message || 'Failed to update credentials. Please re-authenticate and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle 2FA Mock
  const handle2FAToggle = async () => {
    const current2FA = user.security?.twoFactorActive || false;
    const securityUpdate = {
      ...(user.security || {}),
      twoFactorActive: !current2FA
    };
    try {
      await updateUserProfile(user.uid, { security: securityUpdate });
      await logUserActivity(user.uid, `Security center audit: Toggled Two-Factor Authentication (${!current2FA ? 'Enabled' : 'Disabled'})`, 10);
      triggerSuccessAlert(`Two-Factor Authentication has been ${!current2FA ? 'Enabled' : 'Disabled'}.`);
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Failed to toggle two-factor authentication.');
    }
  };

  // Upload Document simulator (Real PNG/PDF File processor)
  const handleDocUploadSimulate = async (e) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      triggerErrorAlert('Please select a PDF or PNG/JPG file to upload.');
      return;
    }
    
    // Check 2MB mock limit to preserve local storage
    if (selectedUploadFile.size > 2 * 1024 * 1024) {
      triggerErrorAlert('File size exceeds the 2MB limit to preserve local database storage.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Content = reader.result;
        const sizeStr = selectedUploadFile.size > 1024 * 1024
          ? (selectedUploadFile.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (selectedUploadFile.size / 1024).toFixed(0) + ' KB';

        await uploadDocument(selectedUploadFile.name, uploadFile.category, sizeStr, base64Content, selectedUploadFile);
        
        triggerSuccessAlert(`File "${selectedUploadFile.name}" uploaded successfully.`);
        setSelectedUploadFile(null);
        
        // Reset file inputs
        e.target.reset();
        loadDocuments();
        if (refetchUser) await refetchUser();
      } catch (err) {
        triggerErrorAlert('Document upload failed.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(selectedUploadFile);
  };

  // Delete Document simulator
  const handleDocDelete = async (id) => {
    try {
      await deleteDocument(id);
      await logUserActivity(user.uid, 'Deleted verification document reference', 5);
      triggerSuccessAlert('Verification document deleted.');
      loadDocuments();
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Unable to delete document.');
    }
  };

  // Request Profile Verification
  const handleRequestVerification = async () => {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { verifiedStatus: 'Pending Verification' });
      await logUserActivity(user.uid, 'Submitted profile credentials for Official Verification', 50);
      
      // Send a mock notification
      await addNotification(
        'Verification Updates',
        'Verification Submitted',
        'Your profile verification request was submitted. Officers will review your uploaded PDFs shortly.'
      );
      window.dispatchEvent(new Event('refresh-notifications'));

      triggerSuccessAlert('Your credentials have been submitted for review.');
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Unable to submit verification request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col justify-center items-center px-4 animate-fade-in">
        <div className="glass p-8 rounded-3xl border border-slate-800/60 shadow-2xl space-y-6 text-center select-none w-full relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Branding Logo */}
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-inner">
              <img src="/logo.png" alt="JanSathi Logo" className="w-16 h-16 object-contain rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-wider uppercase">
              JAN <span className="text-blue-500 font-medium">SATHI</span>
            </h1>
            <p className="text-slate-400 text-[10px] tracking-widest uppercase font-bold">
              जन सेवा, हमारा संकल्प
            </p>
          </div>

          <div className="border-t border-slate-800/40 my-2" />

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">{t("Login Required")}</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
              {t("Welcome to Jan Sathi! To manage your profile details, view your citizen verification documents, and check security logs, please sign in or register an account.")}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] cursor-pointer text-center"
            >
              {t("Sign In or Register")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-left">
      
      {/* Alert Notices */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
          <Check className="w-4.5 h-4.5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-455 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* --- TAB VIEW 1: PROFILE WORKSPACE --- */}
      {activeTab === 'profile' && (
        <>
          {/* Header Profile Card */}
          <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
              
              {/* Avatar with Ring & Actions */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <img
                    src={formData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                    alt={user.name}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-4 ring-slate-800 group-hover:ring-brand-500/30 transition-all duration-300 shadow-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-650 text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                    {level}
                  </div>
                </div>
                
                {/* Photo Simulators */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors bg-slate-900 px-2.5 py-1 rounded border border-slate-800">{t("Upload")}<input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {user.avatar && (
                    <button 
                      onClick={handleAvatarRemove}
                      className="text-[10px] font-bold text-rose-455 hover:text-rose-400 hover:underline cursor-pointer bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                    >{t("Remove")}</button>
                  )}
                </div>
              </div>

              {/* Profile Details Block */}
              <div className="flex-1 space-y-5 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-bold uppercase tracking-wider">
                        Level {level} {t(user.role || 'Citizen')}
                      </span>
                      {verifiedStatus === 'OC Verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3" />{t("OC Verified")}</span>
                      ) : verifiedStatus === 'Pending Verification' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse">{t("Pending Verification")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/40 text-slate-400 border border-slate-800 text-[10px] font-bold uppercase tracking-wider">{t("Not Verified")}</span>
                      )}
                    </div>
                    
                    {!editMode ? (
                      <>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                          <span>{user.name}</span>
                        </h1>
                        <p className="text-slate-500 text-xs mt-1.5 flex items-center justify-center sm:justify-start gap-1 font-semibold uppercase tracking-wider">{t("Unique ID:")}<span className="text-slate-300">{user.uniqueId || 'JS-MOCK'}</span>
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">{t("Editing profile details...")}</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (editMode) {
                        setFormData({
                          name: user.name || '',
                          email: user.email || '',
                          phone: user.phone || '',
                          location: user.location || '',
                          avatar: user.avatar || ''
                        });
                      }
                      setEditMode(!editMode);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl border border-slate-800/60 hover:border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {editMode ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>{t("Cancel")}</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t("Edit Credentials")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Edit Form / Credentials display */}
                {!editMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-300 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Email Address")}</span>
                        <span className="font-semibold block text-slate-200 truncate">{user.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Phone Contact")}</span>
                        <span className="font-semibold block text-slate-200 truncate">{user.phone || 'Not Configured'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Region Zone</span>
                        <span className="font-semibold block text-slate-200 truncate">{user.location || 'Not Specified'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl bg-slate-900/20 p-5 rounded-2xl border border-slate-800/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Email Address")}</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Phone Contact")}</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          placeholder="e.g. +1 555-0199"
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Region Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          placeholder="e.g. Downtown Safety Zone"
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ml-auto"
                    >
                      {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{t("Save Changes")}</span>
                    </button>
                  </form>
                )}

                {/* Level / XP Progress details */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex justify-between text-xs font-extrabold text-slate-400">
                    <span>Guild XP Progress</span>
                    <span className="text-brand-300">{xp} / {nextLevelXp} XP</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500 animate-pulse"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Member Since: {new Date(user.createdAt || user.memberSince).toLocaleDateString()}</span>
                    <span>Last Login: {user.lastLogin || 'Just now'}</span>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Account Overview Stats & Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Column 1: Account Overview Metric Panel */}
            <div className="md:col-span-1 space-y-8">
              
              {/* Account Overview Stats list */}
              <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
                <h2 className="text-sm font-extrabold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2 uppercase">
                  <LayoutDashboard className="w-4 h-4 text-brand-400" />
                  <span>Account Workspace</span>
                </h2>

                <div className="space-y-4 text-xs">
                  {/* Completion Meter */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-800/60">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Profile Status</span>
                      <span className="font-extrabold text-slate-350">{completionPercent}% Completed</span>
                    </div>
                    {/* Circle Loader */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="18" cy="18" r="15" stroke="currentColor" className="text-slate-800" strokeWidth="3" fill="transparent" />
                        <circle cx="18" cy="18" r="15" stroke="currentColor" className="text-blue-500" strokeWidth="3" fill="transparent"
                          strokeDasharray={94.2}
                          strokeDashoffset={94.2 - (94.2 * completionPercent) / 100}
                        />
                      </svg>
                      <span className="absolute text-[8px] font-black text-slate-200">{completionPercent}%</span>
                    </div>
                  </div>

                  {/* Other statistics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/60">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Joined Groups</span>
                      <span className="text-sm sm:text-base font-black text-slate-200 mt-1 block">3 Communities</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/60">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Requests</span>
                      <span className="text-sm sm:text-base font-black text-slate-200 mt-1 block">{reportsSubmitted} Issues</span>
                    </div>
                  </div>

                  {/* Account health */}
                  <div className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Account Trust score</span>
                      <span className="text-sm font-black text-emerald-450 block mt-0.5">98 / 100 Healthy</span>
                    </div>
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping shrink-0" />
                  </div>
                </div>
              </div>

              {/* Achievements & Recognition (Unlocked badges list) */}
              <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
                <h2 className="text-sm font-extrabold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2 uppercase">
                  <Award className="w-4 h-4 text-brand-400" />
                  <span>Awards Catalogue</span>
                </h2>

                <div className="space-y-3.5">
                  {ALL_BADGES.map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-xl border text-left flex gap-3 transition-all duration-300 hover:scale-[1.01] ${
                        badge.unlocked 
                          ? `${badge.color} border-slate-800/80` 
                          : 'bg-slate-900/10 border-slate-900/30 text-slate-600 opacity-40'
                      }`}
                    >
                      <span className="text-2xl shrink-0 h-fit bg-slate-950 p-1.5 rounded-lg">{badge.icon}</span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black tracking-tight leading-snug">{badge.name}</span>
                        <span className="block text-[9px] text-slate-500 mt-0.5 leading-snug">{badge.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Column 2: Community Overview Stats & Timeline */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Community overview counters */}
              <div className="glass p-6 rounded-2xl border border-slate-800/60 shadow-lg space-y-4">
                <h2 className="text-sm font-extrabold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2 uppercase">
                  <Users className="w-4 h-4 text-brand-400" />
                  <span>Community Statistics</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/40">
                  <div className="text-center sm:text-left sm:pr-4 pt-2 sm:pt-0">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Volunteer Done</span>
                    <span className="text-lg font-black text-white mt-1 block flex items-center justify-center sm:justify-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{completedMissions} Missions</span>
                    </span>
                  </div>
                  
                  <div className="text-center sm:text-left pt-3 sm:pt-0 pl-0 sm:pl-4">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Impact Hours</span>
                    <span className="text-lg font-black text-white mt-1 block flex items-center justify-center sm:justify-start gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{hoursVolunteered} Hrs</span>
                    </span>
                  </div>

                  <div className="text-center sm:text-left pt-3 sm:pt-0 pl-0 sm:pl-4">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Reputation Score</span>
                    <span className="text-lg font-black text-brand-300 mt-1 block">{user.reputationScore || 10} XP</span>
                  </div>

                  <div className="text-center sm:text-left pt-3 sm:pt-0 pl-0 sm:pl-4">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Reputation Level</span>
                    <span className="text-xs font-black text-white mt-1 block uppercase tracking-wider">{user.reputationLevel || 'New Recruit'}</span>
                  </div>
                </div>
              </div>

              {/* Activity chronological Timeline */}
              <div className="glass p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-lg space-y-6">
                <h2 className="text-sm font-extrabold text-white tracking-tight border-b border-slate-800/60 pb-3 flex items-center gap-2 uppercase">
                  <History className="w-5 h-5 text-brand-400" />
                  <span>Activity Logs</span>
                </h2>

                <div className="relative border-l-2 border-slate-800/60 pl-6 ml-3 space-y-6 py-2 text-left">
                  {user.impactTimeline?.length === 0 ? (
                    <span className="text-xs text-slate-500 italic block py-2">No activity records logged.</span>
                  ) : (
                    (user.impactTimeline || [
                      { id: 'act-01', title: 'Joined JanSathi Digital Portal', date: user.createdAt, xpReward: 10 },
                      { id: 'act-02', title: 'Security audit: Session login successful', date: new Date().toISOString(), xpReward: 5 }
                    ]).map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="absolute -left-[31px] top-1 bg-brand-500 w-3 h-3 rounded-full border-4 border-slate-900 group-hover:scale-110 group-hover:bg-sky-400 transition-all duration-300" />
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h3 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                              {item.title}
                            </h3>
                            <span className="text-[9px] text-slate-500 font-semibold">{formatDate(item.date)}</span>
                          </div>
                          {item.xpReward > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black shadow-sm shrink-0">
                              +{item.xpReward} XP
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      )}

      {/* --- TAB VIEW: MY SUBMISSIONS --- */}
      {activeTab === 'reports' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <FileText className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">{t("My Submissions")}</h2>
          </div>

          <div className="space-y-4 text-left">
            {reportsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/20 border border-slate-850 rounded-2xl space-y-2">
                <FileText className="w-8 h-8 text-slate-650 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">{t("No Reports Found")}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {t("You haven't submitted any hazard reports yet. Help the community by submitting your first report!")}
                </p>
                <Link to="/report-issue" className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                  {t("Report An Issue")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myReports.map((report) => (
                  <div key={report.id} className="glass p-5 rounded-2xl border border-slate-800/50 hover:border-slate-700/60 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[8px] font-bold text-brand-300 uppercase tracking-wider">
                          {t(report.category)}
                        </span>
                        <SeverityBadge severity={report.severity} status={report.status} />
                      </div>
                      <h3 className="font-extrabold text-sm text-white line-clamp-1">{t(report.title)}</h3>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{t(report.description)}</p>
                      
                      <div className="text-[10px] text-slate-500 flex justify-between items-center">
                        <span>{formatDate(report.date)}</span>
                        {report.edited && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-750 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                            {t("Edited")}
                          </span>
                        )}
                      </div>
                               <div className="flex gap-2 pt-4 border-t border-slate-900/40 mt-4 flex-wrap">
                      <Link 
                        to={`/report/${report.id}`} 
                        className="flex-1 min-w-[70px] py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-350 hover:text-white rounded-xl text-[10px] font-bold transition-all text-center"
                      >
                        {t("View")}
                      </Link>
                      
                      {report.status !== 'Resolved' && (
                        <button
                          onClick={() => {
                            setEditingReport(report);
                            setEditTitle(report.title);
                            setEditCategory(report.category);
                            setEditLocation(getLocationText(report.location));
                            setEditSeverity(report.severity || 'Low');
                            setEditDescription(report.description);
                          }}
                          className="flex-1 min-w-[70px] py-1.5 bg-blue-600/10 border border-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {t("Edit")}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="flex-1 min-w-[70px] py-1.5 bg-rose-600/15 border border-rose-900/30 hover:bg-rose-600 hover:text-white text-rose-455 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        {t("Delete")}
                      </button>
                    </div>           </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- TAB VIEW 2: COMMUNITIES WORKSPACE --- */}
      {activeTab === 'communities' && (() => {
        const communities = [
          {
            id: 'c1',
            name: 'Downtown Infrastructure Hub',
            ngo: 'Smart Urbanism Initiative',
            purpose: 'To collaborate with municipal engineers to fix roads, signposts, and public buildings.',
            mission: 'Making public spaces accessible, safe, and robust for every citizen.',
            department: 'Public Infrastructure & Buildings',
            volunteers: 142,
            activeVolunteers: 85,
            helped: 14,
            solved: 112,
            campaigns: 8,
            contributionScore: 94,
            successRate: 92,
            location: 'Indiranagar Zone, Bengaluru',
            members: '142 members',
            desc: 'Working with municipal engineers to fix roads, signposts, and public buildings.',
            logo: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&q=80&w=150',
            cover: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800',
            history: 'Founded in 2024, our group has audited over 200 public spots, and partnered with the PWD department to rebuild 15 park walkways.',
            achievements: 'Best Civic Group Award 2025, Replaced 40+ damaged signposts.',
            partnerships: 'Public Works Department (PWD)',
            contact: 'downtown-infra@JanSathi-ngo.org',
            gallery: [
              'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&q=80&w=800'
            ]
          },
          {
            id: 'c2',
            name: 'Neighborhood Watch Council',
            ngo: 'Citizens for Safety',
            purpose: 'Citizen patrol and safety hazards identification for local municipal dispatchers and police.',
            mission: 'Securing neighborhood streets through active watch and swift reporting.',
            department: 'Roads & Safety Division',
            volunteers: 94,
            activeVolunteers: 40,
            helped: 9,
            solved: 76,
            campaigns: 4,
            contributionScore: 88,
            successRate: 85,
            location: 'Koramangala Zone, Bengaluru',
            members: '94 members',
            desc: 'Citizen patrol and safety hazards identification for local police dispatchers.',
            logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
            cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
            history: 'A citizen-led alliance formed during the 2024 streetlights safety audit. We report dark alleys, potholes, and broken signals.',
            achievements: 'Triggered 50+ signal repairs, mapped 100+ low-light spots.',
            partnerships: 'Traffic Police Division & BBMP',
            contact: 'watch-council@JanSathi-ngo.org',
            gallery: [
              'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
            ]
          },
          {
            id: 'c3',
            name: 'Sanitation Eco Volunteers',
            ngo: 'Clean Earth Foundation',
            purpose: 'Organizing weekend trash cleanups and public trashcan distribution campaigns.',
            mission: 'Achieving zero waste dumps in public city spaces.',
            department: 'Sanitation & Environment',
            volunteers: 180,
            activeVolunteers: 110,
            helped: 22,
            solved: 154,
            campaigns: 12,
            contributionScore: 98,
            successRate: 96,
            location: 'Whitefield Zone, Bengaluru',
            members: '180 members',
            desc: 'Organizing weekend trash cleanups and public trashcan distribution.',
            logo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
            cover: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80&w=800',
            history: 'Eco volunteers starting as a 5-person cleanup club in 2023. Now hosting weekly clean drives and zero waste workshops.',
            achievements: 'Cleaned 3 major city lakesides, distributed 300+ dry/wet waste bins.',
            partnerships: 'Waste Management Dept & BBMP',
            contact: 'eco-volunteers@JanSathi-ngo.org',
            gallery: [
              'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800'
            ]
          }
        ];

        return (
          <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
              <Users className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-extrabold text-white tracking-tight">{t("Communities Directory")}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {communities.map(group => {
                const isJoined = user?.joinedCommunities?.includes(group.id);
                return (
                  <div 
                    key={group.id} 
                    className="p-0 rounded-2xl bg-slate-900/40 border border-slate-850 shadow-md flex flex-col justify-between hover:border-slate-800 transition-all overflow-hidden group select-none"
                  >
                    {/* Card Banner Cover */}
                    <div className="relative h-28 w-full overflow-hidden shrink-0">
                      <img 
                        src={group.cover} 
                        alt="cover" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-brand-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full glass border border-white/10 shadow-sm">
                        {t(group.department)}
                      </div>
                    </div>

                    {/* Content spec */}
                    <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-3.5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase">{t(group.ngo)}</span>
                          <span className="text-[9px] text-slate-455 font-bold">{group.members}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-brand-300 transition-colors">
                          {t(group.name)}
                        </h3>
                        <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                          {t(group.purpose)}
                        </p>
                      </div>

                      {/* Info Spec Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-semibold">
                        <div>
                          <span>Success Rate:</span>
                          <span className="text-white block font-bold text-xs">{group.successRate}%</span>
                        </div>
                        <div>
                          <span>Contrib Score:</span>
                          <span className="text-white block font-bold text-xs">{group.contributionScore}%</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 shrink-0">
                        <button 
                          onClick={() => setSelectedCommunity(group)}
                          className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-905 border border-slate-800 text-slate-355 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center"
                        >
                          {t("View Details")}
                        </button>
                        
                        <button
                          onClick={() => handleJoinCommunity(group.id, group.name)}
                          disabled={isJoined || joiningCommId === group.id}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-[11px] transition-all duration-200 cursor-pointer ${
                            isJoined
                              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                          }`}
                        >
                          {joiningCommId === group.id ? (
                            <Loader className="w-3.5 h-3.5 animate-spin mx-auto" />
                          ) : isJoined ? (
                            t("Joined")
                          ) : (
                            t("Join Guild")
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* --- TAB VIEW 3: EVENTS WORKSPACE --- */}
      {activeTab === 'events' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4 justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-extrabold text-white tracking-tight">{t("My Registered Events")}</h2>
            </div>
            <button 
              onClick={() => navigate('/explore')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer animate-fade-in"
            >
              + {t("Browse Events")}
            </button>
          </div>

          {eventsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800/60 rounded-2xl text-slate-500 space-y-3">
              <Calendar className="w-8 h-8 mx-auto text-slate-700" />
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t("No Registered Events")}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{t("You have not registered for any upcoming missions yet. Head over to the Explore Missions feed to find events.")}</p>
            </div>
          ) : (() => {
            const today = new Date();
            const upcoming = events.filter(e => new Date(e.date) >= today);
            const completed = events.filter(e => new Date(e.date) < today);
            const totalHours = completed.length * 3;

            return (
              <div className="space-y-6">
                {/* Metrics Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Upcoming Events")}</span>
                    <span className="text-xl font-black text-blue-400 block mt-0.5">{upcoming.length}</span>
                  </div>
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Completed Events")}</span>
                    <span className="text-xl font-black text-emerald-400 block mt-0.5">{completed.length}</span>
                  </div>
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left">
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Volunteer Hours Logged")}</span>
                    <span className="text-xl font-black text-brand-300 block mt-0.5">{totalHours} {t("hours")}</span>
                  </div>
                </div>

                {/* Event list */}
                <div className="space-y-4">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">{t("Participation History")}</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((evt) => {
                      const isUpcoming = new Date(evt.date) >= today;
                      return (
                        <div 
                          key={evt.id}
                          onClick={() => navigate(`/event/${evt.id}`)}
                          className="glass p-4 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all flex gap-4 text-left items-start cursor-pointer hover:bg-slate-900/10"
                        >
                          <img 
                            src={evt.imageUrl} 
                            alt={evt.title} 
                            className="w-16 h-16 rounded-xl object-cover border border-slate-800/80 shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] text-brand-300 font-bold uppercase tracking-wider block">{t(evt.category)}</span>
                              <span className={`px-2 py-0.2 rounded-full border text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                                isUpcoming 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {isUpcoming ? t("Upcoming") : t("Completed")}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-white truncate">{t(evt.title)}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{t(evt.location)}</p>
                            
                            <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1.5 border-t border-slate-900">
                              <span>Date: {evt.date}</span>
                              <span className="font-bold">Status: {isUpcoming ? 'Enrolled' : 'Attended'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* --- TAB VIEW 4: AI ASSISTANT --- */}
      {activeTab === 'ai' && (
        <section className="glass rounded-3xl p-6 border border-slate-800/60 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <Sparkles className="w-5 h-5 text-brand-400 animate-pulse" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">AI Assistant Portal</h2>
          </div>
          <div className="p-8 text-center bg-slate-950/20 border border-slate-800/60 rounded-2xl space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-brand-400 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Consult Gemini Advisor</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our floating AI Assistant is docked in the lower right of your screen. 
              Click on the chat bubble to query hazard regulations, verify report priority, or request neighborhood tips!
            </p>
          </div>
        </section>
      )}

      {/* --- TAB VIEW 5: DOCUMENTS & VERIFICATION --- */}
      {activeTab === 'documents' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-2 text-left w-full">
              <FileText className="w-5 h-5 text-brand-400" />
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight">Verification Documents</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Verified Profile Status: <span className="text-brand-350">{verifiedStatus}</span></p>
              </div>
            </div>
            {verifiedStatus === 'Not Verified' && (
              <button 
                onClick={handleRequestVerification}
                disabled={documents.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Submit Verification Request
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1: Document Upload Simulator */}
            <div className="md:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/35 border border-slate-800/60 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload Certificates</span>
                </h3>
                
                <form onSubmit={handleDocUploadSimulate} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Select File (PDF, PNG, JPG)</label>
                    <input 
                      type="file"
                      required
                      accept="application/pdf, image/png, image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedUploadFile(file);
                      }}
                      className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-brand-500 cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Category Type</label>
                    <select
                      value={uploadFile.category}
                      onChange={(e) => setUploadFile({ ...uploadFile, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-brand-500"
                    >
                      <option value="Aadhar Card">Aadhar Card (UIDAI Identity)</option>
                      <option value="PAN Card">PAN Card (Income Tax Identity)</option>
                      <option value="Ration Card">Ration Card (Address/Food Card)</option>
                      <option value="Voter ID">Voter ID (Election Registry)</option>
                      <option value="Driving License">Driving License (State Transport)</option>
                      <option value="Residency Proof">Residency Proof (Utility Bill/Certificate)</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    disabled={uploading}
                    className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-blue-400 hover:text-blue-300 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {uploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload Document File</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Column 2: Documents list */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider"> {t("Uploaded Certificates")} ({documents.length}) </h3>
              
              {docsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800/60 rounded-xl text-slate-550 text-xs">{t("No verification documents uploaded. Please upload a scan of your Government ID and address bill.")}</div>
              ) : (
                <div className="space-y-3.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/60 hover:border-slate-800 transition-all flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 bg-slate-900 rounded-xl text-brand-350 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="text-xs font-bold text-slate-200 truncate leading-snug">{doc.name}</h4>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
                            <span>{doc.category}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {doc.fileData && (
                          <a 
                            href={doc.fileData}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-blue-400 hover:text-blue-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >{t("Open File")}</a>
                        )}

                        <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shrink-0 ${
                          doc.status === 'Verified' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                        
                        <button 
                          onClick={() => handleDocDelete(doc.id)}
                          className="p-1.5 hover:bg-rose-955/20 border border-transparent hover:border-rose-900/30 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </section>
      )}

      {/* --- TAB VIEW 6: MESSAGES PORTAL --- */}
      {activeTab === 'messages' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <MessageSquare className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">{t("Messages Inbox")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[300px]">
            {/* Folders column */}
            <div className="md:col-span-1 border-r border-slate-800/60 pr-4 space-y-1.5 flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">{t("Mailboxes")}</span>
              {['Inbox', 'Sent Mail', 'Archived', 'Spam Alerts'].map((box, idx) => (
                <button 
                  key={idx} 
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${
                    idx === 0 ? 'bg-slate-900 border border-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900/30'
                  }`}
                >
                  {box}
                </button>
              ))}
            </div>

            {/* Conversation detail list */}
            <div className="md:col-span-3 flex flex-col justify-center items-center text-slate-500 space-y-2.5">
              <MessageSquare className="w-8 h-8 text-slate-700" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("Mailbox Empty")}</h3>
              <p className="text-[10px] text-slate-500 text-center max-w-sm">{t("No municipal correspondence messages found in your inbox database.")}</p>
            </div>
          </div>
        </section>
      )}

      {/* --- TAB VIEW 7: SECURITY CENTER --- */}
      {activeTab === 'security' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-8">
          
          <div className="border-b border-slate-800/60 pb-4 flex items-center gap-2 text-left">
            <Shield className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{t("Security Configurations")}</h2>
              <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">{t("Protect and verify account access credentials")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Password reset & 2FA toggles */}
            <div className="space-y-6">
              
              {/* 2FA Panel - Coming Soon */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4 text-left relative overflow-hidden group">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 shrink-0">
                    <Smartphone className="w-5 h-5 text-blue-450 animate-pulse" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        {t("Two-Factor Authentication")}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full bg-slate-800 text-[8px] font-bold text-slate-400 border border-slate-700">
                        {t("Coming Soon")}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {t("Add a secondary layer of authentication checks. Verify login attempts using generated mobile security codes. This feature will be enabled in a future release.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>{t("Update Password")}</span>
                </h3>

                <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Current Password")}</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={passwords.oldPassword}
                        onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("New Password")}</label>
                      <input 
                        type="password"
                        required
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Confirm Password")}</label>
                      <input 
                        type="password"
                        required
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="py-2 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ml-auto block"
                  >{t("Change Credentials")}</button>
                </form>
              </div>

            </div>

            {/* Column 2: Logins & Device history logs */}
            <div className="space-y-6">
              
              {/* Active logins */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>{t("Active Device Sessions")}</span>
                </h3>
                
                <div className="divide-y divide-slate-800/40 text-xs">
                  {(user.security?.activeDevices || [
                    { id: 'ad1', device: 'Chrome / Windows 10', location: 'California, USA', activeNow: true }
                  ]).map(d => (
                    <div key={d.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div>
                        <span className="font-extrabold text-slate-200 block leading-tight">{d.device}</span>
                        <span className="text-[9px] text-slate-550 block mt-0.5 font-bold uppercase tracking-wider">{d.location}</span>
                      </div>
                      
                      {d.activeNow ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-[8px] font-black uppercase tracking-widest shrink-0">{t("Active Now")}</span>
                      ) : (
                        <button className="text-[9px] font-extrabold text-rose-455 hover:underline cursor-pointer">{t("Revoke")}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Login history log */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{t("Login History Audit Logs")}</span>
                </h3>

                <div className="divide-y divide-slate-800/40 text-[10px] space-y-0.5">
                  {(user.security?.loginActivity || [
                    { id: 'l1', device: 'Chrome / Windows 10', time: new Date().toLocaleString(), status: 'Success' }
                  ]).map(log => (
                    <div key={log.id} className="py-2 flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-300 block truncate leading-none">{log.device}</span>
                        <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">{log.time}</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[7px] font-black uppercase tracking-widest shrink-0">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected accounts */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border-slate-800/60 border space-y-3 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{t("Linked Auth Accounts")}</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-xs">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-extrabold text-slate-300">Google:</span>
                    <span className="text-emerald-450 font-bold">Linked</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-xs">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-extrabold text-slate-350">GitHub:</span>
                    <span className="text-slate-500 font-semibold">Not Linked</span>
                  </div>
                </div>
              </div>

              {/* Destructive Delete Button */}
              <div className="p-5 border border-rose-900/30 bg-rose-955/5 rounded-2xl text-left space-y-3">
                <h3 className="text-xs font-black text-rose-455 uppercase tracking-wider">{t("Administrative Zone")}</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed">{t("Permanently erase account information, hazard reports history, achievements badges, and volunteer records. This process is irreversible.")}</p>
                <button className="py-2.5 px-4 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 text-rose-455 rounded-xl text-xs font-bold transition-all cursor-pointer">{t("Delete Account Registry")}</button>
              </div>

            </div>
          </div>

        </section>
      )}

      {/* --- TAB VIEW 8: USER PREFERENCES --- */}
      {activeTab === 'settings' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-8">
          
          <div className="border-b border-slate-800/60 pb-4 flex items-center gap-2 text-left">
            <Settings className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{t("System Preferences")}</h2>
              <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">{t("Configure theme look, translation languages, and system alert updates")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-xs">
            {/* Column 1: Language & Theme selectors */}
            <div className="space-y-6">
              
              {/* Language Selector */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>{t("Interface Localization Language")}</span>
                </h3>
                <select
                  value={prefs.language}
                  onChange={(e) => handlePreferenceToggle('language', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-brand-500"
                >
                  <option value="en">English (Default)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>

              {/* Theme Settings */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>{t("Display Theme Palette")}</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'system'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => handlePreferenceToggle('theme', mode)}
                      className={`py-2 px-3 rounded-lg border text-center font-bold capitalize transition-colors cursor-pointer ${
                        prefs.theme === mode
                          ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                          : 'bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility UI Removed */}

            </div>

            {/* Column 2: Notification checkboxes */}
            <div className="space-y-6">
              
              {/* Notification Toggles */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
                  <BellRing className="w-4 h-4 text-blue-400" />
                  <span>{t("Notification Preferences")}</span>
                </h3>
                
                <div className="space-y-3.5">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive community summaries and verification updates via email.' },
                    { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Direct mobile texts for urgent neighborhood hazard alerts.' },
                    { key: 'pushNotifications', label: 'Web Push Notifications', desc: 'Real-time browser notifications for message replies.' },
                    { key: 'announcements', label: 'System Announcements', desc: 'Get official government administrative announcements.' },
                    { key: 'eventUpdates', label: 'Registered Event Reminders', desc: 'Reminders 24 hours prior to volunteer missions.' }
                  ].map(item => (
                    <label key={item.key} className="flex gap-3 cursor-pointer items-start p-2 hover:bg-slate-900/20 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={prefs[item.key] || false}
                        onChange={(e) => handlePreferenceToggle(item.key, e.target.checked)}
                        className="mt-1 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-extrabold text-slate-200">{item.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </section>
      )}

      {/* Community Detail Side Drawer Panel */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-955/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCommunity(null)}>
          <div 
            className="w-full max-w-lg h-full bg-[#0b0f19]/95 border-l border-slate-850 shadow-2xl relative flex flex-col justify-between overflow-y-auto animate-slide-left p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedCommunity.logo} 
                  alt={selectedCommunity.name} 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
                />
                <div className="text-left">
                  <span className="text-[10px] text-brand-300 font-bold uppercase tracking-wider">{t(selectedCommunity.ngo)}</span>
                  <h2 className="text-base font-extrabold text-white leading-tight">{t(selectedCommunity.name)}</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedCommunity(null)}
                className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin text-left">
              {/* Cover Banner */}
              <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-850 shadow-md">
                <img 
                  src={selectedCommunity.cover} 
                  alt={selectedCommunity.name} 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-bold">{t("Success Rate")}</span>
                  <span className="font-bold text-white">{selectedCommunity.successRate}%</span>
                </div>
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-bold">{t("Contribution Score")}</span>
                  <span className="font-bold text-white">{selectedCommunity.contributionScore}%</span>
                </div>
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-bold">{t("Active / Total Volunteers")}</span>
                  <span className="font-bold text-white">{selectedCommunity.activeVolunteers} / {selectedCommunity.volunteers}</span>
                </div>
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-bold">{t("Issues Resolved")}</span>
                  <span className="font-bold text-white">{selectedCommunity.solved}</span>
                </div>
              </div>

              {/* Mission Statement */}
              <div className="space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Our Mission")}</span>
                <p className="text-slate-200 text-xs leading-relaxed font-semibold italic">"{t(selectedCommunity.mission)}"</p>
              </div>

              {/* History */}
              <div className="space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Background & History")}</span>
                <p className="text-slate-405 text-xs leading-relaxed">{t(selectedCommunity.history)}</p>
              </div>

              {/* Achievements */}
              <div className="space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Major Achievements")}</span>
                <p className="text-slate-405 text-xs leading-relaxed">{t(selectedCommunity.achievements)}</p>
              </div>

              {/* Partnerships */}
              <div className="space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Government / Department Partnerships")}</span>
                <p className="text-slate-300 text-xs font-semibold">{t(selectedCommunity.partnerships)}</p>
              </div>

              {/* Contact Information */}
              <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-xs space-y-1">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Contact Details")}</span>
                <div><span className="text-slate-500">{t("Email:")}</span> <span className="font-semibold text-blue-400">{selectedCommunity.contact}</span></div>
                <div><span className="text-slate-500">{t("Location:")}</span> <span className="font-semibold text-slate-300">{t(selectedCommunity.location)}</span></div>
              </div>

              {/* Gallery Grid */}
              <div className="space-y-2">
                <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Mission Photo Gallery")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCommunity.gallery.map((imgUrl, i) => (
                    <img 
                      key={i} 
                      src={imgUrl} 
                      alt="Gallery" 
                      className="w-full h-24 object-cover rounded-xl border border-slate-850"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Action Join Button in Drawer Footer */}
            <div className="border-t border-slate-850 pt-4">
              <button
                onClick={() => {
                  handleJoinCommunity(selectedCommunity.id, selectedCommunity.name);
                  setSelectedCommunity(null);
                }}
                disabled={user?.joinedCommunities?.includes(selectedCommunity.id) || joiningCommId === selectedCommunity.id}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                  user?.joinedCommunities?.includes(selectedCommunity.id)
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                }`}
              >
                {user?.joinedCommunities?.includes(selectedCommunity.id) ? t("Joined / Member") : t("Join Active Guild")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Details Popup Modal (Reports Tab) */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm animate-fade-in" onClick={() => setEditingReport(null)}>
          <form 
            onSubmit={handleUpdateReport}
            className="w-full max-w-lg bg-[#0b0f19]/95 border border-slate-855 shadow-2xl rounded-3xl relative flex flex-col overflow-hidden animate-scale-up p-6 space-y-4 text-left"
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
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">{t("Severity Level")}</label>
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
                {updatingReportLoading ? t("Saving...") : t("Save Changes")}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
