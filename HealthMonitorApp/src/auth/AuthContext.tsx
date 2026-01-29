import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Auth0 from 'react-native-auth0';
import { auth0Config } from './auth0';

type AuthState = {
  accessToken: string | null;
  userProfile: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: () => Promise<void>;
  loginDev: () => void;
  logout: () => Promise<void>;
};

const auth0 = new Auth0({ domain: auth0Config.domain, clientId: auth0Config.clientId });

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginInFlight = useRef(false);

  const login = useCallback(async () => {
    if (loginInFlight.current || isLoading) {
      return;
    }
    loginInFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      console.log('Auth0 redirectUrl', auth0Config.redirectUrl);
      const credentials = await auth0.webAuth.authorize({
        audience: auth0Config.audience,
        scope: auth0Config.scope,
        redirectUrl: auth0Config.redirectUrl,
      });
      setAccessToken(credentials.accessToken ?? null);
      const profile = await auth0.auth.userInfo({ token: credentials.accessToken ?? '' });
      setUserProfile(profile as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      if (message.toLowerCase().includes('active transaction')) {
        try {
          await auth0.webAuth.clearSession();
        } catch {
          // Ignore cleanup errors.
        }
      }
    } finally {
      setIsLoading(false);
      loginInFlight.current = false;
    }
  }, [isLoading]);

  const loginDev = useCallback(() => {
    setAccessToken('dev');
    setUserProfile({ name: 'Dev User', email: 'dev@local' });
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await auth0.webAuth.clearSession();
    } finally {
      setAccessToken(null);
      setUserProfile(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ accessToken, userProfile, isLoading, error, login, loginDev, logout }),
    [accessToken, userProfile, isLoading, error, login, loginDev, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
