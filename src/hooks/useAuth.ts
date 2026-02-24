import { useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser?.email) {
        // Only allow specific emails
        const whitelistDoc = await getDoc(doc(db, "whitelist", firebaseUser.email.toLowerCase()));
        if (whitelistDoc.exists() && whitelistDoc.data().allowed === true) {
          setIsWhitelisted(true);
        } else {
          setIsWhitelisted(false);
          // Auto-logout if not whitelisted to keep state clean, 
          // but we'll handle the UI blocking in ProtectedRoute
        }
      } else {
        setIsWhitelisted(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return { user, loading, isWhitelisted, loginWithGoogle, logout };
};
