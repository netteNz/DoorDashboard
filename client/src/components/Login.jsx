import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { login, register, error, loading } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password, email } = formData;

    if (isLoginMode) {
      await login(username, password);
    } else {
      await register(username, password, email || '');
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl max-w-md mx-auto">
      <h2 className="font-mono text-xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        {isLoginMode ? 'Login' : 'Create Account'}
      </h2>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {!isLoginMode && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={toggleMode}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {isLoginMode ? 'Need an account?' : 'Already have an account?'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Processing...' : isLoginMode ? 'Login' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;