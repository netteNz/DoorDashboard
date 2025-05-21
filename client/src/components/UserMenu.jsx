import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const UserMenu = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm"
      >
        <span className="bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </span>
        <span>{user?.username}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-10">
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-sm text-gray-300">Signed in as</p>
            <p className="text-sm font-medium truncate">{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;