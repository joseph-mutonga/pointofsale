// In Electron production, relative URLs (like /api) resolve to file:///api, which fails.
// We need to point to the actual Express server.
const isElectron = typeof window !== 'undefined' && window.api !== undefined;
const API_BASE_URL = isElectron ? 'http://localhost:5001/api' : '/api';

// Capture the existing Electron bridge if it exists BEFORE it might be overwritten
const electronBridge = window.api;

async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Error' }));
      throw new Error(error.message || `Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  login: (username, password) => apiFetch('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getAppLogo: async () => {
    if (electronBridge && electronBridge.getAppLogo) return electronBridge.getAppLogo();
    return '';
  },
  getItemByCode: (code) => apiFetch(`/items?code=${code}`),
  getAllItems: () => apiFetch('/items'),
  processSale: (saleData) => apiFetch('/sales/process', { method: 'POST', body: JSON.stringify(saleData) }),
  upsertItem: (item) => apiFetch('/items/upsert', { method: 'POST', body: JSON.stringify(item) }),
  deleteItem: (id) => apiFetch(`/items/${id}`, { method: 'DELETE' }),
  getSales: () => apiFetch('/sales'),
  getLowStock: () => apiFetch('/items/low-stock'),
  getSalesReports: (range) => apiFetch(`/reports/${range}`),
  getUsers: () => apiFetch('/users'),
  upsertUser: (user) => apiFetch('/users/upsert', { method: 'POST', body: JSON.stringify(user) }),
  getSaleItems: (saleId) => apiFetch(`/sales/${saleId}/items`),
  getMaterials: () => apiFetch('/materials'),
  getColors: () => apiFetch('/colors'),
  getServices: () => apiFetch('/services'),
  addService: (data) => apiFetch('/services', { method: 'POST', body: JSON.stringify(data) }),
  getFittingDeposits: () => apiFetch('/fitting-deposits'),
  addFittingDeposit: (data) => apiFetch('/fitting-deposits', { method: 'POST', body: JSON.stringify(data) }),
  updateFittingPayment: (data) => apiFetch(`/fitting-deposits/${data.id}/payment`, { method: 'PATCH', body: JSON.stringify(data) }),
  getTailoringOrders: () => apiFetch('/tailoring-orders'),
  addTailoringOrder: (data) => apiFetch('/tailoring-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateTailoringPayment: (data) => apiFetch(`/tailoring-orders/${data.id}/payment`, { method: 'PATCH', body: JSON.stringify(data) }),
  getExpenses: () => apiFetch('/expenses'),
  addExpense: (data) => apiFetch('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  getWorkforce: () => apiFetch('/workforce'),
  addWorker: (data) => apiFetch('/workforce', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorker: (id) => apiFetch(`/workforce/${id}`, { method: 'DELETE' }),
  workerLogin: (username, password) => apiFetch('/workforce/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  upsertWorker: (data) => apiFetch(`/workforce/${data.id}/credentials`, { method: 'PATCH', body: JSON.stringify(data) }),
  getProductionLogs: () => apiFetch('/production-logs'),
  addProductionLog: (data) => apiFetch('/production-logs', { method: 'POST', body: JSON.stringify(data) }),
  getWorkforcePayments: () => apiFetch('/workforce-payments'),
  addWorkforcePayment: (data) => apiFetch('/workforce-payments', { method: 'POST', body: JSON.stringify(data) }),
  getAssignableTasks: () => apiFetch('/worker-tasks/assignable'),
  getWorkerTasks: (workerId) => apiFetch(workerId ? `/worker-tasks?worker_id=${workerId}` : '/worker-tasks'),
  assignTask: (data) => apiFetch('/worker-tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTaskStatus: (data) => apiFetch(`/worker-tasks/${data.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: data.status }) }),
  unassignTask: (id) => apiFetch(`/worker-tasks/${id}`, { method: 'DELETE' }),
  getSettings: () => apiFetch('/settings'),
  updateSettings: (settings) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  getGallery: () => apiFetch('/gallery'),
  addMaterial: (name) => apiFetch('/materials', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteMaterial: (id) => apiFetch(`/materials/${id}`, { method: 'DELETE' }),
  addColor: (code, name) => apiFetch('/colors', { method: 'POST', body: JSON.stringify({ color_code: code, color_name: name }) }),
  deleteColor: (id) => apiFetch(`/colors/${id}`, { method: 'DELETE' }),
  backupDb: () => apiFetch('/backup'),
  getPrinters: () => {
    if (electronBridge && electronBridge.getPrinters) return electronBridge.getPrinters();
    return [];
  },
  // Smart Print: Silent if in Electron, dialog if in Browser
  print: (html) => {
    if (electronBridge && electronBridge.print) {
      return electronBridge.print(html);
    }
    // Browser Fallback
    const win = window.open('', '_blank');
    if (!win) return { success: false, message: 'Pop-up blocked. Please allow pop-ups for printing.' };
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    return { success: true };
  }
};

// Globalize the unified API for compatibility with existing code
window.api = api;
