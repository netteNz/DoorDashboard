/**
 * API client that automatically adds authentication headers
 */
const API_BASE_URL = 'http://localhost:5000';

const apiClient = {
  fetch: async (url, options = {}) => {
    // Get the token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Default options
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Merge options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };
    
    // Actually perform the fetch
    return await fetch(url, mergedOptions);
  },
  
  // Convenience methods
  get: (path, options = {}) => apiClient.fetch(`${API_BASE_URL}${path}`, {...options}),
  post: (path, data, options = {}) => apiClient.fetch(`${API_BASE_URL}${path}`, { 
    ...options, 
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (path, data, options = {}) => apiClient.fetch(`${API_BASE_URL}${path}`, { 
    ...options, 
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (path, options = {}) => apiClient.fetch(`${API_BASE_URL}${path}`, { 
    ...options, 
    method: 'DELETE' 
  }),
};

export default apiClient;