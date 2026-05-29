import React, { createContext, useContext, useState, useEffect } from 'react';
import { projectId } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-64775d98`;

// When VITE_ENABLE_DEFAULT_ADMIN === 'true', the app auto-logs in a
// "default-admin" user on first load if no session exists. This is intended
// for local development/demo only; pilot and production builds should leave
// it unset so users land on /login.
const DEFAULT_ADMIN_ENABLED =
  import.meta.env.VITE_ENABLE_DEFAULT_ADMIN === 'true';

// Marker set on explicit sign-out so a subsequent reload doesn't silently
// re-create the default-admin session in dev builds.
const SIGNED_OUT_FLAG = 'signed_out';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sqm';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      const signedOut = localStorage.getItem(SIGNED_OUT_FLAG) === 'true';

      // Clear invalid JWT tokens left over from previous sessions
      if (storedToken && storedToken.startsWith('eyJ') && storedToken.length > 100) {
        console.log('Clearing invalid JWT token from previous session');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      } else if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        return;
      }

      // No valid stored session. Only auto-login as default-admin when the
      // dev/demo flag is on AND the user has not explicitly signed out.
      if (DEFAULT_ADMIN_ENABLED && !signedOut) {
        const defaultUser: User = {
          id: 'default-admin',
          email: 'admin@fieldservice.local',
          name: 'Admin User',
          role: 'admin',
        };
        const defaultToken = 'no-auth-required';

        setUser(defaultUser);
        setAccessToken(defaultToken);
        localStorage.setItem('access_token', defaultToken);
        localStorage.setItem('user', JSON.stringify(defaultUser));
      }
    } catch (error) {
      console.error('Session initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign in');
      }

      const data = await response.json();

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'sqm',
      };

      setUser(user);
      setAccessToken(data.access_token);

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem(SIGNED_OUT_FLAG);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.setItem(SIGNED_OUT_FLAG, 'true');
    // Hard redirect ensures any in-memory state, react-router caches, and
    // role-gated routes are reset cleanly.
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
