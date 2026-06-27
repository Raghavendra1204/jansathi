// Mock API services for Jaan Sathi database

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

const DEFAULT_REPORTS = [
  {
    id: 'rep-01',
    title: 'Broken Streetlight',
    category: 'Infrastructure',
    location: '405 Pine Street, Downtown',
    date: '2026-06-25',
    reporterName: 'David Vance',
    reporterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    description: 'Streetlight pole #12 is completely dark, causing safety concerns for pedestrians at night.',
    imageUrl: 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
    upvotes: 18,
    downvotes: 1,
    priorityScore: 35,
    severity: 'Medium',
    status: 'Assigned',
    votedUsers: {}, // maps { userId: 'up' | 'down' }
    comments: [
      {
        id: 'c-01',
        authorName: 'Sarah Jenkins',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        text: 'This is indeed very dark at night. I almost tripped there yesterday.',
        date: '2026-06-25'
      },
      {
        id: 'c-02',
        authorName: 'Officer Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        text: 'Dispatched to Department of Public Works. Maintenance ticket #842 created.',
        date: '2026-06-26'
      }
    ],
    lat: 12.9784,
    lng: 77.5906
  },
  {
    id: 'rep-02',
    title: 'Deep Pothole in Broadway Ave',
    category: 'Roads & Safety',
    location: '1200 Broadway Ave',
    date: '2026-06-23',
    reporterName: 'Marcus Chen',
    reporterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    description: 'Large, deep pothole in the right lane of Broadway causing cars to swerve abruptly. Highly dangerous during rainfall.',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
    upvotes: 42,
    downvotes: 2,
    priorityScore: 82,
    severity: 'Critical',
    status: 'Pending',
    votedUsers: {},
    comments: [
      {
        id: 'c-03',
        authorName: 'David Vance',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
        text: 'I hit this pothole this morning! Absolute nightmare. Hope the municipality resolves it quickly.',
        date: '2026-06-24'
      }
    ],
    lat: 12.9698,
    lng: 77.6052
  },
  {
    id: 'rep-03',
    title: 'Overflowing Trash Dumpster',
    category: 'Sanitation',
    location: 'Oak Park Recreation Field',
    date: '2026-06-18',
    reporterName: 'Elena Rostova',
    reporterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    description: 'Trash has accumulated around the dumpster, attracting animals and creating severe odor issues near the kids playground.',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800',
    upvotes: 24,
    downvotes: 0,
    priorityScore: 45,
    severity: 'Medium',
    status: 'Resolved',
    votedUsers: {},
    comments: [],
    lat: 12.9562,
    lng: 77.5750
  }
];

// Initialize local storage database
const getStoredReports = () => {
  try {
    const data = localStorage.getItem('jaan_sathi_reports');
    if (!data) {
      localStorage.setItem('jaan_sathi_reports', JSON.stringify(DEFAULT_REPORTS));
      return DEFAULT_REPORTS;
    }
    
    let reports = JSON.parse(data);
    let updated = false;
    
    // Database Migration: Ensure all reports have valid coordinates
    reports = reports.map(r => {
      if (r.lat === undefined || r.lng === undefined) {
        // Assign coordinates in Bangalore area
        r.lat = 12.9716 + (Math.random() - 0.5) * 0.15;
        r.lng = 77.5946 + (Math.random() - 0.5) * 0.15;
        updated = true;
      }
      return r;
    });

    if (updated) {
      localStorage.setItem('jaan_sathi_reports', JSON.stringify(reports));
    }
    return reports;
  } catch {
    return DEFAULT_REPORTS;
  }
};

const saveStoredReports = (reports) => {
  localStorage.setItem('jaan_sathi_reports', JSON.stringify(reports));
};

// Initialize local storage database for missions
const getStoredMissions = () => {
  try {
    const data = localStorage.getItem('jaan_sathi_missions');
    if (!data) {
      localStorage.setItem('jaan_sathi_missions', JSON.stringify(MOCK_MISSIONS));
      return MOCK_MISSIONS;
    }
    return JSON.parse(data);
  } catch {
    return MOCK_MISSIONS;
  }
};

const saveStoredMissions = (missions) => {
  localStorage.setItem('jaan_sathi_missions', JSON.stringify(missions));
};

const getJoinedMissions = () => {
  try {
    const data = localStorage.getItem('jaan_sathi_joined_missions');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveJoinedMissions = (joined) => {
  localStorage.setItem('jaan_sathi_joined_missions', JSON.stringify(joined));
};

export async function fetchMissions() {
  await new Promise(resolve => setTimeout(resolve, 300));
  const missions = getStoredMissions();
  const joined = getJoinedMissions();
  return missions.map(m => ({
    ...m,
    joined: joined.includes(m.id)
  }));
}

export async function fetchTopHeroes() {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_HEROES;
}

export async function joinMission(missionId) {
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

  return { success: true, message: `Successfully registered for mission: ${mission.title}!` };
}

/**
 * Fetches all reports, sorted by priorityScore/upvotes or date.
 */
export async function fetchReports() {
  await new Promise(resolve => setTimeout(resolve, 200));
  return getStoredReports();
}

/**
 * Creates a new report and appends it to storage.
 */
export async function createReport(title, category, location, description, imageUrl, reporterName, reporterAvatar = null, priorityScore = 20, severity = 'Low', lat = 12.9716, lng = 77.5946) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const reports = getStoredReports();
  const newReport = {
    id: `rep-${Date.now()}`,
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

  return newReport;
}

/**
 * Casts or toggles an upvote/downvote on a report.
 * @param {string} reportId 
 * @param {string} userId 
 * @param {'up' | 'down'} voteType 
 */
export async function voteReport(reportId, userId, voteType) {
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

  return report;
}

/**
 * Appends a comment to a report.
 */
export async function addComment(reportId, commentText, authorName, authorAvatar = null) {
  const reports = getStoredReports();
  const reportIndex = reports.findIndex(r => r.id === reportId);
  if (reportIndex === -1) throw new Error("Report not found");

  const report = reports[reportIndex];
  const newComment = {
    id: `c-${Date.now()}`,
    authorName,
    authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    text: commentText,
    date: new Date().toISOString().split('T')[0]
  };

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

  return newComment;
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
    const data = localStorage.getItem('jaan_sathi_notifications');
    if (!data) {
      localStorage.setItem('jaan_sathi_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
};

const saveStoredNotifications = (notifications) => {
  localStorage.setItem('jaan_sathi_notifications', JSON.stringify(notifications));
};

export async function fetchNotifications() {
  await new Promise(resolve => setTimeout(resolve, 150));
  return getStoredNotifications();
}

export async function toggleNotificationRead(id) {
  const notifications = getStoredNotifications();
  const index = notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications[index].read = !notifications[index].read;
    saveStoredNotifications(notifications);
    return notifications[index];
  }
  throw new Error("Notification not found");
}

export async function markAllNotificationsAsRead() {
  const notifications = getStoredNotifications();
  notifications.forEach(n => { n.read = true; });
  saveStoredNotifications(notifications);
  return notifications;
}

export async function addNotification(category, title, message) {
  const notifications = getStoredNotifications();
  const newNotif = {
    id: `n-${Date.now()}`,
    category,
    title,
    message,
    time: 'Just now',
    read: false
  };
  notifications.unshift(newNotif);
  saveStoredNotifications(notifications);
  return newNotif;
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
    const data = localStorage.getItem('jaan_sathi_documents');
    if (!data) {
      localStorage.setItem('jaan_sathi_documents', JSON.stringify(DEFAULT_DOCUMENTS));
      return DEFAULT_DOCUMENTS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_DOCUMENTS;
  }
};

const saveStoredDocuments = (docs) => {
  localStorage.setItem('jaan_sathi_documents', JSON.stringify(docs));
};

export async function fetchDocuments() {
  await new Promise(resolve => setTimeout(resolve, 200));
  return getStoredDocuments();
}

export async function uploadDocument(name, category, size, fileData = '') {
  await new Promise(resolve => setTimeout(resolve, 800));
  const docs = getStoredDocuments();
  const newDoc = {
    id: `doc-${Date.now()}`,
    name,
    category,
    size,
    fileData,
    date: new Date().toISOString().split('T')[0],
    status: 'Pending Verification'
  };
  docs.unshift(newDoc);
  saveStoredDocuments(docs);
  return newDoc;
}

export async function deleteDocument(id) {
  await new Promise(resolve => setTimeout(resolve, 200));
  const docs = getStoredDocuments();
  const filtered = docs.filter(d => d.id !== id);
  saveStoredDocuments(filtered);
  return { success: true };
}

// --- PROFILE & SETTINGS UPDATE SERVICES ---
export async function updateUserProfile(uid, profileData) {
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

// --- CITIZEN ACTIVITY LOGGER AND XP CALCULATOR ---
export async function logUserActivity(uid, title, xpReward = 0) {
  const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
  if (!users[uid]) return null;

  const user = users[uid];
  if (!user.impactTimeline) user.impactTimeline = [];

  const newActivity = {
    id: `act-${Date.now()}`,
    title,
    date: new Date().toISOString(),
    xpReward
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
    const notifications = JSON.parse(localStorage.getItem('jaan_sathi_notifications') || '[]');
    notifications.unshift({
      id: `n-lvl-${Date.now()}`,
      category: 'System Announcements',
      title: 'Guild Level Up!',
      message: `Congratulations! You have reached Level ${user.level} in the Jaan Sathi Citizen Guild. Keep contributing!`,
      time: 'Just now',
      read: false
    });
    localStorage.setItem('jaan_sathi_notifications', JSON.stringify(notifications));
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

  return user;
}
