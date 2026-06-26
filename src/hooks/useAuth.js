import { useState, useEffect } from 'react';
import { auth, db, isMockFirebase } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- MODE: MOCK FIREBASE STATE LISTENER ---
    if (isMockFirebase) {
      const loadMockSession = () => {
        try {
          const session = localStorage.getItem('mock_current_user');
          setUser(session ? JSON.parse(session) : null);
        } catch {
          setUser(null);
        }
        setLoading(false);
      };

      loadMockSession();

      // Listen to local changes dispatched from auth services
      window.addEventListener('mock-auth-state-change', loadMockSession);
      return () => {
        window.removeEventListener('mock-auth-state-change', loadMockSession);
      };
    }

    // --- MODE: PRODUCTION FIREBASE STATE LISTENER ---
    let unsubSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...docSnap.data()
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'citizen',
              name: firebaseUser.displayName || 'Volunteer'
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const logout = () => {
    if (isMockFirebase) {
      localStorage.removeItem('mock_current_user');
      window.dispatchEvent(new Event('mock-auth-state-change'));
      return;
    }
    signOut(auth);
  };

  return { user, loading, logout };
}
