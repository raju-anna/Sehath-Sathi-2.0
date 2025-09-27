// app.js

// FIX: Changed path to be relative and removed unused import.
import { initializeDashboard } from './DashboardApp.js';

// --- Auth0 Configuration ---
const auth0Domain = "dev-mpfhifh03c0v8yf7.us.auth0.com";
const auth0ClientId = "KpskD2cytql2jh92kCnpOlUNMVMCdFuU";

let auth0Client = null;

// --- VIEW MANAGEMENT ---
const showView = (viewId) => {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    
    document.getElementById(viewId).classList.remove('hidden');
    
    // If switching to dashboard, initialize the logic
    if (viewId === 'dashboard-view' && initializeDashboard) {
        initializeDashboard();
    }
};

// --- 1. Client Initialization ---
const configureClient = async () => {
    try {
        auth0Client = await auth0.createAuth0Client({
            domain: auth0Domain,
            clientId: auth0ClientId,
            authorizationParams: { redirect_uri: window.location.origin }
        });
        // Make the client globally accessible for DashboardApp.js
        window.auth0Client = auth0Client;
        return true;
    } catch (err) {
        console.error("Error configuring Auth0 client:", err);
        showView('landing-view');
        return false;
    }
};

// --- 2. Handle Login/Callback ---
const handleRedirectCallback = async () => {
    const url = window.location.search;
    if (url.includes("code=") && url.includes("state=")) {
        console.log("Processing Auth0 callback...");
        
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
        
        if (await auth0Client.isAuthenticated()) {
            console.log("Authentication successful! Showing dashboard.");
            showView('dashboard-view');
            return true;
        }
    }
    return false;
};

// --- 3. Function to trigger login ---
const login = (screenHint = null) => {
    if (!auth0Client) return;
    
    const loginOptions = { authorizationParams: {} };
    if (screenHint) loginOptions.authorizationParams.screen_hint = screenHint;
    
    auth0Client.loginWithRedirect(loginOptions);
};

// --- 4. Function to handle Logout ---
const logoutButton = document.getElementById('logout-btn');
if (logoutButton) {
    logoutButton.onclick = async () => {
        if (!auth0Client) return;
        await auth0Client.logout({
            logoutParams: { returnTo: window.location.origin }
        });
    };
}


// --- 5. Main Execution Flow ---
window.addEventListener('load', async () => {
    // 1. Show loading screen
    showView('loading-overlay');
    
    // 2. Configure Auth0 client
    const clientConfigured = await configureClient();

    if (clientConfigured && auth0Client) {
        
        // 3. Bind buttons
        document.getElementById('login-button')?.addEventListener('click', () => login());
        document.getElementById('signup-button')?.addEventListener('click', () => login('signup'));
        document.getElementById('cta-button')?.addEventListener('click', () => login('signup'));

        // 4. Check for and handle callback
        const isCallback = await handleRedirectCallback();
        if (isCallback) return;

        // 5. Check for existing session
        if (await auth0Client.isAuthenticated()) {
             console.log("Session found. Showing dashboard.");
             showView('dashboard-view');
             return;
        }

        // 6. Fallback: Show landing page
        showView('landing-view');
    }
});