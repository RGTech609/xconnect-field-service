import React, { createContext, useContext, useState, useEffect } from 'react';
import { projectId } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-64775d98`;

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
    // Auto-login with default admin user (no authentication required)
    initializeDefaultUser();
  }, []);

  const initializeDefaultUser = async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      // Clear invalid JWT tokens (they start with 'eyJ')
      if (storedToken && storedToken.startsWith('eyJ') && storedToken.length > 100) {
        console.log('Clearing invalid JWT token from previous session');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
      
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Set default admin user with no authentication
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
      // Even on error, set default user
      const defaultUser: User = {
        id: 'default-admin',
        email: 'admin@fieldservice.local',
        name: 'Admin User',
        role: 'admin',
      };
      setUser(defaultUser);
      setAccessToken('no-auth-required');
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      // Clear invalid JWT tokens (they start with 'eyJ')
      if (storedToken && storedToken.startsWith('eyJ') && storedToken.length > 100) {
        console.log('Clearing invalid JWT token from previous session');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return;
      }
      
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Session check error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Call the backend signin endpoint
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