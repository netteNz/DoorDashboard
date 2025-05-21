import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import apiClient from '../utils/apiClient';

// Move getMerchantType outside the component
const getMerchantType = (merchantName) => {
  // Shopping/Pharmacy merchants
  if (/cvs|walgreens|walmart|target|dollar general|dollar tree|family dollar|rite aid|7-eleven|circle k/i.test(merchantName)) {
    return 'Shopping';
  }
  
  // Grocery stores
  if (/kroger|publix|safeway|albertsons|aldi|whole foods|trader joe|wegmans|sprouts|food lion|giant eagle|meijer|h-e-b|shoprite/i.test(merchantName)) {
    return 'Grocery';
  }
  
  // Fast food
  if (/mcdonald|burger king|wendy|taco bell|kfc|chipotle|subway|pizza hut|domino|popeyes|chick-fil-a|sonic|arby|jimmy john|five guys/i.test(merchantName)) {
    return 'Fast Food';
  }
  
  // Default to Restaurant
  return 'Restaurant';
};

const RestaurantDeliveries = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'deliveries_count',
    direction: 'descending',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(10);
  const [typeFilter, setTypeFilter] = useState('All');
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/restaurants');
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant data');
        }
        const data = await response.json();
        
        // Add safeguards for processing restaurant data
        const enrichedData = data.map(item => ({
          ...item,
          merchant_type: getMerchantType(item.name),
          // Ensure numeric values
          deliveries_count: Number(item.deliveries_count || 0),
          base_pay_total: Number(item.base_pay_total || 0),
          tips_total: Number(item.tips_total || 0),
          total_earnings: Number(item.total_earnings || 0),
          avg_per_delivery: Number(item.avg_per_delivery || 0)
        }));
        
        setRestaurants(enrichedData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching restaurant data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // OPTIMIZATION: Memoize sorted restaurants
  const sortedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [restaurants, sortConfig.key, sortConfig.direction]);
  
  // OPTIMIZATION: Memoize filtered restaurants
  const filteredRestaurants = useMemo(() => {
    return sortedRestaurants
      .filter(restaurant => restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(restaurant => typeFilter === 'All' || restaurant.merchant_type === typeFilter);
  }, [sortedRestaurants, searchTerm, typeFilter]);
  
  // OPTIMIZATION: Memoize displayed restaurants
  const displayedRestaurants = useMemo(() => {
    return filteredRestaurants.slice(0, displayCount);
  }, [filteredRestaurants, displayCount]);
  
  // OPTIMIZATION: Memoize summary data
  const summaryData = useMemo(() => {
    if (restaurants.length === 0) return null;
    
    return {
      totalRestaurants: restaurants.length,
      totalDeliveries: restaurants.reduce((sum, r) => sum + r.deliveries_count, 0),
      avgPerDelivery: restaurants.reduce((sum, r) => sum + r.total_earnings, 0) / 
                    restaurants.reduce((sum, r) => sum + r.deliveries_count, 0),
      mostFrequent: [...restaurants].sort((a, b) => b.deliveries_count - a.deliveries_count)[0]?.name,
      highestPaying: [...restaurants].sort((a, b) => b.avg_per_delivery - a.avg_per_delivery)[0]?.name,
    };
  }, [restaurants]);
  
  // OPTIMIZATION: Memoize merchant types
  const merchantTypes = useMemo(() => {
    return ['All', ...new Set(restaurants.map(r => r.merchant_type))];
  }, [restaurants]);
  
  // OPTIMIZATION: Memoize stats by type
  const statsByType = useMemo(() => {
    return restaurants.reduce((acc, restaurant) => {
      const type = restaurant.merchant_type;
      if (!acc[type]) {
        acc[type] = { count: 0, earnings: 0, deliveries: 0 };
      }
      acc[type].count++;
      acc[type].earnings += restaurant.total_earnings;
      acc[type].deliveries += restaurant.deliveries_count;
      return acc;
    }, {});
  }, [restaurants]);
  
  // OPTIMIZATION: Use useCallback for handlers
  const handleSort = useCallback((key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig.key, sortConfig.direction]);
  
  if (loading) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
        <div className="text-red-500 font-mono">Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
      <h2 className="font-mono text-xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        Merchant Deliveries
      </h2>
      
      {/* Search and filter controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search merchants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {merchantTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <select 
            value={displayCount}
            onChange={(e) => setDisplayCount(Number(e.target.value))}
            className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={1000}>All</option>
          </select>
        </div>
      </div>
      
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Total Merchants</div>
            <div className="text-2xl font-bold">{summaryData.totalRestaurants}</div>
            <div className="text-xs text-gray-400 mt-1">
              {Object.entries(statsByType).map(([type, data]) => (
                <span key={type} className="mr-2">{type}: {data.count}</span>
              ))}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Most Frequent</div>
            <div className="text-lg font-medium truncate">{summaryData.mostFrequent}</div>
            <div className="text-xs text-gray-400">
              {getMerchantType(summaryData.mostFrequent)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Highest Paying Avg</div>
            <div className="text-lg font-medium truncate">{summaryData.highestPaying}</div>
            <div className="text-xs text-gray-400">
              {getMerchantType(summaryData.highestPaying)}
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        {displayedRestaurants.length > 30 ? (
          <List
            height={400}
            itemCount={displayedRestaurants.length}
            itemSize={35}
            width="100%"
          >
            {({ index, style }) => {
              const restaurant = displayedRestaurants[index];
              return (
                <div style={style} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'}>
                  <div className="px-4 py-3 text-sm">{restaurant.name}</div>
                  <div className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      restaurant.merchant_type === 'Restaurant' ? 'bg-blue-900/50 text-blue-200' :
                      restaurant.merchant_type === 'Shopping' ? 'bg-purple-900/50 text-purple-200' :
                      restaurant.merchant_type === 'Grocery' ? 'bg-green-900/50 text-green-200' :
                      restaurant.merchant_type === 'Fast Food' ? 'bg-amber-900/50 text-amber-200' :
                      'bg-gray-900/50 text-gray-200'
                    }`}>
                      {restaurant.merchant_type}
                    </span>
                  </div>
                  <div className="px-4 py-3 text-sm">{restaurant.deliveries_count}</div>
                  <div className="px-4 py-3 text-sm">${restaurant.base_pay_total.toFixed(2)}</div>
                  <div className="px-4 py-3 text-sm">${restaurant.tips_total.toFixed(2)}</div>
                  <div className="px-4 py-3 text-sm">${restaurant.total_earnings.toFixed(2)}</div>
                  <div className="px-4 py-3 text-sm">${restaurant.avg_per_delivery.toFixed(2)}</div>
                </div>
              );
            }}
          </List>
        ) : (
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Merchant
                  {sortConfig.key === 'name' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('merchant_type')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Type
                  {sortConfig.key === 'merchant_type' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('deliveries_count')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Deliveries
                  {sortConfig.key === 'deliveries_count' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('base_pay_total')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Base Pay
                  {sortConfig.key === 'base_pay_total' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('tips_total')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Tips
                  {sortConfig.key === 'tips_total' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('total_earnings')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Total
                  {sortConfig.key === 'total_earnings' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  onClick={() => handleSort('avg_per_delivery')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30"
                >
                  Avg Per Delivery
                  {sortConfig.key === 'avg_per_delivery' && (
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayedRestaurants.map((restaurant, index) => (
                <tr key={restaurant.name} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'}>
                  <td className="px-4 py-3 text-sm">{restaurant.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      restaurant.merchant_type === 'Restaurant' ? 'bg-blue-900/50 text-blue-200' :
                      restaurant.merchant_type === 'Shopping' ? 'bg-purple-900/50 text-purple-200' :
                      restaurant.merchant_type === 'Grocery' ? 'bg-green-900/50 text-green-200' :
                      restaurant.merchant_type === 'Fast Food' ? 'bg-amber-900/50 text-amber-200' :
                      'bg-gray-900/50 text-gray-200'
                    }`}>
                      {restaurant.merchant_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{restaurant.deliveries_count}</td>
                  <td className="px-4 py-3 text-sm">${restaurant.base_pay_total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">${restaurant.tips_total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">${restaurant.total_earnings.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">${restaurant.avg_per_delivery.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {displayCount < filteredRestaurants.length && (
        <div className="mt-4 text-center">
          <button 
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Show More
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(RestaurantDeliveries);