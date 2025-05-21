import { useState } from 'react';
import apiClient from '../utils/apiClient'; // Adjust the import based on your project structure

const SessionInput = ({ onSessionAdded }) => {
  const [sessionData, setSessionData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    active_time_minutes: '',
    dash_time_minutes: '',
    deliveries_count: 0,
    deliveries: []
  });
  
  const [currentDelivery, setCurrentDelivery] = useState({
    restaurant: '',
    doordash_pay: 0,
    tip: 0,
    total: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Auto-calculate total
  const calculateTotal = (base, tip) => {
    const baseValue = parseFloat(base) || 0;
    const tipValue = parseFloat(tip) || 0;
    return (baseValue + tipValue).toFixed(2);
  };

  // Update delivery form field
  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
    
    const updatedDelivery = { 
      ...currentDelivery, 
      [name]: name === 'restaurant' ? value : parseFloat(value) || 0 
    };
    
    // Auto-calculate total when base pay or tip changes
    if (name === 'doordash_pay' || name === 'tip') {
      updatedDelivery.total = calculateTotal(
        name === 'doordash_pay' ? value : currentDelivery.doordash_pay,
        name === 'tip' ? value : currentDelivery.tip
      );
    }
    
    setCurrentDelivery(updatedDelivery);
  };

  // Add current delivery to the list
  const addDelivery = () => {
    if (!currentDelivery.restaurant) {
      setError('Please enter a restaurant name');
      return;
    }

    setSessionData({
      ...sessionData,
      deliveries: [...sessionData.deliveries, {...currentDelivery}],
      deliveries_count: sessionData.deliveries_count + 1
    });
    
    setCurrentDelivery({
      restaurant: '',
      doordash_pay: 0,
      tip: 0,
      total: 0
    });
    
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (sessionData.deliveries.length === 0) {
      setError('Please add at least one delivery');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/api/sessions', sessionData);
      
      if (!response.ok) {
        throw new Error('Failed to add session');
      }
      
      const result = await response.json();
      setSuccess(true);
      
      // Reset form
      setSessionData({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        active_time_minutes: '',
        dash_time_minutes: '',
        deliveries_count: 0,
        deliveries: []
      });
      
      // Notify parent component
      if (onSessionAdded) {
        onSessionAdded();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle general form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSessionData({
      ...sessionData,
      [name]: name.includes('_minutes') ? parseInt(value) || '' : value
    });
  };

  // Remove a delivery from the list
  const removeDelivery = (index) => {
    const updatedDeliveries = [...sessionData.deliveries];
    updatedDeliveries.splice(index, 1);
    
    setSessionData({
      ...sessionData,
      deliveries: updatedDeliveries,
      deliveries_count: updatedDeliveries.length
    });
  };

  // Merchant type suggestions based on your existing categories
  const getMerchantTypeClass = (name) => {
    if (/cvs|walgreens|walmart|target|dollar general|dollar tree|family dollar|rite aid|7-eleven|circle k/i.test(name)) {
      return 'bg-purple-900/50 text-purple-200';
    } else if (/kroger|publix|safeway|albertsons|aldi|whole foods|trader joe|wegmans|sprouts|food lion|giant eagle|meijer|h-e-b|shoprite/i.test(name)) {
      return 'bg-green-900/50 text-green-200';
    } else if (/mcdonald|burger king|wendy|taco bell|kfc|chipotle|subway|pizza hut|domino|popeyes|chick-fil-a|sonic|arby|jimmy john|five guys/i.test(name)) {
      return 'bg-amber-900/50 text-amber-200';
    } 
    return 'bg-blue-900/50 text-blue-200';
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
      <h2 className="font-mono text-xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        Add New Dash Session
      </h2>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/30 border border-green-800 text-green-200 px-4 py-2 rounded-lg mb-4">
          Session added successfully!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={sessionData.date}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
            <input
              type="time"
              name="start_time"
              value={sessionData.start_time}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
            <input
              type="time"
              name="end_time"
              value={sessionData.end_time}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Active Time (minutes)</label>
            <input
              type="number"
              name="active_time_minutes"
              value={sessionData.active_time_minutes}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Dash Time (minutes)</label>
            <input
              type="number"
              name="dash_time_minutes"
              value={sessionData.dash_time_minutes}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="border-t border-gray-700 my-6 pt-6">
          <h3 className="font-mono text-lg mb-4">Deliveries ({sessionData.deliveries_count})</h3>
          
          {/* List of already added deliveries */}
          {sessionData.deliveries.length > 0 && (
            <div className="mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Merchant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Base Pay</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tip</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sessionData.deliveries.map((delivery, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'}>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center">
                            <span>{delivery.restaurant}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getMerchantTypeClass(delivery.restaurant)}`}>
                              {/cvs|walgreens|walmart|target|dollar general|dollar tree/i.test(delivery.restaurant) ? 'Shopping' : 
                               /kroger|publix|safeway|albertsons|aldi|whole foods/i.test(delivery.restaurant) ? 'Grocery' :
                               /mcdonald|burger king|wendy|taco bell|kfc|chipotle/i.test(delivery.restaurant) ? 'Fast Food' : 'Restaurant'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">${delivery.doordash_pay.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm">${delivery.tip.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm">${delivery.total}</td>
                        <td className="px-4 py-2 text-sm">
                          <button 
                            type="button"
                            onClick={() => removeDelivery(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Add new delivery form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Restaurant</label>
              <input
                type="text"
                name="restaurant"
                value={currentDelivery.restaurant}
                onChange={handleDeliveryChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Restaurant name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">DoorDash Pay</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="doordash_pay"
                  value={currentDelivery.doordash_pay}
                  onChange={handleDeliveryChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-8 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Customer Tip</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="tip"
                  value={currentDelivery.tip}
                  onChange={handleDeliveryChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-8 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Total</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="total"
                  value={currentDelivery.total}
                  readOnly
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-8 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={addDelivery}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm mb-6"
          >
            Add Delivery
          </button>
        </div>
        
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => {
              // Force reload the page to refresh all data
              window.location.reload();
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Refresh Data
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionInput;