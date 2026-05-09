const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { db, initDb, dbPath } = require('./db.cjs');

initDb();

// Register privileged schemes
protocol.registerSchemesAsPrivileged([
    { scheme: 'pos-gallery', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, standard: true } }
]);


const isDev = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false // Often required for better-sqlite3 and native modules in main process
        },
        autoHideMenuBar: true,
        fullscreen: false, // Start in windowed mode
        kiosk: false // Set to true for true kiosk mode (no escape), false allows F11 to toggle
    });

    if (isDev) {
        // Development: load from Vite dev server
        win.loadURL('http://localhost:5173').catch(err => {
            console.error('Failed to load dev URL:', err);
            setTimeout(() => win.loadURL('http://localhost:5173'), 2000);
        });
        win.webContents.openDevTools();
    } else {
        // Production: load from built dist folder
        // Using app.getAppPath() ensures reliable path resolution in packaged apps
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        win.loadFile(indexPath).catch(err => {
            console.error('Failed to load production file:', err);
        });
    }
}


app.whenReady().then(() => {
    protocol.handle('pos-gallery', (request) => {
        const url = request.url.replace('pos-gallery://', '');
        const decodedUrl = decodeURIComponent(url);
        const galleryDir = path.join(app.getPath('userData'), 'gallery');
        const filePath = path.join(galleryDir, decodedUrl);
        return net.fetch(pathToFileURL(filePath).toString());
    });
    createWindow();
});

// Style Gallery (Moved Up for Registration)
ipcMain.handle('get-gallery', () => {
    try {
        console.log('--- Fetching Style Gallery ---');
        const rows = db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all();
        console.log(`--- Found ${rows.length} gallery items ---`);
        return rows;
    } catch (e) {
        console.error('get-gallery error:', e);
        return [];
    }
});

ipcMain.handle('add-gallery-item', (_, data) => {
    try {
        console.log('--- Adding Style to Gallery ---', data.title);
        
        let imageToSave = data.image_data; // fallback for old base64 logic if any
        
        // If data.image_path is provided, copy the physical file
        if (data.image_path) {
            const galleryDir = path.join(app.getPath('userData'), 'gallery');
            if (!fs.existsSync(galleryDir)) {
                fs.mkdirSync(galleryDir, { recursive: true });
            }
            const ext = path.extname(data.image_path) || '.jpg';
            const fileName = `gallery_${Date.now()}${ext}`;
            const destPath = path.join(galleryDir, fileName);
            fs.copyFileSync(data.image_path, destPath);
            imageToSave = `pos-gallery://${fileName}`;
        }

        const res = db.prepare('INSERT INTO gallery (title, image_data, category) VALUES (?, ?, ?)')
            .run(data.title, imageToSave, data.category);
        console.log('--- Style Saved. ID:', res.lastInsertRowid);
        return { success: true, id: res.lastInsertRowid };
    } catch (e) {
        console.error('add-gallery-item error:', e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('update-gallery-item', (_, data) => {
    try {
        db.prepare('UPDATE gallery SET title = ?, image_data = ?, category = ? WHERE id = ?')
            .run(data.title, data.image_data, data.category, data.id);
        return { success: true };
    } catch (e) {
        console.error('update-gallery-item error:', e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('delete-gallery-item', (_, id) => {
    try {
        db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
        return { success: true };
    } catch (e) {
        console.error('delete-gallery-item error:', e);
        return { success: false, message: e.message };
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Auth
ipcMain.handle('login', (_, username, password) => {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    console.log(`Login attempt: ${username}, hash: ${hash}`);
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hash);
    if (user) {
        console.log(`Login success: ${user.username}`);
        if (user.status !== 'active') return { success: false, message: 'Account disabled' };
        return { success: true, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } };
    }
    console.log('Login failed: Invalid credentials');
    return { success: false, message: 'Invalid credentials' };
});

ipcMain.handle('get-app-logo', () => {
    try {
        const logoPath = isDev
            ? path.join(app.getAppPath(), 'src', 'assets', 'logo.png')
            : path.join(app.getAppPath(), 'dist', 'assets', 'logo-DKdrsMHN.png'); // Use the known hashed name or look it up

        // Fallback: If the hashed name changes, we can try to find ANY png in dist/assets starting with logo
        let finalPath = logoPath;
        if (!isDev && !fs.existsSync(logoPath)) {
            const assetsDir = path.join(app.getAppPath(), 'dist', 'assets');
            if (fs.existsSync(assetsDir)) {
                const files = fs.readdirSync(assetsDir);
                const found = files.find(f => f.startsWith('logo-') && f.endsWith('.png'));
                if (found) finalPath = path.join(assetsDir, found);
            }
        }

        if (fs.existsSync(finalPath)) {
            const bitmap = fs.readFileSync(finalPath);
            return `data:image/png;base64,${bitmap.toString('base64')}`;
        }
        return '';
    } catch (e) {
        console.error('get-app-logo error:', e);
        return '';
    }
});

// Items
ipcMain.handle('get-item-by-code', (_, code) => db.prepare('SELECT * FROM items WHERE code = ?').get(code));
ipcMain.handle('get-all-items', () => db.prepare('SELECT * FROM items').all());
ipcMain.handle('upsert-item', (_, item) => {
    try {
        console.log('main: upsert-item attempt:', JSON.stringify(item));

        // Ensure all required fields have values to avoid NOT NULL constraints
        const params = {
            id: item.id || null,
            code: String(item.code || '').trim(),
            item_code: String(item.item_code || item.code || '').trim(),
            item_name: String(item.item_name || item.name || '').trim(),
            price: Number(item.price) || 0,
            stock: Number(item.stock) || 0,
            min_stock: Number(item.min_stock) || 5
        };

        if (!params.code) throw new Error('Item code is required');
        if (!params.item_name) throw new Error('Item name is required');

        if (params.id) {
            db.prepare(`
                UPDATE items 
                SET code = :code, item_code = :item_code, item_name = :item_name, 
                    price = :price, stock = :stock, min_stock = :min_stock
                WHERE id = :id
            `).run(params);
        } else {
            db.prepare(`
                INSERT INTO items (code, item_code, item_name, price, stock, min_stock) 
                VALUES (:code, :item_code, :item_name, :price, :stock, :min_stock)
            `).run(params);
        }

        console.log('main: upsert-item success');
        return { success: true };
    } catch (e) {
        console.error('upsert-item error:', e);
        // Provide a cleaner error message for the user
        let msg = e.message;
        if (msg.includes('UNIQUE constraint failed: items.code')) msg = 'Error: A product with this code already exists.';
        else if (msg.includes('NOT NULL constraint failed: items.item_code')) msg = 'Error: Database item_code is required.';
        return { success: false, message: msg };
    }
});

// Materials removed

ipcMain.handle('delete-item', (_, id) => {
    try {
        // Protect system items from deletion
        const item = db.prepare('SELECT code FROM items WHERE id = ?').get(id);
        if (item && (item.code === 'SYSTEM_SERVICE' || item.code === 'SYSTEM_TAILORING')) {
            return { success: false, message: 'Restricted: This is a system-required item and cannot be deleted.' };
        }

        db.prepare('DELETE FROM items WHERE id = ?').run(id);
        return { success: true };
    } catch (e) {
        console.error('Delete item error:', e);
        return { success: false, message: 'Could not delete item: ' + e.message };
    }
});

ipcMain.handle('get-low-stock', () => {
    try {
        return db.prepare("SELECT *, 'item' as type FROM items WHERE stock <= min_stock OR stock IS NULL").all();
    } catch (e) {
        console.error('get-low-stock error:', e);
        return [];
    }
});

// Services
ipcMain.handle('get-services', () => db.prepare('SELECT * FROM services ORDER BY created_at DESC').all());
ipcMain.handle('add-service', (_, data) => {
    try {
        const code = 'SRV-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const trans = db.transaction(() => {
            db.prepare(`
                INSERT INTO services (service_code, customer_name, customer_phone, item_description, service_required, total_amount, paid_amount, payment_mode, mpesa_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(code, data.customer_name, data.customer_phone, data.item_description, data.service_required, data.total_amount, data.paid_amount, data.payment_mode || 'Cash', data.mpesa_code || null);

            if (data.paid_amount > 0) {
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(code, data.paid_amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'service');

                const saleId = resSale.lastInsertRowid;
                const serviceItem = db.prepare('SELECT id FROM items WHERE code = ?').get('SYSTEM_SERVICE');

                if (serviceItem) {
                    db.prepare(`
                        INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(saleId, serviceItem.id, `[Service Deposit] ${data.item_description}`, code, 1, data.paid_amount, data.paid_amount);
                }
            }
        });

        trans();
        return { success: true, code };
    } catch (e) {
        console.error('add-service error:', e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('update-service-payment', (_, data) => {
    try {
        console.log('=== Updating Service Payment ===');
        console.log('Service ID:', data.id);
        console.log('Payment Amount:', data.amount);
        console.log('Payment Mode:', data.payment_mode);

        const trans = db.transaction(() => {
            const current = db.prepare('SELECT * FROM services WHERE id = ?').get(data.id);
            if (!current) throw new Error('Service not found');

            const newPaid = Number(current.paid_amount) + Number(data.amount);
            console.log('Previous Paid:', current.paid_amount);
            console.log('New Total Paid:', newPaid);
            console.log('Balance Remaining:', current.total_amount - newPaid);

            db.prepare('UPDATE services SET paid_amount = ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newPaid, data.status || current.status, data.payment_mode, data.mpesa_code, data.id);

            console.log('✅ Service record updated in database');

            // Record this specific payment in sales table
            if (data.amount > 0) {
                // Check if cashier exists to avoid FK error
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const ref = `${current.service_code}-P${Date.now().toString().slice(-4)}`;
                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(ref, data.amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'service');

                const saleId = resSale.lastInsertRowid;
                const serviceItem = db.prepare('SELECT id FROM items WHERE code = ?').get('SYSTEM_SERVICE');

                if (serviceItem) {
                    db.prepare(`
                        INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(saleId, serviceItem.id, `[Service Balance] ${current.item_description}`, current.service_code, 1, data.amount, data.amount);

                    console.log(`✅ Payment recorded in sales (Ref: ${ref}, Sale ID: ${saleId})`);
                }
            }
        });

        trans();
        console.log('✅ Transaction committed successfully\n');
        return { success: true };
    } catch (e) {
        console.error('❌ Error updating service payment:', e.message);
        return { success: false, message: e.message };
    }
});

// Fitting Deposits
ipcMain.handle('get-fitting-deposits', () => db.prepare('SELECT * FROM fitting_deposits ORDER BY updated_at DESC').all());
ipcMain.handle('add-fitting-deposit', (_, data) => {
    try {
        const code = 'FIT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const trans = db.transaction(() => {
            db.prepare(`
                INSERT INTO fitting_deposits (fitting_code, customer_name, customer_phone, item_id, item_name, material, color, total_amount, paid_amount, payment_mode, mpesa_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(code, data.customer_name, data.customer_phone, data.item_id, data.item_name, data.material, data.color, data.total_amount, data.paid_amount, data.payment_mode || 'Cash', data.mpesa_code || null);

            if (data.paid_amount > 0) {
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(code, data.paid_amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'layaway');

                const saleId = resSale.lastInsertRowid;
                db.prepare(`
                    INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total, material, color_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(saleId, data.item_id, `[Fitting Deposit] ${data.item_name}`, code, 1, data.paid_amount, data.paid_amount, data.material, data.color);
            }
        });
        trans();
        return { success: true, code };
    } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('update-fitting-payment', (_, data) => {
    try {
        const trans = db.transaction(() => {
            const current = db.prepare('SELECT * FROM fitting_deposits WHERE id = ?').get(data.id);
            if (!current) throw new Error('Record not found');

            const newPaid = Number(current.paid_amount) + Number(data.amount);
            const status = newPaid >= current.total_amount ? 'completed' : current.status;

            db.prepare('UPDATE fitting_deposits SET paid_amount = ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newPaid, status, data.payment_mode || 'Cash', data.mpesa_code || null, data.id);

            if (data.amount > 0) {
                const ref = `${current.fitting_code}-P${Date.now().toString().slice(-4)}`;
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(ref, data.amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'layaway');

                const saleId = resSale.lastInsertRowid;
                db.prepare(`
                    INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total, material, color_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(saleId, current.item_id, `[Fitting Payment] ${current.item_name}`, current.fitting_code, 1, data.amount, data.amount, current.material, current.color);
            }
        });
        trans();
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// workforce
ipcMain.handle('get-workforce', () => db.prepare('SELECT * FROM workforce ORDER BY name ASC').all());
ipcMain.handle('add-worker', (_, data) => {
    try {
        db.prepare('INSERT INTO workforce (name, role) VALUES (?, ?)').run(data.name, data.role);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});
ipcMain.handle('delete-worker', (_, id) => {
    try {
        db.prepare('DELETE FROM workforce WHERE id = ?').run(id);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// production logs
ipcMain.handle('get-production-logs', () => db.prepare('SELECT * FROM production_logs ORDER BY created_at DESC').all());
ipcMain.handle('add-production-log', (_, data) => {
    try {
        db.prepare('INSERT INTO production_logs (worker_id, worker_name, item_name, quantity, action) VALUES (?, ?, ?, ?, ?)')
            .run(data.worker_id, data.worker_name, data.item_name, data.quantity, data.action);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});
ipcMain.handle('delete-production-log', (_, id) => {
    try {
        db.prepare('DELETE FROM production_logs WHERE id = ?').run(id);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// workforce payments
ipcMain.handle('get-workforce-payments', () => db.prepare('SELECT * FROM workforce_payments ORDER BY created_at DESC').all());
ipcMain.handle('add-workforce-payment', (_, data) => {
    try {
        db.prepare('INSERT INTO workforce_payments (worker_id, worker_name, amount, payment_mode, mpesa_code, notes) VALUES (?, ?, ?, ?, ?, ?)')
            .run(data.worker_id, data.worker_name, data.amount, data.payment_mode, data.mpesa_code || null, data.notes);

        // Also record as an expense automatically?
        // User said "payment should be records in admin panel".
        // It might be useful to track this as an expense too, but I'll stick to the specific table for now unless requested.

        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});
ipcMain.handle('delete-workforce-payment', (_, id) => {
    try {
        db.prepare('DELETE FROM workforce_payments WHERE id = ?').run(id);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});



// tailoring orders
ipcMain.handle('get-tailoring-orders', () => {
    console.log('=== Retrieving Tailoring Orders ===');
    const orders = db.prepare(`
        SELECT t.*, g.title as style_name, g.image_data as style_image, m.name as material_name 
        FROM tailoring_orders t
        LEFT JOIN gallery g ON t.style_id = g.id
        LEFT JOIN materials m ON t.material_id = m.id
        ORDER BY t.created_at DESC
    `).all();
    console.log(`✅ Retrieved ${orders.length} tailoring orders from database\n`);
    return orders;
});

ipcMain.handle('add-tailoring-order', (_, data) => {
    try {
        console.log('=== Attempting to Save Tailoring Order ===');
        const code = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const styleId = (data.style_id && data.style_id !== '') ? parseInt(data.style_id) : null;
        const materialId = (data.material_id && data.material_id !== '') ? parseInt(data.material_id) : null;

        const trans = db.transaction((data, code, styleId, materialId) => {
            // 1. Insert Order
            db.prepare(`
                INSERT INTO tailoring_orders (order_code, customer_name, customer_phone, style_id, material_id, measurements, total_price, paid_amount, deadline)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(code, data.customer_name, data.customer_phone, styleId, materialId, JSON.stringify(data.measurements), data.total_price, data.paid_amount, data.deadline);

            console.log('  -> Order record created:', code);

            // 2. Record Sale if deposit paid
            if (data.paid_amount > 0) {
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(code, data.paid_amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'tailoring');

                const saleId = resSale.lastInsertRowid;
                
                // Get or Create System Item
                let tailorItem = db.prepare('SELECT id FROM items WHERE code = ?').get('SYSTEM_TAILORING');
                if (!tailorItem) {
                    const resNew = db.prepare('INSERT INTO items (item_name, item_code, code, price, stock, category) VALUES (?, ?, ?, ?, ?, ?)')
                        .run('Tailoring Revenue', 'TAILOR', 'SYSTEM_TAILORING', 0, 999999, 'Services');
                    tailorItem = { id: resNew.lastInsertRowid };
                }

                db.prepare(`
                    INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(saleId, tailorItem.id, `[Tailoring Deposit] ${data.customer_name}`, code, 1, data.paid_amount, data.paid_amount);
                
                console.log('  -> Financial record created. Sale ID:', saleId);
            }
            return code;
        });

        const result = trans(data, code, styleId, materialId);
        console.log('=== Order Saved Successfully ===\n');
        return { success: true, code: result };
    } catch (e) {
        console.error('❌ TAILORING ERROR:', e.message);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('update-tailoring-payment', (_, data) => {
    try {
        const trans = db.transaction(() => {
            const current = db.prepare('SELECT * FROM tailoring_orders WHERE id = ?').get(data.id);
            if (!current) throw new Error('Order not found');

            const newPaid = Number(current.paid_amount) + Number(data.amount);
            const status = data.status || (newPaid >= current.total_price ? 'collected' : current.status);

            db.prepare('UPDATE tailoring_orders SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newPaid, status, data.id);

            if (data.amount > 0) {
                const ref = `${current.order_code}-P${Date.now().toString().slice(-4)}`;
                const cashier = data.cashier_id ? db.prepare('SELECT id FROM users WHERE id = ?').get(data.cashier_id) : null;
                const cid = cashier ? cashier.id : null;

                const resSale = db.prepare(`
                    INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(ref, data.amount, data.cashier_name || 'N/A', cid, data.payment_mode || 'Cash', data.mpesa_code || null, 'tailoring');

                const saleId = resSale.lastInsertRowid;
                const tailorItem = db.prepare('SELECT id FROM items WHERE code = ?').get('SYSTEM_TAILORING');

                if (!tailorItem) {
                    console.error('❌ SYSTEM_TAILORING item missing from database!');
                    db.prepare('INSERT INTO items (item_name, item_code, code, price, stock, category) VALUES (?, ?, ?, ?, ?, ?)')
                        .run('Tailoring Revenue', 'TAILOR', 'SYSTEM_TAILORING', 0, 999999, 'Services');
                    const newItem = db.prepare('SELECT id FROM items WHERE code = ?').get('SYSTEM_TAILORING');
                    var tId = newItem.id;
                } else {
                    var tId = tailorItem.id;
                }

                db.prepare(`
                    INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(saleId, tId, `[Tailoring Payment] ${current.customer_name}`, current.order_code, 1, data.amount, data.amount);
            }
        });
        trans();
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// Materials
ipcMain.handle('get-materials', () => db.prepare('SELECT * FROM materials ORDER BY name ASC').all());
ipcMain.handle('add-material', (_, name) => {
    try {
        db.prepare('INSERT INTO materials (name) VALUES (?)').run(name);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});
ipcMain.handle('delete-material', (_, id) => {
    try {
        db.prepare('DELETE FROM materials WHERE id = ?').run(id);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});



// Colors
ipcMain.handle('get-colors', () => db.prepare('SELECT * FROM colors ORDER BY color_code ASC').all());
ipcMain.handle('add-color', (_, code, name) => {
    try {
        db.prepare('INSERT INTO colors (color_code, color_name) VALUES (?, ?)').run(code, name);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});
ipcMain.handle('delete-color', (_, id) => {
    try {
        db.prepare('DELETE FROM colors WHERE id = ?').run(id);
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// Sales
ipcMain.handle('process-sale', (_, saleData) => {
    const trans = db.transaction((data) => {
        const ref = 'REF-' + Date.now();
        const res = db.prepare('INSERT INTO sales (ref_number, total_amount, cashier_name, payment_mode, mpesa_code, cashier_id) VALUES (?, ?, ?, ?, ?, ?)')
            .run(ref, data.total, data.cashier, data.paymentMode, data.mpesaCode || null, data.cashierId);
        const saleId = res.lastInsertRowid;

        const ins = db.prepare(`
            INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total, material, color_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updStock = db.prepare(`
            UPDATE items SET stock = stock - ? WHERE id = ? AND code NOT LIKE 'SYSTEM_%'
        `);

        for (const it of data.items) {
            ins.run(saleId, it.id, it.name, it.code || 'N/A', it.qty, it.price, it.qty * it.price, it.material || null, it.colorCode || null);
            // Only update stock for physical items, skip system items
            updStock.run(it.qty, it.id);
        }
        return ref;
    });
    try {
        const ref = trans(saleData);
        return { success: true, ref };
    } catch (e) {
        console.error('Process sale error:', e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('get-sales', () => db.prepare(`
    SELECT s.*, 
    EXISTS(SELECT 1 FROM sale_items WHERE sale_id = s.id AND (material IS NOT NULL OR color_code IS NOT NULL)) as is_custom
    FROM sales s
    ORDER BY created_at DESC
`).all());
ipcMain.handle('get-sale-items', (_, saleId) => db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId));

// Users
ipcMain.handle('get-users', () => db.prepare('SELECT id, username, role, full_name, status FROM users').all());
ipcMain.handle('upsert-user', (_, u) => {
    try {
        if (u.id) {
            if (u.password) {
                const hash = crypto.createHash('sha256').update(u.password).digest('hex');
                db.prepare('UPDATE users SET full_name = ?, username = ?, status = ?, password = ? WHERE id = ?')
                    .run(u.full_name, u.username, u.status, hash, u.id);
            } else {
                db.prepare('UPDATE users SET full_name = ?, username = ?, status = ? WHERE id = ?')
                    .run(u.full_name, u.username, u.status, u.id);
            }
        } else {
            const hash = crypto.createHash('sha256').update(u.password || '1234').digest('hex');
            db.prepare('INSERT INTO users (username, password, role, full_name, status) VALUES (?, ?, ?, ?, ?)')
                .run(u.username, hash, u.role || 'cashier', u.full_name, 'active');
        }
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

// Reports
ipcMain.handle('get-sales-reports', (_, range) => {
    try {
        let filter = "1=1";
        if (range === 'daily') filter = "date(created_at, 'localtime') = date('now', 'localtime')";
        else if (range === 'weekly') filter = "date(created_at, 'localtime') >= date('now', 'localtime', '-7 days')";
        else if (range === 'monthly') filter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
        else if (range === 'yearly') filter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of year')";

        console.log(`--- Generating Reports (Range: ${range}) ---`);
        const summary = db.prepare(`SELECT count(*) as count, coalesce(sum(total_amount), 0) as total FROM sales WHERE ${filter}`).get();
        const modes = db.prepare(`SELECT payment_mode, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY payment_mode`).all();
        
        // Use a more specific filter for joined queries to avoid ambiguity
        const joinFilter = filter.replace(/created_at/g, 'sales.created_at');
        console.log('--- Running Items Query with filter:', joinFilter);
        const items = db.prepare(`SELECT item_name, sum(quantity) as qty, sum(total) as total FROM sale_items JOIN sales ON sales.id = sale_items.sale_id WHERE ${joinFilter} GROUP BY item_name ORDER BY qty DESC LIMIT 10`).all();
        const salesByType = db.prepare(`SELECT sale_type, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY sale_type`).all();

        // Expenses reporting
        let expFilter = "1=1";
        if (range === 'daily') expFilter = "date(created_at, 'localtime') = date('now', 'localtime')";
        else if (range === 'weekly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', '-7 days')";
        else if (range === 'monthly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
        else if (range === 'yearly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of year')";

        const expensesSummary = db.prepare(`SELECT coalesce(sum(amount), 0) as total, count(*) as count FROM expenses WHERE ${expFilter}`).get();
        const expensesByCategory = db.prepare(`SELECT category, sum(amount) as total, count(*) as count FROM expenses WHERE ${expFilter} GROUP BY category`).all();

        // Workforce Payments reporting
        let wfFilter = "1=1";
        if (range === 'daily') wfFilter = "date(created_at, 'localtime') = date('now', 'localtime')";
        else if (range === 'weekly') wfFilter = "date(created_at, 'localtime') >= date('now', 'localtime', '-7 days')";
        else if (range === 'monthly') wfFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
        else if (range === 'yearly') wfFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of year')";

        const workforceSummary = db.prepare(`SELECT coalesce(sum(amount), 0) as total, count(*) as count FROM workforce_payments WHERE ${wfFilter}`).get();

        return { summary, modes, items, salesByType, expensesSummary, expensesByCategory, workforceSummary };
    } catch (err) {
        console.error('Report Generation Error:', err);
        return { error: err.message };
    }
});

// Expenses
ipcMain.handle('get-expenses', () => db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all());
ipcMain.handle('add-expense', (_, data) => {
    try {
        db.prepare(`
            INSERT INTO expenses (description, amount, category, payment_mode, mpesa_code, cashier_id, cashier_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(data.description, data.amount, data.category, data.payment_mode || 'Cash', data.mpesa_code || null, data.cashier_id, data.cashier_name);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('delete-expense', (_, id) => {
    try {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('backup-db', async () => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Backup Database',
            defaultPath: path.join(app.getPath('downloads'), 'pos_master_backup.db'),
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (filePath) {
            fs.copyFileSync(dbPath, filePath);
            return { success: true, path: filePath };
        }
        return { success: false, message: 'Backup cancelled' };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('restore-db', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Backup to Restore',
            filters: [{ name: 'SQLite Database', extensions: ['db'] }],
            properties: ['openFile']
        });

        if (filePaths && filePaths.length > 0) {
            const selectedPath = filePaths[0];
            // Safety check: Don't restore if the file is the same as current
            if (path.resolve(selectedPath) === path.resolve(dbPath)) {
                return { success: false, message: 'Source and destination are the same file!' };
            }

            // Close DB before overwriting
            db.close();
            fs.copyFileSync(selectedPath, dbPath);

            // Re-launch app to pick up new data
            app.relaunch();
            app.exit();
            return { success: true };
        }
        return { success: false, message: 'Restore cancelled' };
    } catch (e) {
        return { success: false, message: e.message };
    }
});
// Settings
ipcMain.handle('get-settings', () => {
    try {
        const rows = db.prepare('SELECT * FROM settings').all();
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        return settings;
    } catch (e) { return {}; }
});

ipcMain.handle('update-settings', (_, data) => {
    try {
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        Object.entries(data).forEach(([key, value]) => {
            upsert.run(key, value);
        });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('get-printers', async (event) => {
    try {
        return await event.sender.getPrintersAsync();
    } catch (e) {
        console.error('get-printers error:', e);
        return [];
    }
});

ipcMain.handle('print', async (_, html) => {
    let printWin = null;
    try {
        printWin = new BrowserWindow({ 
            show: false, 
            width: 800, 
            height: 600, 
            webPreferences: { 
                nodeIntegration: false,
                contextIsolation: true
            } 
        });
        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Check if a specific printer is configured
        let printerName = null;
        try {
            const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('default_printer');
            if (setting && setting.value) printerName = setting.value;
        } catch (e) { /* ignore db error */ }

        let printedDirectly = false;

        if (printerName && printerName !== 'PDF') {
            const printers = await printWin.webContents.getPrintersAsync();
            const target = printers.find(p => p.name === printerName);

            if (target) {
                console.log(`Printing silently to: ${printerName}`);
                await new Promise((resolve, reject) => {
                    printWin.webContents.print({
                        silent: true,
                        deviceName: printerName,
                        printBackground: true,
                        margins: { marginType: 'none' }
                    }, (success, errorType) => {
                        if (!success) reject(new Error(errorType));
                        else resolve();
                    });
                });
                printedDirectly = true;
            } else {
                console.warn(`Configured printer '${printerName}' not found. Falling back to PDF.`);
            }
        }

        if (printedDirectly) {
            printWin.close();
            return { success: true };
        }

        // Generate PDF instead of printing to device (Fallback)
        const pdfData = await printWin.webContents.printToPDF({
            printBackground: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        const receiptsDir = path.join(app.getPath('documents'), 'receipts');
        if (!fs.existsSync(receiptsDir)) {
            fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const filename = `receipt_${Date.now()}.pdf`;
        const filePath = path.join(receiptsDir, filename);

        fs.writeFileSync(filePath, pdfData);
        console.log('Receipt saved to:', filePath);

        printWin.close();

        // Open the PDF to simulate "printing" / let user see the result immediately
        // Check if user wants to open the PDF automatically
        try {
            const autoOpen = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_open_pdf');
            if (autoOpen && autoOpen.value === 'true') {
                require('electron').shell.openPath(filePath);
            }
        } catch (e) { }

        return { success: true, savedPath: filePath };
    } catch (e) {
        console.error('Print error:', e);
        if (printWin) printWin.close();
        return { success: false, message: e.message };
    }
});
