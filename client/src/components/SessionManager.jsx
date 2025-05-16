import { useState, useEffect } from 'react';

const SessionManager = ({ onSessionDeleted }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

  // Fetch all sessions when component mounts
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/sessions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data.sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (session) => {
    setSelectedSession(session);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSession) return;
    
    try {
      setDeleteStatus('deleting');
      const sessionId = selectedSession.id || sessions.indexOf(selectedSession);
      
      const response = await fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
      
      // Remove from local state
      setSessions(prevSessions => prevSessions.filter(s => s !== selectedSession));
      setDeleteStatus('success');
      
      // Notify parent component
      if (onSessionDeleted) {
        onSessionDeleted();
      }
      
      // Clear status after delay
      setTimeout(() => {
        setDeleteStatus('');
        setIsConfirmOpen(false);
        setSelectedSession(null);
      }, 2000);
      
    } catch (err) {
      setDeleteStatus('error');
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-xl">
      <h2 className="font-mono text-xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        Manage Sessions
      </h2>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading sessions...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Deliveries</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Earnings</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Active Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dash Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sessions.map((session, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'}>
                  <td className="px-4 py-2 text-sm">{formatDate(session.date)}</td>
                  <td className="px-4 py-2 text-sm">{session.deliveries_count || 0}</td>
                  <td className="px-4 py-2 text-sm">
                    ${session.deliveries?.reduce((sum, d) => sum + d.total, 0).toFixed(2) || "0.00"}
                  </td>
                  <td className="px-4 py-2 text-sm">{session.active_time_minutes || 0} min</td>
                  <td className="px-4 py-2 text-sm">{session.dash_time_minutes || 0} min</td>
                  <td className="px-4 py-2 text-sm">
                    <button 
                      onClick={() => handleDeleteClick(session)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 max-w-md w-full">
            <h3 className="text-xl mb-4">Confirm Deletion</h3>
            
            {deleteStatus === 'success' ? (
              <div className="bg-green-900/30 border border-green-800 text-green-200 px-4 py-2 rounded-lg mb-4">
                Session deleted successfully!
              </div>
            ) : deleteStatus === 'error' ? (
              <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-lg mb-4">
                {error || 'Failed to delete session'}
              </div>
            ) : (
              <>
                <p className="mb-4">
                  Are you sure you want to delete this session from {selectedSession ? formatDate(selectedSession.date) : ''}?
                  <br />
                  <span className="text-red-400">This action cannot be undone.</span>
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsConfirmOpen(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                    disabled={deleteStatus === 'deleting'}
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                    disabled={deleteStatus === 'deleting'}
                  >
                    {deleteStatus === 'deleting' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;