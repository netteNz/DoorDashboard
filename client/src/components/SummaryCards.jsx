import React, { useState, useEffect, useMemo, useCallback } from 'react';

const SummaryCards = () => {
  const [summaryData, setSummaryData] = useState({
    totalNet: 0,
    deliveriesMade: 0,
    avgPerDelivery: 0,
    totalDashTime: 0,
    totalActiveTime: 0,
    weeklyData: [],
    commonLocations: []
  });
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState('all'); // 'all', 'weekly'
  const [selectedWeek, setSelectedWeek] = useState(null);
  
  // Debug state to help identify issues
  const [debugData, setDebugData] = useState(null);

  // OPTIMIZATION: Split API calls to avoid blocking UI
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        
        // Add cache-busting parameter to prevent stale data
        const response = await fetch(`http://localhost:5000/api/summary?_=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch summary data');
        
        const data = await response.json();
        
        // Save debug data
        setDebugData(data);
        
        // Safety checks for null/undefined values
        const totalEarnings = data.total_earnings || 0;
        const totalGas = data.total_gas || 0;
        const totalOffers = data.total_deliveries || data.total_offers || 0;
        const totalDashMin = data.total_dash_min || 0;
        const totalActiveMin = data.total_active_min || 0;
        
        console.log("API Data:", data);
        console.log("Deliveries count from API:", totalOffers);
        
        // Calculate metrics from the data
        const totalNet = totalEarnings - totalGas;
        const deliveriesMade = totalOffers;
        const avgPerDelivery = deliveriesMade > 0 ? totalNet / deliveriesMade : 0;
        
        setSummaryData(prev => ({
          ...prev,
          totalNet,
          deliveriesMade,  // Make sure this is being set correctly
          avgPerDelivery,
          totalDashTime: totalDashMin,
          totalActiveTime: totalActiveMin
        }));
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching summary data:', error);
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, []);
  
  // OPTIMIZATION: Separate weekly data fetch
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        const weeklyResponse = await fetch('http://localhost:5000/api/weekly');
        const weeklyData = await weeklyResponse.json();
        
        // Get most recent week if available
        const mostRecentWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null;
        setSelectedWeek(mostRecentWeek);
        
        setSummaryData(prev => ({
          ...prev,
          weeklyData
        }));
      } catch (error) {
        console.error('Error fetching weekly data:', error);
      }
    };
    
    fetchWeeklyData();
  }, []);
  
  // OPTIMIZATION: Separate locations data fetch
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const locationResponse = await fetch('http://localhost:5000/api/locations');
        const locationData = await locationResponse.json();
        
        setSummaryData(prev => ({
          ...prev,
          commonLocations: locationData.slice(0, 5) // Top 5 locations
        }));
      } catch (error) {
        console.error('Error fetching location data:', error);
      }
    };
    
    fetchLocationData();
  }, []);

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  // Format time values (minutes to hours and minutes)
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // OPTIMIZATION: Memoize getCurrentViewData
  const currentData = useMemo(() => {
    if (timeView === 'weekly' && selectedWeek) {
      return {
        net: (selectedWeek.earnings || 0) - (selectedWeek.gas || 0),
        deliveries: selectedWeek.deliveries || 0,
        dashTime: selectedWeek.dash_minutes || 0,
        activeTime: selectedWeek.active_minutes || 0,
        weekRange: `${selectedWeek.start_date || ''} - ${selectedWeek.end_date || ''}`
      };
    }
    
    return {
      net: summaryData.totalNet || 0,
      deliveries: summaryData.deliveriesMade || 0,
      dashTime: summaryData.totalDashTime || 0,
      activeTime: summaryData.totalActiveTime || 0,
      weekRange: 'All Time'
    };
  }, [timeView, selectedWeek, summaryData.totalNet, summaryData.deliveriesMade, 
      summaryData.totalDashTime, summaryData.totalActiveTime]);
  
  // OPTIMIZATION: Memoize time efficiency calculation
  const timeEfficiency = useMemo(() => {
    if (currentData.dashTime === 0) return 0;
    return Math.round((currentData.activeTime / currentData.dashTime) * 100);
  }, [currentData.activeTime, currentData.dashTime]);

  // OPTIMIZATION: Use useCallback for event handlers
  const handleTimeViewChange = useCallback((view) => {
    setTimeView(view);
  }, []);
  
  const handleWeekChange = useCallback((e) => {
    const weekId = e.target.value;
    const week = summaryData.weeklyData.find(w => w.id.toString() === weekId);
    setSelectedWeek(week);
  }, [summaryData.weeklyData]);

  // Week selector component
  const WeekSelector = () => (
    <div className="flex items-center mb-5 bg-gray-900/50 p-3 rounded-lg">
      <div className="flex space-x-2 items-center mr-4">
        <span className="font-mono text-xs text-gray-400">View:</span>
        <button
          onClick={() => handleTimeViewChange('all')}
          className={`px-2 py-1 text-xs rounded ${
            timeView === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => handleTimeViewChange('weekly')}
          className={`px-2 py-1 text-xs rounded ${
            timeView === 'weekly' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Weekly
        </button>
      </div>
      
      {timeView === 'weekly' && (
        <select 
          className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded p-1"
          value={selectedWeek?.id || ''}
          onChange={handleWeekChange}
        >
          {summaryData.weeklyData.map(week => (
            <option key={week.id} value={week.id}>
              {week.start_date} - {week.end_date}
            </option>
          ))}
        </select>
      )}
      
      {timeView === 'weekly' && selectedWeek && (
        <span className="ml-auto text-xs text-cyan-400 font-mono">
          Week {selectedWeek.week_number}
        </span>
      )}
    </div>
  );

  // Debug display (you can comment this out in production)
  const renderDebugInfo = () => {
    if (!debugData) return null;
    
    return (
      <div className="mt-4 p-2 bg-gray-900 rounded text-xs">
        <p>Debug Info:</p>
        <pre className="text-green-500">{JSON.stringify(debugData, null, 2)}</pre>
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800/70 rounded-xl p-5 animate-pulse">
            <div className="h-5 bg-gray-700 rounded mb-3 w-2/3"></div>
            <div className="h-8 bg-gray-700 rounded w-4/5"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <WeekSelector />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Net Earnings Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Net Earnings</h3>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            {formatCurrency(currentData.net)}
          </p>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {currentData.weekRange}
          </div>
        </div>

        {/* Deliveries Made Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Deliveries Made</h3>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            {currentData.deliveries.toLocaleString()}
          </p>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {formatCurrency(currentData.net / (currentData.deliveries || 1))} per delivery
          </div>
        </div>

        {/* Time Efficiency Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Time Efficiency</h3>
          <div className="flex items-end">
            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              {timeEfficiency}%
            </p>
            <span className="text-gray-400 text-sm ml-2 mb-1">active/dash</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full" 
              style={{ width: `${timeEfficiency}%` }}
            ></div>
          </div>
        </div>

        {/* Dash Time Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Dash Time</h3>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
            {formatTime(currentData.dashTime)}
          </p>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {formatCurrency((currentData.net / (currentData.dashTime / 60)) || 0)}/hour
          </div>
        </div>

        {/* Active Time Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Active Time</h3>
          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {formatTime(currentData.activeTime)}
          </p>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {formatCurrency((currentData.net / (currentData.activeTime / 60)) || 0)}/active hour
          </div>
        </div>

        {/* Common Locations Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-1">Top Delivery Locations</h3>
          {summaryData.commonLocations.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {summaryData.commonLocations.map((location, idx) => (
                <li key={idx} className="flex items-center text-sm">
                  <span className="inline-block w-5 h-5 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs mr-2">
                    {idx + 1}
                  </span>
                  <span className="text-gray-300">{location.name}</span>
                  <span className="ml-auto text-gray-500 text-xs">{location.count}x</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm mt-2">No location data available</p>
          )}
        </div>
      </div>

      {renderDebugInfo()}
    </>
  );
};

export default React.memo(SummaryCards);