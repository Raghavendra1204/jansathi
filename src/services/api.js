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
    ]
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
    ]
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
    comments: []
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
    return JSON.parse(data);
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
export async function createReport(title, category, location, description, imageUrl, reporterName, reporterAvatar = null, priorityScore = 20, severity = 'Low') {
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
    comments: []
  };

  reports.unshift(newReport);
  saveStoredReports(reports);
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

  if (currentVote === voteType) {
    // Undo vote if clicking same button
    delete report.votedUsers[userId];
    if (voteType === 'up') report.upvotes = Math.max(0, report.upvotes - 1);
    if (voteType === 'down') report.downvotes = Math.max(0, report.downvotes - 1);
  } else {
    // Undo old opposite vote if exists
    if (currentVote === 'up') report.upvotes = Math.max(0, report.upvotes - 1);
    if (currentVote === 'down') report.downvotes = Math.max(0, report.downvotes - 1);

    // Apply new vote
    report.votedUsers[userId] = voteType;
    if (voteType === 'up') report.upvotes += 1;
    if (voteType === 'down') report.downvotes += 1;
  }

  reports[reportIndex] = report;
  saveStoredReports(reports);
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
  return newComment;
}
