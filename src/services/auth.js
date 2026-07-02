import { auth, db, isMockFirebase } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { awardXP } from './api';

// Mock storage helper: fetch all accounts
const getMockUsers = () => {
  try {
    const data = localStorage.getItem('mock_users');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Mock storage helper: save new account
const saveMockUser = (uid, profile) => {
  const users = getMockUsers();
  users[uid] = profile;
  localStorage.setItem('mock_users', JSON.stringify(users));
};

/**
 * Registers a new user. Falls back to mock localStorage storage if Firebase credentials are placeholders.
 */
export async function registerUser(email, password, name, role, department = null) {
  if (isMockFirebase) {
    const uid = `mock-uid-${Math.random().toString(36).substr(2, 9)}`;
    const userProfile = {
      uid,
      name,
      email,
      role,
      phone: '',
      location: '',
      uniqueId: `JS-${Math.floor(100000 + Math.random() * 900000)}`,
      verifiedStatus: 'Not Verified',
      level: 1,
      xp: 0,
      nextLevelXp: 1000,
      completedMissions: 0,
      hoursVolunteered: 0,
      reputationScore: 10,
      reputationLevel: 'New Recruit',
      badges: [],
      impactTimeline: [],
      preferences: {
        language: 'en',
        theme: 'system',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        announcements: true,
        eventUpdates: true
      },
      security: {
        twoFactorActive: false,
        loginActivity: [
          { id: 'l1', device: 'Chrome / Windows 10', time: new Date().toLocaleString(), status: 'Success' }
        ],
        activeDevices: [
          { id: 'ad1', device: 'Chrome / Windows 10', location: 'Los Angeles, USA', activeNow: true }
        ],
        connectedAccounts: {
          google: true,
          github: false
        }
      },
      lastLogin: new Date().toLocaleString(),
      points: 0,
      reportsSubmitted: 0,
      createdAt: new Date().toISOString(),
      ...(role === 'officer' ? { department } : { department: null })
    };
    
    // Save profile WITH password in local mock DB for login verification
    const mockDbProfile = {
      ...userProfile,
      password // only stored client-side for simulation verification
    };
    
    saveMockUser(uid, mockDbProfile);
    
    // Set active session (excluding password for security)
    localStorage.setItem('mock_current_user', JSON.stringify(userProfile));
    
    // Trigger auth state listener update
    window.dispatchEvent(new Event('mock-auth-state-change'));

    // Award XP for first-time registration
    setTimeout(() => awardXP(uid, 10, 'Welcome to Jan Sathi! 🎉'), 500);

    return { user: { uid, email }, profile: userProfile };
  }

  // Real Firebase Registration (no password stored in Firestore)
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  const userProfile = {
    uid,
    name,
    email,
    role,
    phone: '',
    location: '',
    uniqueId: `JS-${Math.floor(100000 + Math.random() * 900000)}`,
    verifiedStatus: 'Not Verified',
    level: 1,
    xp: 0,
    nextLevelXp: 1000,
    completedMissions: 0,
    hoursVolunteered: 0,
    reputationScore: 10,
    reputationLevel: 'New Recruit',
    badges: [],
    impactTimeline: [],
    preferences: {
      language: 'en',
      theme: 'system',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      announcements: true,
      eventUpdates: true
    },
    security: {
      twoFactorActive: false,
      loginActivity: [
        { id: 'l1', device: 'Chrome / Windows 10', time: new Date().toLocaleString(), status: 'Success' }
      ],
      activeDevices: [
        { id: 'ad1', device: 'Chrome / Windows 10', location: 'Los Angeles, USA', activeNow: true }
      ],
      connectedAccounts: {
        google: true,
        github: false
      }
    },
    lastLogin: new Date().toLocaleString(),
    points: 0,
    reportsSubmitted: 0,
    createdAt: new Date().toISOString(),
    ...(role === 'officer' ? { department } : { department: null })
  };

  await setDoc(doc(db, 'users', uid), userProfile);
  // Award XP for first-time registration
  setTimeout(() => awardXP(uid, 10, 'Welcome to Jan Sathi! 🎉'), 500);
  return { user: userCredential.user, profile: userProfile };
}

/**
 * Authenticates a user. Verifies email/password against mock data.
 */
export async function loginUser(email, password) {
  if (isMockFirebase) {
    const users = getMockUsers();
    const matchedUser = Object.values(users).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!matchedUser) {
      throw new Error("No citizen or officer account exists under this email. Please Register first.");
    }
    
    // Verify password match in mock database
    if (matchedUser.password !== password) {
      throw new Error("Invalid password. Please verify credentials and try again.");
    }
    
    // Strip password from the active session profile
    const activeSessionProfile = { ...matchedUser };
    delete activeSessionProfile.password;

    // Update active mock session
    localStorage.setItem('mock_current_user', JSON.stringify(activeSessionProfile));
    window.dispatchEvent(new Event('mock-auth-state-change'));
    return { uid: matchedUser.uid, email: matchedUser.email };
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Signs out a user.
 */
export async function logoutUser() {
  if (isMockFirebase) {
    localStorage.removeItem('mock_current_user');
    window.dispatchEvent(new Event('mock-auth-state-change'));
    return;
  }
  await signOut(auth);
}

/**
 * Log in / Sign up using Google Account credentials.
 */
export async function loginWithGoogle() {
  if (isMockFirebase) {
    const dummyUser = {
      uid: 'mock-uid-google',
      name: 'Google User',
      email: 'googleuser@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      role: 'citizen',
      xp: 150,
      level: 1,
      nextLevelXp: 1000,
      preferences: {
        language: 'en',
        theme: 'dark'
      }
    };
    
    const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
    users[dummyUser.uid] = dummyUser;
    localStorage.setItem('mock_users', JSON.stringify(users));
    localStorage.setItem('mock_current_user', JSON.stringify(dummyUser));
    window.dispatchEvent(new Event('mock-auth-state-change'));
    return dummyUser;
  }

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const userProfile = {
        name: user.displayName || 'Google Volunteer',
        email: user.email,
        role: 'citizen',
        phone: user.phoneNumber || '',
        location: '',
        uniqueId: `JS-${Math.floor(100000 + Math.random() * 900000)}`,
        verifiedStatus: 'Not Verified',
        level: 1,
        xp: 0,
        nextLevelXp: 1000,
        completedMissions: 0,
        hoursVolunteered: 0,
        reputationScore: 10,
        reputationLevel: 'New Recruit',
        badges: [],
        impactTimeline: [],
        preferences: {
          language: 'en',
          theme: 'dark',
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          announcements: true,
          eventUpdates: true
        },
        security: {
          twoFactorActive: false,
          loginActivity: [
            { id: 'l1', device: 'Chrome / Windows 10', time: new Date().toLocaleString(), status: 'Success' }
          ],
          activeDevices: [
            { id: 'ad1', device: 'Chrome / Windows 10', location: 'Los Angeles, USA', activeNow: true }
          ],
          connectedAccounts: {
            google: true,
            github: false
          }
        },
        lastLogin: new Date().toLocaleString(),
        points: 0,
        reportsSubmitted: 0,
        createdAt: new Date().toISOString(),
        department: null
      };
      
      await setDoc(userRef, userProfile);
    }
    
    return user;
  } catch (error) {
    console.error("Google sign in failed:", error);
    throw error;
  }
}
