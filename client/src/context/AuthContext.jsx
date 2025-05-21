import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Debug statement to check token
        console.log("Verifying token:", token ? token.substring(0, 15) + "..." : "No token");

        const response = await apiClient.get('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          const data = await response.json();
          console.error("Token verification failed:", data.error);
          logout();
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      // PROBLEM: This is using a relative URL which goes to the Vite server
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password })
      // });

      // SOLUTION: Use apiClient which adds the correct base URL
      const response = await apiClient.post('/api/auth/login', { 
        username, password 
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Login failed';
        } catch (e) {
          errorMessage = `Login failed: ${errorText || 'Unknown error'}`;
        }
        throw new Error(errorMessage);
      }

      // Add error handling for JSON parsing
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("JSON parsing error:", e);
        throw new Error("Failed to parse server response");
      }

      localStorage.setItem('auth_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password, email) => {
    setLoading(true);
    setError(null);

    try {
      // Use apiClient.post instead of fetch
      const response = await apiClient.post('/api/auth/register', { 
        username, password, email 
      });

      // Same error handling as login
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Registration failed';
        } catch (e) {
          errorMessage = `Registration failed: ${errorText || 'Unknown error'}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("JSON parsing error:", e);
        throw new Error("Failed to parse server response");
      }

      localStorage.setItem('auth_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};