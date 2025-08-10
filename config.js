// API Configuration
const API_CONFIG = {
    // Railway backend URL - BURADA Railway domain'inizi yazın
    API_BASE_URL: 'https://eievdanismanligi-production.up.railway.app',
    
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

// Global olarak kullanım için
window.API_CONFIG = API_CONFIG;