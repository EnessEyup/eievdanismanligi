// API Configuration
const API_CONFIG = {
    // Render backend URL
    API_BASE_URL: 'https://eievdanismanligi.onrender.com',
    
    // Development için
    DEV_API_URL: 'http://localhost:3000',
    
    // Environment detection
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1',
    
    // Get the correct API URL
    getApiUrl() {
        return this.isDevelopment ? this.DEV_API_URL : this.API_BASE_URL;
    }
};

// Global API function - tüm fetch çağrılarında kullan
window.apiCall = function(endpoint, options = {}) {
    const url = `${API_CONFIG.getApiUrl()}${endpoint}`;
    console.log('apiCall called with:', endpoint, 'Full URL:', url);
    return fetch(url, options);
};

// Debug: Check if apiCall is loaded
console.log('config.js loaded, apiCall defined:', typeof window.apiCall);

// Global olarak kullanım için
window.API_CONFIG = API_CONFIG;