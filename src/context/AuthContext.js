// src/context/AuthContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, functions } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const fetchUserData = useCallback(async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.warn('Error fetching user data from Firestore:', error?.message);
      setUserData(null);
    }
  }, []);

  useEffect(() => {
    // Safety timeout to prevent infinite loader if network hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      try {
        if (firebaseUser) {
          try {
            const migrateCredentials = httpsCallable(functions, 'migrateInstagramCredentials');
            await migrateCredentials({});
          } catch (migErr) {
            console.warn('Credential migration check skipped:', migErr?.message);
          }

          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                createdAt: serverTimestamp(),
                instagramConnected: false,
                instagramUsername: null,
                instagramAccountId: null,
              });
            }
          } catch (dbErr) {
            console.warn('Unable to sync user document:', dbErr?.message);
          }

          await fetchUserData(firebaseUser.uid);
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Error initializing authenticated user:', error);
        setUserData(null);
        setAuthError(error?.message || '');
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) {
      await fetchUserData(user.uid);
    }
  }, [user, fetchUserData]);

  const value = {
    user,
    userData,
    loading,
    authError,
    logout,
    loginWithGoogle,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
