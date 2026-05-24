import { useState, useEffect, useMemo } from 'react';
import AdminPanel from './AdminPanel';
import TailoringView from './views/TailoringView';
import GalleryView from './views/GalleryView';
import './hub.css';
import logo from './assets/logo.png';

const parseWorkerMeasurements = (measurementsStr) => {
    try {
        const parsed = typeof measurementsStr === 'string' ? JSON.parse(measurementsStr || '[]') : measurementsStr || [];
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return [];
    }
};

function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState(() => {
        return localStorage.getItem('pos_view') || 'hub';
    });
    const [showAdmin, setShowAdmin] = useState(() => {
        return localStorage.getItem('pos_show_admin') === 'true';
    });
    const [cart, setCart] = useState([]);
    const [items, setItems] = useState([]);
    const [code, setCode] = useState('');
    const [qty, setQty] = useState('1');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [mpesaCode, setMpesaCode] = useState('');
    const [materials, setMaterials] = useState([]);
    const [colors, setColors] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [services, setServices] = useState([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [fittingDeposits, setFittingDeposits] = useState([]);
    const [fittingSearch, setFittingSearch] = useState('');

    const [tailoringOrders, setTailoringOrders] = useState([]);
    const [gallery, setGallery] = useState([]);

    const [servicePayment, setServicePayment] = useState(null);
    const [fittingPayment, setFittingPayment] = useState(null);

    const [expenses, setExpenses] = useState([]);


    const [settings, setSettings] = useState({});
    const [toast, setToast] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [stkStatus, setStkStatus] = useState(null);
    const [base64Logo, setBase64Logo] = useState(logo);
    const [loginMode, setLoginMode] = useState('staff'); // 'staff' | 'worker'
    const [loggedInWorker, setLoggedInWorker] = useState(null);
    const [workerTasks, setWorkerTasks] = useState([]);
    const [workerCompletedTasks, setWorkerCompletedTasks] = useState([]);
    const [workerCompletedRange, setWorkerCompletedRange] = useState('daily');
    const [workerTab, setWorkerTab] = useState('active');
    const [unclaimedMpesa, setUnclaimedMpesa] = useState([]);

    useEffect(() => {
        // Load high-reliability base64 logo for printing in production
        window.api.getAppLogo().then(b64 => {
            if (b64) setBase64Logo(b64);
        });
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogout = () => {
        setUser(null);
        setView('hub');
        setShowAdmin(false);
    };

    useEffect(() => {
        if (!user) {
            localStorage.removeItem('pos_user');
            localStorage.removeItem('pos_view');
            localStorage.removeItem('pos_show_admin');
        }
    }, [user]);

    useEffect(() => {
        localStorage.setItem('pos_view', view);
    }, [view]);

    useEffect(() => {
        localStorage.setItem('pos_show_admin', String(showAdmin));
    }, [showAdmin]);

    useEffect(() => {
        if (user) loadData();
    }, [user, showAdmin]);

    useEffect(() => {
        if (loggedInWorker) {
            fetch(`http://localhost:5001/api/worker-tasks/completed?worker_id=${loggedInWorker.id}&range=${workerCompletedRange}`)
                .then(res => res.json())
                .then(data => setWorkerCompletedTasks(data || []))
                .catch(err => console.error(err));
        }
    }, [loggedInWorker, workerCompletedRange]);

    const loadData = async () => {
        try {
            const all = await window.api.getAllItems();
            setItems(all);
            const mats = await window.api.getMaterials();
            setMaterials(mats || []);
            const cols = await window.api.getColors();
            setColors(cols || []);
            const srvs = await window.api.getServices();
            setServices(srvs || []);
            const fits = await window.api.getFittingDeposits();
            setFittingDeposits(fits || []);

            const tords = await window.api.getTailoringOrders();
            setTailoringOrders(tords || []);
            const gall = await window.api.getGallery();
            setGallery(gall || []);
            const exps = await window.api.getExpenses();
            setExpenses(exps || []);
            const sets = await window.api.getSettings();
            setSettings(sets || {});
            const umpesa = await window.api.getUnclaimedMpesa();
            setUnclaimedMpesa(umpesa || []);
        } catch (e) {
            console.error('Data load error:', e);
        }
    };

    const addToCart = async () => {
        const numericQty = Number(qty);
        const it = items.find(i => (i.item_code || i.code) === code);
        if (!it) return showToast('Product not found', 'error');
        if (numericQty <= 0) return showToast('Invalid quantity', 'error');

        if (view === 'selling_materials') {
            if (!selectedMaterial) return showToast('Please select a material', 'error');
            if (!selectedColor) return showToast('Please select a color code', 'error');
        }

        const exist = cart.find(x => x.id === it.id && x.material === selectedMaterial && x.colorCode === selectedColor);
        if (exist) {
            setCart(cart.map(x => (x.id === it.id && x.material === selectedMaterial && x.colorCode === selectedColor) ? { ...x, qty: x.qty + numericQty } : x));
        } else {
            setCart([...cart, {
                ...it,
                type: 'item',
                name: it.item_name || it.name,
                code: it.item_code || it.code,
                qty: numericQty,
                material: selectedMaterial,
                colorCode: selectedColor
            }]);
        }

        setCode('');
        setQty('1');
        setSelectedMaterial('');
        setSelectedColor('');
    };

    const total = useMemo(() => cart.reduce((s, i) => s + (i.price * i.qty), 0), [cart]);

    const filteredFitting = useMemo(() => {
        const term = fittingSearch.toLowerCase();
        return fittingDeposits.filter(f =>
            f.customer_name.toLowerCase().includes(term) ||
            f.order_code.toLowerCase().includes(term) ||
            (f.customer_phone && f.customer_phone.includes(term))
        );
    }, [fittingDeposits, fittingSearch]);



    const filteredServices = useMemo(() => {
        if (!user) return [];
        return services.filter(s => {
            const term = serviceSearch.toLowerCase();
            const matches = s.customer_name.toLowerCase().includes(term) ||
                s.service_code.toLowerCase().includes(term) ||
                (s.customer_phone && s.customer_phone.includes(term));

            if (user.role === 'cashier') {
                return matches && s.status !== 'collected';
            }
            return matches;
        });
    }, [services, serviceSearch, user]);



    const handleProcess = async (overrideMpesaCode = null, overridePaymentMode = null) => {
        if (cart.length === 0) return;
        const finalMode = overridePaymentMode || paymentMode;
        const finalMpesa = overrideMpesaCode || mpesaCode;
        if (finalMode === 'M-Pesa' && !finalMpesa) return showToast('M-Pesa Code required', 'error');

        setProcessing(true);
        try {
            const saleData = {
                items: cart,
                total,
                cashier: user.full_name || user.username,
                cashierId: user.id,
                paymentMode: finalMode,
                mpesaCode: finalMpesa
            };
            const res = await window.api.processSale(saleData);

            if (res.success) {
                if (finalMode === 'M-Pesa') await window.api.claimMpesaPayment(finalMpesa);
                showToast('Receipt is being printed...', 'info');
                await printReceipt(res.ref || res.ref_number || 'N/A');
                setCart([]);
                setMpesaCode('');
                setPaymentMode('Cash');
                await loadData();
            } else showToast(res.message || 'Sale failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const triggerSTKPush = async (amount, phone, onSuccessCallback = null) => {
        if (!phone) return showToast('Phone number is required for STK Push', 'error');
        if (!amount || amount <= 0) return showToast('Invalid amount', 'error');

        setProcessing(true);
        setStkStatus('pending');
        try {
            const response = await fetch('http://localhost:5001/api/payments/stkpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    phone,
                    reference: 'POS-' + Date.now(),
                    description: 'Eunika Payment'
                })
            });
            const res = await response.json();
            if (res.success && res.result && res.result.CheckoutRequestID) {
                showToast('STK Push sent! Waiting for customer to enter PIN...', 'info');
                setStkStatus('waiting_for_pin');
                
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const statusRes = await fetch(`http://localhost:5001/api/payments/status/${res.result.CheckoutRequestID}`);
                        const statusData = await statusRes.json();
                        
                        if (statusData.status === 'success') {
                            clearInterval(pollInterval);
                            setStkStatus('success');
                            showToast('Payment successful!', 'success');
                            if (onSuccessCallback) {
                                setTimeout(() => onSuccessCallback(statusData.receipt), 1500);
                            } else {
                                setPaymentMode('M-Pesa');
                                setMpesaCode(statusData.receipt);
                                setTimeout(() => handleProcess(statusData.receipt, 'M-Pesa'), 1500);
                            }
                        } else if (statusData.status === 'failed') {
                            clearInterval(pollInterval);
                            setStkStatus('failed');
                            showToast('Payment Failed: ' + statusData.description, 'error');
                            setProcessing(false);
                        } else if (attempts >= 20) { // 20 * 3s = 60s timeout
                            clearInterval(pollInterval);
                            setStkStatus('timeout');
                            showToast('Payment timed out. Customer took too long.', 'error');
                            setProcessing(false);
                        }
                    } catch (e) {
                        console.error("Polling error:", e);
                    }
                }, 3000);
            } else {
                showToast(res.message || 'STK Push failed', 'error');
                setStkStatus('failed');
                setProcessing(false);
            }
        } catch (err) {
            console.error('STK Error:', err);
            showToast('Could not reach M-Pesa server.', 'error');
            setStkStatus('failed');
            setProcessing(false);
        }
    };

    const printReceipt = (ref) => {
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding: 10px; text-align: center; }
            h2 { margin: 5px 0; text-transform: uppercase; font-size: 16px; font-weight: 900; text-align: center; }
            .info-text { font-size: 10px; color: #000; line-height: 1.2; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { border-bottom: 1px solid #000; text-align: left; padding: 4px 0; font-size: 10px; }
            td { padding: 4px 0; text-align: left; vertical-align: top; }
            .right { text-align: right; }
            .total-section { border-top: 1px double #000; margin-top: 5px; padding-top: 5px; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
            .pmt-info { text-align: left; margin: 10px 0; font-size: 10px; border-top: 1px dashed #aaa; padding-top: 5px; }
            .footer { margin-top: 20px; font-size: 9px; font-style: italic; border-top: 1px solid #000; padding-top: 8px; }
            .meta { font-size: 8px; margin-top: 5px; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div class="info-text">
                ${settings.shop_address || ''}<br/>
                TEL: ${settings.shop_phone || ''}<br/>
                REF: ${ref}
            </div>
          </div>
          
          <table>
            <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
            <tbody>
              ${cart.map(c => `
                <tr>
                  <td colspan="4" style="font-weight: bold;">${c.item_name || c.name}</td>
                </tr>
                <tr>
                  <td style="font-size: 9px; padding-left: 5px;">${c.code || ''} ${c.material ? `// ${c.material}` : ''}</td>
                  <td class="right">${c.qty}</td>
                  <td class="right">${c.price.toFixed(2)}</td>
                  <td class="right">${(c.price * c.qty).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row"><span>GRAND TOTAL</span><span>Ksh ${total.toFixed(2)}</span></div>
          </div>

          <div class="pmt-info">
            <div>MODE: ${paymentMode}</div>
            ${mpesaCode ? `<div>MPESA: ${mpesaCode}</div>` : ''}
            <div>DATE: ${new Date().toLocaleString()}</div>
            <div>CASHIER: ${user.full_name || user.username}</div>
          </div>

          <div class="footer">${settings.receipt_footer || 'Thank you for your business!'}</div>
          <div class="meta">Software by Whose Folt</div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printServiceReceipt = (srv, paidAmountThisTime) => {
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding: 10px; text-align: center; }
            h2 { margin: 5px 0; text-transform: uppercase; font-size: 16px; font-weight: 900; text-align: center; }
            .info-text { font-size: 10px; color: #000; line-height: 1.2; }
            .label-badge { font-size: 10px; font-weight: bold; margin: 10px; display: block; background: #000; color: #fff; padding: 2px; text-transform: uppercase; text-align: center; }
            .details { text-align: left; font-size: 11px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-section { border-top: 1px double #000; margin-top: 10px; padding-top: 5px; }
            .total { font-size: 15px; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 9px; border-top: 1px solid #000; padding-top: 8px; }
            .meta { font-size: 8px; margin-top: 5px; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div class="info-text">
                ${settings.shop_address || ''}<br/>
                TEL: ${settings.shop_phone || ''}<br/>
            </div>
            <div class="label-badge">SERVICE RECEIPT</div>
            <div style="font-size: 14px; font-weight: bold;">TICKET: ${srv.service_code || srv.code}</div>
          </div>

          <div class="details">
            <div class="row"><span>Customer:</span><span>${srv.customer_name}</span></div>
            <div class="row"><span>Item:</span><span>${srv.item_description}</span></div>
            <div style="margin: 5px 0; border: 1px dashed #eee; padding: 5px; font-size: 10px; font-style: italic;">
                SERVICE: ${srv.service_required}
            </div>
          </div>

          <div class="details">
            <div class="row"><span>Service Total:</span><span>Ksh ${Number(srv.total_amount).toFixed(2)}</span></div>
            <div class="row" style="font-weight: bold;"><span>PAID NOW:</span><span>Ksh ${Number(paidAmountThisTime).toFixed(2)}</span></div>
            <div class="row"><span>Cumulative Paid:</span><span>Ksh ${Number(srv.paid_amount).toFixed(2)}</span></div>
          </div>

          <div class="total-section">
            <div class="row total"><span>BALANCE DUE:</span><span>Ksh ${(Number(srv.total_amount) - Number(srv.paid_amount)).toFixed(2)}</span></div>
          </div>

          <div class="pmt-info" style="text-align: left; font-size: 9px; margin-top: 10px;">
            <div>DATE: ${new Date().toLocaleString()}</div>
            <div>CASHIER: ${user.full_name}</div>
          </div>
          
          <div class="footer">Please retain this ticket for collection. ${settings.receipt_footer || ''}</div>
          <div class="meta">Software by Whose Folt</div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printFittingReceipt = (fit, paidAmountThisTime) => {
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding: 10px; text-align: center; }
            h2 { margin: 5px 0; text-transform: uppercase; font-size: 16px; font-weight: 900; }
            .info-text { font-size: 10px; color: #000; line-height: 1.2; }
            .label-badge { font-size: 10px; font-weight: bold; margin: 10px; display: block; border: 1px solid #000; padding: 2px; text-transform: uppercase; text-align: center; }
            .details { text-align: left; font-size: 11px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-section { border-top: 1px double #000; margin-top: 10px; padding-top: 5px; }
            .footer { margin-top: 20px; font-size: 9px; border-top: 1px solid #000; padding-top: 8px; }
            .meta { font-size: 8px; margin-top: 5px; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div class="info-text">
                ${settings.shop_address || ''}<br/>
                TEL: ${settings.shop_phone || ''}<br/>
            </div>
            <div class="label-badge">DEPOSIT/INSTALLMENT</div>
            <div style="font-size: 14px; font-weight: bold;">PLAN: ${fit.fitting_code || fit.code}</div>
          </div>

          <div class="details">
            <div class="row"><span>Customer:</span><span>${fit.customer_name}</span></div>
            <div class="row"><span>Product:</span><span>${fit.item_name}</span></div>
            <div class="row"><span>Variation:</span><span>${fit.material} (${fit.color})</span></div>
          </div>

          <div class="details">
            <div class="row"><span>Total Price:</span><span>Ksh ${Number(fit.total_amount).toFixed(2)}</span></div>
            <div class="row" style="font-weight: bold;"><span>PAID NOW:</span><span>Ksh ${Number(paidAmountThisTime).toFixed(2)}</span></div>
            <div class="row"><span>Cumulative Paid:</span><span>Ksh ${Number(fit.paid_amount).toFixed(2)}</span></div>
          </div>

          <div class="total-section">
            <div class="row" style="font-size: 15px; font-weight: bold;"><span>BALANCE:</span><span>Ksh ${(Number(fit.total_amount) - Number(fit.paid_amount)).toFixed(2)}</span></div>
          </div>

          <div style="text-align: left; font-size: 9px; margin-top: 10px;">
            <div>DATE: ${new Date().toLocaleString()}</div>
            <div>CASHIER: ${user.full_name}</div>
          </div>

          <div class="footer">${settings.receipt_footer || 'Thank you for your business!'}</div>
          <div class="meta">Software by Whose Folt</div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printTailoringReceipt = (ord, paidAmountThisTime) => {
        if (!ord) return;
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding: 10px; text-align: center; }
            h2 { margin: 5px 0; text-transform: uppercase; font-size: 16px; font-weight: 900; text-align: center; }
            .info-text { font-size: 10px; color: #000; line-height: 1.2; }
            .label-badge { font-size: 10px; font-weight: bold; margin: 10px 0; display: block; background: #000; color: #fff; padding: 2px; text-transform: uppercase; text-align: center; }
            .details { text-align: left; font-size: 11px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-section { border-top: 1px double #000; margin-top: 10px; padding-top: 5px; }
            .footer { margin-top: 20px; font-size: 9px; border-top: 1px solid #000; padding-top: 8px; }
            .measurements { text-align: left; font-size: 9px; border: 1px dashed #aaa; padding: 5px; margin: 10px 0; }
            .meta { font-size: 8px; margin-top: 5px; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <img src="${base64Logo}" style="width: 50px; height: 50px; filter: grayscale(1); margin-bottom: 5px;" />
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div class="info-text">
                ${settings.shop_address || ''}<br/>
                TEL: ${settings.shop_phone || ''}<br/>
            </div>
            <div class="label-badge">CUSTOM TAILORING</div>
            <div style="font-size: 14px; font-weight: bold;">ORDER: ${ord.order_code || ord.code || 'N/A'}</div>
          </div>

          <div class="details">
            <div class="row"><span>Customer:</span><span>${ord.customer_name || 'Walking Customer'}</span></div>
            <div class="row"><span>Garments:</span><span style="font-weight: bold; text-transform: uppercase;">${(() => {
                try {
                    const m = typeof ord.measurements === 'string' ? JSON.parse(ord.measurements || '[]') : (ord.measurements || []);
                    const sets = Array.isArray(m) ? m : [m];
                    return sets.map(set => set.type || 'Custom').join(', ');
                } catch { return 'Custom'; }
            })()}</span></div>
            <div class="row"><span>Style:</span><span>${ord.style_name || 'Custom'}</span></div>
            <div class="row"><span>Fabric:</span><span>${ord.material_name || 'Own Material'}</span></div>
            <div class="row"><span>DEADLINE:</span><span style="font-weight: bold;">${ord.deadline || 'N/A'}</span></div>
          </div>

          <div class="details">
            <div class="row"><span>Total Price:</span><span>Ksh ${Number(ord.total_price || ord.total_amount || 0).toFixed(2)}</span></div>
            <div class="row" style="font-weight: bold;"><span>PAID NOW:</span><span>Ksh ${Number(paidAmountThisTime || 0).toFixed(2)}</span></div>
            <div class="row"><span>Cumulative Paid:</span><span>Ksh ${Number(ord.paid_amount || 0).toFixed(2)}</span></div>
          </div>

          <div class="total-section">
            <div class="row" style="font-size: 15px; font-weight: bold;"><span>BALANCE:</span><span>Ksh ${(Number(ord.total_price || ord.total_amount || 0) - Number(ord.paid_amount || 0)).toFixed(2)}</span></div>
          </div>

          <div style="text-align: left; font-size: 9px; margin-top: 10px;">
            <div>DATE: ${new Date().toLocaleString()}</div>
            <div>CASHIER: ${user.full_name}</div>
          </div>

          <div class="footer">${settings.receipt_footer || 'Expertise in every stitch.'}</div>
          <div class="meta">Software by Whose Folt</div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printTailoringSpecs = (ord) => {
        const m = typeof ord.measurements === 'string' ? JSON.parse(ord.measurements || '[]') : (ord.measurements || []);
        const sets = Array.isArray(m) ? m : [m];
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { 
                box-sizing: border-box;
                font-family: 'Courier New', monospace; 
                padding: 0 0 10px 0; 
                text-align: left; 
                width: 72mm; 
                margin: 0; 
                font-size: 11px; 
            }
            .header { border-bottom: 2px solid #000; padding: 10px; margin-bottom: 10px; text-align: center; }
            h2 { margin: 2px 0; text-transform: uppercase; font-size: 14px; text-align: center; }
            .info { text-align: left; margin-bottom: 10px; font-size: 10px; }
            .specs-title { 
                background: #000; 
                color: #fff; 
                padding: 3px; 
                margin: 10px 0; 
                font-weight: bold; 
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .spec-row { 
                display: flex; 
                justify-content: space-between; 
                border-bottom: 1px dashed #ccc; 
                padding: 4px 0;
            }
            .label { text-transform: capitalize; }
            .value { font-weight: bold; font-size: 12px; }
            .notes { 
                text-align: left; 
                margin-top: 15px; 
                padding: 5px; 
                border: 1px solid #000; 
                font-style: italic;
                font-size: 10px;
            }
            .footer { 
                margin-top: 20px; 
                font-size: 9px; 
                border-top: 1px solid #000; 
                padding-top: 5px; 
                opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${settings.shop_name || 'Tailoring Workshop'}</h2>
            <div style="font-size: 9px;">MEASUREMENT SPEC SHEET</div>
          </div>
          
          <div class="info">
            <div>ORDER: <strong>${ord.order_code}</strong></div>
            <div>CUST : <strong>${ord.customer_name}</strong></div>
            <div>ITEMS: <strong style="text-transform: uppercase;">${sets.map(set => set.type || 'Custom').join(', ')}</strong></div>
            <div>DATE : ${new Date().toLocaleDateString()}</div>
          </div>

          ${sets.map((set, idx) => `
          <div class="specs-title">Measurements (Inches) - ${set.type ? set.type.toUpperCase() : 'CUSTOM'}</div>
          
          <div style="text-align: left;">
            ${Object.entries(set)
                .filter(([k, v]) => k !== 'notes' && k !== 'type' && v)
                .map(([k, v]) => `
                <div class="spec-row">
                    <span class="label">${k.replace(/_/g, ' ')}</span>
                    <span class="value">${v}"</span>
                </div>
                `).join('')}
          </div>

          ${set.notes ? `<div class="notes"><strong>WORKSHOP NOTES:</strong><br/>${set.notes}</div>` : ''}
          `).join('')}

          <div class="footer">
            Style: ${ord.style_name || 'Custom'}<br/>
            Fabric: ${ord.material_name || 'Customer Supplied'}<br/>
            <div style="margin-top: 5px; font-weight: bold;">DEADLINE: ${ord.deadline}</div>
            <div style="font-size: 8px; margin-top: 10px; opacity: 0.7;">Software by Whose Folt</div>
            <div style="font-size: 7px; margin-top: 5px; opacity: 0.5;">Printed on ${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printExpenseReceipt = (exp) => {
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
            h2 { margin: 5px 0; font-size: 14px; }
            .details { text-align: left; font-size: 11px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .amount-box { border: 1.5px solid #000; padding: 10px; font-size: 16px; font-weight: bold; margin: 10px 0; }
            .footer { margin-top: 15px; font-size: 8px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div style="font-weight: bold; border: 1px solid #000; padding: 2px;">EXPENSE VOUCHER</div>
          </div>
          <div class="details">
            <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
            <div class="row"><span>Category:</span><span>${exp.category || 'N/A'}</span></div>
            <div class="row"><span>Method:</span><span>${exp.payment_mode || 'Cash'}</span></div>
          </div>
          <div style="text-align: left; font-size: 11px; margin-bottom: 5px; font-weight: bold;">DESCRIPTION:</div>
          <div style="text-align: left; font-size: 11px; margin-bottom: 10px; border: 1px dashed #ccc; padding: 5px;">
            ${exp.description}
          </div>
          <div class="amount-box">
            TOTAL: Ksh ${Number(exp.amount).toFixed(2)}
          </div>
          <div class="footer">
            Internal Business Document<br/>
            Software by Whose Folt
          </div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    const printWorkforcePaymentReceipt = (p) => {
        const html = `
      <html>
        <head>
          <style>
            @page { size: 72mm auto; margin: 0; }
            body { box-sizing: border-box; font-family: 'Courier New', monospace; padding: 0 0 10px 0; text-align: left; width: 72mm; margin: 0; font-size: 12px; }
            .header-info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding: 10px; text-align: center; }
            h2 { margin: 5px 0; font-size: 14px; text-align: center; }
            .details { text-align: left; font-size: 11px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .amount-box { border: 2px double #000; padding: 10px; font-size: 16px; font-weight: bold; margin: 10px 0; }
            .sig { margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; font-size: 9px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2>${settings.shop_name || 'Eunika Collection'}</h2>
            <div class="voucher-title">PAYMENT ADVICE</div>
          </div>
          <div class="details">
            <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
            <div class="row"><span>Staff Name:</span><span>${p.worker_name}</span></div>
            <div class="row"><span>Method:</span><span>${p.payment_mode || 'Cash'}</span></div>
          </div>
          <div class="amount-box">
            PAID: Ksh ${Number(p.amount).toFixed(2)}
          </div>
          <div class="sig">
            <div style="margin-bottom: 20px;">Staff Signature: __________________</div>
            <div>Authorized By: ${user.full_name}</div>
          </div>
          <div style="margin-top: 15px; font-size: 8px; opacity: 0.7;">Software by Whose Folt</div>
        </body>
      </html>
    `;
        return window.api.print(html);
    };

    if (!user && !loggedInWorker) {
        const isWorker = loginMode === 'worker';
        return (
            <div className="login-screen">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Authenticating...</div>
                    </div>
                )}

                <div className="login-card" style={{ paddingTop: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <img src={logo} style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1rem' }} />
                        <h1 className="brand" style={{ margin: 0, fontSize: '2rem', textTransform: 'uppercase' }}>{settings.shop_name || 'EUNIKA COLLECTION'}</h1>
                        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Management & POS System</p>
                    </div>

                    {/* Tab Toggle */}
                    <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155', marginBottom: '24px' }}>
                        <button type="button"
                            onClick={() => setLoginMode('staff')}
                            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', background: !isWorker ? '#3b82f6' : '#1e293b', color: !isWorker ? 'white' : '#94a3b8', transition: 'all 0.2s' }}>
                            👔 Staff / Admin
                        </button>
                        <button type="button"
                            onClick={() => setLoginMode('worker')}
                            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', background: isWorker ? '#10b981' : '#1e293b', color: isWorker ? 'white' : '#94a3b8', transition: 'all 0.2s' }}>
                            🧵 Worker Portal
                        </button>
                    </div>

                    {!isWorker ? (
                        // --- Staff/Admin Login ---
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setProcessing(true);
                            try {
                                const res = await window.api.login(e.target.username.value, e.target.password.value);
                                if (res.success) { setUser(res.user); setView('hub'); }
                                else showToast(res.message, 'error');
                            } catch (err) {
                                showToast(`Authentication Failed: ${err.message || 'Network Error'}`, 'error');
                            } finally { setProcessing(false); }
                        }}>
                            <div className="form-group">
                                <label className="label">Username</label>
                                <input name="username" placeholder="Enter username" required />
                            </div>
                            <div className="form-group">
                                <label className="label">Password</label>
                                <input name="password" type="password" placeholder="••••••••" required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '16px' }}>Sign In</button>
                        </form>
                    ) : (
                        // --- Worker Portal Login ---
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setProcessing(true);
                            try {
                                const res = await window.api.workerLogin(e.target.w_username.value, e.target.w_password.value);
                                if (res.success) {
                                    setLoggedInWorker(res.worker);
                                    const tasks = await window.api.getWorkerTasks(res.worker.id);
                                    setWorkerTasks(tasks || []);
                                } else showToast(res.message, 'error');
                            } catch (err) {
                                showToast(`Login Failed: ${err.message || 'Network Error'}`, 'error');
                            } finally { setProcessing(false); }
                        }}>
                            <div className="form-group">
                                <label className="label">Worker Username</label>
                                <input name="w_username" placeholder="Enter your username" required />
                            </div>
                            <div className="form-group">
                                <label className="label">Password</label>
                                <input name="w_password" type="password" placeholder="••••••••" required />
                            </div>
                            <button type="submit" className="btn" style={{ width: '100%', padding: '12px', marginTop: '16px', background: '#10b981', color: 'white', fontWeight: '700' }}>Enter Worker Portal</button>
                        </form>
                    )}
                </div>

                {toast && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', fontWeight: '600' }}>
                        {toast.message}
                    </div>
                )}
            </div>
        );
    }

    // --- WORKER DASHBOARD ---
    if (loggedInWorker) {
        const statusColor = { assigned: '#dbeafe', in_progress: '#fef9c3', completed: '#dcfce7' };
        const statusText = { assigned: '#1e40af', in_progress: '#854d0e', completed: '#166534' };
        return (
            <div className="app" style={{ height: '100vh', background: '#0f172a' }}>
                {processing && (<div className="processing-overlay"><div className="spinner"></div></div>)}
                <header className="header" style={{ background: '#134e4a', borderBottom: '1px solid #0d9488' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🧵</span>
                        <div>
                            <div className="brand" style={{ color: '#5eead4', fontSize: '1rem' }}>WORKER PORTAL</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{loggedInWorker.name} — {loggedInWorker.role}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button className="btn" style={{ background: '#0f766e', color: 'white', fontSize: '0.85rem' }} onClick={async () => {
                            setProcessing(true);
                            const tasks = await window.api.getWorkerTasks(loggedInWorker.id);
                            setWorkerTasks(tasks || []);
                            setProcessing(false);
                        }}>↻ Refresh</button>
                        <button className="btn btn-danger" style={{ fontSize: '0.85rem' }} onClick={() => { setLoggedInWorker(null); setWorkerTasks([]); }}>Logout</button>
                    </div>
                </header>

                <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <button onClick={() => setWorkerTab('active')} style={{ flex: 1, padding: '12px', background: workerTab === 'active' ? '#0f766e' : '#1e293b', color: workerTab === 'active' ? 'white' : '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📋 Active Tasks</button>
                        <button onClick={() => setWorkerTab('completed')} style={{ flex: 1, padding: '12px', background: workerTab === 'completed' ? '#0f766e' : '#1e293b', color: workerTab === 'completed' ? 'white' : '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Work Done</button>
                    </div>

                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header" style={{ background: '#134e4a', color: '#5eead4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{workerTab === 'active' ? '📋 My Assigned Tasks' : '✅ Completed Work'}</span>
                            {workerTab === 'active' ? (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{workerTasks.filter(t => t.status !== 'completed').length} active</span>
                            ) : (
                                <select value={workerCompletedRange} onChange={(e) => setWorkerCompletedRange(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid #334155', fontSize: '0.8rem' }}>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            )}
                        </div>
                        <div className="card-body">
                            {(workerTab === 'active' ? workerTasks.filter(t => t.status !== 'completed') : workerCompletedTasks).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{workerTab === 'active' ? 'No active tasks' : 'No work completed'}</div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>{workerTab === 'active' ? 'Check back later or contact your admin' : 'Select a different time range'}</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(workerTab === 'active' ? workerTasks.filter(t => t.status !== 'completed') : workerCompletedTasks).map(task => (
                                        <div key={task.id} style={{ background: '#1e293b', borderRadius: '10px', padding: '16px 20px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8', fontSize: '1rem' }}>{task.task_code}</span>
                                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', background: task.task_type === 'service' ? '#dcfce7' : '#ede9fe', color: task.task_type === 'service' ? '#166534' : '#6d28d9' }}>
                                                        {task.task_type === 'service' ? 'SERVICE' : 'TAILORING'}
                                                    </span>
                                                    <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', background: statusColor[task.status] || '#f1f5f9', color: statusText[task.status] || '#334155' }}>
                                                        {task.status === 'in_progress' ? 'IN PROGRESS' : task.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '4px' }}>{task.task_description}</div>
                                                {task.notes && <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>📝 {task.notes}</div>}
                                                <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '4px' }}>Assigned: {new Date(task.assigned_at).toLocaleDateString()} by {task.assigned_by}</div>
                                                
                                                {workerTab === 'completed' && task.completed_at && (
                                                    <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>Completed: {new Date(task.completed_at).toLocaleString()}</div>
                                                )}

                                                  {task.task_type === 'tailoring' && (
                                                      <div style={{ marginTop: '8px', display: 'flex', gap: '15px', fontSize: '0.75rem' }}>
                                                          <div><span style={{ color: '#94a3b8' }}>Material:</span> <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{task.material_name || 'Customer Supplied'}</span></div>
                                                          {task.deadline && <div><span style={{ color: '#94a3b8' }}>Deadline:</span> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{task.deadline}</span></div>}
                                                      </div>
                                                  )}
                                                  
                                                  {task.task_type === 'tailoring' && task.measurements && (
                                                      <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                                                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>📏 MEASUREMENTS</div>
                                                          {parseWorkerMeasurements(task.measurements).map((set, idx) => (
                                                              <div key={idx} style={{ marginBottom: idx < parseWorkerMeasurements(task.measurements).length - 1 ? '8px' : '0' }}>
                                                                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', marginRight: '6px', fontWeight: 'bold' }}>{set.type || 'Custom'}:</span>
                                                                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                                                                      {Object.entries(set).filter(([k, v]) => k !== 'type' && v).map(([k, v]) => `${k.replace('m_', '').replace('_', ' ')}: ${v}`).join(', ')}
                                                                  </span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                                  
                                                  {task.task_type === 'tailoring' && task.design_image && (
                                                      <div style={{ marginTop: '10px' }}>
                                                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>🖼️ DESIGN IMAGE</div>
                                                          <img src={task.design_image} alt="Design" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', border: '1px solid #334155' }} />
                                                      </div>
                                                  )}
                                              </div>
                                            {workerTab === 'active' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
                                                    {task.status === 'assigned' && (
                                                        <button className="btn" style={{ background: '#ca8a04', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }}
                                                            onClick={async () => {
                                                                setProcessing(true);
                                                                const res = await window.api.updateTaskStatus({ id: task.id, status: 'in_progress' });
                                                                if (res.success) { const t = await window.api.getWorkerTasks(loggedInWorker.id); setWorkerTasks(t || []); showToast('Status updated', 'success'); }
                                                                setProcessing(false);
                                                            }}>▶ Start Task</button>
                                                    )}
                                                    <button className="btn" style={{ background: '#16a34a', color: 'white', fontSize: '0.8rem', padding: '6px 12px' }}
                                                        onClick={async () => {
                                                            setProcessing(true);
                                                            const res = await window.api.updateTaskStatus({ id: task.id, status: 'completed' });
                                                            if (res.success) { 
                                                                const t = await window.api.getWorkerTasks(loggedInWorker.id); 
                                                                setWorkerTasks(t || []); 
                                                                fetch(`http://localhost:5001/api/worker-tasks/completed?worker_id=${loggedInWorker.id}&range=${workerCompletedRange}`)
                                                                    .then(r => r.json())
                                                                    .then(d => setWorkerCompletedTasks(d || []));
                                                                showToast('Task marked complete!', 'success'); 
                                                            }
                                                            setProcessing(false);
                                                        }}>✔ Mark Complete</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {toast && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', fontWeight: '600' }}>
                        {toast.message}
                    </div>
                )}
            </div>
        );
    }

    if (showAdmin) {
        return <AdminPanel
            user={user}
            onBack={() => { setShowAdmin(false); setView('hub'); }}
            onGoToPOS={() => { setShowAdmin(false); setView('pos'); }}
            showToast={showToast}
            printExpenseReceipt={printExpenseReceipt}
            printWorkforcePaymentReceipt={printWorkforcePaymentReceipt}
            base64Logo={base64Logo}
            gallery={gallery}
            loadData={loadData}
        />;
    }

    if (view === 'hub') {
        const modules = [
            { id: 'pos', title: 'Product Sale', icon: '🛒' },
            { id: 'selling_materials', title: 'Custom Order', icon: '🎨' },
            { id: 'materials_service', title: 'Service Intake', icon: '🧵' },
            { id: 'deposits_measurements', title: 'Fitting & Deposit', icon: '📏' },
            { id: 'expense_tracker', title: 'Shop Expenses', icon: '💸' },
            { id: 'custom_tailoring', title: 'Custom Tailoring', icon: '✂' },
            { id: 'gallery', title: 'Style Gallery', icon: '🖼️' },
        ];

        return (
            <div className="hub-screen">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold' }}>Updating System...</div>
                    </div>
                )}
                <div className="hub-header-futuristic">
                    <h1 style={{ textTransform: 'uppercase' }}>{settings.shop_name ? settings.shop_name.split(' ')[0] : 'EUNIKA'}</h1>
                    <p>{settings.shop_name || 'Eunika Collection'} // Selection Protocol</p>
                </div>

                <div className="hub-grid-futuristic">
                    {modules.map(m => (
                        <div key={m.id}
                            className="hub-tile-futuristic"
                            onClick={() => setView(m.id)}>
                            <div className="hub-icon-futuristic">{m.icon}</div>
                            <h3>{m.title}</h3>
                        </div>
                    ))}
                </div>

                <div className="hub-footer-futuristic">
                    <div className="hub-user-futuristic">
                        <span style={{ opacity: 0.5 }}>ACTIVE OPERATOR:</span>
                        <span style={{ fontWeight: 'bold' }}>{(user.full_name || user.username || 'USER').toUpperCase()}</span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2ff', boxShadow: '0 0 10px #00f2ff' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <button
                            className="btn-terminal-action"
                            onClick={() => window.location.reload()}
                            style={{
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid #10b981',
                                padding: '0.6rem 1.5rem',
                                cursor: 'pointer',
                                fontFamily: 'Orbitron',
                                transition: 'all 0.3s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                        >
                            REFRESH SYSTEM
                        </button>
                        {user.role === 'admin' && (
                            <button className="btn-terminal-action" onClick={() => setShowAdmin(true)} style={{ color: '#00f2ff', background: 'rgba(0, 242, 255, 0.1)', border: '1px solid #00f2ff', padding: '0.6rem 1.5rem', cursor: 'pointer', fontFamily: 'Orbitron' }}>SYSTEM ADMIN</button>
                        )}
                        <button className="btn-futuristic-exit" onClick={handleLogout}>TERMINATE SESSION</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'pos' || view === 'selling_materials') {
        return (
            <div className="app">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold' }}>
                            {stkStatus === 'waiting_for_pin' ? 'Waiting for customer to enter PIN...' : 'Processing Transaction...'}
                        </div>
                    </div>
                )}
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn-back-nav" onClick={() => setView('hub')}>← Dashboard</button>
                        <div className="brand">EUNIKA {view === 'pos' ? 'POS' : 'CUSTOM ORDER'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="btn" style={{ background: '#10b981', color: 'white', width: 'auto' }} onClick={() => window.location.reload()} title="Refresh System Data">↻ Refresh App</button>
                        <span style={{ fontWeight: '600' }}>{user.full_name}</span>
                        <button className="btn btn-danger" style={{ width: 'auto' }} onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <main className="main">
                    <div className="card">
                        <div className="card-header">Sale Details</div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="label">Item Code</label>
                                <input value={code}
                                    onChange={e => setCode(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToCart()}
                                    placeholder="Scan code..." autoFocus />
                            </div>

                            {view === 'selling_materials' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Material</label>
                                        <select
                                            value={selectedMaterial}
                                            onChange={e => setSelectedMaterial(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">-- Select Material --</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Color Code</label>
                                        <select
                                            value={selectedColor}
                                            onChange={e => setSelectedColor(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">-- Select Color Code --</option>
                                            {colors.map(c => (
                                                <option key={c.id} value={c.color_code}>{c.color_code} {c.color_name ? `(${c.color_name})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="label">Quantity</label>
                                <input type="number" value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addToCart()}
                                />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '24px' }} onClick={addToCart}>Add to Cart</button>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <label className="label">Payment Mode</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                    <button className={`btn`} style={{ flex: 1, background: paymentMode === 'Cash' ? '#22c55e' : '#f1f5f9', color: paymentMode === 'Cash' ? 'white' : 'black' }} onClick={() => setPaymentMode('Cash')}>CASH</button>
                                    <button className={`btn`} style={{ flex: 1, background: paymentMode === 'M-Pesa' ? '#2563eb' : '#f1f5f9', color: paymentMode === 'M-Pesa' ? 'white' : 'black' }} onClick={() => setPaymentMode('M-Pesa')}>M-PESA (OFFLINE)</button>
                                    <button className={`btn`} style={{ flex: 1, background: paymentMode === 'M-Pesa-STK' ? '#10b981' : '#f1f5f9', color: paymentMode === 'M-Pesa-STK' ? 'white' : 'black' }} onClick={() => setPaymentMode('M-Pesa-STK')}>M-PESA (STK)</button>
                                </div>
                                {paymentMode === 'M-Pesa' && (
                                    <div className="form-group">
                                        <label className="label">Select M-Pesa Payment</label>
                                        <select 
                                            value={mpesaCode} 
                                            onChange={e => setMpesaCode(e.target.value)}
                                            style={{ marginBottom: '10px', width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">-- Select or type below --</option>
                                            {unclaimedMpesa.map(u => (
                                                <option key={u.id} value={u.mpesa_receipt}>
                                                    {u.mpesa_receipt} - Ksh {u.amount} ({u.phone})
                                                </option>
                                            ))}
                                        </select>
                                        <input value={mpesaCode}
                                            onChange={e => setMpesaCode(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleProcess()}
                                            placeholder="Or type code manually..." />
                                    </div>
                                )}
                                {paymentMode === 'M-Pesa-STK' && (
                                    <div className="form-group">
                                        <label className="label">Customer Phone (254...)</label>
                                        <input 
                                            placeholder="254..." 
                                            defaultValue="" 
                                            id="pos_stk_phone"
                                            style={{ marginBottom: '10px' }}
                                        />
                                        <button 
                                            className="btn" 
                                            style={{ width: '100%', background: '#10b981', color: 'white' }}
                                            onClick={() => {
                                                const phone = document.getElementById('pos_stk_phone').value;
                                                triggerSTKPush(total, phone);
                                            }}
                                        >
                                            📲 Send STK Push (Ksh {total})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Current Basket</div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <table>
                                    <thead><tr><th>Code</th><th>Item</th><th>Detail</th><th>Qty</th><th>Amt</th><th></th></tr></thead>
                                    <tbody>
                                        {cart.map((it, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#666' }}>{it.item_code || it.code || 'N/A'}</td>
                                                <td>{it.item_name || it.name}</td>
                                                <td style={{ fontSize: '0.75rem' }}>
                                                    {it.material && <div>Mat: {it.material}</div>}
                                                    {it.colorCode && <div>Col: {it.colorCode}</div>}
                                                </td>
                                                <td>{it.qty}</td>
                                                <td>Ksh {(it.price * it.qty).toFixed(2)}</td>
                                                <td><button style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setCart(cart.filter((_, i) => i !== idx))}>✕</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '20px', borderTop: '2px solid #000', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px' }}>
                                    <span>TOTAL</span>
                                    <span>Ksh {total.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setCart([])}>Void</button>
                                    <button className="btn btn-success" style={{ flex: 2 }} onClick={handleProcess}>Process</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                {toast && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 9999,
                        backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e',
                        color: 'white',
                        padding: '16px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: '16px',
                        fontWeight: '600',
                        opacity: 0.95
                    }}>
                        {toast.message}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'gallery') {
        return <GalleryView
            gallery={gallery}
            loadData={loadData}
            onBack={() => setView('hub')}
            showToast={showToast}
            processing={processing}
            setProcessing={setProcessing}
        />;
    }

    if (view === 'materials_service') {
        const handleAddService = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const standardService = fd.get('service_required');
            const customDetail = fd.get('custom_service');
            const data = {
                customer_name: fd.get('customer_name'),
                customer_phone: fd.get('customer_phone'),
                item_description: fd.get('item_description'),
                service_required: standardService === 'Custom' ? customDetail : (customDetail ? `${standardService}: ${customDetail}` : standardService),
                total_amount: Number(fd.get('total_amount')),
                paid_amount: Number(fd.get('paid_amount')),
                payment_mode: fd.get('payment_mode_service'),
                mpesa_code: fd.get('mpesa_code_service'),
                cashier_name: user.full_name,
                cashier_id: user.id
            };
            setProcessing(true);
            try {
                const res = await window.api.addService(data);
                if (res.success) {
                    showToast('Intake Successful! Printing Receipt...', 'success');
                    await printServiceReceipt({ ...data, service_code: res.code, paid_amount: data.paid_amount }, data.paid_amount);
                    e.target.reset();
                    await loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        };

        const handlePayBalance = (srv) => {
            setServicePayment(srv);
        };

        const handleUpdateStatus = async (srv, status) => {
            const res = await window.api.updateServicePayment({
                id: srv.id,
                amount: 0,
                status,
                cashier_name: user.full_name,
                cashier_id: user.id
            });
            if (res.success) loadData();
            else showToast(res.message, 'error');
        };

        const handleProcessServicePayment = async (e) => {
            e.preventDefault();
            const srv = servicePayment;
            if (!srv) return;

            const numericAmount = Number(e.target.amount.value);
            const pMode = e.target.payment_mode.value;
            const mCode = e.target.mpesa_code?.value || '';

            let status = srv.status;
            const total = Number(srv.total_amount);
            const paid = Number(srv.paid_amount);

            if (paid + numericAmount >= total - 0.01) {
                // If paid full, prompt user if they want to collect (can be checkbox in modal, but for now auto-ready)
                // We'll leave it as is or use the form checkbox if we add one.
                // For simplicity: if payment completes balance, it remains 'ready' (unless already ready), or 'collected' if user chooses.
                // Let's rely on standard flow: Pending -> (Paid) -> Ready -> Collected.
                // If it was pending and now fully paid, mark ready?
                if (status === 'pending') status = 'ready';
            }

            setProcessing(true);
            try {
                const res = await window.api.updateServicePayment({
                    id: srv.id,
                    amount: numericAmount,
                    status,
                    payment_mode: pMode,
                    mpesa_code: mCode,
                    cashier_name: user.full_name,
                    cashier_id: user.id
                });

                if (res.success) {
                    showToast('Payment Processed! Printing Receipt...', 'success');
                    await printServiceReceipt({ ...srv, paid_amount: paid + numericAmount }, numericAmount);
                    setServicePayment(null);
                    await loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        };



        return (
            <div className="app">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold' }}>Updating Service Record...</div>
                    </div>
                )}
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn-back-nav" onClick={() => setView('hub')}>← Dashboard</button>
                        <div className="brand">SERVICE INTAKE & MAINTENANCE</div>
                        <button className="btn" style={{ background: '#10b981', color: 'white', marginLeft: '20px', padding: '5px 15px' }} onClick={() => window.location.reload()}>↻ Refresh App</button>
                    </div>
                </header>

                <main className="main" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '2rem', padding: '2rem' }}>
                    {/* New Intake Form */}
                    <div className="card">
                        <div className="card-header">New Service Intake</div>
                        <div className="card-body">
                            <form onSubmit={handleAddService}>
                                <div className="form-group">
                                    <label className="label">Customer Name</label>
                                    <input name="customer_name" placeholder="John Doe" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Phone Number</label>
                                    <input name="customer_phone" placeholder="0712345678" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Item Description</label>
                                    <input name="item_description" placeholder="e.g. Blue Suit Jacket" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Service Required</label>
                                    <select name="service_required" required style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
                                        <option value="Ironing">Ironing Only</option>
                                        <option value="Dry Cleaning">Dry Cleaning</option>
                                        <option value="Repair">Repair / Stitching</option>
                                        <option value="Custom">Custom Service (Specify below)</option>
                                    </select>
                                    <textarea name="custom_service" placeholder="If custom, specify here..." style={{ width: '100%', marginTop: '10px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid #334155', borderRadius: '6px', padding: '10px' }}></textarea>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="label">Total Amount (Ksh)</label>
                                        <input type="number" name="total_amount" placeholder="0.00" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Paid Amount (Deposit)</label>
                                        <input type="number" name="paid_amount" defaultValue="0" required />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                    <label className="label">Payment Mode</label>
                                    <select name="payment_mode_service" className="input" style={{ width: '100%', marginBottom: '10px' }} onChange={(e) => {
                                        const mpesaField = document.getElementById('mpesa-field-service');
                                        if (mpesaField) mpesaField.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                        const stkBtn = document.getElementById('stk-btn-service');
                                        if (stkBtn) stkBtn.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                    }}>
                                        <option value="Cash">Cash</option>
                                        <option value="M-Pesa">M-Pesa (Offline)</option>
                                        <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                    </select>
                                    <div id="mpesa-field-service" style={{ display: 'none' }}>
                                        <label className="label">M-Pesa Code</label>
                                        <input name="mpesa_code_service" placeholder="RX..." />
                                    </div>
                                    <div id="stk-btn-service" style={{ display: 'none' }}>
                                        <button 
                                            type="button" 
                                            className="btn" 
                                            style={{ background: '#10b981', color: 'white', width: '100%' }}
                                            onClick={(e) => {
                                                const form = e.target.closest('form');
                                                const amount = form.paid_amount.value;
                                                const phone = form.customer_phone.value;
                                                triggerSTKPush(amount, phone, (receipt) => {
                                                    document.getElementsByName('mpesa_code_service')[0].value = receipt;
                                                    document.getElementsByName('payment_mode_service')[0].value = 'M-Pesa';
                                                    form.requestSubmit();
                                                });
                                            }}
                                        >
                                            📲 Request STK Push
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '1rem' }}>Submit Intake</button>
                            </form>
                        </div>
                    </div>

                    {/* Active Services List */}
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Managed Service Requests</span>
                            <div style={{ maxWidth: '250px', width: '100%' }}>
                                <input
                                    placeholder="Search Customer/Code..."
                                    value={serviceSearch}
                                    onChange={e => setServiceSearch(e.target.value)}
                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                />
                            </div>
                        </div>
                        <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Customer</th>
                                        <th>Service</th>
                                        <th>Status</th>
                                        <th>Payment</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredServices.map(s => (
                                        <tr key={s.id} style={{ opacity: s.status === 'collected' ? 0.6 : 1 }}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary)' }}>{s.service_code}</td>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{s.customer_name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.customer_phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{s.item_description}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.service_required}</div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    background: s.status === 'pending' ? '#ef444422' : s.status === 'ready' ? '#3b82f622' : '#10b98122',
                                                    color: s.status === 'pending' ? '#ef4444' : s.status === 'ready' ? '#3b82f6' : '#10b981'
                                                }}>
                                                    {s.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>Ksh {s.paid_amount}/{s.total_amount}</div>
                                                <div style={{ fontSize: '0.7rem' }}>
                                                    {s.paid_amount >= s.total_amount ? 'PAID' : `BAL: Ksh ${s.total_amount - s.paid_amount} `}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {s.status === 'pending' && <button className="btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#3b82f6' }} onClick={() => handleUpdateStatus(s, 'ready')}>Ready</button>}
                                                    {s.status !== 'collected' && s.paid_amount < s.total_amount && (
                                                        <button className="btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#10b981' }} onClick={() => handlePayBalance(s)}>Pay Bal</button>
                                                    )}
                                                    {s.status === 'ready' && s.paid_amount >= s.total_amount && (
                                                        <button className="btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#7000ff' }} onClick={() => handleUpdateStatus(s, 'collected')}>Collect</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                    }
                                    {services.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No service records found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {servicePayment && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '400px', background: 'white', padding: '24px' }}>
                            <h2 style={{ marginBottom: '20px' }}>Process Payment</h2>
                            <div style={{ marginBottom: '15px', padding: '10px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <div><strong>Service:</strong> {servicePayment.service_code}</div>
                                <div><strong>Balance:</strong> Ksh {(servicePayment.total_amount - servicePayment.paid_amount).toFixed(2)}</div>
                            </div>
                            <form onSubmit={handleProcessServicePayment}>
                                <div className="form-group">
                                    <label className="label">Amount to Pay</label>
                                    <input name="amount" type="number" defaultValue={servicePayment.total_amount - servicePayment.paid_amount} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Payment Mode</label>
                                    <select name="payment_mode" className="input" style={{ width: '100%' }} onChange={(e) => {
                                        const el = document.getElementById('modal_mpesa_code');
                                        if (el) el.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                        const stk = document.getElementById('modal_stk_btn_service');
                                        if (stk) stk.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                        const req = document.getElementById('modal_mpesa_input');
                                        if (req) req.required = e.target.value === 'M-Pesa';
                                    }}>
                                        <option value="Cash">Cash</option>
                                        <option value="M-Pesa">M-Pesa (Offline)</option>
                                        <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                    </select>
                                </div>
                                <div id="modal_mpesa_code" style={{ display: 'none', marginBottom: '15px' }}>
                                    <label className="label">M-Pesa Code</label>
                                    <input id="modal_mpesa_input" name="mpesa_code" placeholder="Confirmation Code" />
                                </div>
                                <div id="modal_stk_btn_service" style={{ display: 'none', marginBottom: '15px' }}>
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        style={{ background: '#10b981', color: 'white', width: '100%' }}
                                        onClick={(e) => {
                                            const form = e.target.closest('form');
                                            triggerSTKPush(form.amount.value, servicePayment.customer_phone, (receipt) => {
                                                document.getElementById('modal_mpesa_input').value = receipt;
                                                form.payment_mode.value = 'M-Pesa';
                                                form.requestSubmit();
                                            });
                                        }}
                                    >
                                        📲 Send STK Push
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Confirm Payment</button>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setServicePayment(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'deposits_measurements') {
        const handleAddFitting = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const itemId = fd.get('item_id');
            const selectedItem = items.find(x => x.id == itemId);

            const data = {
                customer_name: fd.get('customer_name'),
                customer_phone: fd.get('customer_phone'),
                item_id: itemId,
                item_name: selectedItem?.item_name || 'Generic Item',
                material: fd.get('material'),
                color: fd.get('color'),
                total_amount: Number(fd.get('total_amount')),
                paid_amount: Number(fd.get('paid_amount')),
                payment_mode: fd.get('payment_mode_fit'),
                mpesa_code: fd.get('mpesa_code_fit'),
                cashier_name: user.full_name,
                cashier_id: user.id
            };

            setProcessing(true);
            try {
                const res = await window.api.addFittingDeposit(data);
                if (res.success) {
                    if (data.payment_mode === 'M-Pesa' && data.mpesa_code) await window.api.claimMpesaPayment(data.mpesa_code);
                    showToast('Intake Successful! Printing Receipt...', 'success');
                    await printFittingReceipt({ ...data, fitting_code: res.code }, data.paid_amount);
                    e.target.reset();
                    await loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        };

        const handlePayFitting = (fit) => {
            setFittingPayment(fit);
        };

        const handleProcessFittingPayment = async (e) => {
            e.preventDefault();
            const fit = fittingPayment;
            if (!fit) return;

            const numericAmount = Number(e.target.amount.value);
            const pMode = e.target.payment_mode.value;
            const mCode = e.target.mpesa_code?.value || '';

            setProcessing(true);
            try {
                const res = await window.api.updateFittingPayment({
                    id: fit.id,
                    amount: numericAmount,
                    payment_mode: pMode,
                    mpesa_code: mCode,
                    cashier_name: user.full_name,
                    cashier_id: user.id
                });

                if (res.success) {
                    if (pMode === 'M-Pesa' && mCode) await window.api.claimMpesaPayment(mCode);
                    showToast('Payment Processed! Printing Receipt...', 'success');
                    // Ensure print uses numeric addition
                    const totalPaidNow = Number(fit.paid_amount) + numericAmount;
                    await printFittingReceipt({ ...fit, paid_amount: totalPaidNow }, numericAmount);
                    setFittingPayment(null);
                    await loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        };

        return (
            <div className="app">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold' }}>Updating Fitting Record...</div>
                    </div>
                )}
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn-back-nav" onClick={() => setView('hub')}>← Dashboard</button>
                        <div className="brand">FITTING & INSTALLMENTS</div>
                        <button className="btn" style={{ background: '#10b981', color: 'white', marginLeft: '20px', padding: '5px 15px' }} onClick={() => window.location.reload()}>↻ Refresh App</button>
                    </div>
                </header>

                <main className="main" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '2rem', padding: '2rem' }}>
                    <div className="card">
                        <div className="card-header">New Fitting Deposit</div>
                        <div className="card-body">
                            <form onSubmit={handleAddFitting}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label className="label">Customer Name</label>
                                        <input name="customer_name" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Phone Number</label>
                                        <input name="customer_phone" placeholder="0712345678" required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label">Product</label>
                                    <select name="item_id" required className="input" style={{ width: '100%' }}>
                                        <option value="">Select a Product...</option>
                                        {items.map(it => <option key={it.id} value={it.id}>{it.item_name} (Ksh {it.price})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Material</label>
                                    <select name="material" required className="input" style={{ width: '100%' }}>
                                        {materials.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Color</label>
                                    <select name="color" required className="input" style={{ width: '100%' }}>
                                        {colors.map(c => <option key={c.id} value={c.color_code}>{c.color_code} {c.color_name ? `(${c.color_name})` : ''}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="label">Total Price</label>
                                        <input type="number" name="total_amount" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Deposit</label>
                                        <input type="number" name="paid_amount" required />
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                    <label className="label">Payment Mode</label>
                                    <select name="payment_mode_fit" className="input" style={{ width: '100%', marginBottom: '10px' }} onChange={(e) => {
                                        const mpesaField = document.getElementById('mpesa-field-fit');
                                        if (mpesaField) mpesaField.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                        const stkBtn = document.getElementById('stk-btn-fit');
                                        if (stkBtn) stkBtn.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                    }}>
                                        <option value="Cash">Cash</option>
                                        <option value="M-Pesa">M-Pesa (Offline)</option>
                                        <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                    </select>
                                    <div id="mpesa-field-fit" style={{ display: 'none' }}>
                                        <label className="label">Select M-Pesa Payment</label>
                                        <select 
                                            name="mpesa_code_fit_dropdown"
                                            className="input"
                                            style={{ width: '100%', marginBottom: '10px' }}
                                            onChange={(e) => {
                                                document.getElementsByName('mpesa_code_fit')[0].value = e.target.value;
                                            }}
                                        >
                                            <option value="">-- Select or type below --</option>
                                            {unclaimedMpesa?.map(u => (
                                                <option key={u.id} value={u.mpesa_receipt}>
                                                    {u.mpesa_receipt} - Ksh {u.amount} ({u.phone})
                                                </option>
                                            ))}
                                        </select>
                                        <input name="mpesa_code_fit" placeholder="Or type M-Pesa Code" />
                                    </div>
                                    <div id="stk-btn-fit" style={{ display: 'none' }}>
                                        <button 
                                            type="button" 
                                            className="btn" 
                                            style={{ background: '#10b981', color: 'white', width: '100%' }}
                                            onClick={(e) => {
                                                const form = e.target.closest('form');
                                                const amount = form.paid_amount.value;
                                                const phone = form.customer_phone.value;
                                                triggerSTKPush(amount, phone, (receipt) => {
                                                    document.getElementsByName('mpesa_code_fit')[0].value = receipt;
                                                    document.getElementsByName('payment_mode_fit')[0].value = 'M-Pesa';
                                                    form.requestSubmit();
                                                });
                                            }}
                                        >
                                            📲 Request STK Push
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Create Plan</button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Active Installments</span>
                            <div style={{ maxWidth: '250px', width: '100%' }}>
                                <input
                                    placeholder="Search Customer/Code..."
                                    value={fittingSearch}
                                    onChange={e => setFittingSearch(e.target.value)}
                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                />
                            </div>
                        </div>
                        <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Customer</th>
                                        <th>Product Info</th>
                                        <th>Payment Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFitting.map(f => (
                                        <tr key={f.id} style={{ opacity: f.status === 'collected' ? 0.6 : 1 }}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 'bold' }}>{f.fitting_code}</td>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{f.customer_name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{f.customer_phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{f.item_name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{f.material} | {f.color}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>Ksh {f.paid_amount} / {f.total_amount}</div>
                                                <div style={{ fontSize: '0.7rem' }}>
                                                    {f.paid_amount >= f.total_amount ? <span style={{ color: '#10b981' }}>COMPLETED</span> : `BAL: Ksh ${f.total_amount - f.paid_amount} `}
                                                </div>
                                            </td>
                                            <td>
                                                {f.paid_amount < f.total_amount && (
                                                    <button className="btn" style={{ background: '#10b981', padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handlePayFitting(f)}>Pay Installment</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {fittingPayment && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div className="card" style={{ width: '400px', background: 'white', padding: '24px' }}>
                            <h2 style={{ marginBottom: '20px' }}>Process Installment</h2>
                            <div style={{ marginBottom: '15px', padding: '10px', background: '#f1f5f9', borderRadius: '6px' }}>
                                <div><strong>Code:</strong> {fittingPayment.fitting_code}</div>
                                <div><strong>Balance:</strong> Ksh {(fittingPayment.total_amount - fittingPayment.paid_amount).toFixed(2)}</div>
                            </div>
                            <form onSubmit={handleProcessFittingPayment}>
                                <div className="form-group">
                                    <label className="label">Amount to Pay</label>
                                    <input name="amount" type="number" defaultValue={fittingPayment.total_amount - fittingPayment.paid_amount} required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Payment Mode</label>
                                    <select name="payment_mode" className="input" style={{ width: '100%' }} onChange={(e) => {
                                        const el = document.getElementById('fit_mpesa_code');
                                        if (el) el.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                        const stk = document.getElementById('fit_stk_btn_modal');
                                        if (stk) stk.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                        const req = document.getElementById('fit_mpesa_input');
                                        if (req) req.required = e.target.value === 'M-Pesa';
                                    }}>
                                        <option value="Cash">Cash</option>
                                        <option value="M-Pesa">M-Pesa (Offline)</option>
                                        <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                    </select>
                                </div>
                                <div id="fit_mpesa_code" style={{ display: 'none', marginBottom: '15px' }}>
                                    <label className="label">Select M-Pesa Payment</label>
                                    <select
                                        className="input"
                                        style={{ width: '100%', marginBottom: '10px' }}
                                        onChange={(e) => {
                                            document.getElementById('fit_mpesa_input').value = e.target.value;
                                        }}
                                    >
                                        <option value="">-- Select or type below --</option>
                                        {unclaimedMpesa?.map(u => (
                                            <option key={u.id} value={u.mpesa_receipt}>
                                                {u.mpesa_receipt} - Ksh {u.amount} ({u.phone})
                                            </option>
                                        ))}
                                    </select>
                                    <input id="fit_mpesa_input" name="mpesa_code" placeholder="Or type Confirmation Code" />
                                </div>
                                <div id="fit_stk_btn_modal" style={{ display: 'none', marginBottom: '15px' }}>
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        style={{ background: '#10b981', color: 'white', width: '100%' }}
                                        onClick={(e) => {
                                            const form = e.target.closest('form');
                                            triggerSTKPush(form.amount.value, fittingPayment.customer_phone, (receipt) => {
                                                document.getElementById('fit_mpesa_input').value = receipt;
                                                form.payment_mode.value = 'M-Pesa';
                                                form.requestSubmit();
                                            });
                                        }}
                                    >
                                        📲 Send STK Push
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Confirm Payment</button>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setFittingPayment(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }




    if (view === 'custom_tailoring') {
        return (

            <TailoringView
                user={user}
                tailoringOrders={tailoringOrders}
                materials={materials}
                gallery={gallery}
                loadData={loadData}
                onBack={() => setView('hub')}
                printTailoringReceipt={printTailoringReceipt}
                printTailoringSpecs={printTailoringSpecs}
                showToast={showToast}
                processing={processing}
                setProcessing={setProcessing}
                unclaimedMpesa={unclaimedMpesa}
            />
        );
    }

    if (view === 'expense_tracker') {
        const handleAddExpense = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            setProcessing(true);
            try {
                const expenseData = {
                    description: fd.get('description'),
                    amount: Number(fd.get('amount')),
                    category: fd.get('category'),
                    payment_mode: fd.get('payment_mode_exp'),
                    mpesa_code: fd.get('mpesa_code'),
                    cashier_id: user.id,
                    cashier_name: user.full_name
                };
                const res = await window.api.addExpense(expenseData);
                if (res.success) {
                    showToast('Expense recorded successfully.', 'success');
                    e.target.reset();
                    await loadData();
                } else showToast(res.message, 'error');
            } finally {
                setProcessing(false);
            }
        };

        return (
            <div className="app">
                {processing && (
                    <div className="processing-overlay">
                        <div className="spinner"></div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Working...</div>
                    </div>
                )}
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn-back-nav" onClick={() => setView('hub')}>← Dashboard</button>
                        <div className="brand">OUTSOURCING & SHOP EXPENSES</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn" style={{ background: '#10b981', color: 'white', width: 'auto' }} onClick={() => window.location.reload()}>↻ Refresh App</button>
                        <span style={{ fontWeight: '600' }}>{user.full_name}</span>
                        <button className="btn btn-danger" style={{ width: 'auto' }} onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <main className="main">
                    <div className="card">
                        <div className="card-header">Record Expense</div>
                        <div className="card-body">
                            <form onSubmit={handleAddExpense}>
                                <div className="form-group">
                                    <label className="label">Expense Description</label>
                                    <input name="description" placeholder="e.g. Electricity, Water, Rent" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Amount (Ksh)</label>
                                    <input name="amount" type="number" step="0.01" required placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <input name="category" placeholder="e.g. Utility" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Payment Source</label>
                                    <select
                                        name="payment_mode_exp"
                                        className="input"
                                        style={{ width: '100%' }}
                                        onChange={(e) => {
                                            const el = document.getElementById('expense_mpesa_field');
                                            if (el) el.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                            const inp = document.getElementById('expense_mpesa_input');
                                            if (inp) inp.required = e.target.value === 'M-Pesa';
                                        }}
                                    >
                                        <option value="Cash">Cash (Shop Till)</option>
                                        <option value="M-Pesa">M-Pesa</option>
                                    </select>
                                </div>
                                <div id="expense_mpesa_field" className="form-group" style={{ display: 'none' }}>
                                    <label className="label">M-Pesa Code</label>
                                    <input id="expense_mpesa_input" name="mpesa_code" placeholder="e.g. SFG73HDS9S" />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Submit Report</button>
                            </form>
                        </div>
                    </div>

                    {user.role === 'admin' && (
                        <div className="card">
                            <div className="card-header">Recent Expenditure History</div>
                            <div className="card-body">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Item</th>
                                            <th>Category</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map(ex => (
                                            <tr key={ex.id}>
                                                <td>{new Date(ex.created_at).toLocaleDateString()}</td>
                                                <td>{ex.description}</td>
                                                <td>{ex.category}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Ksh {ex.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {expenses.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No history found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        );
    }
}

export default App;
