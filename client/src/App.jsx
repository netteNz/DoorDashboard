import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import './index.css'

// OPTIMIZATION: Use lazy loading for components
const EarningsChart = lazy(() => import('./components/EarningsChart'));
const SummaryCards = lazy(() => import('./components/SummaryCards'));
const RestaurantDeliveries = lazy(() => import('./components/RestaurantDeliveries'));
const SessionInput = lazy(() => import('./components/SessionInput'));
const SessionManager = lazy(() => import('./components/SessionManager'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="h-80 bg-gray-700/50 rounded"></div>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Options: 'dashboard', 'add', 'manage'
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // OPTIMIZATION: Use useCallback for event handlers
  const handleDataChanged = useCallback(() => {
    // Trigger data refresh in child components
    setDataRefreshTrigger(prev => prev + 1);
  }, []);
  
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black text-gray-200 min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="font-sans text-4xl text-center my-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 font-bold">
          DoorDash Tracker
        </h1>
        
        {/* Tab navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 p-1 rounded-lg flex">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('add')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'add' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Add Session
            </button>
            <button
              onClick={() => handleTabChange('manage')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'manage' 
                  ? 'bg-amber-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Manage Sessions
            </button>
          </div>
        </div>
        
        {/* Content based on active tab */}
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'dashboard' && (
            <>
              <EarningsChart key={`chart-${dataRefreshTrigger}`} />
              <SummaryCards key={`summary-${dataRefreshTrigger}`} />
              <RestaurantDeliveries key={`restaurants-${dataRefreshTrigger}`} />
            </>
          )}
          
          {activeTab === 'add' && (
            <SessionInput onSessionAdded={handleDataChanged} />
          )}
          
          {activeTab === 'manage' && (
            <SessionManager onSessionDeleted={handleDataChanged} />
          )}
        </Suspense>
      </div>
    </div>
  )
}

export default App