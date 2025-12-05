// api-config.js
// Configuración centralizada para todas las llamadas a la API

const API_CONFIG = {
    BASE_URL: 'https://proyecto02-backend.onrender.com/api/v1',
    API_KEY: 'dev_api_key_2024_IC8057_cambiar_en_produccion',
    TOKEN_KEY: 'auth_token', // Key para localStorage
    USER_KEY: 'current_user' // Key para datos del usuario
};

// Utilidad para obtener el token del localStorage
function getAuthToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
}

// Utilidad para guardar el token
function setAuthToken(token) {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
}

// Utilidad para eliminar el token (logout)
function removeAuthToken() {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
}

// Utilidad para guardar datos del usuario
function setCurrentUser(user) {
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
}

// Utilidad para obtener datos del usuario
function getCurrentUser() {
    const userData = localStorage.getItem(API_CONFIG.USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

// Función centralizada para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    // Headers por defecto
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Agregar API Key si no es un endpoint que use solo JWT
    if (options.useApiKey !== false) {
        headers['x-api-key'] = API_CONFIG.API_KEY;
    }

    // Agregar token JWT si existe y se requiere autenticación
    if (options.requiresAuth) {
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (options.redirectOnNoAuth) {
            // Redirigir al login si no hay token
            window.location.href = '/index.html';
            throw new Error('No hay sesión activa');
        }
    }

    // Configuración completa de la petición
    const config = {
        method: options.method || 'GET',
        headers,
        ...options
    };

    // Agregar body si existe (y no es GET)
    if (options.body && config.method !== 'GET') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            // Manejar errores específicos
            if (response.status === 401) {
                // Token inválido o expirado
                removeAuthToken();
                if (options.redirectOnNoAuth) {
                    window.location.href = '/index.html';
                }
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
            
            // Intentar obtener el mensaje de error del servidor
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Error ${response.status}: ${response.statusText}`);
        }

        // Parsear respuesta JSON
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Funciones específicas para cada tipo de petición
const api = {
    // GET request
    get: (endpoint, options = {}) => {
        return apiRequest(endpoint, { method: 'GET', ...options });
    },

    // POST request
    post: (endpoint, body, options = {}) => {
        return apiRequest(endpoint, { method: 'POST', body, ...options });
    },

    // PUT request
    put: (endpoint, body, options = {}) => {
        return apiRequest(endpoint, { method: 'PUT', body, ...options });
    },

    // DELETE request
    delete: (endpoint, options = {}) => {
        return apiRequest(endpoint, { method: 'DELETE', ...options });
    }
};

// Exportar todo
export {
    API_CONFIG,
    api,
    getAuthToken,
    setAuthToken,
    removeAuthToken,
    getCurrentUser,
    setCurrentUser
};