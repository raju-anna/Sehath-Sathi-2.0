// fileName: DashboardApp.js

// --- 1. CONSTANTS, ICONS, AND BACKEND SETUP ---
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = Array.from({ length: 24 }, (_, i) => i);
const BACKEND_URL = "http://localhost:8000/api/v1"; 

// The global Auth0 client, initialized in app.js (available on window)
const getAuth0Client = () => window.auth0Client; 

// --- ICONS ---
const getEditIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>`;
const getPillIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3 text-teal-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 11a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM15 12a1 1 0 100-2 1 1 0 000 2zM8 11a1 1 0 11-2 0 1 1 0 012 0zM12 15a1 1 0 100-2 1 1 0 000 2zM5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM8 5a.5.5 0 01.5.5v6a.5.5 0 11-1 0V5.5A.5.5 0 018 5zm4.5-.5a.5.5 0 00-1 0v6a.5.5 0 101 0V5.5a.5.5 0 00-.5-.5z" /><path d="M3 14a5 5 0 0010 0h-1a4 4 0 11-8 0H3z" /></svg>`;


// --- 2. GLOBAL STATE AND API ACCESS ---
let appData = { caregiver: {}, relatives: [] }; 
let isEditingSchedule = false;
let isEditingStock = false;
let activeRelativeId = null;
let scheduleTemplates = []; // Global store for reusable schedule templates

/** * Fetches an access token and performs an authenticated API request. */
const apiFetch = async (url, method = 'GET', body = null) => {
    const auth0Client = getAuth0Client();
    if (!auth0Client) throw new Error("Auth0 client not initialized.");

    const token = await auth0Client.getTokenSilently({
        authorizationParams: {
            // NOTE: Use the correct AUTH0_AUDIENCE defined in your .env file
            audience: "https://dev-mpfhifh03c0v8yf7.us.auth0.com/api/v2/" 
        }
    });

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const config = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.message || `API Error: ${response.status}`);
    }
    
    return data.data; 
};


// --- 3. DATA FETCHING/SYNCING FUNCTIONS ---

const loadScheduleAndStockData = async (patientId) => {
    try {
        // Fetch Medications/Stock for the active patient
        const medications = await apiFetch(`${BACKEND_URL}/medicines/${patientId}`, 'GET');

        // Fetch Medication Schedules for the active patient
        const medSchedules = await apiFetch(`${BACKEND_URL}/med-schedules/${patientId}`, 'GET');

        // Fetch all available Schedule Templates (for use in the UI)
        scheduleTemplates = await apiFetch(`${BACKEND_URL}/schedules`, 'GET');

        // Transform the fetched schedules into the structured dashboard format (Map Day -> Time -> Medicine)
        const scheduleMap = {};
        daysOfWeek.forEach(day => { scheduleMap[day] = {}; }); // Initialize
        
        medSchedules.forEach(item => {
            const day = item.schedule.dayOfWeek;
            const time = item.schedule.time.substring(0, 2); // e.g., '08:30' -> '08'
            const medicineName = item.medicine.name;
            const medScheduleId = item._id; // ID for deletion

            if (scheduleMap[day]) {
                scheduleMap[day][time] = { name: medicineName, id: medScheduleId };
            }
        });

        const activeRelative = appData.relatives.find(r => r.id === patientId);
        if (activeRelative) {
            activeRelative.medicationStock = medications.map(m => ({ 
                name: m.name, 
                currentStock: m.stock,
                id: m._id // Medication ID
            }));
            activeRelative.schedule = scheduleMap; // Store the mapped schedule
        }

    } catch (error) {
        console.error("Error loading patient details:", error);
        showSaveStatus("Failed to load patient's schedule and stock.", true);
    }
};


export const loadDataFromBackend = async () => {
    try {
        // Step 1: Sync (creates user if not exists)
        const syncedUser = await apiFetch(`${BACKEND_URL}/users/sync`, 'POST');
        appData.caretaker = { 
            id: syncedUser._id, 
            name: syncedUser.fullName, 
            email: syncedUser.email, 
            phoneNumber: syncedUser.phonenumber
        };
        
        // Step 2: Fetch relatives for the user
        const patientData = await apiFetch(`${BACKEND_URL}/patients`, 'GET');
        appData.relatives = patientData.map(p => ({
            id: p._id, 
            name: p.fullName,
            phoneNumber: 'N/A', // Not stored in current patient model
            schedule: {}, 
            medicationStock: [], 
            checkups: { registered: false, type: null } 
        }));

        if (!activeRelativeId && appData.relatives.length > 0) {
            activeRelativeId = appData.relatives[0].id;
        }
        
        if (activeRelativeId) {
            await loadScheduleAndStockData(activeRelativeId); 
        }

        return true;

    } catch (error) {
        console.error("Error loading data from backend:", error);
        showSaveStatus("Failed to sync user data. Please try logging in again.", true);
        return false;
    }
};

export const loadLocalData = loadDataFromBackend; // Alias for backward compatibility


// --- 4. API ACTIONS ---

const addRelativeOnBackend = async (fullName, phoneNumber) => {
    const newPatient = await apiFetch(`${BACKEND_URL}/patients`, 'POST', { 
        fullName, 
        phonenumber: phoneNumber
    });

    return { success: true, relative: {
        id: newPatient._id,
        name: newPatient.fullName,
        phoneNumber: phoneNumber,
        schedule: {},
        medicationStock: [],
        checkups: { registered: false, type: null }
    }};
};

const deleteMedScheduleOnBackend = async (medScheduleId) => {
    await apiFetch(`${BACKEND_URL}/med-schedules/${medScheduleId}`, 'DELETE');
};


// --- 5. REMAINDER OF UTILITIES AND RENDERING ---

const getActiveRelative = () => appData.relatives.find(r => r.id === activeRelativeId);

const setHtmlAndAttachListeners = (id, html, listeners = {}) => {
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = html;
        for (const [selector, handler] of Object.entries(listeners)) {
            element.querySelectorAll(selector).forEach(el => {
                el.addEventListener('click', handler);
            });
        }
    }
};

const showSaveStatus = (message, isError = false) => {
    const statusDiv = document.getElementById('save-status');
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden', 'text-green-500', 'text-red-500', 'bg-gray-700');
    statusDiv.classList.add(isError ? 'text-red-500' : 'text-green-500', 'bg-gray-700');
    
    setTimeout(() => { statusDiv.classList.add('hidden'); }, 3000);
};

// --- CORE RENDERING ---

const renderSidebar = () => {
    const sidebarList = document.getElementById('sidebar-relatives');
    if (!sidebarList) return;
    
    const html = appData.relatives.map(relative => `
        <li>
            <a href="#" data-relative-id="${relative.id}" 
                class="flex items-center p-3 rounded-lg text-sm font-medium ${relative.id === activeRelativeId ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-gray-700'}">
                ${relative.name}
            </a>
        </li>
    `).join('');
    
    sidebarList.innerHTML = html;

    sidebarList.querySelectorAll('a').forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            setActiveRelative(e.currentTarget.dataset.relativeId);
        };
    });
};

const createScheduleTable = (relative) => {
    let html = `<table class="w-full text-left table-auto">
        <thead>
            <tr class="border-b border-gray-600">
                <th class="p-3 text-sm font-medium text-gray-400 w-28">Time</th>`;
    daysOfWeek.forEach(day => { 
        html += `<th class="p-3 text-sm font-medium text-gray-400 min-w-[100px]">${day}</th>`; 
    });
    html += `</tr></thead><tbody>`;

    for (let hour = 0; hour < 24; hour++) {
        const time24 = String(hour).padStart(2, '0');
        const time12 = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
        html += `<tr class="border-b border-gray-700 hover:bg-gray-700/50">
            <td class="p-3 font-semibold text-gray-300">${time12}</td>`;
        
        daysOfWeek.forEach(day => {
            const entry = relative.schedule[day] ? relative.schedule[day][time24] : null;
            const medName = entry ? entry.name : '';
            const medId = entry ? entry.id : '';

            html += `<td class="p-3 text-sm relative">`;
            
            if (medName) {
                // Display the medicine and a delete button if editing
                html += `<div class="flex items-center justify-between bg-teal-800/30 p-1 rounded-md">
                    <span class="text-teal-300 font-medium">${medName}</span>
                    ${isEditingSchedule ? 
                        `<button data-id="${medId}" class="delete-schedule-btn text-red-400 hover:text-red-300 ml-2">
                           <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd" /></svg>
                        </button>` : ''}
                </div>`;
            } else if (isEditingSchedule) {
                 // Placeholder for 'Add' button in edit mode
                 html += `<button data-day="${day}" data-time="${time24}:00" class="add-schedule-btn text-gray-500 hover:text-teal-500 text-xs">Add Medication</button>`;
            }
            
            html += `</td>`;
        });

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    return html;
};

const renderScheduleSection = (relative) => {
    
    // Attach listener for dynamic delete buttons
    const listeners = isEditingSchedule ? {
        '.delete-schedule-btn': handleDeleteScheduleClick,
        '#schedule-save': handleSaveSchedule,
        '#schedule-cancel': handleCancelScheduleEdit,
    } : {
        '#schedule-edit': handleStartScheduleEdit
    };

    setHtmlAndAttachListeners('schedule-table-container', createScheduleTable(relative), listeners);
    
    setHtmlAndAttachListeners('schedule-buttons', isEditingSchedule ? 
        `<button id="schedule-save" class="bg-green-600 text-white py-1 px-3 rounded-lg text-sm">Save Changes</button>
         <button id="schedule-cancel" class="bg-gray-600 text-white py-1 px-3 rounded-lg text-sm ml-2">Cancel</button>` :
        `<button id="schedule-edit" class="bg-teal-600 text-white py-1 px-3 rounded-lg text-sm">Edit Schedule</button>`,
        listeners
    );
};

const renderStockSection = (relative) => {
    const stockHtml = relative.medicationStock.length > 0 ? 
        relative.medicationStock.map(m => `
            <div class="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                <span class="text-white">${m.name}</span>
                <span class="text-teal-400 font-semibold">${m.currentStock} units</span>
                ${isEditingStock ? `<button data-id="${m.id}" class="edit-stock-btn text-gray-400 hover:text-teal-300 ml-4">${getEditIcon()}</button>` : ''}
            </div>
        `).join('')
        : `<p class="text-gray-400">No medication stock is currently tracked for this relative.</p>`;
    
    setHtmlAndAttachListeners('stock-list', stockHtml);
    setHtmlAndAttachListeners('stock-buttons', isEditingStock ? 
        `<button id="stock-save" class="bg-green-600 text-white py-1 px-3 rounded-lg text-sm">Save</button>
         <button id="stock-cancel" class="bg-gray-600 text-white py-1 px-3 rounded-lg text-sm ml-2">Cancel</button>` :
        `<button id="stock-edit" class="bg-teal-600 text-white py-1 px-3 rounded-lg text-sm">Manage Stock</button>`,
        { '#stock-edit': handleStartStockEdit }
    );
};

const renderCheckupsSection = (relative) => {
    const content = relative.checkups.registered ?
        `<p class="text-gray-300">Registered for a ${relative.checkups.type} checkup schedule.</p>` :
        `<p class="text-gray-400 mb-4">No regular checkup schedule registered.</p>
         <div class="space-x-4">
            <button id="register-monthly" class="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-500">Register Monthly</button>
            <button id="register-quarterly" class="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-500">Register Quarterly</button>
         </div>`;
    setHtmlAndAttachListeners('checkup-content', content, {
        '#register-monthly': () => handleRegisterCheckup('Monthly'),
        '#register-quarterly': () => handleRegisterCheckup('Quarterly')
    });
};


const renderDashboardContent = () => {
    const relative = getActiveRelative();
    const headerElement = document.getElementById('relative-name-header');
    
    if (!relative) {
        headerElement.textContent = 'Welcome! You are connected.';
        document.getElementById('dashboard-content').innerHTML = `<div class="p-10 text-center text-gray-400">No relatives added yet. Click "Add Relative" to begin!</div>`;
        return;
    }

    headerElement.textContent = `Managing: ${relative.name}`;

    renderScheduleSection(relative);
    renderStockSection(relative);
    renderCheckupsSection(relative);
};

// --- CORE ACTIONS ---

const setActiveRelative = async (id) => { 
    activeRelativeId = id;
    isEditingSchedule = false; // Reset editing state on switch
    isEditingStock = false;
    await loadScheduleAndStockData(id);
    renderSidebar();
    renderDashboardContent();
};

const handleStartScheduleEdit = () => {
    isEditingSchedule = true;
    renderScheduleSection(getActiveRelative());
};

const handleCancelScheduleEdit = () => {
    isEditingSchedule = false;
    renderScheduleSection(getActiveRelative());
};

const handleSaveSchedule = async () => {
    // NOTE: Actual save logic is complex, just toggling state for now
    isEditingSchedule = false;
    renderScheduleSection(getActiveRelative());
    showSaveStatus("Schedule changes saved (API calls pending for full implementation).");
};

const handleDeleteScheduleClick = async (e) => {
    const medScheduleId = e.currentTarget.dataset.id;
    if (!medScheduleId || !confirm("Are you sure you want to remove this medication from the schedule?")) return;

    try {
        await deleteMedScheduleOnBackend(medScheduleId);
        await loadScheduleAndStockData(activeRelativeId);
        renderScheduleSection(getActiveRelative());
        showSaveStatus("Medication schedule removed successfully.");
    } catch (error) {
        console.error("Delete failed:", error);
        showSaveStatus(`Failed to remove schedule: ${error.message}`, true);
    }
};

const handleStartStockEdit = () => { isEditingStock = true; renderStockSection(getActiveRelative()); };
const handleCancelStockEdit = () => { isEditingStock = false; renderStockSection(getActiveRelative()); };
const handleSaveStock = async () => { isEditingStock = false; renderStockSection(getActiveRelative()); showSaveStatus("Stock changes saved (API calls pending)."); };
const handleRegisterCheckup = async (type) => { showSaveStatus(`Checkup registered as ${type} (API calls pending).`); };


const closeAddRelativeModal = () => {
    document.getElementById('add-relative-modal').classList.add('hidden');
    document.getElementById('add-relative-form').reset();
};

const handleAddRelativeSubmit = async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('new-relative-name').value;
    const phoneNumber = document.getElementById('new-relative-phone').value;

    try {
        const { relative } = await addRelativeOnBackend(fullName, phoneNumber);
        appData.relatives.push(relative);
        activeRelativeId = relative.id;
        closeAddRelativeModal();
        
        await loadScheduleAndStockData(activeRelativeId); // Load data for the new relative
        
        renderSidebar();
        renderDashboardContent();
        showSaveStatus(`${fullName} added successfully.`);
    } catch (error) {
        console.error(error);
        showSaveStatus(`Failed to add relative: ${error.message}`, true);
    }
};


// --- 6. INITIALIZATION ---

export const initializeDashboard = async () => {
    
    // Sync data and fetch all patients
    const dataLoaded = await loadDataFromBackend(); 
    
    if(dataLoaded){
        // Attach listeners for Modals/Forms
        document.getElementById('add-relative-form').onsubmit = handleAddRelativeSubmit;
        document.getElementById('add-relative-modal-open').onclick = () => {
            document.getElementById('add-relative-modal').classList.remove('hidden');
        };
        document.getElementById('add-relative-modal-close').onclick = closeAddRelativeModal;
        document.getElementById('add-relative-modal-cancel').onclick = closeAddRelativeModal;
        
        // Initial render
        renderSidebar();
        renderDashboardContent();
    }
};