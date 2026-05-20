import { useState, useEffect, useCallback } from 'react';
import logo from './assets/logo.png';
import PrinterSettings from './components/PrinterSettings';

export default function AdminPanel({ user, onBack, showToast, printExpenseReceipt, printWorkforcePaymentReceipt, base64Logo, loadData }) {
    const [view, setView] = useState('inventory');
    const [items, setItems] = useState([]);
    const [users, setUsers] = useState([]);
    const [sales, setSales] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [reportRange, setReportRange] = useState('daily');
    const [reportData, setReportData] = useState(null);
    const [filterDate, setFilterDate] = useState('');
    const [searchRef, setSearchRef] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [filterCustom, setFilterCustom] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [colors, setColors] = useState([]);
    const [services, setServices] = useState([]);
    const [fittingDeposits, setFittingDeposits] = useState([]);
    const [tailoringOrders, setTailoringOrders] = useState([]);
    const [tailoringOrderToView, setTailoringOrderToView] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [workforce, setWorkforce] = useState([]);
    const [productionLogs, setProductionLogs] = useState([]);
    const [workforcePayments, setWorkforcePayments] = useState([]);
    const [workforceDateFilter, setWorkforceDateFilter] = useState('');
    const [settings, setSettings] = useState({});
    const [printers, setPrinters] = useState([]);
    const [galleryItems, setGalleryItems] = useState([]);
    const [galleryEdit, setGalleryEdit] = useState(null);
    const [workerTasks, setWorkerTasks] = useState([]);
    const [assignableTasks, setAssignableTasks] = useState({ services: [], tailoring: [] });
    const [workerLoginEdit, setWorkerLoginEdit] = useState(null);

    const [selectedSale, setSelectedSale] = useState(null);
    const [saleItems, setSaleItems] = useState([]);
    const [itemEdit, setItemEdit] = useState(null);
    const [userEdit, setUserEdit] = useState(null);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ show: true, message, onConfirm });
    };
    const closeConfirm = () => setConfirmDialog({ show: false, message: '', onConfirm: null });

    const loadAll = useCallback(async () => {
        try {
            if (view === 'inventory') {
                const res = await window.api.getAllItems();
                setItems(res || []);
            } else if (view === 'low_stock') {
                const res = await window.api.getLowStock();
                setLowStock(res || []);
            } else if (view === 'users') {
                const res = await window.api.getUsers();
                setUsers(res || []);
            } else if (view === 'sales') {
                const res = await window.api.getSales();
                setSales(res || []);
            } else if (view === 'reports') {
                const res = await window.api.getSalesReports(reportRange);
                setReportData(res);
            } else if (view === 'resources') {
                const mats = await window.api.getMaterials();
                const cols = await window.api.getColors();
                setMaterials(mats || []);
                setColors(cols || []);
            } else if (view === 'services') {
                const srvs = await window.api.getServices();
                setServices(srvs || []);
            } else if (view === 'fittings') {
                const fits = await window.api.getFittingDeposits();
                setFittingDeposits(fits || []);
            } else if (view === 'tailoring') {
                const tords = await window.api.getTailoringOrders();
                setTailoringOrders(tords || []);
            } else if (view === 'deadlines') {
                const tords = await window.api.getTailoringOrders();
                setTailoringOrders(tords || []);
            } else if (view === 'expenses') {
                const exps = await window.api.getExpenses();
                setExpenses(exps || []);
            } else if (view === 'workforce') {
                const wf = await window.api.getWorkforce();
                const pl = await window.api.getProductionLogs();
                const wp = await window.api.getWorkforcePayments();
                const wt = await window.api.getWorkerTasks();
                const at = await window.api.getAssignableTasks();
                setWorkforce(wf || []);
                setProductionLogs(pl || []);
                setWorkforcePayments(wp || []);
                setWorkerTasks(wt || []);
                setAssignableTasks(at || { services: [], tailoring: [] });
            } else if (view === 'gallery') {
                const res = await window.api.getGallery();
                setGalleryItems(res || []);
            } else if (view === 'settings') {
                const res = await window.api.getSettings();
                setSettings(res || {});
                const prn = await window.api.getPrinters();
                setPrinters(prn || []);
            }

            // Always check for low stock to show notification counts/banners
            const ls = await window.api.getLowStock();
            setLowStock(ls || []);
        } catch (e) {
            console.error('Failed to load admin data:', e);
        }
    }, [view, reportRange]);

    useEffect(() => {
        loadAll();
        // Add auto-refresh interval for reports view
        let interval;
        if (view === 'reports') {
            interval = setInterval(() => {
                loadAll();
            }, 10000); // Refresh every 10 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loadAll, view]);

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        setProcessing(true);
        const res = await window.api.upsertItem({
            id: itemEdit?.id,
            code: data.item_code,
            item_code: data.item_code,
            item_name: data.item_name,
            price: Number(data.price),
            stock: Number(data.stock),
            min_stock: Number(data.min_stock)
        });
        setProcessing(false);
        if (res.success) {
            if (showToast) showToast('Product Saved Successfully', 'success');
            setItemEdit(null);
            loadAll();
        }
        else {
            if (showToast) showToast(res.message, 'error');
        }
    };

    const handleDeleteItem = async (id) => {
        showConfirm('Are you sure you want to delete this item?', async () => {
            setProcessing(true);
            const res = await window.api.deleteItem(id);
            setProcessing(false);
            if (res.success) {
                if (showToast) showToast('Item deleted', 'success');
                loadAll();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        });
    };


    const handleSaveUser = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        setProcessing(true);
        try {
            const res = await window.api.upsertUser({
                id: userEdit?.id,
                username: data.username,
                full_name: data.full_name,
                password: data.password,
                role: data.role,
                status: data.status
            });
            if (res.success) {
                if (showToast) showToast('User saved successfully', 'success');
                setUserEdit(null);
                await loadAll();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleUserStatus = async (user) => {
        const newStatus = user.status === 'active' ? 'disabled' : 'active';
        showConfirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} user ${user.username}?`, async () => {

            setProcessing(true);
            try {
                const res = await window.api.upsertUser({
                    ...user,
                    status: newStatus
                });
                if (res.success) {
                    if (showToast) showToast(`User ${newStatus}`, 'success');
                    await loadAll();
                } else {
                    if (showToast) showToast(res.message, 'error');
                }
            } finally {
                setProcessing(false);
            }
        });
    };
    const handleViewSale = async (sale) => {
        const items = await window.api.getSaleItems(sale.id);
        setSaleItems(items || []);
        setSelectedSale(sale);
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        const name = e.target.material_name.value;
        if (!name) return;
        setProcessing(true);
        try {
            const res = await window.api.addMaterial(name);
            if (res.success) {
                if (showToast) showToast('Material added', 'success');
                e.target.reset();
                await loadAll();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteMaterial = async (id) => {
        showConfirm('Delete this material?', async () => {
            setProcessing(true);
            try {
                const res = await window.api.deleteMaterial(id);
                if (res.success) {
                    if (showToast) showToast('Material deleted', 'success');
                    await loadAll();
                } else {
                    if (showToast) showToast(res.message, 'error');
                }
            } finally {
                setProcessing(false);
            }
        });
    };

    const handleAddColor = async (e) => {
        e.preventDefault();
        const code = e.target.color_code.value;
        const name = e.target.color_name.value;
        if (!code) return;
        setProcessing(true);
        try {
            const res = await window.api.addColor(code, name);
            if (res.success) {
                if (showToast) showToast('Color added', 'success');
                e.target.reset();
                await loadAll();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteColor = async (id) => {
        showConfirm('Delete this color?', async () => {
            setProcessing(true);
            try {
                const res = await window.api.deleteColor(id);
                if (res.success) {
                    if (showToast) showToast('Color deleted', 'success');
                    await loadAll();
                } else {
                    if (showToast) showToast(res.message, 'error');
                }
            } finally {
                setProcessing(false);
            }
        });
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const expenseData = {
            description: fd.get('description'),
            amount: Number(fd.get('amount')),
            category: fd.get('category'),
            payment_mode: fd.get('payment_mode'),
            mpesa_code: fd.get('mpesa_code'),
            cashier_id: user.id,
            cashier_name: user.full_name || user.username
        };
        setProcessing(true);
        try {
            const res = await window.api.addExpense(expenseData);
            if (res.success) {
                if (showToast) showToast('Expense recorded successfully.', 'success');
                setShowExpenseForm(false);
                await loadAll();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };
    const handleDeleteGalleryItem = async (id) => {
        showConfirm('Delete this style?', async () => {
            setProcessing(true);
            try {
                const res = await window.api.deleteGalleryItem(id);
                if (res.success) {
                    showToast('Style deleted', 'success');
                    loadAll();
                    if (loadData) loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        });
    };

    return (
        <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {processing && (
                <div className="processing-overlay" style={{ zIndex: 10000 }}>
                    <div className="spinner"></div>
                    <div style={{ fontWeight: 'bold' }}>Updating System...</div>
                </div>
            )}
            <header className="header" style={{ background: '#1e293b', color: 'white', flexShrink: 0 }}>
                <div className="brand" style={{ color: 'white', textTransform: 'uppercase' }}>Admin</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn" style={{ background: view === 'inventory' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('inventory')}>Products</button>
                    <button className="btn" style={{
                        background: view === 'low_stock' ? '#ef4444' : 'transparent',
                        color: 'white',
                        position: 'relative'
                    }} onClick={() => setView('low_stock')}>
                        Low Stock
                        {lowStock.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #1e293b',
                                boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)'
                            }}>
                                {lowStock.length}
                            </span>
                        )}
                    </button>
                    <button className="btn" style={{ background: view === 'users' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('users')}>Users</button>
                    <button className="btn" style={{ background: view === 'sales' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('sales')}>History</button>
                    <button className="btn" style={{ background: view === 'reports' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('reports')}>Reports</button>
                    <button className="btn" style={{ background: view === 'services' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('services')}>Services</button>
                    <button className="btn" style={{ background: view === 'fittings' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('fittings')}>Fittings</button>
                    <button className="btn" style={{ background: view === 'tailoring' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('tailoring')}>Tailoring</button>
                    <button className="btn" style={{ background: view === 'deadlines' ? '#f59e0b' : 'transparent', color: 'white' }} onClick={() => setView('deadlines')}>⏰ Deadlines</button>
                    <button className="btn" style={{ background: view === 'expenses' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('expenses')}>Expenses</button>
                    <button className="btn" style={{ background: view === 'workforce' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('workforce')}>Workforce</button>
                    <button className="btn" style={{ background: view === 'resources' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('resources')}>Resources</button>
                    <button className="btn" style={{ background: view === 'gallery' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('gallery')}>Gallery</button>
                    <button className="btn" style={{ background: view === 'settings' ? '#3b82f6' : 'transparent', color: 'white' }} onClick={() => setView('settings')}>Settings</button>


                    <button className="btn" style={{ background: '#059669', color: 'white' }} onClick={async () => {
                        setProcessing(true);
                        try {
                            const res = await window.api.backupDb();
                            if (res.success) {
                                if (showToast) showToast('Backup updated successfully!', 'success');
                            } else if (res.message !== 'Backup cancelled') {
                                if (showToast) showToast(`Backup failed: ${res.message}`, 'error');
                            }
                        } finally {
                            setProcessing(false);
                        }
                    }} title="Replace old backup with current data">💾 Update Backup</button>

                    <button className="btn" style={{ background: '#10b981', color: 'white' }} onClick={() => window.location.reload()} title="Reload Application">↻ Refresh App</button>
                    <button className="btn btn-danger" onClick={onBack}>Hub</button>
                </div>
            </header>

            <main className="admin-main" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', background: 'transparent' }}>
                <div style={{ width: '100%', padding: '20px' }}>
                    {lowStock.length > 0 && view !== 'low_stock' && (
                        <div style={{
                            background: '#fee2e2',
                            border: '1px solid #ef4444',
                            color: '#b91c1c',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>📢</span>
                                <strong>Attention:</strong> {lowStock.length} products are currently low in stock.
                            </div>
                            <button className="btn" style={{ background: '#ef4444', color: 'white', fontSize: '0.8rem' }} onClick={() => setView('low_stock')}>
                                View Critical Items
                            </button>
                        </div>
                    )}
                    {view === 'inventory' && (
                        <div>
                            {/* Low Stock logic moved to dedicated section */}
                            {/* All Products Section */}
                            <div className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>All Products</span>
                                    <div style={{ flex: 1, margin: '0 20px', maxWidth: '400px', position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Search by name or code..."
                                            value={searchProduct}
                                            onChange={(e) => setSearchProduct(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 32px 8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        {searchProduct && (
                                            <button
                                                onClick={() => setSearchProduct('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    padding: '2px',
                                                    fontSize: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setItemEdit({})}>+ Add Product</button>
                                </div>
                                <div className="card-body">
                                    <table>
                                        <thead><tr><th>Code</th><th>Name</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {items.filter(i => {
                                                const term = searchProduct.toLowerCase();
                                                const name = (i.item_name || i.name || '').toLowerCase();
                                                const code = (i.item_code || i.code || '').toLowerCase();
                                                return name.includes(term) || code.includes(term);
                                            }).map(i => (
                                                <tr key={i.id}>
                                                    <td style={{ fontFamily: 'monospace' }}>{i.item_code || i.code}</td>
                                                    <td>{i.item_name || i.name}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: (i.stock || 0) <= (i.min_stock || 5) ? '#fee2e2' : '#dcfce7',
                                                            color: (i.stock || 0) <= (i.min_stock || 5) ? '#991b1b' : '#166534',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem'
                                                        }}>
                                                            {i.stock || 0}
                                                        </span>
                                                    </td>
                                                    <td>Ksh {(Number(i.price) || 0).toFixed(2)}</td>
                                                    <td>
                                                        <button className="btn" style={{ marginRight: '5px' }} onClick={() => setItemEdit(i)}>Edit</button>
                                                        <button className="btn btn-danger" onClick={() => handleDeleteItem(i.id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}



                    {view === 'low_stock' && (
                        <div className="card" style={{ border: '1px solid #ef4444' }}>
                            <div className="card-header" style={{ background: '#fee2e2', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                    <span>Low Stock Alert</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{lowStock.length} Items Critical</div>
                            </div>
                            <div className="card-body">
                                <table>
                                    <thead><tr><th>Code</th><th>Name</th><th>Current Stock</th><th>Min Required</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {lowStock.map(i => (
                                            <tr key={i.id}>
                                                <td style={{ fontFamily: 'monospace' }}>{i.item_code || i.code}</td>
                                                <td>{i.item_name || i.name}</td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        background: '#fecaca',
                                                        color: '#7f1d1d',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {i.stock}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 'bold', color: '#64748b' }}>{i.min_stock || 5}</td>
                                                <td>
                                                    <button className="btn btn-primary" onClick={() => setItemEdit(i)}>Update Stock</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {lowStock.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#166534', fontWeight: 'bold' }}>
                                                    All stock levels are healthy! ✅
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {view === 'users' && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Users</span>
                                <button className="btn btn-primary" onClick={() => setUserEdit({})}>+ Add</button>
                            </div>
                            <div className="card-body">
                                <table>
                                    <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: '500' }}>{u.username}</td>
                                                <td>{u.full_name}</td>
                                                <td>
                                                    <span style={{
                                                        background: u.role === 'admin' ? '#f59e0b22' : '#64748b22',
                                                        color: u.role === 'admin' ? '#d97706' : '#475569',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        color: u.status === 'active' ? '#16a34a' : '#dc2626',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.status === 'active' ? '#16a34a' : '#dc2626' }}></span>
                                                        {u.status === 'active' ? 'ACTIVE' : 'DISABLED'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn" style={{ marginRight: '5px' }} onClick={() => setUserEdit(u)}>Edit</button>
                                                    {u.id !== user.id && (
                                                        <button
                                                            className={`btn ${u.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                                                            onClick={() => handleToggleUserStatus(u)}
                                                            style={{
                                                                background: u.status === 'active' ? '#fee2e2' : '#dcfce7',
                                                                color: u.status === 'active' ? '#b91c1c' : '#15803d',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'sales' && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Sales History</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Search Ref..."
                                        value={searchRef}
                                        onChange={(e) => setSearchRef(e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.875rem', width: '120px' }}
                                    />
                                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '10px' }}>Date:</label>
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.875rem' }}
                                    />
                                    {(filterDate || searchRef) && (
                                        <button
                                            className="btn"
                                            style={{ background: '#eee', padding: '4px 10px', fontSize: '0.8rem' }}
                                            onClick={() => { setFilterDate(''); setSearchRef(''); setFilterCustom(false); }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={filterCustom} onChange={e => setFilterCustom(e.target.checked)} />
                                        Custom Only
                                    </label>
                                </div>
                            </div>
                            <div className="card-body">
                                <table>
                                    <thead><tr><th>Ref</th><th>Date</th><th>Sold By</th><th>Type</th><th>Mode</th><th>Total</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {sales.filter(s => {
                                            const d = new Date(s.created_at);
                                            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            const matchesDate = !filterDate || localDateStr === filterDate;
                                            const matchesRef = !searchRef || s.ref_number.toLowerCase().includes(searchRef.toLowerCase());
                                            const matchesCustom = !filterCustom || s.is_custom;
                                            return matchesDate && matchesRef && matchesCustom;
                                        }).map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    {s.ref_number}
                                                    {s.is_custom ? <span style={{ marginLeft: '8px', fontSize: '0.6rem', padding: '1px 4px', background: '#7000ff', color: 'white', borderRadius: '3px', fontWeight: 'bold' }}>CUSTOM</span> : ''}
                                                </td>
                                                <td>{new Date(s.created_at).toLocaleString()}</td>
                                                <td style={{ fontWeight: '500' }}>{s.cashier_name || 'N/A'}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: s.sale_type === 'service' ? '#f0fdf4' : s.sale_type === 'tailoring' ? '#eff6ff' : '#f8fafc',
                                                        color: s.sale_type === 'service' ? '#166534' : s.sale_type === 'tailoring' ? '#1e40af' : '#64748b',
                                                        border: `1px solid ${s.sale_type === 'service' ? '#bbf7d0' : s.sale_type === 'tailoring' ? '#bfdbfe' : '#e2e8f0'}`,
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {(s.sale_type || 'pos').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        background: s.payment_mode === 'Cash' ? '#dcfce7' : '#dbeafe',
                                                        color: s.payment_mode === 'Cash' ? '#166534' : '#1e40af'
                                                    }}>
                                                        {s.payment_mode} {s.mpesa_code && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({s.mpesa_code})</span>}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 'bold' }}>Ksh {(Number(s.total_amount) || 0).toFixed(2)}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                        onClick={() => handleViewSale(s)}
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sales.filter(s => {
                                            const d = new Date(s.created_at);
                                            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            const matchesDate = !filterDate || localDateStr === filterDate;
                                            const matchesRef = !searchRef || s.ref_number.toLowerCase().includes(searchRef.toLowerCase());
                                            const matchesCustom = !filterCustom || s.is_custom;
                                            return matchesDate && matchesRef && matchesCustom;
                                        }).length === 0 && (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                        No sales records found matching your criteria.
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'reports' && (
                        <div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                {['daily', 'weekly', 'monthly', 'yearly'].map(r => (
                                    <button key={r} className="btn" style={{ background: reportRange === r ? '#3b82f6' : '#eee', color: reportRange === r ? 'white' : '#333', textTransform: 'capitalize' }} onClick={() => setReportRange(r)}>{r}</button>
                                ))}
                                <button className="btn" style={{ marginLeft: 'auto', background: '#10b981', color: 'white' }} onClick={() => loadAll()}>↻ Refresh</button>
                            </div>
                            {!reportData && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading reports...</div>}
                            {reportData?.error && <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626', background: '#fee2e2', borderRadius: '8px' }}>Report Error: {reportData.error}</div>}
                            {reportData && !reportData.error && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                                        <div className="card" style={{ padding: '20px', background: '#e0f2fe', border: '1px solid #7dd3fc' }}>
                                            <h3 style={{ color: '#0369a1', marginBottom: '8px' }}>Total Revenue</h3>
                                            <h2 style={{ fontSize: '2rem' }}>Ksh {(Number(reportData.summary?.total) || 0).toFixed(2)}</h2>
                                            <p style={{ color: '#0c4a6e' }}>{reportData.summary?.count || 0} Transactions</p>
                                        </div>

                                        <div className="card" style={{ padding: '20px', background: '#fee2e2', border: '1px solid #fecaca' }}>
                                            <h3 style={{ color: '#b91c1c', marginBottom: '8px' }}>Total Expenses</h3>
                                            <h2 style={{ fontSize: '2rem' }}>Ksh {(Number(reportData.expensesSummary?.total) || 0).toFixed(2)}</h2>
                                            <p style={{ color: '#991b1b' }}>{reportData.expensesSummary?.count || 0} Records</p>
                                        </div>

                                        <div className="card" style={{ padding: '20px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                                            <h3 style={{ color: '#c2410c', marginBottom: '8px' }}>Workforce Paid</h3>
                                            <h2 style={{ fontSize: '2rem' }}>Ksh {(Number(reportData.workforceSummary?.total) || 0).toFixed(2)}</h2>
                                            <p style={{ color: '#9a3412' }}>{reportData.workforceSummary?.count || 0} Payments</p>
                                        </div>

                                        <div className="card" style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                            <h3 style={{ color: '#15803d', marginBottom: '8px' }}>Net Profit</h3>
                                            <h2 style={{ fontSize: '2rem' }}>Ksh {((Number(reportData.summary?.total) || 0) - (Number(reportData.expensesSummary?.total) || 0) - (Number(reportData.workforceSummary?.total) || 0)).toFixed(2)}</h2>
                                            <p style={{ color: '#166534' }}>Rev - Exp - Workforce</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        {['Cash', 'M-Pesa'].map(mode => {
                                            const data = (reportData.modes || []).find(m => m.payment_mode === mode) || { total: 0, count: 0 };
                                            return (
                                                <div key={mode} className="card" style={{ padding: '20px', background: mode === 'Cash' ? '#f0fdf4' : '#eff6ff', border: mode === 'Cash' ? '1px solid #bbf7d0' : '1px solid #bfdbfe' }}>
                                                    <h3 style={{ color: mode === 'Cash' ? '#15803d' : '#1d4ed8', marginBottom: '8px' }}>{mode} Total</h3>
                                                    <h2 style={{ fontSize: '1.5rem' }}>Ksh {(Number(data.total) || 0).toFixed(2)}</h2>
                                                    <p style={{ color: mode === 'Cash' ? '#166534' : '#1e40af' }}>{data.count} Sales</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="card">
                                            <div className="card-body">
                                                <h3>Revenue by Department</h3>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Department</th>
                                                            <th>Orders</th>
                                                            <th style={{ textAlign: 'right' }}>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(reportData.salesByType || []).map(st => (
                                                            <tr key={st.sale_type}>
                                                                <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{st.sale_type || 'General POS'}</td>
                                                                <td>{st.count} records</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Ksh {(Number(st.total) || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                        {(reportData.salesByType || []).length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No revenue records</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="card">
                                            <div className="card-body">
                                                <h3>Popular Items & Services</h3>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th>Qty</th>
                                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(reportData.items || []).map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td>{item.item_name}</td>
                                                                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Ksh {(Number(item.total) || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                        {(reportData.items || []).length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No sales records</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="card">
                                            <div className="card-body">
                                                <h3>By Payment Mode</h3>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Mode</th>
                                                            <th>Sales</th>
                                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(reportData.modes || []).map(m => (
                                                            <tr key={m.payment_mode}>
                                                                <td>
                                                                    <span style={{
                                                                        padding: '4px 12px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 'bold',
                                                                        background: m.payment_mode === 'Cash' ? '#dcfce7' : '#dbeafe',
                                                                        color: m.payment_mode === 'Cash' ? '#166534' : '#1e40af'
                                                                    }}>
                                                                        {m.payment_mode.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td>{m.count} sales</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Ksh {(Number(m.total) || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="card">
                                            <div className="card-body">
                                                <h3>By Expense Category</h3>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Category</th>
                                                            <th>Records</th>
                                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(reportData.expensesByCategory || []).map(ex => (
                                                            <tr key={ex.category}>
                                                                <td>
                                                                    <span style={{
                                                                        padding: '4px 12px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 'bold',
                                                                        background: '#f1f5f9',
                                                                        color: '#475569'
                                                                    }}>
                                                                        {ex.category || 'Uncategorized'}
                                                                    </span>
                                                                </td>
                                                                <td>{ex.count} items</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>- Ksh {(Number(ex.total) || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {view === 'services' && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Service Records</span>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                    Total: {services.length} services
                                </div>
                            </div>
                            <div className="card-body">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Service Code</th>
                                            <th>Customer</th>
                                            <th>Item / Service</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.map(s => {
                                            const balance = Number(s.total_amount) - Number(s.paid_amount);
                                            const isPaidFull = balance <= 0;
                                            return (
                                                <tr key={s.id} style={{ opacity: s.status === 'collected' ? 0.7 : 1 }}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6' }}>
                                                        {s.service_code}
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{s.customer_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.customer_phone}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '500' }}>{s.item_description}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                                            {s.service_required}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: s.status === 'pending' ? '#fef3c7' : s.status === 'ready' ? '#dbeafe' : '#d1fae5',
                                                            color: s.status === 'pending' ? '#92400e' : s.status === 'ready' ? '#1e40af' : '#065f46'
                                                        }}>
                                                            {s.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>
                                                            Ksh {Number(s.paid_amount).toFixed(2)} / {Number(s.total_amount).toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: isPaidFull ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                                            {isPaidFull ? 'PAID FULL' : `Balance: Ksh ${balance.toFixed(2)}`}
                                                        </div>
                                                        {s.payment_mode && (
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                {s.payment_mode} {s.mpesa_code && `(${s.mpesa_code})`}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {new Date(s.created_at).toLocaleDateString()}
                                                        <div style={{ fontSize: '0.7rem' }}>{new Date(s.created_at).toLocaleTimeString()}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {services.length === 0 && (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                    No service records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'fittings' && (
                        <div className="card">
                            <div className="card-header">Fitting & Deposit History</div>
                            <div className="card-body">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Customer</th>
                                            <th>Item Details</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fittingDeposits.map(f => {
                                            const bal = Number(f.total_amount) - Number(f.paid_amount);
                                            return (
                                                <tr key={f.id} style={{ opacity: f.status === 'completed' ? 0.7 : 1 }}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6' }}>{f.fitting_code}</td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{f.customer_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.customer_phone}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '500' }}>{f.item_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.material} | {f.color}</div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: f.status === 'completed' ? '#d1fae5' : '#fef3c7',
                                                            color: f.status === 'completed' ? '#065f46' : '#92400e'
                                                        }}>
                                                            {f.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>Ksh {Number(f.paid_amount).toFixed(2)} / {Number(f.total_amount).toFixed(2)}</div>
                                                        <div style={{ fontSize: '0.7rem', color: bal <= 0 ? '#16a34a' : '#dc2626' }}>
                                                            {bal <= 0 ? 'FULLY PAID' : `BAL: Ksh ${bal.toFixed(2)}`}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {new Date(f.updated_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'tailoring' && (
                        <div className="card">
                            <div className="card-header">Custom Tailoring History</div>
                            <div className="card-body">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Order Code</th>
                                            <th>Customer</th>
                                            <th>Style/Material</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tailoringOrders.map(o => {
                                            const bal = Number(o.total_price) - Number(o.paid_amount);
                                            return (
                                                <tr key={o.id} style={{ opacity: o.status === 'collected' ? 0.7 : 1 }}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#7000ff' }}>{o.order_code}</td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{o.customer_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.customer_phone}</div>
                                                        <button
                                                            className="btn"
                                                            style={{
                                                                marginTop: '5px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.7rem',
                                                                background: '#e0f2fe',
                                                                color: '#0369a1',
                                                                border: '1px solid #bae6fd'
                                                            }}
                                                            onClick={() => setTailoringOrderToView(o)}
                                                        >
                                                            View Measurements & Notes
                                                        </button>
                                                    </td>
                                                    <td>
                                                        {(() => {
                                                            try {
                                                                const m = JSON.parse(o.measurements || '[]');
                                                                const sets = Array.isArray(m) ? m : [m];
                                                                return <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>{sets.map(set => set.type || 'Custom').join(', ')}</div>;
                                                            } catch { return null; }
                                                        })()}
                                                        <div style={{ fontWeight: '500' }}>{o.style_name || 'Custom Design'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.material_name || 'Customer Material'}</div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            background: o.status === 'collected' ? '#d1fae5' : '#fef3c7',
                                                            color: o.status === 'collected' ? '#065f46' : '#92400e'
                                                        }}>
                                                            {o.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>Ksh {Number(o.paid_amount).toFixed(2)} / {Number(o.total_price).toFixed(2)}</div>
                                                        <div style={{ fontSize: '0.7rem', color: bal <= 0 ? '#16a34a' : '#dc2626' }}>
                                                            {bal <= 0 ? 'FULLY PAID' : `BAL: Ksh ${bal.toFixed(2)}`}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '600' }}>{o.deadline}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Issued: {new Date(o.created_at).toLocaleDateString()}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'deadlines' && (
                        <div>
                            <div className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>⏰ Order Deadlines Overview</span>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                                <div className="card-body">
                                    {(() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        const tomorrow = new Date(today);
                                        tomorrow.setDate(tomorrow.getDate() + 1);

                                        const dayAfterTomorrow = new Date(today);
                                        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

                                        // Filter and sort orders by deadline
                                        const urgentOrders = tailoringOrders.filter(order => {
                                            if (order.status === 'collected') return false;
                                            const deadline = new Date(order.deadline);
                                            deadline.setHours(0, 0, 0, 0);
                                            return deadline <= tomorrow;
                                        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

                                        const upcomingOrders = tailoringOrders.filter(order => {
                                            if (order.status === 'collected') return false;
                                            const deadline = new Date(order.deadline);
                                            deadline.setHours(0, 0, 0, 0);
                                            return deadline > tomorrow && deadline <= dayAfterTomorrow;
                                        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

                                        const futureOrders = tailoringOrders.filter(order => {
                                            if (order.status === 'collected') return false;
                                            const deadline = new Date(order.deadline);
                                            deadline.setHours(0, 0, 0, 0);
                                            return deadline > dayAfterTomorrow;
                                        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

                                        return (
                                            <div style={{ display: 'grid', gap: '20px' }}>
                                                {/* Urgent Orders - Due Today or Tomorrow */}
                                                {urgentOrders.length > 0 && (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 'bold',
                                                            color: '#ef4444',
                                                            marginBottom: '15px',
                                                            padding: '10px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}>
                                                            🚨 URGENT - Due Today or Tomorrow ({urgentOrders.length} orders)
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '12px' }}>
                                                            {urgentOrders.map(order => {
                                                                const deadline = new Date(order.deadline);
                                                                const isToday = deadline.toDateString() === today.toDateString();
                                                                const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                                                                return (
                                                                    <div key={order.id} style={{
                                                                        padding: '15px',
                                                                        borderRadius: '10px',
                                                                        border: '2px solid #ef4444',
                                                                        background: 'rgba(239, 68, 68, 0.05)',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                                                                    }}>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                                <span style={{
                                                                                    fontFamily: 'monospace',
                                                                                    fontWeight: 'bold',
                                                                                    fontSize: '1.1rem',
                                                                                    color: '#ef4444'
                                                                                }}>
                                                                                    {order.order_code}
                                                                                </span>
                                                                                <span style={{
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '12px',
                                                                                    fontSize: '0.7rem',
                                                                                    fontWeight: 'bold',
                                                                                    background: isToday ? '#fee2e2' : '#fed7d7',
                                                                                    color: isToday ? '#b91c1c' : '#c53030'
                                                                                }}>
                                                                                    {isToday ? 'TODAY' : 'TOMORROW'}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{order.customer_name}</div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                                                                                {(() => {
                                                                                    try {
                                                                                        const m = JSON.parse(order.measurements || '[]');
                                                                                        const sets = Array.isArray(m) ? m : [m];
                                                                                        return sets.map(set => set.type || 'Custom').join(', ');
                                                                                    } catch { return 'Custom'; }
                                                                                })()}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                                Balance: Ksh {(Number(order.total_price) - Number(order.paid_amount)).toFixed(2)}
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                                            <div style={{
                                                                                fontWeight: 'bold',
                                                                                fontSize: '1.1rem',
                                                                                color: '#ef4444',
                                                                                marginBottom: '4px'
                                                                            }}>
                                                                                {deadline.toLocaleDateString()}
                                                                            </div>
                                                                            <div style={{
                                                                                fontSize: '0.8rem',
                                                                                color: isToday ? '#b91c1c' : '#c53030',
                                                                                fontWeight: 'bold'
                                                                            }}>
                                                                                {daysLeft === 0 ? 'DUE TODAY' : daysLeft === 1 ? 'DUE TOMORROW' : `${daysLeft} days left`}
                                                                            </div>
                                                                            <button
                                                                                className="btn"
                                                                                style={{
                                                                                    marginTop: '8px',
                                                                                    padding: '6px 12px',
                                                                                    fontSize: '0.8rem',
                                                                                    background: '#3b82f6',
                                                                                    color: 'white'
                                                                                }}
                                                                                onClick={() => setTailoringOrderToView(order)}
                                                                            >
                                                                                View Details
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Upcoming Orders - Due Soon */}
                                                {upcomingOrders.length > 0 && (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 'bold',
                                                            color: '#f59e0b',
                                                            marginBottom: '15px',
                                                            padding: '10px',
                                                            background: 'rgba(245, 158, 11, 0.1)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(245, 158, 11, 0.3)'
                                                        }}>
                                                            📅 Due Soon - Day After Tomorrow ({upcomingOrders.length} orders)
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                            {upcomingOrders.map(order => (
                                                                <div key={order.id} style={{
                                                                    padding: '12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                    background: 'rgba(245, 158, 11, 0.05)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                                            {order.order_code} - {order.customer_name}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                            {(() => {
                                                                                try {
                                                                                    const m = JSON.parse(order.measurements || '[]');
                                                                                    const sets = Array.isArray(m) ? m : [m];
                                                                                    return sets.map(set => set.type || 'Custom').join(', ');
                                                                                } catch { return 'Custom'; }
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                                                                            {new Date(order.deadline).toLocaleDateString()}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                            Balance: Ksh {(Number(order.total_price) - Number(order.paid_amount)).toFixed(2)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Future Orders */}
                                                {futureOrders.length > 0 && (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 'bold',
                                                            color: '#10b981',
                                                            marginBottom: '15px',
                                                            padding: '10px',
                                                            background: 'rgba(16, 185, 129, 0.1)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)'
                                                        }}>
                                                            📆 Future Deadlines ({futureOrders.length} orders)
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '8px' }}>
                                                            {futureOrders.slice(0, 10).map(order => (
                                                                <div key={order.id} style={{
                                                                    padding: '10px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                    background: 'rgba(16, 185, 129, 0.02)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: '500' }}>
                                                                            {order.order_code} - {order.customer_name}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                            {(() => {
                                                                                try {
                                                                                    const m = JSON.parse(order.measurements || '[]');
                                                                                    const sets = Array.isArray(m) ? m : [m];
                                                                                    return sets.map(set => set.type || 'Custom').join(', ');
                                                                                } catch { return 'Custom'; }
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                                                                            {new Date(order.deadline).toLocaleDateString()}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                            {Math.ceil((new Date(order.deadline) - today) / (1000 * 60 * 60 * 24))} days left
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {futureOrders.length > 10 && (
                                                                <div style={{
                                                                    textAlign: 'center',
                                                                    padding: '10px',
                                                                    color: '#64748b',
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    ... and {futureOrders.length - 10} more future orders
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* No orders message */}
                                                {tailoringOrders.filter(o => o.status !== 'collected').length === 0 && (
                                                    <div style={{
                                                        textAlign: 'center',
                                                        padding: '40px',
                                                        color: '#64748b',
                                                        fontSize: '1.1rem'
                                                    }}>
                                                        🎉 All orders are completed! No pending deadlines.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'expenses' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                                <div className="card" style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h3 style={{ color: '#fca5a5', marginBottom: '5px', fontSize: '1rem', textTransform: 'uppercase' }}>Total Expenses (All Time)</h3>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f87171', textShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}>Ksh {expenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}</div>
                                </div>
                                <div className="card" style={{ padding: '20px', border: '1px solid rgba(249, 115, 22, 0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h3 style={{ color: '#fdba74', marginBottom: '5px', fontSize: '1rem', textTransform: 'uppercase' }}>Today's Expenses</h3>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fb923c', textShadow: '0 0 10px rgba(249, 115, 22, 0.3)' }}>
                                        Ksh {expenses
                                            .filter(e => new Date(e.created_at).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0))
                                            .reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="card" style={{ padding: '20px', border: '1px dashed #00f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0, 242, 255, 0.05)' }} onClick={() => setShowExpenseForm(true)}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', color: '#00f2ff', marginBottom: '5px', textShadow: '0 0 10px #00f2ff' }}>+</div>
                                        <div style={{ color: '#fff', fontWeight: 'bold' }}>Record New Expense</div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Expense History</span>
                                    <button className="btn btn-primary" onClick={() => setShowExpenseForm(true)}>+ New Expense</button>
                                </div>
                                <div className="card-body" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ whiteSpace: 'nowrap', padding: '10px' }}>Date</th>
                                                <th style={{ padding: '10px' }}>Description</th>
                                                <th style={{ padding: '10px' }}>Category</th>
                                                <th style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '10px' }}>Amount</th>
                                                <th style={{ padding: '10px' }}>Payment Mode</th>
                                                <th style={{ padding: '10px' }}>Recorded By</th>
                                                <th style={{ textAlign: 'center', padding: '10px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map(ex => (
                                                <tr key={ex.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: '500' }}>{new Date(ex.created_at).toLocaleDateString()}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{new Date(ex.created_at).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td style={{ fontWeight: '600', minWidth: '120px' }}>{ex.description}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 10px',
                                                            background: '#f1f5f9',
                                                            borderRadius: '12px',
                                                            color: '#64748b',
                                                            fontWeight: '600',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {ex.category}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 'bold', color: '#f87171', textAlign: 'right', whiteSpace: 'nowrap' }}>Ksh {Number(ex.amount).toFixed(2)}</td>
                                                    <td>
                                                        <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{ex.payment_mode}</div>
                                                        {ex.mpesa_code && <div style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'monospace' }}>{ex.mpesa_code}</div>}
                                                    </td>
                                                    <td style={{ fontSize: '0.9rem' }}>{ex.cashier_name}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="btn btn-danger"
                                                            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}
                                                            onClick={() => {
                                                                showConfirm('Delete this expense?', async () => {
                                                                    setProcessing(true);
                                                                    try {
                                                                        const res = await window.api.deleteExpense(ex.id);
                                                                        if (res.success) {
                                                                            if (showToast) showToast('Expense deleted', 'success');
                                                                            await loadAll();
                                                                        } else {
                                                                            if (showToast) showToast(res.message, 'error');
                                                                        }
                                                                    } finally {
                                                                        setProcessing(false);
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {expenses.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                                                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧾</div>
                                                        No expense records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'workforce' && (
                        <div>
                            {/* Staff Management */}
                            <div className="card" style={{ marginBottom: '20px' }}>
                                <div className="card-header">Workforce & Staff</div>
                                <div className="card-body">
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const name = e.target.worker_name.value;
                                        const role = e.target.worker_role.value;
                                        if (!name) return;
                                        setProcessing(true);
                                        try {
                                            const res = await window.api.addWorker({ name, role });
                                            if (res.success) {
                                                if (showToast) showToast('Staff added', 'success');
                                                e.target.reset();
                                                await loadAll();
                                            } else {
                                                if (showToast) showToast(res.message, 'error');
                                            }
                                        } finally {
                                            setProcessing(false);
                                        }
                                    }} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <input name="worker_name" placeholder="Staff Name" required style={{ flex: 2 }} />
                                        <input name="worker_role" placeholder="Role (e.g. Tailor, Assistant)" style={{ flex: 1 }} />
                                        <button type="submit" className="btn btn-primary">+ Add Staff</button>
                                    </form>
                                    <table>
                                        <thead><tr><th>Name</th><th>Role</th><th>Username</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {workforce.map(w => (
                                                <tr key={w.id}>
                                                    <td style={{ fontWeight: 'bold' }}>{w.name}</td>
                                                    <td>{w.role}</td>
                                                    <td>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: w.username ? '#0369a1' : '#94a3b8' }}>
                                                            {w.username || <em>not set</em>}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ padding: '2px 8px', borderRadius: '10px', background: w.status === 'active' ? '#dcfce7' : '#fee2e2', color: w.status === 'active' ? '#166534' : '#991b1b', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                            {w.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
                                                    <td style={{ display: 'flex', gap: '5px' }}>
                                                        <button className="btn" style={{ background: '#0ea5e9', color: 'white', fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => setWorkerLoginEdit(w)}>🔑 Login</button>
                                                        <button className="btn btn-danger" onClick={() => {
                                                            showConfirm('Remove this staff member?', async () => {
                                                                setProcessing(true);
                                                                try {
                                                                    const res = await window.api.deleteWorker(w.id);
                                                                    if (res.success) {
                                                                        if (showToast) showToast('Staff removed', 'success');
                                                                        await loadAll();
                                                                    } else {
                                                                        if (showToast) showToast(res.message, 'error');
                                                                    }
                                                                } finally {
                                                                    setProcessing(false);
                                                                }
                                                            });
                                                        }}>Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {workforce.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No staff members recorded.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Task Assignment */}
                            <div className="card" style={{ marginBottom: '20px' }}>
                                <div className="card-header" style={{ background: '#1e3a5f', color: 'white' }}>📋 Assign Tasks to Workers</div>
                                <div className="card-body">
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.target);
                                        const workerId = fd.get('assign_worker_id');
                                        const taskType = fd.get('task_type');
                                        const taskId = fd.get('task_id');
                                        const notes = fd.get('assign_notes');
                                        if (!workerId || !taskId) { showToast('Select both a worker and a task', 'error'); return; }
                                        const worker = workforce.find(w => w.id == workerId);
                                        const allTasks = taskType === 'service' ? assignableTasks.services : assignableTasks.tailoring;
                                        const task = allTasks.find(t => t.id == taskId);
                                        setProcessing(true);
                                        try {
                                            const res = await window.api.assignTask({
                                                worker_id: Number(workerId),
                                                worker_name: worker?.name,
                                                task_type: taskType,
                                                task_id: Number(taskId),
                                                task_code: task?.code,
                                                task_description: task?.description,
                                                assigned_by: user.full_name,
                                                notes
                                            });
                                            if (res.success) {
                                                showToast('Task assigned successfully', 'success');
                                                e.target.reset();
                                                await loadAll();
                                            } else showToast(res.message, 'error');
                                        } finally { setProcessing(false); }
                                    }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                        <div>
                                            <label className="label">Worker</label>
                                            <select name="assign_worker_id" className="input" required>
                                                <option value="">-- Select Worker --</option>
                                                {workforce.filter(w => w.status === 'active').map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Task Type</label>
                                            <select name="task_type" className="input" required defaultValue="service">
                                                <option value="service">Service Intake</option>
                                                <option value="tailoring">Custom Tailoring</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Task (Code — Customer)</label>
                                            <select name="task_id" className="input" required>
                                                <option value="">-- Select Task --</option>
                                                <optgroup label="Service Tasks">
                                                    {assignableTasks.services.map(t => <option key={t.id} value={t.id}>{t.code} — {t.description}</option>)}
                                                </optgroup>
                                                <optgroup label="Tailoring Orders">
                                                    {assignableTasks.tailoring.map(t => <option key={t.id} value={t.id}>{t.code} — {t.description}</option>)}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Notes (optional)</label>
                                            <input name="assign_notes" placeholder="Special instructions..." />
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>Assign</button>
                                    </form>

                                    {/* All Assignments Table */}
                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        <table style={{ fontSize: '0.875rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Worker</th>
                                                    <th>Task Code</th>
                                                    <th>Type</th>
                                                    <th>Description</th>
                                                    <th>Status</th>
                                                    <th>Assigned</th>
                                                    <th>Notes</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {workerTasks.map(t => (
                                                    <tr key={t.id} style={{ opacity: t.status === 'completed' ? 0.6 : 1 }}>
                                                        <td style={{ fontWeight: '600' }}>{t.worker_name}</td>
                                                        <td style={{ fontFamily: 'monospace', color: '#0369a1', fontWeight: 'bold' }}>{t.task_code}</td>
                                                        <td>
                                                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', background: t.task_type === 'service' ? '#dcfce7' : '#ede9fe', color: t.task_type === 'service' ? '#166534' : '#6d28d9' }}>
                                                                {t.task_type === 'service' ? 'SERVICE' : 'TAILORING'}
                                                            </span>
                                                        </td>
                                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task_description}</td>
                                                        <td>
                                                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold',
                                                                background: t.status === 'completed' ? '#dcfce7' : t.status === 'in_progress' ? '#fef9c3' : '#dbeafe',
                                                                color: t.status === 'completed' ? '#166534' : t.status === 'in_progress' ? '#854d0e' : '#1e40af'
                                                            }}>
                                                                {t.status === 'in_progress' ? 'IN PROGRESS' : t.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(t.assigned_at).toLocaleDateString()}</td>
                                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.notes || '—'}</td>
                                                        <td>
                                                            <button className="btn btn-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => {
                                                                showConfirm('Remove this task assignment?', async () => {
                                                                    setProcessing(true);
                                                                    try {
                                                                        const res = await window.api.unassignTask(t.id);
                                                                        if (res.success) { showToast('Assignment removed', 'success'); await loadAll(); }
                                                                        else showToast(res.message, 'error');
                                                                    } finally { setProcessing(false); }
                                                                });
                                                            }}>Unassign</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {workerTasks.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No tasks assigned yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                                <label style={{ fontWeight: 'bold', color: '#334155' }}>Filter Work & Payments by Date:</label>
                                <input
                                    type="date"
                                    value={workforceDateFilter}
                                    onChange={(e) => setWorkforceDateFilter(e.target.value)}
                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                                {workforceDateFilter && (
                                    <button className="btn" style={{ background: '#e2e8f0', color: '#475569', padding: '6px 12px' }} onClick={() => setWorkforceDateFilter('')}>Clear Filter</button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Daily Work Logs */}
                                <div className="card">
                                    <div className="card-header">Daily Work Records</div>
                                    <div className="card-body">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.target);
                                            const workerId = fd.get('worker_id');
                                            if (!workerId) {
                                                if (showToast) showToast('Please select a staff member', 'error');
                                                return;
                                            }
                                            const workerName = workforce.find(w => w.id == workerId)?.name;
                                            setProcessing(true);
                                            try {
                                                const res = await window.api.addProductionLog({
                                                    worker_id: workerId,
                                                    worker_name: workerName,
                                                    item_name: fd.get('item_name'),
                                                    quantity: Number(fd.get('quantity')),
                                                    action: fd.get('action')
                                                });
                                                if (res.success) {
                                                    if (showToast) showToast('Log recorded', 'success');
                                                    e.target.reset();
                                                    await loadAll();
                                                } else {
                                                    if (showToast) showToast(res.message, 'error');
                                                }
                                            } finally {
                                                setProcessing(false);
                                            }
                                        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select name="worker_id" className="input" style={{ flex: 1 }} required>
                                                    <option value="">Select Staff...</option>
                                                    {workforce.filter(w => w.status === 'active').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                </select>
                                                <input name="item_name" placeholder="Item/Task (e.g. Shirt)" style={{ flex: 1.5 }} required />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input name="quantity" type="number" placeholder="Qty" style={{ width: '80px' }} required />
                                                <input name="action" placeholder="Action (e.g. Sewn)" style={{ flex: 1 }} />
                                                <button type="submit" className="btn btn-primary" style={{ flex: 0.5 }}>Record</button>
                                            </div>
                                        </form>

                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <table style={{ fontSize: '0.9rem' }}>
                                                <thead><tr><th>Date</th><th>Staff</th><th>Task</th><th>Qty</th><th>Action</th></tr></thead>
                                                <tbody>
                                                    {productionLogs.filter(l => !workforceDateFilter || new Date(l.created_at).toLocaleDateString('en-CA') === workforceDateFilter).map(l => (
                                                        <tr key={l.id}>
                                                            <td>{new Date(l.created_at).toLocaleDateString()}</td>
                                                            <td style={{ fontWeight: '500' }}>{l.worker_name}</td>
                                                            <td>{l.action} {l.item_name}</td>
                                                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{l.quantity}</td>
                                                            <td>
                                                                <button className="btn btn-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => {
                                                                    showConfirm('Delete this work record?', async () => {
                                                                        setProcessing(true);
                                                                        try {
                                                                            const res = await window.api.deleteProductionLog(l.id);
                                                                            if (res.success) {
                                                                                if (showToast) showToast('Record deleted', 'success');
                                                                                await loadAll();
                                                                            } else {
                                                                                if (showToast) showToast(res.message, 'error');
                                                                            }
                                                                        } finally {
                                                                            setProcessing(false);
                                                                        }
                                                                    });
                                                                }}>Del</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {productionLogs.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No work records yet.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Payments */}
                                <div className="card">
                                    <div className="card-header">Daily Workforce Payments</div>
                                    <div className="card-body">
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.target);
                                            const workerId = fd.get('worker_id');
                                            if (!workerId) {
                                                if (showToast) showToast('Please select a staff member', 'error');
                                                return;
                                            }
                                            const workerName = workforce.find(w => w.id == workerId)?.name;
                                            setProcessing(true);
                                            try {
                                                const paymentData = {
                                                    worker_id: workerId,
                                                    worker_name: workerName,
                                                    amount: Number(fd.get('amount')),
                                                    payment_mode: fd.get('payment_mode'),
                                                    mpesa_code: fd.get('mpesa_code'),
                                                    notes: fd.get('notes')
                                                };
                                                const res = await window.api.addWorkforcePayment(paymentData);
                                                if (res.success) {
                                                    if (showToast) showToast('Payment recorded successfully.', 'success');
                                                    e.target.reset();
                                                    await loadAll();
                                                } else {
                                                    if (showToast) showToast(res.message, 'error');
                                                }
                                            } finally {
                                                setProcessing(false);
                                            }
                                        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', background: '#fff7ed', padding: '15px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select name="worker_id" className="input" style={{ flex: 1 }} required>
                                                    <option value="">Select Staff...</option>
                                                    {workforce.filter(w => w.status === 'active').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                </select>
                                                <input name="amount" type="number" placeholder="Amount (Ksh)" style={{ flex: 1 }} required />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select name="payment_mode" className="input" style={{ flex: 1 }}>
                                                    <option value="Cash">Cash</option>
                                                    <option value="M-Pesa">M-Pesa</option>
                                                    <option value="Bank">Bank Transfer</option>
                                                </select>
                                                <input name="mpesa_code" placeholder="M-Pesa Code (if M-Pesa)" style={{ flex: 1 }} />
                                                <input name="notes" placeholder="Notes (Optional)" style={{ flex: 1.5 }} />
                                                <button type="submit" className="btn" style={{ flex: 0.5, background: '#ea580c', color: 'white' }}>Pay</button>
                                            </div>
                                        </form>

                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <table style={{ fontSize: '0.9rem' }}>
                                                <thead><tr><th>Date</th><th>Staff</th><th>Amount</th><th>Method</th><th>Action</th></tr></thead>
                                                <tbody>
                                                    {workforcePayments.filter(p => !workforceDateFilter || new Date(p.created_at).toLocaleDateString('en-CA') === workforceDateFilter).map(p => (
                                                        <tr key={p.id}>
                                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                                            <td style={{ fontWeight: '500' }}>{p.worker_name}</td>
                                                            <td style={{ color: '#dc2626', fontWeight: 'bold' }}>Ksh {Number(p.amount).toFixed(2)}</td>
                                                            <td>{p.payment_mode}</td>
                                                            <td>
                                                                <button className="btn btn-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => {
                                                                    showConfirm('Delete this payment record?', async () => {
                                                                        setProcessing(true);
                                                                        try {
                                                                            const res = await window.api.deleteWorkforcePayment(p.id);
                                                                            if (res.success) {
                                                                                if (showToast) showToast('Payment record removed', 'success');
                                                                                await loadAll();
                                                                            } else {
                                                                                if (showToast) showToast(res.message, 'error');
                                                                            }
                                                                        } finally {
                                                                            setProcessing(false);
                                                                        }
                                                                    });
                                                                }}>Del</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {workforcePayments.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No payments recorded.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'resources' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Materials Management */}
                            <div className="card">
                                <div className="card-header">Manage Materials</div>
                                <div className="card-body">
                                    <form onSubmit={handleAddMaterial} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <input name="material_name" placeholder="Material Name (e.g. Silk, Cotton)" required style={{ flex: 1 }} />
                                        <button type="submit" className="btn btn-primary">+ Add</button>
                                    </form>
                                    <table>
                                        <thead><tr><th>Material Name</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {materials.map(m => (
                                                <tr key={m.id}>
                                                    <td>{m.name}</td>
                                                    <td>
                                                        <button className="btn btn-danger" onClick={() => handleDeleteMaterial(m.id)}>Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {materials.length === 0 && <tr><td colSpan="2" style={{ textAlign: 'center' }}>No materials added yet</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Colors Management */}
                            <div className="card">
                                <div className="card-header">Manage Color Codes</div>
                                <div className="card-body">
                                    <form onSubmit={handleAddColor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
                                        <input name="color_code" placeholder="Code (e.g. BLU-01)" required />
                                        <input name="color_name" placeholder="Name (e.g. Sky Blue)" />
                                        <button type="submit" className="btn btn-primary">+ Add</button>
                                    </form>
                                    <table>
                                        <thead><tr><th>Code</th><th>Name</th><th>Action</th></tr></thead>
                                        <tbody>
                                            {colors.map(c => (
                                                <tr key={c.id}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.color_code}</td>
                                                    <td>{c.color_name || 'N/A'}</td>
                                                    <td>
                                                        <button className="btn btn-danger" onClick={() => handleDeleteColor(c.id)}>Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {colors.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No color codes added yet</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    {view === 'gallery' && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Style Gallery</span>
                                <button className="btn btn-primary" onClick={() => setGalleryEdit({})}>+ Add Style</button>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                    {galleryItems.map(item => (
                                        <div key={item.id} className="card" style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                            <img
                                                src={item.image_data}
                                                alt={item.title}
                                                style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', cursor: 'zoom-in' }}
                                                onClick={() => setPreviewImage(item.image_data)}
                                            />
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>{item.category}</div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn" style={{ flex: 1, fontSize: '0.75rem', padding: '4px' }} onClick={() => setGalleryEdit(item)}>Edit</button>
                                                <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.75rem', padding: '4px' }} onClick={() => handleDeleteGalleryItem(item.id)}>Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                    {galleryItems.length === 0 && (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            No styles added to the gallery yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'settings' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                            {/* Printer Settings */}
                            <PrinterSettings showToast={showToast} />

                            {/* Global Shop Settings */}
                            <div className="card">
                                <div className="card-header">Global Shop Settings</div>
                                <div className="card-body">
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
                                        Changes made here will reflect on all printed receipts and system headers immediately.
                                    </p>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.target);
                                        const data = Object.fromEntries(fd);
                                        setProcessing(true);
                                        try {
                                            const res = await window.api.updateSettings(data);
                                            if (res.success) {
                                                if (showToast) showToast('Settings updated successfully!', 'success');
                                                await loadAll();
                                            } else {
                                                if (showToast) showToast('Failed to update settings: ' + res.message, 'error');
                                            }
                                        } finally {
                                            setProcessing(false);
                                        }
                                    }}>
                                        <div className="form-group">
                                            <label className="label">Shop Name</label>
                                            <input name="shop_name" defaultValue={settings.shop_name} placeholder="e.g. Eunika Collection" required />
                                        </div>
                                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div>
                                                <label className="label">Contact Phone</label>
                                                <input name="shop_phone" defaultValue={settings.shop_phone} placeholder="+254 712 345 678" />
                                            </div>
                                            <div>
                                                <label className="label">Shop Email</label>
                                                <input name="shop_email" defaultValue={settings.shop_email} placeholder="info@shop.com" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Physical Address</label>
                                            <input name="shop_address" defaultValue={settings.shop_address} placeholder="Street, Building, Town" />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Receipt Footer Message</label>
                                            <textarea
                                                name="receipt_footer"
                                                defaultValue={settings.receipt_footer}
                                                rows="3"
                                                className="input"
                                                style={{ width: '100%', resize: 'vertical' }}
                                                placeholder="e.g. Goods once sold cannot be returned. Thank you!"
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
                                            Save Configuration
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals - Simplified for verification */}
            {
                itemEdit && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '400px', background: 'white', padding: '24px' }} key={itemEdit.id || 'new'}>
                            <h2 style={{ marginBottom: '20px' }}>{itemEdit.id ? 'Edit Product' : 'New Product'}</h2>
                            <form onSubmit={handleSaveItem}>
                                <div className="form-group">
                                    <label className="label">Item Code</label>
                                    <input name="item_code" defaultValue={itemEdit.item_code || itemEdit.code} placeholder="e.g. PRD001" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Product Name</label>
                                    <input name="item_name" defaultValue={itemEdit.item_name || itemEdit.name} placeholder="e.g. Milk 1L" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Price (Ksh)</label>
                                    <input name="price" type="number" step="0.01" defaultValue={itemEdit.price} placeholder="0.00" required />
                                </div>
                                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label className="label">Current Stock</label>
                                        <input name="stock" type="number" defaultValue={itemEdit.stock || 0} placeholder="Qty" required />
                                    </div>
                                    <div>
                                        <label className="label">Min Stock Alert</label>
                                        <input name="min_stock" type="number" defaultValue={itemEdit.min_stock || 5} placeholder="Alert at..." required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Product</button>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setItemEdit(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {
                galleryEdit && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="card" style={{ width: '400px', background: '#1e293b', padding: '30px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '1.5rem', textAlign: 'center' }}>{galleryEdit.id ? 'Update Style' : 'Add New Style'}</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.target);
                                const data = {
                                    id: galleryEdit.id,
                                    title: fd.get('title'),
                                    category: fd.get('category'),
                                    image_data: galleryEdit.image_data
                                };
                                setProcessing(true);
                                try {
                                    const res = galleryEdit.id
                                        ? await window.api.updateGalleryItem(data)
                                        : await window.api.addGalleryItem(data);
                                    if (res.success) {
                                        showToast('Style saved successfully!', 'success');
                                        setGalleryEdit(null);
                                        loadAll();
                                        if (loadData) loadData();
                                    } else showToast(res.message, 'error');
                                } finally {
                                    setProcessing(false);
                                }
                            }}>
                                <div className="form-group">
                                    <label className="label">Style Title</label>
                                    <input name="title" defaultValue={galleryEdit.title} placeholder="e.g. Slim Fit Tuxedo" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <input name="category" defaultValue={galleryEdit.category} placeholder="e.g. Men's Collection" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Reference Image</label>
                                    <div style={{
                                        border: '2px dashed rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }} onClick={() => document.getElementById('gallery-file-input').click()}>
                                        {galleryEdit.image_data ? (
                                            <img src={galleryEdit.image_data} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                                        ) : (
                                            <div style={{ color: '#94a3b8' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📁</div>
                                                <div>Click to upload image</div>
                                            </div>
                                        )}
                                        <input
                                            id="gallery-file-input"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setGalleryEdit({ ...galleryEdit, image_data: reader.result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Save Changes</button>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => setGalleryEdit(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                selectedSale && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '500px', background: 'white', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            {/* Watermark Logo */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%) rotate(-15deg)',
                                opacity: '0.08',
                                width: '300px',
                                height: '300px',
                                backgroundImage: `url(${base64Logo || logo})`,
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                pointerEvents: 'none',
                                zIndex: 0
                            }}></div>

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Transaction Details</h2>
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0 0' }}>{selectedSale.ref_number}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedSale(null)}
                                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
                                    <div>
                                        <div style={{ color: '#64748b' }}>Date:</div>
                                        <div>{new Date(selectedSale.created_at).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#64748b' }}>Cashier:</div>
                                        <div>{selectedSale.cashier_name}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#64748b' }}>Payment Mode:</div>
                                        <div>{selectedSale.payment_mode} {selectedSale.mpesa_code ? `(${selectedSale.mpesa_code})` : ''}</div>
                                    </div>
                                </div>

                                <table style={{ marginBottom: '20px' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th>Item</th>
                                            <th>Detail</th>
                                            <th style={{ textAlign: 'center' }}>Qty</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {saleItems.map((it, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ fontWeight: '500' }}>{it.item_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{it.item_code}</div>
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {it.material && <div>Mat: {it.material}</div>}
                                                    {it.color_code && <div>Col: {it.color_code}</div>}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                                                <td style={{ textAlign: 'right' }}>Ksh {(Number(it.total) || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{
                                    borderTop: '2px solid #1e293b',
                                    paddingTop: '15px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem'
                                }}>
                                    <span>TOTAL AMOUNT</span>
                                    <span>Ksh {(Number(selectedSale.total_amount) || 0).toFixed(2)}</span>
                                </div>

                                <div style={{ marginTop: '24px' }}>
                                    <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setSelectedSale(null)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                userEdit && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '400px', background: '#1e293b', padding: '30px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '1.5rem', textAlign: 'center' }}>{userEdit.id ? 'Update User Profile' : 'Register New User'}</h3>
                            <form onSubmit={handleSaveUser}>
                                <div className="form-group">
                                    <label className="label">Username</label>
                                    <input name="username" defaultValue={userEdit.username} placeholder="e.g. jdoe" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Full Name</label>
                                    <input name="full_name" defaultValue={userEdit.full_name} placeholder="e.g. John Doe" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">
                                        Password {userEdit.id && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: '5px' }}>(Leave blank to keep current)</span>}
                                    </label>
                                    <input name="password" type="password" placeholder={userEdit.id ? "••••••••" : "Enter new password"} required={!userEdit.id} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="label">Role</label>
                                        <select name="role" defaultValue={userEdit.role || 'cashier'} className="input" style={{ width: '100%' }}>
                                            <option value="admin">Administrator</option>
                                            <option value="cashier">Cashier</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="label">Account Status</label>
                                        <select name="status" defaultValue={userEdit.status || 'active'} className="input" style={{ width: '100%' }}>
                                            <option value="active">Active</option>
                                            <option value="disabled">Disabled</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Save Changes</button>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => setUserEdit(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {
                tailoringOrderToView && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '600px', background: 'white', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '20px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Order Details</h2>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>#{tailoringOrderToView.order_code}</div>
                                </div>
                                <button style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setTailoringOrderToView(null)}>×</button>
                            </div>
                            <div className="card-body" style={{ padding: '24px', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Customer</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{tailoringOrderToView.customer_name}</div>
                                        <div style={{ color: '#3b82f6' }}>{tailoringOrderToView.customer_phone}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Deadline</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: new Date(tailoringOrderToView.deadline) < new Date() ? '#ef4444' : '#10b981' }}>{tailoringOrderToView.deadline}</div>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            {tailoringOrderToView.style_image && (
                                                <img
                                                    src={tailoringOrderToView.style_image}
                                                    alt="Style Ref"
                                                    onClick={() => setPreviewImage(tailoringOrderToView.style_image)}
                                                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'zoom-in' }}
                                                />
                                            )}
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Style Reference</div>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{tailoringOrderToView.style_name || 'Custom Design'}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Material Selected</div>
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{tailoringOrderToView.material_name || 'Customer Provided'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#334155', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>MEASUREMENTS & NOTES</div>
                                    {(() => {
                                        try {
                                            const m = JSON.parse(tailoringOrderToView.measurements || '[]');
                                            const sets = Array.isArray(m) ? m : [m];
                                            return sets.map((set, idx) => (
                                                <div key={idx} style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                                                    <div style={{ marginBottom: '15px' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '10px' }}>GARMENT {idx + 1}:</span>
                                                        <span style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                            {set.type ? set.type.toUpperCase() : 'NOT SPECIFIED'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '15px' }}>
                                                        {Object.entries(set).map(([k, v]) => {
                                                            if (k === 'notes' || k === 'type' || !v) return null;
                                                            return (
                                                                <div key={k} style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.replace('_', ' ')}</div>
                                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{v} "</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {set.notes && (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Creation Notes / Description</div>
                                                            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', lineHeight: '1.5', minHeight: '60px', color: '#334155' }}>
                                                                {set.notes}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ));
                                        } catch {
                                            return <div>Error parsing measurements</div>;
                                        }
                                    })()}
                                </div>
                            </div>
                            <div className="card-footer" style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                                <button className="btn" style={{ background: '#cbd5e1', color: '#1e293b' }} onClick={() => setTailoringOrderToView(null)}>Close Details</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                previewImage && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, cursor: 'zoom-out' }}
                        onClick={() => setPreviewImage(null)}
                    >
                        <img
                            src={previewImage}
                            alt="Style Preview"
                            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
                        />
                        <button
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
                            onClick={() => setPreviewImage(null)}
                        >
                            ×
                        </button>
                    </div>
                )
            }

            {
                showExpenseForm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                            <h2 style={{ marginBottom: '20px', color: '#fff' }}>Record New Expense</h2>
                            <form onSubmit={handleAddExpense}>
                                <div className="form-group">
                                    <label className="label">Accessory / Item / Description</label>
                                    <input name="description" placeholder="e.g. Electricity Bill, Cleaning Supplies" required autoFocus />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label className="label">Amount (Ksh)</label>
                                        <input name="amount" type="number" step="0.01" placeholder="0.00" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Category</label>
                                        <select name="category" className="input" style={{ width: '100%' }}>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Rent">Rent</option>
                                            <option value="Supplies">Supplies</option>
                                            <option value="Salaries">Salaries</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Transportation">Transportation</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label">Payment Mode</label>
                                    <select name="payment_mode" className="input" style={{ width: '100%' }} onChange={(e) => {
                                        const mpesaInput = document.getElementById('expense-mpesa-code');
                                        if (e.target.value === 'M-Pesa') mpesaInput.style.display = 'block';
                                        else mpesaInput.style.display = 'none';
                                    }}>
                                        <option value="Cash">Cash</option>
                                        <option value="M-Pesa">M-Pesa</option>
                                        <option value="Bank">Bank Transfer</option>
                                    </select>
                                </div>

                                <div className="form-group" id="expense-mpesa-code" style={{ display: 'none' }}>
                                    <label className="label">M-Pesa Transaction Code</label>
                                    <input name="mpesa_code" placeholder="e.g. QWE123RTY" />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Record</button>
                                    <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setShowExpenseForm(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Custom Confirm Dialog */}
            {confirmDialog.show && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '380px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
                        <p style={{ color: '#e2e8f0', fontSize: '1rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '500' }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => { closeConfirm(); }}
                                style={{
                                    flex: 1, padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const cb = confirmDialog.onConfirm;
                                    closeConfirm();
                                    if (cb) cb();
                                }}
                                style={{
                                    flex: 1, padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Worker Login Modal */}
            {workerLoginEdit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '30px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ margin: '0 0 6px 0', color: '#0369a1' }}>🔑 Set Worker Login</h3>
                        <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem' }}>Worker: <strong>{workerLoginEdit.name}</strong></p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const username = e.target.worker_username.value.trim();
                            const password = e.target.worker_password.value;
                            if (!username || !password) { showToast('Username and password are required', 'error'); return; }
                            setProcessing(true);
                            try {
                                const res = await window.api.upsertWorker({ id: workerLoginEdit.id, username, password });
                                if (res.success) {
                                    showToast(`Login set for ${workerLoginEdit.name}`, 'success');
                                    setWorkerLoginEdit(null);
                                    await loadAll();
                                } else showToast(res.message, 'error');
                            } finally { setProcessing(false); }
                        }}>
                            <div className="form-group">
                                <label className="label">Username</label>
                                <input name="worker_username" defaultValue={workerLoginEdit.username || ''} placeholder="e.g. john_tailor" required style={{ width: '100%' }} />
                            </div>
                            <div className="form-group">
                                <label className="label">Password</label>
                                <input name="worker_password" type="password" placeholder="New password" required style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setWorkerLoginEdit(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#0369a1' }}>Save Login</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
