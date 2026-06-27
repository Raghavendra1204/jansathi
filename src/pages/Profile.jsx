import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Award, Clock, Shield, Sparkles, CheckCircle2, History, AlertCircle, Loader, 
  User, Mail, Phone, MapPin, Edit3, Save, X, ToggleLeft, ToggleRight, Smartphone, 
  Key, Globe, BellRing, Eye, EyeOff, LayoutDashboard, Users, Calendar, 
  MessageSquare, FileText, Settings, ShieldCheck, HelpCircle, Upload, Check, Trash2 
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { 
  fetchNotifications, fetchDocuments, uploadDocument, deleteDocument, updateUserProfile, addNotification, logUserActivity 
} from '../services/api';

export default function Profile() {
  const { user, loading, refetchUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const navigate = useNavigate();

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

  // Change Password Mock
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
    try {
      await logUserActivity(user.uid, 'Security credentials audit: Changed profile login password', 10);
      triggerSuccessAlert('Account credentials updated successfully.');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      if (refetchUser) await refetchUser();
    } catch (err) {
      triggerErrorAlert('Failed to log security updates.');
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

        await uploadDocument(selectedUploadFile.name, uploadFile.category, sizeStr, base64Content);
        await logUserActivity(user.uid, `Uploaded document: ${selectedUploadFile.name} (${uploadFile.category})`, 25);
        
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
                  <label className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    Upload
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {user.avatar && (
                    <button 
                      onClick={handleAvatarRemove}
                      className="text-[10px] font-bold text-rose-455 hover:text-rose-400 hover:underline cursor-pointer bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Details Block */}
              <div className="flex-1 space-y-5 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-bold uppercase tracking-wider">
                        Level {level} {user.role || 'Citizen'}
                      </span>
                      {verifiedStatus === 'OC Verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3" />
                          OC Verified
                        </span>
                      ) : verifiedStatus === 'Pending Verification' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                          Pending Verification
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/40 text-slate-400 border border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                          Not Verified
                        </span>
                      )}
                    </div>
                    
                    {!editMode ? (
                      <>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                          <span>{user.name}</span>
                        </h1>
                        <p className="text-slate-500 text-xs mt-1.5 flex items-center justify-center sm:justify-start gap-1 font-semibold uppercase tracking-wider">
                          Unique ID: <span className="text-slate-300">{user.uniqueId || 'JS-MOCK'}</span>
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Editing profile details...</span>
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
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Credentials</span>
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
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</span>
                        <span className="font-semibold block text-slate-200 truncate">{user.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phone Contact</span>
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phone Contact</label>
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
                      <span>Save Changes</span>
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
                      <span className="text-lg font-black text-slate-200 mt-1 block">3 Communities</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/60">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Requests</span>
                      <span className="text-lg font-black text-slate-200 mt-1 block">{reportsSubmitted} Issues</span>
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
                      { id: 'act-01', title: 'Joined JaanSathi Digital Portal', date: user.createdAt, xpReward: 10 },
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

      {/* --- TAB VIEW 2: COMMUNITIES WORKSPACE --- */}
      {activeTab === 'communities' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <Users className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">Communities Directory</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'c1', name: 'Downtown Infrastructure Hub', count: '142 members', category: 'Infrastructure', desc: 'Working with municipal engineers to fix roads, signposts, and public buildings.' },
              { id: 'c2', name: 'Neighborhood Watch Council', count: '94 members', category: 'Roads & Safety', desc: 'Citizen patrol and safety hazards identification for local police dispatchers.' },
              { id: 'c3', name: 'Sanitation Eco Volunteers', count: '180 members', category: 'Sanitation', desc: 'Organizing weekend trash cleanups and public trashcan distribution.' }
            ].map(group => (
              <div key={group.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 shadow-md flex flex-col justify-between hover:border-slate-800 transition-all">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-350 border border-brand-500/20 text-[9px] font-black uppercase tracking-wider">{group.category}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{group.count}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-snug">{group.name}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{group.desc}</p>
                </div>
                <button className="w-full mt-5 py-2 bg-slate-800 border border-slate-800 hover:bg-brand-500 hover:border-brand-600 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
                  Joined Municipal Hub
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- TAB VIEW 3: EVENTS WORKSPACE --- */}
      {activeTab === 'events' && (
        <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
            <Calendar className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">Active Volunteering Engagements</h2>
          </div>
          
          <div className="p-12 text-center border border-dashed border-slate-800/60 rounded-2xl text-slate-500 space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-slate-700" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">No Registered Events</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">You have not registered for any upcoming missions yet. Head over to the Explore Missions feed to find events.</p>
            <button 
              onClick={() => navigate('/explore')}
              className="mt-2 py-2 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
            >
              Browse Active Missions
            </button>
          </div>
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
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Uploaded Certificates ({documents.length})</h3>
              
              {docsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800/60 rounded-xl text-slate-550 text-xs">
                  No verification documents uploaded. Please upload a scan of your Government ID and address bill.
                </div>
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
                          >
                            Open File
                          </a>
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
            <h2 className="text-lg font-extrabold text-white tracking-tight">Messages Inbox</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[300px]">
            {/* Folders column */}
            <div className="md:col-span-1 border-r border-slate-800/60 pr-4 space-y-1.5 flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Mailboxes</span>
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
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Mailbox Empty</h3>
              <p className="text-[10px] text-slate-500 text-center max-w-sm">No municipal correspondence messages found in your inbox database.</p>
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
              <h2 className="text-lg font-extrabold text-white tracking-tight">Security Configurations</h2>
              <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Protect and verify account access credentials</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Password reset & 2FA toggles */}
            <div className="space-y-6">
              
              {/* 2FA Panel */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 text-left">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span>Two-Factor Authentication (2FA)</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed pr-6">
                      Add a secondary layer of authentication checks. Verify login attempts using generated security codes.
                    </p>
                  </div>

                  <button 
                    onClick={handle2FAToggle}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  >
                    {user.security?.twoFactorActive ? (
                      <ToggleRight className="w-9 h-9 text-emerald-450" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-600" />
                    )}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                    user.security?.twoFactorActive 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-450'
                      : 'bg-slate-900 border-slate-800/60 text-slate-400'
                  }`}>
                    Status: {user.security?.twoFactorActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Password update form */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>Update Password</span>
                </h3>

                <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Password</label>
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
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">New Password</label>
                      <input 
                        type="password"
                        required
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Confirm Password</label>
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
                  >
                    Change Credentials
                  </button>
                </form>
              </div>

            </div>

            {/* Column 2: Logins & Device history logs */}
            <div className="space-y-6">
              
              {/* Active logins */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Active Device Sessions</span>
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
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-[8px] font-black uppercase tracking-widest shrink-0">
                          Active Now
                        </span>
                      ) : (
                        <button className="text-[9px] font-extrabold text-rose-455 hover:underline cursor-pointer">
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Login history log */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Login History Audit Logs</span>
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
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Linked Auth Accounts</h3>
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
                <h3 className="text-xs font-black text-rose-455 uppercase tracking-wider">Administrative Zone</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Permanently erase account information, hazard reports history, achievements badges, and volunteer records. This process is irreversible.
                </p>
                <button className="py-2.5 px-4 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 text-rose-455 rounded-xl text-xs font-bold transition-all cursor-pointer">
                  Delete Account Registry
                </button>
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
              <h2 className="text-lg font-extrabold text-white tracking-tight">System Preferences</h2>
              <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Configure theme look, translation languages, and system alert updates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-xs">
            {/* Column 1: Language & Theme selectors */}
            <div className="space-y-6">
              
              {/* Language Selector */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Interface Localization Language</span>
                </h3>
                <select
                  value={prefs.language}
                  onChange={(e) => handlePreferenceToggle('language', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-brand-500"
                >
                  <option value="en">English (US Default)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              {/* Theme Settings */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>Display Theme Palette</span>
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

              {/* Accessibility */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-3 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Accessibility Controls</h3>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold cursor-pointer">
                    <input type="checkbox" className="rounded bg-slate-950 border-slate-800 focus:ring-0 text-blue-650" />
                    <span>High Contrast UI elements</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold cursor-pointer">
                    <input type="checkbox" className="rounded bg-slate-950 border-slate-800 focus:ring-0 text-blue-650" />
                    <span>Reduce visual graphics animations</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Column 2: Notification checkboxes */}
            <div className="space-y-6">
              
              {/* Notification Toggles */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
                  <BellRing className="w-4 h-4 text-blue-400" />
                  <span>Notification Preferences</span>
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

    </div>
  );
}
