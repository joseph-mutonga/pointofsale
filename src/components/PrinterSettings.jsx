import { useState, useEffect } from 'react';

export default function PrinterSettings({ showToast, onClose }) {
    const [settings, setSettings] = useState({
        default_printer: '',
        paper_size: '58mm',
        auto_print_receipt: 'true',
        print_copies: '1',
        receipt_template: 'standard',
        shop_name: '',
        shop_address: '',
        shop_phone: '',
        receipt_footer: 'Thank you for your business!'
    });

    const [printers, setPrinters] = useState([]);
    const [testPrinting, setTestPrinting] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const config = await window.api.getSettings();
            setSettings(prev => ({ ...prev, ...config }));
            const p = await window.api.getPrinters();
            setPrinters(p || []);
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async () => {
        try {
            const result = await window.api.updateSettings(settings);
            if (result.success) {
                if (showToast) showToast('Printer settings saved successfully!', 'success');
                onClose?.();
            }
        } catch (e) {
            if (showToast) showToast('Failed to save settings: ' + e.message, 'error');
        }
    };

    const handleTestPrint = async () => {
        setTestPrinting(true);
        try {
            const testHtml = generateTestReceipt();
            const result = await window.api.print(testHtml);
            if (result.success) {
                if (showToast) showToast('Test receipt sent to printer!', 'success');
            } else {
                if (showToast) showToast('Print failed: ' + result.message, 'error');
            }
        } catch (e) {
            if (showToast) showToast('Test print error: ' + e.message, 'error');
        } finally {
            setTestPrinting(false);
        }
    };

    const generateTestReceipt = () => {
        const paperWidth = settings.paper_size === '80mm' ? '360px' : '260px';
        const html = `
            <html>
                <head>
                    <style>
                        @page { margin: 0; }
                        body {
                            font-family: 'Courier New', monospace;
                            padding: 10px;
                            text-align: center;
                            width: ${paperWidth};
                            margin: auto;
                            font-size: 12px;
                        }
                        .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                        h2 { margin: 5px 0; font-size: 16px; font-weight: bold; }
                        .info-text { font-size: 10px; line-height: 1.4; }
                        .test-label { background: #000; color: #fff; padding: 8px; margin: 10px 0; font-weight: bold; }
                        .content { text-align: left; font-size: 11px; margin: 10px 0; }
                        .row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .footer { margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 9px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>${settings.shop_name || 'Shop Name'}</h2>
                        <div class="info-text">
                            ${settings.shop_address || 'Address not set'}<br/>
                            TEL: ${settings.shop_phone || 'Phone not set'}<br/>
                            Paper: ${settings.paper_size}
                        </div>
                    </div>
                    
                    <div class="test-label">TEST RECEIPT</div>
                    
                    <div class="content">
                        <div class="row">
                            <span>Item Name</span>
                            <span>1x 100</span>
                        </div>
                        <div class="row">
                            <span>Test Product</span>
                            <span>100.00</span>
                        </div>
                        <div style="border-top: 1px solid #000; margin-top: 8px; padding-top: 8px;">
                            <div class="row" style="font-weight: bold; font-size: 14px;">
                                <span>TOTAL</span>
                                <span>100.00</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div>Time: ${new Date().toLocaleString()}</div>
                        <div style="margin-top: 10px;">${settings.receipt_footer || 'Thank you!'}</div>
                    </div>
                </body>
            </html>
        `;
        return html;
    };

    const paperSizeInfo = {
        '58mm': '58mm (2.4") thermal - compact, standard for POS',
        '80mm': '80mm (3.15") thermal - wider, shows more content'
    };

    return (
        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                🖨️ Printer Configuration
            </h2>

            <div style={{ display: 'grid', gap: '20px' }}>
                {/* Shop Information */}
                <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                    <legend style={{ fontWeight: 'bold', fontSize: '14px', padding: '0 5px' }}>Shop Information</legend>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Shop Name</label>
                        <input
                            type="text"
                            value={settings.shop_name || ''}
                            onChange={(e) => handleChange('shop_name', e.target.value)}
                            placeholder="e.g., Eunika Collection"
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Shop Address</label>
                        <input
                            type="text"
                            value={settings.shop_address || ''}
                            onChange={(e) => handleChange('shop_address', e.target.value)}
                            placeholder="e.g., 123 Main Street"
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Shop Phone</label>
                        <input
                            type="text"
                            value={settings.shop_phone || ''}
                            onChange={(e) => handleChange('shop_phone', e.target.value)}
                            placeholder="e.g., +254712345678"
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </fieldset>

                {/* Printer Hardware Settings */}
                <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                    <legend style={{ fontWeight: 'bold', fontSize: '14px', padding: '0 5px' }}>Printer Hardware</legend>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Select Printer</label>
                        <select
                            value={settings.default_printer || ''}
                            onChange={(e) => handleChange('default_printer', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">-- Use Default / PDF Fallback --</option>
                            {printers.map((p, idx) => (
                                <option key={idx} value={p.name}>
                                    {p.name} {p.isDefault ? '(Default)' : ''}
                                </option>
                            ))}
                        </select>
                        <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                            {printers.length === 0
                                ? '⚠️ No printers found. Make sure a printer is connected and installed.'
                                : `✓ ${printers.length} printer(s) available`}
                        </small>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Paper Size</label>
                        <select
                            value={settings.paper_size || '58mm'}
                            onChange={(e) => handleChange('paper_size', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        >
                            <option value="58mm">58mm - Compact Thermal</option>
                            <option value="80mm">80mm - Standard Thermal</option>
                        </select>
                        <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                            {paperSizeInfo[settings.paper_size] || 'Select a paper size'}
                        </small>
                    </div>
                </fieldset>

                {/* Print Behavior */}
                <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                    <legend style={{ fontWeight: 'bold', fontSize: '14px', padding: '0 5px' }}>Print Behavior</legend>

                    <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#e3f2fd', 
                        borderLeft: '4px solid #2196F3',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '14px'
                    }}>
                        <strong>✓ Automatic Silent Printing</strong><br/>
                        <small style={{ color: '#555', display: 'block', marginTop: '4px' }}>
                            When you select a printer above, receipts will print automatically and silently to that printer. No dialogs or PDF windows will appear - you stay in the system while printing happens in the background.
                        </small>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Number of Copies</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={settings.print_copies || '1'}
                            onChange={(e) => handleChange('print_copies', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px'
                            }}
                        />
                        <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                            Each receipt will print this many times (500ms delay between copies)
                        </small>
                    </div>
                </fieldset>

                {/* Receipt Customization */}
                <fieldset style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
                    <legend style={{ fontWeight: 'bold', fontSize: '14px', padding: '0 5px' }}>Receipt Customization</legend>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Receipt Footer</label>
                        <textarea
                            value={settings.receipt_footer || ''}
                            onChange={(e) => handleChange('receipt_footer', e.target.value)}
                            placeholder="e.g., Thank you for your business!"
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                                fontSize: '14px',
                                minHeight: '60px',
                                fontFamily: 'monospace'
                            }}
                        />
                        <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                            Custom message to display at the bottom of every receipt
                        </small>
                    </div>
                </fieldset>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleTestPrint}
                        disabled={testPrinting}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#ff9800',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: testPrinting ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: testPrinting ? 0.6 : 1
                        }}
                    >
                        {testPrinting ? '🖨️ Printing...' : '🖨️ Print Test Receipt'}
                    </button>

                    <button
                        onClick={handleSaveSettings}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        ✓ Save Settings
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#999',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            ✕ Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
