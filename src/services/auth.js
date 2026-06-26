import { auth, db, isMockFirebase } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
    points: 0,
    reportsSubmitted: 0,
    createdAt: new Date().toISOString(),
    ...(role === 'officer' ? { department } : { department: null })
  };

  await setDoc(doc(db, 'users', uid), userProfile);
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
