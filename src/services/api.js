import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  query, 
  orderBy, 
  limit, 
  arrayUnion 
} from 'firebase/firestore';
import { db, isMockFirebase } from '../firebase/config';

// API services for Jan Sathi database

// --- CENTRALIZED XP REWARD SYSTEM ---
/**
 * Awards XP to a user for a civic action.
 * - Updates users/{uid} xp, level, nextLevelXp in Firestore
 * - Writes a record to xp_log collection
 * - Fires 'xp-awarded' window event to trigger XPToast popup
 * - Adds entry to activity log
 */
export async function awardXP(uid, amount, action, relatedId = '') {
  if (!uid || !amount || amount <= 0) return null;

  // Fire the toast popup event immediately (UI feedback)
  window.dispatchEvent(new CustomEvent('xp-awarded', { detail: { amount, action } }));

  if (isMockFirebase) {
    const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const user = users[uid] || currentSession;
    if (!user) return null;

    const prevXp = user.xp || 0;
    let newXp = prevXp + amount;
    let newLevel = user.level || 1;
    let newNextLevelXp = user.nextLevelXp || 1000;

    // Level up logic
    while (newXp >= newNextLevelXp) {
      newXp -= newNextLevelXp;
      newLevel += 1;
      newNextLevelXp = newLevel * 1000;

      // Level up notification
      const notifications = JSON.parse(localStorage.getItem('jan_sathi_notifications') || '[]');
      notifications.unshift({
        id: `n-lvl-${Date.now()}`,
        category: 'System Announcements',
        title: `Level Up! You reached Level ${newLevel}`,
        message: `Congratulations! You have reached Level ${newLevel} in the Jan Sathi Citizen Guild. Keep contributing to your community!`,
        time: 'Just now',
        read: false,
        userId: uid
      });
      localStorage.setItem('jan_sathi_notifications', JSON.stringify(notifications));
    }

    // XP gain notification
    const xpNotifications = JSON.parse(localStorage.getItem('jan_sathi_notifications') || '[]');
    xpNotifications.unshift({
      id: `n-xp-${Date.now()}`,
      category: 'XP Rewards',
      title: `+${amount} XP Earned`,
      message: `You earned ${amount} XP for: ${action}. Your total XP is now ${newXp}.`,
      time: 'Just now',
      read: false,
      userId: uid
    });
    localStorage.setItem('jan_sathi_notifications', JSON.stringify(xpNotifications));

    // Update user XP
    const updatedUser = { ...user, xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp };
    if (users[uid]) {
      users[uid] = { ...users[uid], xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp };
      localStorage.setItem('mock_users', JSON.stringify(users));
    }

    // Update active session if this is the logged-in user
    if (currentSession.uid === uid) {
      const sessionUpdate = { ...currentSession, xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp };
      localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
      window.dispatchEvent(new Event('mock-auth-state-change'));
      window.dispatchEvent(new Event('refresh-notifications'));
    }

    // Write to xp_log mock
    const xpLog = JSON.parse(localStorage.getItem('jan_sathi_xp_log') || '[]');
    xpLog.unshift({
      id: `xp-log-${Date.now()}`,
      userId: uid,
      userName: user.name || 'Citizen',
      action,
      xpAwarded: amount,
      timestamp: new Date().toISOString(),
      relatedId
    });
    localStorage.setItem('jan_sathi_xp_log', JSON.stringify(xpLog));

    // Also add to activity timeline
    const actLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
    actLogs.unshift({
      id: `act-${Date.now()}`,
      userId: uid,
      userName: user.name || 'Citizen',
      type: 'XP Reward',
      title: `+${amount} XP — ${action}`,
      description: `Earned ${amount} XP for: ${action}`,
      xpEarned: amount,
      xpReward: amount,
      status: 'Completed',
      date: new Date().toISOString(),
      relatedResourceId: relatedId
    });
    localStorage.setItem('mock_activity_logs', JSON.stringify(actLogs));

    // Also update impactTimeline on user
    if (users[uid]) {
      if (!users[uid].impactTimeline) users[uid].impactTimeline = [];
      users[uid].impactTimeline.unshift({
        id: `act-${Date.now()}`,
        title: `+${amount} XP — ${action}`,
        date: new Date().toISOString(),
        xpReward: amount,
        type: 'XP Reward',
        description: `Earned ${amount} XP for: ${action}`,
        status: 'Completed',
        relatedResourceId: relatedId
      });
      localStorage.setItem('mock_users', JSON.stringify(users));
    }

    return updatedUser;
  }

  // Real Firestore mode
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    let xp = 0, level = 1, nextLevelXp = 1000, userName = 'Citizen';

    if (userSnap.exists()) {
      const data = userSnap.data();
      xp = data.xp || 0;
      level = data.level || 1;
      nextLevelXp = data.nextLevelXp || 1000;
      userName = data.name || 'Citizen';
    }

    let newXp = xp + amount;
    let newLevel = level;
    let newNextLevelXp = nextLevelXp;

    while (newXp >= newNextLevelXp) {
      newXp -= newNextLevelXp;
      newLevel += 1;
      newNextLevelXp = newLevel * 1000;
    }

    // Update user doc
    await setDoc(userRef, { xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp }, { merge: true });

    // Write to xp_log collection
    await addDoc(collection(db, 'xp_log'), {
      userId: uid,
      userName,
      action,
      xpAwarded: amount,
      timestamp: new Date().toISOString(),
      relatedId
    });

    // Write to activityLogs collection
    await addDoc(collection(db, 'activityLogs'), {
      userId: uid,
      userName,
      type: 'XP Reward',
      description: `Earned ${amount} XP for: ${action}`,
      xpEarned: amount,
      status: 'Completed',
      timestamp: new Date().toISOString(),
      relatedResourceId: relatedId
    });

    // Add notification to Firestore
    await addDoc(collection(db, 'notifications'), {
      userId: uid,
      category: 'XP Rewards',
      title: `+${amount} XP Earned`,
      message: `You earned ${amount} XP for: ${action}. Your total XP is now ${newXp}.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Update active session
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    if (currentSession.uid === uid) {
      const sessionUpdate = { ...currentSession, xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp };
      localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
      window.dispatchEvent(new Event('mock-auth-state-change'));
      window.dispatchEvent(new Event('refresh-notifications'));
    }

    return { uid, xp: newXp, level: newLevel, nextLevelXp: newNextLevelXp };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return null;
  }
}



const MOCK_MISSIONS = [
  {
    id: 'm1',
    title: 'Green Space Clean Up',
    category: 'Environment',
    description: 'Help restore the local city park by clearing plastic waste, weeding gardens, and planting native wildflowers.',
    location: 'Central Park East',
    date: '2026-07-12',
    time: '09:00 AM - 01:00 PM',
    xpReward: 250,
    spotsTotal: 15,
    spotsFilled: 9,
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    organizer: 'Park Preservation Club'
  },
  {
    id: 'm2',
    title: 'Tech Training for Seniors',
    category: 'Education',
    description: 'Teach local senior citizens how to use smartphones, send emails, make video calls, and browse the web safely.',
    location: 'Community Senior Center',
    date: '2026-07-15',
    time: '02:00 PM - 04:30 PM',
    xpReward: 300,
    spotsTotal: 8,
    spotsFilled: 6,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    organizer: 'Digital Literacy Initiative'
  },
  {
    id: 'm3',
    title: 'Community Food Drive',
    category: 'Social Help',
    description: 'Sort and package donated non-perishable goods at the neighborhood food bank for distribution to families in need.',
    location: 'Hope Food Pantry',
    date: '2026-07-18',
    time: '10:00 AM - 02:00 PM',
    xpReward: 200,
    spotsTotal: 20,
    spotsFilled: 18,
    imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800',
    organizer: 'Unity Food Bank'
  }
];

const MOCK_HEROES = [
  {
    id: 'h1',
    name: 'Sarah Jenkins',
    badge: 'Eco Guardian',
    xp: 4200,
    missionsCount: 18,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 'h2',
    name: 'Marcus Chen',
    badge: 'Code & Mentor',
    xp: 3850,
    missionsCount: 14,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 'h3',
    name: 'Elena Rostova',
    badge: 'Food Rescue Specialist',
    xp: 3100,
    missionsCount: 12,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
  }
];

const DEFAULT_REPORTS = [];

// Initialize local storage database
const getStoredReports = () => {
  try {
    const data = localStorage.getItem('jan_sathi_reports');
    if (!data) {
      localStorage.setItem('jan_sathi_reports', JSON.stringify(DEFAULT_REPORTS));
      return DEFAULT_REPORTS;
    }
    
    let reports = JSON.parse(data);
    let updated = false;
    
    // Database Migration: Ensure all reports have valid coordinates and valid image URLs
    reports = reports.map(r => {
      let isChanged = false;
      if (r.lat === undefined || r.lng === undefined) {
        r.lat = 12.9716 + (Math.random() - 0.5) * 0.15;
        r.lng = 77.5946 + (Math.random() - 0.5) * 0.15;
        isChanged = true;
      }
      if (r.imageUrl && r.imageUrl.startsWith('blob:')) {
        r.imageUrl = 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800';
        isChanged = true;
      }
      if (isChanged) {
        updated = true;
      }
      return r;
    });

    if (updated) {
      localStorage.setItem('jan_sathi_reports', JSON.stringify(reports));
    }
    return reports;
  } catch {
    return DEFAULT_REPORTS;
  }
};

const saveStoredReports = (reports) => {
  localStorage.setItem('jan_sathi_reports', JSON.stringify(reports));
};

// Initialize local storage database for missions
const getStoredMissions = () => {
  try {
    const data = localStorage.getItem('jan_sathi_missions');
    if (!data) {
      localStorage.setItem('jan_sathi_missions', JSON.stringify(MOCK_MISSIONS));
      return MOCK_MISSIONS;
    }
    return JSON.parse(data);
  } catch {
    return MOCK_MISSIONS;
  }
};

const saveStoredMissions = (missions) => {
  localStorage.setItem('jan_sathi_missions', JSON.stringify(missions));
};

const getJoinedMissions = () => {
  try {
    const data = localStorage.getItem('jan_sathi_joined_missions');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveJoinedMissions = (joined) => {
  localStorage.setItem('jan_sathi_joined_missions', JSON.stringify(joined));
};

export async function fetchMissions() {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const missions = getStoredMissions();
    const joined = getJoinedMissions();
    return missions.map(m => ({
      ...m,
      joined: joined.includes(m.id)
    }));
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'missions'));
    const missions = [];
    querySnapshot.forEach((doc) => {
      missions.push({ id: doc.id, ...doc.data() });
    });
    
    // Seed default missions into Firestore if empty
    if (missions.length === 0) {
      for (const m of MOCK_MISSIONS) {
        await setDoc(doc(db, 'missions', m.id), m);
        missions.push(m);
      }
    }
    
    const joined = getJoinedMissions();
    return missions.map(m => ({
      ...m,
      joined: joined.includes(m.id)
    }));
  } catch (error) {
    console.error("Error fetching missions from Firestore:", error);
    const missions = getStoredMissions();
    const joined = getJoinedMissions();
    return missions.map(m => ({
      ...m,
      joined: joined.includes(m.id)
    }));
  }
}

export async function fetchTopHeroes() {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_HEROES;
  }

  try {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);
    const heroes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      heroes.push({
        id: doc.id,
        name: data.name,
        badge: data.reputationLevel || 'Volunteer',
        xp: data.xp || 0,
        missionsCount: data.completedMissions || 0,
        avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      });
    });
    return heroes.length > 0 ? heroes : MOCK_HEROES;
  } catch (error) {
    console.error("Error fetching top heroes from Firestore:", error);
    return MOCK_HEROES;
  }
}

export async function joinMission(missionId) {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const joined = getJoinedMissions();
    if (joined.includes(missionId)) {
      return { success: false, message: "You have already registered for this mission!" };
    }

    const missions = getStoredMissions();
    const mIndex = missions.findIndex(m => m.id === missionId);
    if (mIndex === -1) {
      return { success: false, message: "Mission not found!" };
    }

    const mission = missions[mIndex];
    if (mission.spotsFilled >= mission.spotsTotal) {
      return { success: false, message: "This mission is already full!" };
    }

    mission.spotsFilled = Math.min(mission.spotsTotal, mission.spotsFilled + 1);
    missions[mIndex] = mission;
    saveStoredMissions(missions);

    joined.push(missionId);
    saveJoinedMissions(joined);

    // Award XP for joining a mission/event
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    if (currentSession.uid) await awardXP(currentSession.uid, 20, 'Joined Event/Mission 🌟', missionId);

    return { success: true, message: `Successfully registered for mission: ${mission.title}!` };
  }

  try {
    const docRef = doc(db, 'missions', missionId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, message: "Mission not found!" };
    }

    const mission = docSnap.data();
    if (mission.spotsFilled >= mission.spotsTotal) {
      return { success: false, message: "This mission is already full!" };
    }

    const joined = getJoinedMissions();
    if (joined.includes(missionId)) {
      return { success: false, message: "You have already registered for this mission!" };
    }

    await updateDoc(docRef, {
      spotsFilled: mission.spotsFilled + 1
    });

    joined.push(missionId);
    saveJoinedMissions(joined);

    // Award XP for joining a mission/event
    const currentSession2 = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    if (currentSession2.uid) await awardXP(currentSession2.uid, 20, 'Joined Event/Mission 🌟', missionId);

    return { success: true, message: `Successfully registered for mission: ${mission.title}!` };
  } catch (error) {
    console.error("Error joining mission in Firestore:", error);
    return { success: false, message: "Server connection failed. Try again later." };
  }
}

export async function fetchReports() {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return getStoredReports();
  }

  try {
    const q = query(collection(db, 'reports'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const reports = [];
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    return reports;
  } catch (error) {
    console.error("Error fetching reports from Firestore:", error);
    return getStoredReports();
  }
}

export async function fetchReportById(reportId) {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const reports = getStoredReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error("Report not found");
    return report;
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    throw new Error("Report not found in Firestore");
  } catch (error) {
    console.error("Error fetching report by ID:", error);
    throw error;
  }
}


/**
 * Creates a new report and appends it to storage.
 */
export async function createReport(title, category, location, description, imageUrl, reporterName, reporterAvatar = null, priorityScore = 20, severity = 'Low', lat = 12.9716, lng = 77.5946) {
  const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
  const uid = currentSession.uid || 'unknown_user';

  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const reports = getStoredReports();
    const newReport = {
      id: `rep-${Date.now()}`,
      userId: uid,
      title,
      category,
      location,
      date: new Date().toISOString().split('T')[0],
      reporterName,
      reporterAvatar: reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      description,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
      upvotes: 1,
      downvotes: 0,
      priorityScore,
      severity,
      status: 'Pending',
      votedUsers: {},
      comments: [],
      lat,
      lng
    };

    reports.unshift(newReport);
    saveStoredReports(reports);

    // Trigger Notification
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `n-rep-${Date.now()}`,
      category: 'Community Updates',
      title: 'New Civic Report Filed',
      message: `A new community issue "${title}" has been registered in the "${category}" category.`,
      time: 'Just now',
      read: false
    });
    saveStoredNotifications(notifications);
    window.dispatchEvent(new Event('refresh-notifications'));

    // Award XP for reporting an issue
    await awardXP(uid, 100, 'Issue Reported 🗺️', newReport.id);

    return newReport;
  }

  try {
    const { auth } = await import('../firebase/config');
    const newReport = {
      userId: auth.currentUser?.uid || uid,
      title,
      category,
      location,
      date: new Date().toISOString().split('T')[0],
      reporterName,
      reporterAvatar: reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      description,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
      upvotes: 1,
      downvotes: 0,
      priorityScore,
      severity,
      status: 'Pending',
      votedUsers: {},
      comments: [],
      lat,
      lng
    };

    const docRef = await addDoc(collection(db, 'reports'), newReport);
    const createdReport = { id: docRef.id, ...newReport };
    // Award XP for reporting an issue
    await awardXP(auth.currentUser?.uid || uid, 100, 'Issue Reported 🗺️', docRef.id);
    return createdReport;
  } catch (error) {
    console.error("Error creating report in Firestore:", error);
    throw error;
  }
}

export async function deleteReport(reportId) {
  if (isMockFirebase) {
    const reports = getStoredReports();
    const filtered = reports.filter(r => r.id !== reportId);
    saveStoredReports(filtered);
    return { success: true };
  }

  try {
    const { db } = await import('../firebase/config');
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'reports', reportId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
}

export async function updateReport(reportId, updatedData) {
  const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
  const uid = currentSession.uid || 'unknown_user';

  const editTag = {
    edited: true,
    editedAt: new Date().toISOString()
  };

  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const localReports = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
    const idx = localReports.findIndex(r => r.id === reportId);
    let result = {};
    if (idx !== -1) {
      localReports[idx] = {
        ...localReports[idx],
        ...updatedData,
        ...editTag
      };
      localStorage.setItem('jan_sathi_reports', JSON.stringify(localReports));
      result = localReports[idx];
    }
    
    await logUserActivity(uid, `Edited report: ${updatedData.title || reportId}`, 15, 'Report Edited', `Edited incident submission details: ${updatedData.title || reportId}`, 'Completed');
    return { id: reportId, ...result };
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await setDoc(docRef, {
      ...updatedData,
      ...editTag
    }, { merge: true });

    await logUserActivity(uid, `Edited report: ${updatedData.title || reportId}`, 15, 'Report Edited', `Edited incident submission details: ${updatedData.title || reportId}`, 'Completed');

    return { id: reportId, ...updatedData, ...editTag };
  } catch (error) {
    console.error("Error updating report in Firestore:", error);
    throw error;
  }
}

export async function voteReport(reportId, userId, voteType) {
  if (isMockFirebase) {
    const reports = getStoredReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) throw new Error("Report not found");

    const report = reports[reportIndex];
    if (!report.votedUsers) report.votedUsers = {};

    const currentVote = report.votedUsers[userId];
    let actionText = '';

    if (currentVote === voteType) {
      // Undo vote if clicking same button
      delete report.votedUsers[userId];
      if (voteType === 'up') {
        report.upvotes = Math.max(0, report.upvotes - 1);
        actionText = 'removed their upvote from';
      }
      if (voteType === 'down') {
        report.downvotes = Math.max(0, report.downvotes - 1);
        actionText = 'removed their downvote from';
      }
    } else {
      // Undo old opposite vote if exists
      if (currentVote === 'up') report.upvotes = Math.max(0, report.upvotes - 1);
      if (currentVote === 'down') report.downvotes = Math.max(0, report.downvotes - 1);

      // Apply new vote
      report.votedUsers[userId] = voteType;
      if (voteType === 'up') {
        report.upvotes += 1;
        actionText = 'upvoted';
      }
      if (voteType === 'down') {
        report.downvotes += 1;
        actionText = 'downvoted';
      }
    }

    reports[reportIndex] = report;
    saveStoredReports(reports);

    // Trigger Notification
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `n-vote-${Date.now()}`,
      category: 'Community Updates',
      title: voteType === 'up' ? 'New Post Upvote Received' : 'New Post Downvote Received',
      message: `Your report "${report.title}" has been ${actionText} by a community member. Total votes score is now ${report.upvotes - report.downvotes}.`,
      time: 'Just now',
      read: false
    });
    saveStoredNotifications(notifications);
    window.dispatchEvent(new Event('refresh-notifications'));

    // Award +5 XP to the report OWNER when they receive an upvote
    if (voteType === 'up' && currentVote !== 'up' && report.userId && report.userId !== userId) {
      await awardXP(report.userId, 5, 'Upvote Received 👍', reportId);
    }

    return report;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Report not found");

    const report = docSnap.data();
    if (!report.votedUsers) report.votedUsers = {};

    const currentVote = report.votedUsers[userId];
    if (currentVote === voteType) {
      delete report.votedUsers[userId];
      if (voteType === 'up') report.upvotes = Math.max(0, report.upvotes - 1);
      else report.downvotes = Math.max(0, report.downvotes - 1);
    } else {
      if (currentVote === 'up') report.upvotes = Math.max(0, report.upvotes - 1);
      if (currentVote === 'down') report.downvotes = Math.max(0, report.downvotes - 1);

      report.votedUsers[userId] = voteType;
      if (voteType === 'up') report.upvotes += 1;
      else report.downvotes += 1;
    }

    await updateDoc(docRef, {
      votedUsers: report.votedUsers,
      upvotes: report.upvotes,
      downvotes: report.downvotes
    });

    // Award +5 XP to the report OWNER when they receive an upvote
    if (voteType === 'up' && report.userId && report.userId !== userId) {
      await awardXP(report.userId, 5, 'Upvote Received 👍', reportId);
    }

    return { id: reportId, ...report };
  } catch (error) {
    console.error("Error voting on report in Firestore:", error);
    throw error;
  }
}

export async function addComment(reportId, commentText, authorName, authorAvatar = null, authorId = null) {
  const newComment = {
    id: `c-${Date.now()}`,
    authorName,
    authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    text: commentText,
    date: new Date().toISOString().split('T')[0],
    authorId: authorId || 'citizen_user'
  };

  if (isMockFirebase) {
    const reports = getStoredReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) throw new Error("Report not found");

    const report = reports[reportIndex];
    if (!report.comments) report.comments = [];
    report.comments.push(newComment);

    reports[reportIndex] = report;
    saveStoredReports(reports);

    // Trigger Notification
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `n-comm-${Date.now()}`,
      category: 'Community Updates',
      title: 'New Comment on Your Post',
      message: `"${authorName}" commented on your report "${report.title}": "${commentText.substring(0, 35)}..."`,
      time: 'Just now',
      read: false
    });
    saveStoredNotifications(notifications);
    window.dispatchEvent(new Event('refresh-notifications'));

    // Award XP to the commenter
    if (authorId) await awardXP(authorId, 5, 'Comment Posted 💬', reportId);

    return newComment;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      comments: arrayUnion(newComment)
    });
    // Award XP to the commenter
    if (authorId) await awardXP(authorId, 5, 'Comment Posted 💬', reportId);
    return newComment;
  } catch (error) {
    console.error("Error adding comment in Firestore:", error);
    throw error;
  }
}

export async function updateComment(reportId, commentId, newText) {
  if (isMockFirebase) {
    const reports = getStoredReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) throw new Error("Report not found");
    const report = reports[reportIndex];
    if (!report.comments) report.comments = [];
    const commentIndex = report.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) throw new Error("Comment not found");
    report.comments[commentIndex].text = newText;
    report.comments[commentIndex].edited = true;
    report.comments[commentIndex].editedAt = new Date().toISOString();
    reports[reportIndex] = report;
    saveStoredReports(reports);
    return report.comments[commentIndex];
  }

  try {
    const { db } = await import('../firebase/config');
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Report not found");
    const report = docSnap.data();
    const comments = report.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) throw new Error("Comment not found");
    comments[commentIndex].text = newText;
    comments[commentIndex].edited = true;
    comments[commentIndex].editedAt = new Date().toISOString();
    await updateDoc(docRef, { comments });
    return comments[commentIndex];
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

export async function deleteComment(reportId, commentId) {
  if (isMockFirebase) {
    const reports = getStoredReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) throw new Error("Report not found");
    const report = reports[reportIndex];
    if (report.comments) {
      report.comments = report.comments.filter(c => c.id !== commentId);
      reports[reportIndex] = report;
      saveStoredReports(reports);
    }
    return { success: true };
  }

  try {
    const { db } = await import('../firebase/config');
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Report not found");
    const report = docSnap.data();
    const comments = (report.comments || []).filter(c => c.id !== commentId);
    await updateDoc(docRef, { comments });
    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

// --- NOTIFICATIONS DATABASE MOCK SERVICES ---
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n-01',
    category: 'Verification Updates',
    title: 'Verification Status Pending',
    message: 'Your citizen identity verification documents have been received and are under active review by municipal officers.',
    time: '2 hours ago',
    read: false
  },
  {
    id: 'n-02',
    category: 'Community Updates',
    title: 'New Mission Posted Near You',
    message: 'A new municipal volunteering activity "Green Space Clean Up" was published in your neighborhood zone.',
    time: '5 hours ago',
    read: false
  },
  {
    id: 'n-03',
    category: 'Security Alerts',
    title: 'Login established',
    message: 'A secure login session was established on Chrome browser / Windows 10 client.',
    time: 'Yesterday',
    read: true
  },
  {
    id: 'n-04',
    category: 'AI Recommendations',
    title: 'Gemini Safety Assessment',
    message: 'Gemini AI has completed assessment for your reported broken streetlight: priority score is calculated as 35 (Medium severity).',
    time: '2 days ago',
    read: true
  }
];

const getStoredNotifications = () => {
  try {
    const data = localStorage.getItem('jan_sathi_notifications');
    if (!data) {
      localStorage.setItem('jan_sathi_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
};

const saveStoredNotifications = (notifications) => {
  localStorage.setItem('jan_sathi_notifications', JSON.stringify(notifications));
};

export async function fetchNotifications() {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return getStoredNotifications();
  }

  try {
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const uid = currentSession.uid || 'citizen_user';
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'notifications'), where('userId', '==', uid));
    const querySnapshot = await getDocs(q);
    const notifications = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        category: data.category || 'System Updates',
        title: data.title,
        message: data.message,
        time: data.timestamp ? formatDate(data.timestamp.split('T')[0]) : 'Just now',
        read: data.read || false,
        timestampVal: data.timestamp ? new Date(data.timestamp).getTime() : 0
      });
    });
    // Sort descending by timestamp
    notifications.sort((a, b) => b.timestampVal - a.timestampVal);
    return notifications;
  } catch (error) {
    console.error("Error fetching notifications from Firestore:", error);
    return getStoredNotifications();
  }
}

export async function toggleNotificationRead(id) {
  if (isMockFirebase) {
    const notifications = getStoredNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = !notifications[index].read;
      saveStoredNotifications(notifications);
      return notifications[index];
    }
    throw new Error("Notification not found");
  }

  try {
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'notifications', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Notification not found");
    const isRead = docSnap.data().read || false;
    await updateDoc(docRef, { read: !isRead });
    return { id, read: !isRead };
  } catch (error) {
    console.error("Error toggling notification read status in Firestore:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead() {
  if (isMockFirebase) {
    const notifications = getStoredNotifications();
    notifications.forEach(n => { n.read = true; });
    saveStoredNotifications(notifications);
    return notifications;
  }

  try {
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const uid = currentSession.uid || 'citizen_user';
    const { collection, getDocs, query, where, doc, updateDoc } = await import('firebase/firestore');
    const q = query(collection(db, 'notifications'), where('userId', '==', uid), where('read', '==', false));
    const querySnapshot = await getDocs(q);
    
    const promises = [];
    querySnapshot.forEach((document) => {
      promises.push(updateDoc(doc(db, 'notifications', document.id), { read: true }));
    });
    await Promise.all(promises);
    return fetchNotifications();
  } catch (error) {
    console.error("Error marking all notifications as read in Firestore:", error);
    return getStoredNotifications();
  }
}

export async function addNotification(category, title, message, targetUserId = null) {
  const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
  const uid = targetUserId || currentSession.uid || 'citizen_user';
  const timestamp = new Date().toISOString();

  if (isMockFirebase) {
    const notifications = getStoredNotifications();
    const newNotif = {
      id: `n-${Date.now()}`,
      category,
      title,
      message,
      time: 'Just now',
      read: false,
      userId: uid
    };
    notifications.unshift(newNotif);
    saveStoredNotifications(notifications);
    return newNotif;
  }

  try {
    const { collection, addDoc } = await import('firebase/firestore');
    const docRef = await addDoc(collection(db, 'notifications'), {
      userId: uid,
      category,
      title,
      message,
      timestamp,
      read: false
    });
    return {
      id: docRef.id,
      category,
      title,
      message,
      time: 'Just now',
      read: false
    };
  } catch (error) {
    console.error("Error adding notification in Firestore:", error);
    const notifications = getStoredNotifications();
    const newNotif = {
      id: `n-${Date.now()}`,
      category,
      title,
      message,
      time: 'Just now',
      read: false,
      userId: uid
    };
    notifications.unshift(newNotif);
    saveStoredNotifications(notifications);
    return newNotif;
  }
}

// --- DOCUMENTS DATABASE MOCK SERVICES ---
const DEFAULT_DOCUMENTS = [
  {
    id: 'doc-01',
    name: 'Government_ID_Verification.pdf',
    category: 'Identity Proof',
    size: '1.2 MB',
    date: '2026-06-25',
    status: 'Verified'
  },
  {
    id: 'doc-02',
    name: 'Address_Utility_Bill.pdf',
    category: 'Residence Verification',
    size: '850 KB',
    date: '2026-06-25',
    status: 'Verified'
  }
];

const getStoredDocuments = () => {
  try {
    const data = localStorage.getItem('jan_sathi_documents');
    if (!data) {
      localStorage.setItem('jan_sathi_documents', JSON.stringify(DEFAULT_DOCUMENTS));
      return DEFAULT_DOCUMENTS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_DOCUMENTS;
  }
};

const saveStoredDocuments = (docs) => {
  localStorage.setItem('jan_sathi_documents', JSON.stringify(docs));
};

export async function fetchDocuments(userId = null) {
  const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
  const uid = userId || currentSession.uid;

  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const docs = getStoredDocuments();
    if (currentSession.role === 'officer') {
      return docs;
    }
    return docs.filter(d => d.userId === uid || !d.userId);
  }

  try {
    const { query, collection, where, getDocs, orderBy } = await import('firebase/firestore');
    let q = query(collection(db, 'documents'), orderBy('date', 'desc'));
    
    if (currentSession.role !== 'officer' && uid) {
      q = query(collection(db, 'documents'), where('userId', '==', uid));
    }

    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (error) {
    console.error("Error fetching documents:", error);
    const docs = getStoredDocuments();
    return docs.filter(d => d.userId === uid || !d.userId);
  }
}

export async function uploadDocument(name, category, size, fileData = '', fileObj = null) {
  const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
  const uid = currentSession.uid || 'unknown_user';
  const userName = currentSession.name || 'Anonymous Citizen';

  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const docs = getStoredDocuments();
    const newDoc = {
      id: `doc-${Date.now()}`,
      userId: uid,
      userName,
      name,
      category,
      size,
      fileData: fileData || '',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending Verification'
    };
    docs.unshift(newDoc);
    saveStoredDocuments(docs);
    
    const mockDbDocs = JSON.parse(localStorage.getItem('mock_db_documents') || '[]');
    mockDbDocs.unshift(newDoc);
    localStorage.setItem('mock_db_documents', JSON.stringify(mockDbDocs));

    await awardXP(uid, 40, 'Document Uploaded 📄', newDoc.id);

    return newDoc;
  }

  try {
    let downloadUrl = '';
    const storagePath = `users/${uid}/verifications/${Date.now()}_${name}`;

    try {
      const { storage } = await import('../firebase/config');
      const { ref, uploadBytes, getDownloadURL, uploadString } = await import('firebase/storage');

      if (storage) {
        // Run storage upload with a 4-second timeout to prevent hanging on blocked networks/unconfigured buckets
        const uploadPromise = (async () => {
          if (fileObj) {
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, fileObj);
            return await getDownloadURL(snapshot.ref);
          } else if (fileData && fileData.startsWith('data:')) {
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadString(storageRef, fileData, 'data_url');
            return await getDownloadURL(snapshot.ref);
          }
          return fileData;
        })();

        // 4000ms timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Storage upload timeout')), 4000)
        );

        downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
        console.log("Uploaded successfully to Firebase Storage:", downloadUrl);
      } else {
        console.warn("Firebase Storage not initialized. Falling back to local Firestore storage.");
        downloadUrl = '';
      }
    } catch (storageError) {
      console.warn("Firebase Storage upload failed or timed out. Falling back to Firestore database storage:", storageError);
      downloadUrl = '';
    }

    const docId = `doc-${Date.now()}`;
    const newDoc = {
      id: docId,
      userId: uid,
      userName,
      name,
      category,
      size,
      fileUrl: downloadUrl,
      fileData: fileData || '',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending Verification'
    };

    const docRef = doc(db, 'documents', docId);
    await setDoc(docRef, newDoc);

    await awardXP(uid, 40, 'Document Uploaded 📄', docId);

    return newDoc;
  } catch (error) {
    console.error("Error uploading document in Firestore:", error);
    throw error;
  }
}

export async function deleteDocument(id) {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const docs = getStoredDocuments();
    const filtered = docs.filter(d => d.id !== id);
    saveStoredDocuments(filtered);

    const mockDbDocs = JSON.parse(localStorage.getItem('mock_db_documents') || '[]');
    const filteredDb = mockDbDocs.filter(d => d.id !== id);
    localStorage.setItem('mock_db_documents', JSON.stringify(filteredDb));

    return { success: true };
  }

  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'documents', id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

// --- PROFILE & SETTINGS UPDATE SERVICES ---
export async function updateUserProfile(uid, profileData) {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 1. Get mock database users list
    const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
    if (!users[uid]) {
      throw new Error("User account not found");
    }

    // 2. Merge details
    const updatedUser = {
      ...users[uid],
      ...profileData
    };

    // 3. Save to global list
    users[uid] = updatedUser;
    localStorage.setItem('mock_users', JSON.stringify(users));

    // 4. If this is the current active session user, update session object
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    if (currentSession.uid === uid) {
      const sessionUpdate = { ...currentSession, ...profileData };
      delete sessionUpdate.password;
      localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
      window.dispatchEvent(new Event('mock-auth-state-change'));
    }

    return updatedUser;
  }

  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, profileData, { merge: true });

    // Also update session info in local storage
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const sessionUpdate = { ...currentSession, uid, ...profileData };
    localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
    window.dispatchEvent(new Event('mock-auth-state-change'));
    
    return { uid, ...profileData };
  } catch (error) {
    console.error("Error updating user profile in Firestore:", error);
    throw error;
  }
}

// --- CITIZEN ACTIVITY LOGGER AND XP CALCULATOR ---
export async function logUserActivity(uid, title, xpReward = 0, type = 'Activity', description = '', status = 'Completed', relatedResourceId = '') {
  if (isMockFirebase) {
    const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
    if (!users[uid]) return null;

    const user = users[uid];
    if (!user.impactTimeline) user.impactTimeline = [];

    const newActivity = {
      id: `act-${Date.now()}`,
      title,
      date: new Date().toISOString(),
      xpReward,
      type,
      description: description || title,
      status,
      relatedResourceId
    };

    user.impactTimeline.unshift(newActivity);
    
    // Gamified XP Progress and Level up calculation
    user.xp = (user.xp || 0) + xpReward;
    const nextXp = user.nextLevelXp || 1000;
    if (user.xp >= nextXp) {
      user.level = (user.level || 1) + 1;
      user.xp = user.xp - nextXp;
      user.nextLevelXp = user.level * 1000;
      
      // Add level up notification
      const notifications = JSON.parse(localStorage.getItem('jan_sathi_notifications') || '[]');
      notifications.unshift({
        id: `n-lvl-${Date.now()}`,
        category: 'System Announcements',
        title: 'Guild Level Up!',
        message: `Congratulations! You have reached Level ${user.level} in the Jan Sathi Citizen Guild. Keep contributing!`,
        time: 'Just now',
        read: false
      });
      localStorage.setItem('jan_sathi_notifications', JSON.stringify(notifications));
    }

    if (title.includes('Reported Issue')) {
      user.reportsSubmitted = (user.reportsSubmitted || 0) + 1;
      user.activeRequests = (user.activeRequests || 0) + 1;
    } else if (title.includes('Resolved')) {
      if (user.activeRequests > 0) user.activeRequests -= 1;
    }

    users[uid] = user;
    localStorage.setItem('mock_users', JSON.stringify(users));

    // Update active session
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    if (currentSession.uid === uid) {
      const sessionUpdate = { ...currentSession, ...user };
      delete sessionUpdate.password;
      localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
      window.dispatchEvent(new Event('mock-auth-state-change'));
      window.dispatchEvent(new Event('refresh-notifications'));
    }

    // Save mock activity logs to global logs array
    const mockLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
    mockLogs.unshift({
      ...newActivity,
      userId: uid,
      userName: user.name || 'Volunteer'
    });
    localStorage.setItem('mock_activity_logs', JSON.stringify(mockLogs));

    return user;
  }

  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    let user = {};
    if (docSnap.exists()) {
      user = docSnap.data();
    } else {
      const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
      user = {
        name: currentSession.name || 'Volunteer',
        email: currentSession.email || '',
        role: currentSession.role || 'citizen',
        xp: 0,
        level: 1,
        nextLevelXp: 1000,
        completedMissions: 0,
        hoursVolunteered: 0,
        reputationScore: 10,
        reputationLevel: 'New Recruit',
        badges: [],
        impactTimeline: [],
        activeRequests: 0,
        reportsSubmitted: 0
      };
    }

    if (!user.impactTimeline) user.impactTimeline = [];

    const newActivity = {
      id: `act-${Date.now()}`,
      title,
      date: new Date().toISOString(),
      xpReward,
      type,
      description: description || title,
      status,
      relatedResourceId
    };

    user.impactTimeline.unshift(newActivity);
    
    // Gamified XP Progress and Level up calculation
    user.xp = (user.xp || 0) + xpReward;
    const nextXp = user.nextLevelXp || 1000;
    if (user.xp >= nextXp) {
      user.level = (user.level || 1) + 1;
      user.xp = user.xp - nextXp;
      user.nextLevelXp = user.level * 1000;
    }

    if (title.includes('Reported Issue')) {
      user.reportsSubmitted = (user.reportsSubmitted || 0) + 1;
      user.activeRequests = (user.activeRequests || 0) + 1;
    } else if (title.includes('Resolved')) {
      if (user.activeRequests > 0) user.activeRequests -= 1;
    }

    // Save user update in Firestore
    await setDoc(docRef, {
      impactTimeline: user.impactTimeline,
      xp: user.xp,
      level: user.level,
      nextLevelXp: user.nextLevelXp,
      activeRequests: user.activeRequests || 0,
      reportsSubmitted: user.reportsSubmitted || 0,
      name: user.name,
      email: user.email,
      role: user.role
    }, { merge: true });

    // Save in root 'activityLogs' collection in Firestore
    const logRef = doc(collection(db, 'activityLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      userId: uid,
      userName: user.name || 'Volunteer',
      timestamp: new Date().toISOString(),
      type,
      description: description || title,
      status,
      relatedResourceId,
      xpEarned: xpReward
    });

    // Update active session
    const currentSession = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
    const sessionUpdate = { ...currentSession, uid, ...user };
    localStorage.setItem('mock_current_user', JSON.stringify(sessionUpdate));
    window.dispatchEvent(new Event('mock-auth-state-change'));
    window.dispatchEvent(new Event('refresh-notifications'));

    return user;
  } catch (error) {
    console.error("Error logging user activity in Firestore:", error);
    return null;
  }
}

export async function reviewDocument(docId, status, remarks, officerName) {
  if (isMockFirebase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockDbDocs = JSON.parse(localStorage.getItem('mock_db_documents') || '[]');
    const idx = mockDbDocs.findIndex(d => d.id === docId);
    if (idx !== -1) {
      mockDbDocs[idx].status = status;
      mockDbDocs[idx].officerRemark = remarks;
      mockDbDocs[idx].officerName = officerName;
      mockDbDocs[idx].reviewDate = new Date().toISOString().split('T')[0];
      localStorage.setItem('mock_db_documents', JSON.stringify(mockDbDocs));
      
      const localDocs = JSON.parse(localStorage.getItem('jan_sathi_documents') || '[]');
      const localIdx = localDocs.findIndex(d => d.id === docId);
      if (localIdx !== -1) {
        localDocs[localIdx].status = status;
        localDocs[localIdx].officerRemark = remarks;
        localDocs[localIdx].officerName = officerName;
        localDocs[localIdx].reviewDate = new Date().toISOString().split('T')[0];
        localStorage.setItem('jan_sathi_documents', JSON.stringify(localDocs));
      }

      const userId = mockDbDocs[idx].userId;
      const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
      if (users[userId]) {
        users[userId].verifiedStatus = status === 'Approved' ? 'OC Verified' : 'Rejected';
        localStorage.setItem('mock_users', JSON.stringify(users));
      }
      
      await logUserActivity(userId, `Verification Document ${status}`, 20, 'Document Verification', `Your document verification submission was reviewed and marked as "${status}" by Officer ${officerName}. Remarks: ${remarks}`, 'Completed');
    }
    return { success: true };
  }

  try {
    const docRef = doc(db, 'documents', docId);
    const reviewDate = new Date().toISOString().split('T')[0];
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const docData = docSnap.data();
      const userId = docData.userId;

      await setDoc(docRef, {
        status,
        officerRemark: remarks,
        officerName,
        reviewDate
      }, { merge: true });

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        verifiedStatus: status === 'Approved' ? 'OC Verified' : status === 'Request Re-upload' ? 'Re-upload Pending' : 'Rejected'
      }, { merge: true });

      await logUserActivity(userId, `Verification Document ${status}`, 20, 'Document Verification', `Your document verification submission was reviewed and marked as "${status}" by Officer ${officerName}. Remarks: ${remarks}`, 'Completed');
    }

    return { success: true };
  } catch (error) {
    console.error("Error reviewing document in Firestore:", error);
    throw error;
  }
}

const MOCK_TEAMS = [
  { id: 'team-01', name: 'Roads Team Alpha', department: 'Roads & Bridges Department', leader: 'Suresh Raina', membersCount: 6, status: 'Available', currentIncidentId: null, performanceScore: 92, contact: '+91 98765 01001', lastUpdated: new Date().toLocaleString(), eta: 'N/A' },
  { id: 'team-02', name: 'Water Crew Bravo', department: 'Water Board', leader: 'Amit Mishra', membersCount: 4, status: 'Assigned', currentIncidentId: 'rep-dup-03', performanceScore: 88, contact: '+91 98765 01002', lastUpdated: new Date().toLocaleString(), eta: '25 Mins' },
  { id: 'team-03', name: 'Electrical Line Unit 1', department: 'Electricity Board', leader: 'Hardik Pandya', membersCount: 5, status: 'Available', currentIncidentId: null, performanceScore: 95, contact: '+91 98765 01003', lastUpdated: new Date().toLocaleString(), eta: 'N/A' },
  { id: 'team-04', name: 'Drainage Squad Delta', department: 'Water Board', leader: 'Jasprit Bumrah', membersCount: 8, status: 'Working', currentIncidentId: 'rep-dup-04', performanceScore: 90, contact: '+91 98765 01004', lastUpdated: new Date().toLocaleString(), eta: 'En Route' },
  { id: 'team-05', name: 'Sanitation Crew 5', department: 'Sanitation Department', leader: 'KL Rahul', membersCount: 12, status: 'Available', currentIncidentId: null, performanceScore: 84, contact: '+91 98765 01005', lastUpdated: new Date().toLocaleString(), eta: 'N/A' },
  { id: 'team-06', name: 'Emergency Rescue Unit', department: 'Police Department', leader: 'Virat Kohli', membersCount: 10, status: 'En Route', currentIncidentId: null, performanceScore: 98, contact: '+91 98765 01006', lastUpdated: new Date().toLocaleString(), eta: '12 Mins' }
];

export async function fetchTeams() {
  if (isMockFirebase) {
    const data = localStorage.getItem('jan_sathi_teams');
    if (!data) {
      localStorage.setItem('jan_sathi_teams', JSON.stringify(MOCK_TEAMS));
      return MOCK_TEAMS;
    }
    return JSON.parse(data);
  }
  try {
    const querySnapshot = await getDocs(collection(db, 'teams'));
    const teams = [];
    querySnapshot.forEach((doc) => {
      teams.push({ id: doc.id, ...doc.data() });
    });
    if (teams.length === 0) {
      for (const t of MOCK_TEAMS) {
        await setDoc(doc(db, 'teams', t.id), t);
        teams.push(t);
      }
    }
    return teams;
  } catch (error) {
    console.error("Error fetching teams from Firestore:", error);
    const data = localStorage.getItem('jan_sathi_teams');
    return data ? JSON.parse(data) : MOCK_TEAMS;
  }
}

export async function updateTeam(teamId, updateData) {
  const timestamp = new Date().toLocaleString();
  const fullUpdate = { ...updateData, lastUpdated: timestamp };
  
  if (isMockFirebase) {
    const data = localStorage.getItem('jan_sathi_teams');
    const teams = data ? JSON.parse(data) : [...MOCK_TEAMS];
    const idx = teams.findIndex(t => t.id === teamId);
    if (idx !== -1) {
      teams[idx] = { ...teams[idx], ...fullUpdate };
      localStorage.setItem('jan_sathi_teams', JSON.stringify(teams));
      window.dispatchEvent(new CustomEvent('refresh-teams'));
    }
    return { success: true };
  }
  try {
    const docRef = doc(db, 'teams', teamId);
    await setDoc(docRef, fullUpdate, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating team in Firestore:", error);
    throw error;
  }
}
