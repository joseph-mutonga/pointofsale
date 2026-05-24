import { useState, useMemo, useRef } from 'react';
import logo from '../assets/logo.png';

export default function TailoringView({
    user, tailoringOrders, materials, gallery, loadData, onBack,
    printTailoringReceipt,
    printTailoringSpecs,
    showToast,
    processing,
    setProcessing,
    unclaimedMpesa
}) {
    const [garmentType, setGarmentType] = useState('shirt');
    const [orderSearch, setOrderSearch] = useState('');
    const [tailoringPayment, setTailoringPayment] = useState(null);
    const [tailoringOrderToView, setTailoringOrderToView] = useState(null);
    const [selectedStyle, setSelectedStyle] = useState(null);
    const [measurementSets, setMeasurementSets] = useState([]);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [tailoringPaymentMode, setTailoringPaymentMode] = useState('Cash');
    const [stkStatus, setStkStatus] = useState(null); // 'pending', 'success', 'failed'
    const formRef = useRef(null);

    const parseMeasurementSets = (measurements) => {
        try {
            const parsed = typeof measurements === 'string' ? JSON.parse(measurements || '[]') : measurements || [];
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [];
        }
    };

    const getMeasurementTypeLabel = (measurements) => {
        const sets = parseMeasurementSets(measurements);
        return sets.map(set => set.type || 'Custom').join(', ');
    };

    const measurementFieldDefinitions = [
        { name: 'm_neck', label: '1. Neck', types: ['shirt', 'jacket', 'dress', 'top', 'skirt'] },
        { name: 'm_over_bust', label: '2. Over Bust', types: ['shirt', 'dress', 'top'] },
        { name: 'm_chest', label: '3. Chest', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_under_bust', label: '4. Under Bust', types: ['shirt', 'dress', 'top'] },
        { name: 'm_waist', label: '5. Waist', types: ['shirt', 'trouser', 'dress', 'skirt', 'jacket', 'top'] },
        { name: 'm_hips', label: '6. Hips', types: ['shirt', 'trouser', 'dress', 'skirt', 'jacket'] },
        { name: 'm_neck_to_heel', label: '7. Neck to Heel', types: ['dress', 'skirt'] },
        { name: 'm_neck_to_above_knee', label: '8. Neck to Above Knee', types: ['dress', 'skirt'] },
        { name: 'm_above_knee_to_ankle', label: '9. Above Knee to Ankle', types: ['trouser', 'dress', 'skirt'] },
        { name: 'm_arm_length', label: '10. Arm Length', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_shoulder_seam', label: '11. Shoulder Seam', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_arm_hole', label: '12. Arm Hole', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_bicep', label: '13. Bicep', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_fore_arm', label: '14. Fore Arm', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_wrist', label: '15. Wrist', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_v_neck_cut', label: '16. V Neck Cut', types: ['shirt', 'dress', 'top'] },
        { name: 'm_shoulder_to_waist', label: '17. Shoulder to Waist', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_waist_to_above_knee', label: '18. Waist to Above Knee', types: ['dress', 'skirt'] },
        { name: 'm_waist_to_ankle', label: '19. Waist to Ankle', types: ['trouser', 'dress', 'skirt'] },
        { name: 'm_shoulder', label: '20. Shoulder', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_thigh', label: '21. Thigh', types: ['trouser'] },
        { name: 'm_knee', label: '22. Knee', types: ['trouser'] },
        { name: 'm_trouser_button', label: '23. Trouser Button', types: ['trouser'] },
        { name: 'm_sleeve_length', label: 'Sleeve Length', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_cuff', label: 'Cuff', types: ['shirt', 'jacket', 'dress', 'top'] },
        { name: 'm_shirt_length', label: 'Shirt Length', types: ['shirt', 'top'] },
        { name: 'm_front_width', label: 'Front Width', types: ['jacket'] },
        { name: 'm_back_width', label: 'Back Width', types: ['jacket'] },
        { name: 'm_jacket_length', label: 'Jacket Length', types: ['jacket'] },
        { name: 'm_bust', label: 'Bust', types: ['dress'] },
        { name: 'm_calf', label: 'Calf', types: ['trouser'] },
        { name: 'm_inseam', label: 'Inseam', types: ['trouser'] },
        { name: 'm_outseam', label: 'Outseam', types: ['trouser'] },
        { name: 'm_rise', label: 'Rise', types: ['trouser'] },
        { name: 'm_skirt_length', label: 'Skirt Length', types: ['skirt'] },
        { name: 'm_dress_length', label: 'Dress Length', types: ['dress'] },
    ];

    const renderMeasurementList = (measurements) => {
        const sets = parseMeasurementSets(measurements);
        return sets.map((set, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>{set.type ? set.type.toUpperCase() : 'CUSTOM'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.entries(set)
                        .filter(([k, v]) => k !== 'notes' && k !== 'type' && v)
                        .map(([k, v]) => (
                            <div key={k} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.replace(/_/g, ' ')}</div>
                                <div style={{ fontWeight: '700' }}>{v}</div>
                            </div>
                        ))}
                </div>
                {set.notes && (
                    <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', fontStyle: 'italic' }}>
                        {set.notes}
                    </div>
                )}
            </div>
        ));
    };

    const buildMeasurementFromForm = (fd) => ({
        type: garmentType,
        neck: fd.get('m_neck'),
        over_bust: fd.get('m_over_bust'),
        chest: fd.get('m_chest'),
        under_bust: fd.get('m_under_bust'),
        waist: fd.get('m_waist'),
        hips: fd.get('m_hips'),
        neck_to_heel: fd.get('m_neck_to_heel'),
        neck_to_above_knee: fd.get('m_neck_to_above_knee'),
        above_knee_to_ankle: fd.get('m_above_knee_to_ankle'),
        arm_length: fd.get('m_arm_length'),
        shoulder_seam: fd.get('m_shoulder_seam'),
        arm_hole: fd.get('m_arm_hole'),
        bicep: fd.get('m_bicep'),
        fore_arm: fd.get('m_fore_arm'),
        wrist: fd.get('m_wrist'),
        v_neck_cut: fd.get('m_v_neck_cut'),
        shoulder_to_waist: fd.get('m_shoulder_to_waist'),
        waist_to_above_knee: fd.get('m_waist_to_above_knee'),
        waist_to_ankle: fd.get('m_waist_to_ankle'),
        shoulder: fd.get('m_shoulder'),
        thigh: fd.get('m_thigh'),
        knee: fd.get('m_knee'),
        trouser_button: fd.get('m_trouser_button'),
        sleeve_length: fd.get('m_sleeve_length'),
        cuff: fd.get('m_cuff'),
        shirt_length: fd.get('m_shirt_length'),
        front_width: fd.get('m_front_width'),
        back_width: fd.get('m_back_width'),
        jacket_length: fd.get('m_jacket_length'),
        bust: fd.get('m_bust'),
        calf: fd.get('m_calf'),
        inseam: fd.get('m_inseam'),
        outseam: fd.get('m_outseam'),
        rise: fd.get('m_rise'),
        skirt_length: fd.get('m_skirt_length'),
        dress_length: fd.get('m_dress_length'),
        notes: fd.get('m_notes')
    });

    const hasMeasurementValues = (measurement) => {
        return Object.entries(measurement).some(([key, value]) => {
            return key !== 'type' && key !== 'notes' && value && String(value).trim();
        });
    };

    const clearMeasurementInputs = () => {
        if (!formRef.current) return;
        Array.from(formRef.current.querySelectorAll('input[name^="m_"], textarea[name="m_notes"]')).forEach(el => {
            el.value = '';
        });
    };

    const handleAddMeasurement = () => {
        if (!formRef.current) return;
        const fd = new FormData(formRef.current);
        const measurement = buildMeasurementFromForm(fd);
        if (!hasMeasurementValues(measurement)) {
            if (showToast) showToast('Enter at least one measurement field before adding.', 'error');
            return;
        }
        setMeasurementSets(prev => [...prev, measurement]);
        clearMeasurementInputs();
        setGarmentType('shirt');
        if (showToast) showToast(`${measurement.type || 'Garment'} measurement added. You can add another or submit the order.`, 'success');
    };

    const filteredTailoring = useMemo(() => {
        const term = orderSearch.toLowerCase();
        return (tailoringOrders || []).filter(o =>
            o.customer_name.toLowerCase().includes(term) ||
            o.order_code.toLowerCase().includes(term) ||
            (o.customer_phone && o.customer_phone.includes(term))
        );
    }, [tailoringOrders, orderSearch]);

    const handleAddOrder = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const currentMeasurement = buildMeasurementFromForm(fd);
        const measurementArray = [...measurementSets];

        if (hasMeasurementValues(currentMeasurement)) {
            measurementArray.push(currentMeasurement);
        }

        if (!measurementArray.length) {
            if (showToast) showToast('Add at least one garment measurement before submitting the order.', 'error');
            return;
        }

        const data = {
            customer_name: fd.get('customer_name'),
            customer_phone: fd.get('customer_phone'),
            style_id: selectedStyle?.id || null,
            material_id: fd.get('material_id') || null,
            measurements: measurementArray,
            total_price: Number(fd.get('total_price')),
            paid_amount: Number(fd.get('paid_amount')),
            deadline: fd.get('deadline'),
            payment_mode: fd.get('payment_mode_tailor'),
            mpesa_code: fd.get('mpesa_code_tailor'),
            cashier_name: user.full_name,
            cashier_id: user.id
        };

        setProcessing(true);
        try {
            const res = await window.api.addTailoringOrder(data);
            if (res.success) {
                if (data.payment_mode === 'M-Pesa' && data.mpesa_code) await window.api.claimMpesaPayment(data.mpesa_code);
                const material = materials.find(m => m.id == data.material_id);

                if (showToast) showToast(`Order Created (${res.code})! Printing Receipt...`, 'success');
                await printTailoringReceipt({ ...data, order_code: res.code, material_name: material?.name }, data.paid_amount);

                e.target.reset();
                setSelectedStyle(null);
                setMeasurementSets([]);
                clearMeasurementInputs();
                setGarmentType('shirt');
                await loadData();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handlePayOrder = (ord) => {
        setTailoringPayment(ord);
    };

    const triggerSTKPush = async (amount, phone, onSuccessCallback = null) => {
        if (!phone) return showToast('Customer phone number is required for STK Push', 'error');
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
                    reference: 'TLR-' + Date.now(),
                    description: 'Tailoring Payment'
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
                                setTimeout(() => handleProcessTailoringPayment(null, amount, statusData.receipt), 1500);
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
            showToast('Could not reach M-Pesa server. Ensure it is running.', 'error');
            setStkStatus('failed');
            setProcessing(false);
        }
    };

    const handleProcessTailoringPayment = async (e, overrideAmount = null, overrideMpesaCode = null) => {
        if (e) e.preventDefault();
        const ord = tailoringPayment;
        if (!ord) return;

        const amt = overrideAmount !== null ? overrideAmount : Number(e.target.amount.value);
        const pMode = overrideMpesaCode ? 'M-Pesa' : (e ? e.target.payment_mode.value : tailoringPaymentMode);
        const code = overrideMpesaCode || (e ? e.target.mpesa_code?.value : '') || '';

        setProcessing(true);
        try {
            const res = await window.api.updateTailoringPayment({
                id: ord.id,
                amount: amt,
                payment_mode: pMode,
                mpesa_code: code,
                cashier_id: user.id,
                cashier_name: user.full_name
            });
            if (res.success) {
                if (pMode === 'M-Pesa' && code) await window.api.claimMpesaPayment(code);
                const newCumulativePaid = Number(ord.paid_amount) + amt;
                if (showToast) showToast('Payment Processed! Printing Receipt...', 'success');
                await printTailoringReceipt({ ...ord, paid_amount: newCumulativePaid }, amt);

                setTailoringPayment(null);
                await loadData();
            } else {
                if (showToast) showToast(res.message, 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="app">
            {processing && (
                <div className="processing-overlay" style={{ zIndex: 99999 }}>
                    <div className="spinner"></div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>Processing Order...</div>
                </div>
            )}
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn-back-nav" onClick={onBack}>← Dashboard</button>
                    <div className="brand">CUSTOM TAILORING WORKFLOW</div>
                </div>
            </header>

            <main className="tailoring-main" style={{ 
                display: 'grid',
                gridTemplateColumns: 'minmax(400px, 1fr) minmax(700px, 2fr)', 
                gap: '2.5rem', 
                padding: '2.5rem', 
                alignItems: 'start', 
                minHeight: 'calc(100vh - 120px)', 
                background: 'radial-gradient(circle at top left, rgba(0, 242, 255, 0.05), transparent)',
                overflowY: 'auto'
            }}>
                <div className="card" style={{ 
                    border: '1px solid rgba(0, 242, 255, 0.2)', 
                    boxShadow: '0 40px 100px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 242, 255, 0.1)', 
                    minWidth: '400px', 
                    borderRadius: '24px',
                    overflow: 'hidden',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(12px)'
                }}>
                    <div className="card-header" style={{ 
                        fontSize: '1.4rem', 
                        fontWeight: '900', 
                        letterSpacing: '0.1em', 
                        textTransform: 'uppercase', 
                        color: '#00f2ff', 
                        textShadow: '0 0 15px rgba(0, 242, 255, 0.5)',
                        padding: '2rem',
                        background: 'linear-gradient(to bottom, rgba(0, 242, 255, 0.1), transparent)',
                        borderBottom: '1px solid rgba(0, 242, 255, 0.1)'
                    }}>
                        ✨ Order Intake Studio
                    </div>
                    <div className="card-body" style={{ padding: '2rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', scrollbarWidth: 'none' }}>
                        <form ref={formRef} onSubmit={handleAddOrder}>
                            {/* Section: Client Protocol */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                padding: '24px',
                                borderRadius: '20px',
                                marginBottom: '24px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    color: '#00f2ff',
                                    marginBottom: '20px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    opacity: 0.8
                                }}>
                                    Phase 01: Client Identity
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Customer Name</label>
                                        <input
                                            name="customer_name"
                                            required
                                            placeholder="Ex: John Doe"
                                            style={{
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                color: '#ffffff',
                                                fontSize: '1rem',
                                                width: '100%',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#00f2ff'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Contact Hub</label>
                                        <input
                                            name="customer_phone"
                                            required
                                            placeholder="+254..."
                                            style={{
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                color: '#ffffff',
                                                fontSize: '1rem',
                                                width: '100%',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#00f2ff'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Material & Blueprint */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                padding: '24px',
                                borderRadius: '20px',
                                marginBottom: '24px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    color: '#00f2ff',
                                    marginBottom: '20px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    opacity: 0.8
                                }}>
                                    Phase 02: Material & Blueprint
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Primary Material</label>
                                        <select
                                            name="material_id"
                                            className="input"
                                            style={{
                                                width: '100%',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                color: '#ffffff',
                                                fontSize: '1rem',
                                                appearance: 'none'
                                            }}
                                        >
                                            <option value="">-- Customer Selection --</option>
                                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Reference Style</label>
                                        <button
                                            type="button"
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                background: selectedStyle ? 'rgba(0, 242, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                                                border: selectedStyle ? '1px solid #00f2ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                                color: selectedStyle ? '#00f2ff' : '#ffffff',
                                                height: '52px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '12px',
                                                borderRadius: '12px',
                                                fontSize: '0.95rem',
                                                fontWeight: '600',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onClick={() => setShowGalleryModal(true)}
                                        >
                                            {selectedStyle ? (
                                                <>
                                                    <img src={selectedStyle.image_data} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                                                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedStyle.title}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🎨</span>
                                                    <span>Visual Reference</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                padding: '24px',
                                borderRadius: '20px',
                                marginBottom: '24px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    color: '#00f2ff',
                                    marginBottom: '20px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    opacity: 0.8
                                }}>
                                    Phase 03: Precision Metrics
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="label" style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', marginBottom: '12px', display: 'block' }}>
                                        Garment Architecture
                                    </label>
                                    <select className="input" style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        background: 'rgba(0, 242, 255, 0.05)',
                                        border: '1px solid rgba(0, 242, 255, 0.3)',
                                        color: '#00f2ff',
                                        fontSize: '1rem',
                                        fontWeight: '700'
                                    }} value={garmentType} onChange={e => setGarmentType(e.target.value)}>
                                        <option value="shirt">👔 Premium Shirt</option>
                                        <option value="trouser">👖 Custom Trouser</option>
                                        <option value="jacket">🧥 Bespoke Jacket</option>
                                        <option value="dress">👗 Signature Dress</option>
                                        <option value="skirt">🩳 Elegant Skirt</option>
                                    </select>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#00f2ff', marginBottom: '15px', textAlign: 'center' }}>
                                        MEASUREMENT FIELDS
                                    </div>

                                    {/* Group measurements by category */}
                                    <div style={{ display: 'grid', gap: '20px' }}>
                                        {/* Upper Body Measurements */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Upper Body
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                                {measurementFieldDefinitions.filter(field =>
                                                    ['m_neck', 'm_over_bust', 'm_chest', 'm_under_bust', 'm_shoulder', 'm_shoulder_seam', 'm_arm_hole', 'm_arm_length', 'm_bicep', 'm_fore_arm', 'm_wrist', 'm_v_neck_cut', 'm_shoulder_to_waist'].includes(field.name)
                                                ).map(field => {
                                                    const isRelevant = field.types.some(type => type === garmentType);
                                                    return (
                                                        <label key={field.name} style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            opacity: isRelevant ? 1 : 0.3,
                                                            gap: '6px',
                                                            transition: 'opacity 0.2s'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: isRelevant ? '#ffffff' : '#64748b',
                                                                fontWeight: isRelevant ? '800' : '400',
                                                                textAlign: 'center',
                                                                textShadow: isRelevant ? '0 0 4px rgba(0, 242, 255, 0.3)' : 'none'
                                                            }}>{field.label}</span>
                                                            <input
                                                                name={field.name}
                                                                placeholder={isRelevant ? field.label : ''}
                                                                disabled={!isRelevant}
                                                                style={{
                                                                    width: '100%',
                                                                    borderRadius: '6px',
                                                                    border: isRelevant ? '2px solid rgba(0, 242, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                                                    background: isRelevant ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255,255,255,0.03)',
                                                                    color: '#ffffff',
                                                                    padding: '8px 10px',
                                                                    minHeight: '36px',
                                                                    textAlign: 'center',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '600',
                                                                    boxShadow: isRelevant ? 'inset 0 0 8px rgba(0, 242, 255, 0.15)' : 'none'
                                                                }}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Lower Body Measurements */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Lower Body
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                                {measurementFieldDefinitions.filter(field =>
                                                    ['m_waist', 'm_hips', 'm_thigh', 'm_knee', 'm_calf', 'm_inseam', 'm_outseam', 'm_rise', 'm_trouser_button', 'm_waist_to_above_knee', 'm_above_knee_to_ankle', 'm_waist_to_ankle'].includes(field.name)
                                                ).map(field => {
                                                    const isRelevant = field.types.some(type => type === garmentType);
                                                    return (
                                                        <label key={field.name} style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            opacity: isRelevant ? 1 : 0.3,
                                                            gap: '6px',
                                                            transition: 'opacity 0.2s'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: isRelevant ? '#ffffff' : '#64748b',
                                                                fontWeight: isRelevant ? '800' : '400',
                                                                textAlign: 'center',
                                                                textShadow: isRelevant ? '0 0 4px rgba(0, 242, 255, 0.3)' : 'none'
                                                            }}>{field.label}</span>
                                                            <input
                                                                name={field.name}
                                                                placeholder={isRelevant ? field.label : ''}
                                                                disabled={!isRelevant}
                                                                style={{
                                                                    width: '100%',
                                                                    borderRadius: '6px',
                                                                    border: isRelevant ? '2px solid rgba(0, 242, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                                                    background: isRelevant ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255,255,255,0.03)',
                                                                    color: '#ffffff',
                                                                    padding: '8px 10px',
                                                                    minHeight: '36px',
                                                                    textAlign: 'center',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '600',
                                                                    boxShadow: isRelevant ? 'inset 0 0 8px rgba(0, 242, 255, 0.15)' : 'none'
                                                                }}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Garment Specific Measurements */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Garment Specific
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                                {measurementFieldDefinitions.filter(field =>
                                                    ['m_shirt_length', 'm_jacket_length', 'm_dress_length', 'm_skirt_length', 'm_front_width', 'm_back_width', 'm_cuff', 'm_sleeve_length', 'm_neck_to_heel', 'm_neck_to_above_knee'].includes(field.name)
                                                ).map(field => {
                                                    const isRelevant = field.types.some(type => type === garmentType);
                                                    return (
                                                        <label key={field.name} style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            opacity: isRelevant ? 1 : 0.3,
                                                            gap: '6px',
                                                            transition: 'opacity 0.2s'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: isRelevant ? '#ffffff' : '#64748b',
                                                                fontWeight: isRelevant ? '800' : '400',
                                                                textAlign: 'center',
                                                                textShadow: isRelevant ? '0 0 4px rgba(0, 242, 255, 0.3)' : 'none'
                                                            }}>{field.label}</span>
                                                            <input
                                                                name={field.name}
                                                                placeholder={isRelevant ? field.label : ''}
                                                                disabled={!isRelevant}
                                                                style={{
                                                                    width: '100%',
                                                                    borderRadius: '6px',
                                                                    border: isRelevant ? '2px solid rgba(0, 242, 255, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                                                    background: isRelevant ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255,255,255,0.03)',
                                                                    color: '#ffffff',
                                                                    padding: '8px 10px',
                                                                    minHeight: '36px',
                                                                    textAlign: 'center',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '600',
                                                                    boxShadow: isRelevant ? 'inset 0 0 8px rgba(0, 242, 255, 0.15)' : 'none'
                                                                }}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0, 242, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '15px' }}>
                                            <button type="button" className="btn" style={{
                                                flex: 1,
                                                background: '#10b981',
                                                color: '#0f172a',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem'
                                            }} onClick={handleAddMeasurement}>
                                                ➕ Add This Garment
                                            </button>
                                            <button type="button" className="btn" style={{
                                                flex: 1,
                                                background: '#64748b',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem'
                                            }} onClick={() => {
                                                clearMeasurementInputs();
                                                setGarmentType('shirt');
                                            }}>
                                                🔄 Clear Fields
                                            </button>
                                        </div>

                                        {measurementSets.length > 0 && (
                                            <div style={{ marginTop: '15px' }}>
                                                <div style={{
                                                    fontWeight: '700',
                                                    marginBottom: '15px',
                                                    color: '#00f2ff',
                                                    textAlign: 'center',
                                                    fontSize: '1rem'
                                                }}>
                                                    📋 ADDED GARMENTS ({measurementSets.length})
                                                </div>
                                                <div style={{ display: 'grid', gap: '10px' }}>
                                                    {measurementSets.map((set, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '12px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.1)'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{
                                                                    fontWeight: '600',
                                                                    color: '#00f2ff',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    {idx + 1}. {set.type ? set.type.toUpperCase() : 'CUSTOM'}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: '#94a3b8',
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: '8px'
                                                                }}>
                                                                    {Object.entries(set)
                                                                        .filter(([k, v]) => k !== 'notes' && k !== 'type' && v)
                                                                        .slice(0, 3)
                                                                        .map(([k, v]) => (
                                                                            <span key={k} style={{
                                                                                background: 'rgba(0, 242, 255, 0.1)',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.7rem'
                                                                            }}>
                                                                                {k.replace(/_/g, ' ')}: {v}
                                                                            </span>
                                                                        ))}
                                                                    {Object.entries(set).filter(([k, v]) => k !== 'notes' && k !== 'type' && v).length > 3 && (
                                                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                                                            +{Object.entries(set).filter(([k, v]) => k !== 'notes' && k !== 'type' && v).length - 3} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {set.notes && (
                                                                    <div style={{
                                                                        fontSize: '0.7rem',
                                                                        color: '#cbd5e1',
                                                                        marginTop: '4px',
                                                                        fontStyle: 'italic'
                                                                    }}>
                                                                        📝 {set.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button type="button" className="btn" style={{
                                                                background: '#ef4444',
                                                                padding: '8px 12px',
                                                                fontSize: '0.8rem',
                                                                borderRadius: '6px',
                                                                marginLeft: '10px'
                                                            }} onClick={() => setMeasurementSets(prev => prev.filter((_, i) => i !== idx))}>
                                                                ✕ Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Deadline & Special Notes */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                padding: '24px',
                                borderRadius: '20px',
                                marginBottom: '24px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}>
                                <div style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    color: '#00f2ff',
                                    marginBottom: '20px',
                                    letterSpacing: '2px',
                                    fontWeight: '900',
                                    opacity: 0.8
                                }}>
                                    Phase 03.1: Deadline & Specifications
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        fontSize: '0.8rem',
                                        color: '#94a3b8',
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: '700'
                                    }}>
                                        Completion Protocol Date
                                    </label>
                                    <input
                                        name="deadline"
                                        type="date"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '2px solid rgba(0, 242, 255, 0.4)',
                                            background: 'rgba(0, 0, 0, 0.5)',
                                            color: '#ffffff',
                                            fontWeight: '600',
                                            boxShadow: 'inset 0 0 8px rgba(0, 242, 255, 0.15)'
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Special Instructions</label>
                                    <textarea
                                        name="m_notes"
                                        placeholder="Additional style notes, special requirements, or fitting preferences..."
                                        style={{
                                            width: '100%',
                                            height: '100px',
                                            borderRadius: '12px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            color: '#ffffff',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            padding: '14px 16px',
                                            fontSize: '1rem',
                                            resize: 'vertical',
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                </div>
                            </div>

                                {/* Section: Financial Protocol */}
                                <div style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                    padding: '24px',
                                    borderRadius: '20px',
                                    marginBottom: '24px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '900',
                                        color: '#00f2ff',
                                        marginBottom: '20px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '2px',
                                        opacity: 0.8
                                    }}>
                                        Phase 04: Financial Protocol
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Total Quotation (Ksh)</label>
                                            <input
                                                name="total_price"
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                style={{
                                                    padding: '14px 16px',
                                                    borderRadius: '12px',
                                                    border: '2px solid rgba(0, 242, 255, 0.4)',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    color: '#ffffff',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 'bold',
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Deposit Paid (Ksh)</label>
                                            <input
                                                name="paid_amount"
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                style={{
                                                    padding: '14px 16px',
                                                    borderRadius: '12px',
                                                    border: '2px solid rgba(16, 185, 129, 0.4)',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    color: '#10b981',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 'bold',
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                        <div className="form-group">
                                            <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Payment Method</label>
                                            <select 
                                                name="payment_mode_tailor" 
                                                style={{
                                                    width: '100%',
                                                    padding: '14px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    color: '#ffffff'
                                                }}
                                                onChange={(e) => {
                                                    const mpesaArea = document.getElementById('tailor_mpesa_area');
                                                    const stkArea = document.getElementById('tailor_stk_area');
                                                    if (mpesaArea) mpesaArea.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                                    if (stkArea) stkArea.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                                }}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="M-Pesa">M-Pesa (Offline)</option>
                                                <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                            </select>
                                        </div>
                                        <div id="tailor_mpesa_area" style={{ display: 'none' }}>
                                            <label className="label" style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.8rem', marginBottom: '8px', display: 'block' }}>Select M-Pesa Payment</label>
                                            <select 
                                                name="mpesa_code_tailor_dropdown" 
                                                style={{
                                                    padding: '14px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid #00f2ff',
                                                    background: 'rgba(0, 242, 255, 0.05)',
                                                    color: '#00f2ff',
                                                    width: '100%',
                                                    marginBottom: '10px'
                                                }}
                                                onChange={(e) => {
                                                    document.getElementsByName('mpesa_code_tailor')[0].value = e.target.value;
                                                }}
                                            >
                                                <option value="">-- Select or type below --</option>
                                                {unclaimedMpesa?.map(u => (
                                                    <option key={u.id} value={u.mpesa_receipt}>
                                                        {u.mpesa_receipt} - Ksh {u.amount} ({u.phone})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                name="mpesa_code_tailor"
                                                placeholder="Or type REF CODE"
                                                style={{
                                                    padding: '14px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    color: '#ffffff',
                                                    width: '100%',
                                                    textTransform: 'uppercase'
                                                }}
                                            />
                                        </div>
                                        <div id="tailor_stk_area" style={{ display: 'none', gridColumn: 'span 2' }}>
                                            <button 
                                                type="button"
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    fontWeight: 'bold',
                                                    marginTop: '10px'
                                                }}
                                                onClick={() => {
                                                    const fd = new FormData(formRef.current);
                                                    triggerSTKPush(fd.get('paid_amount'), fd.get('customer_phone'), (receipt) => {
                                                        const mpesaInput = formRef.current.querySelector('input[name="mpesa_code"]');
                                                        if (mpesaInput) mpesaInput.value = receipt;
                                                        const pModeInput = formRef.current.querySelector('input[name="payment_mode"]');
                                                        if (pModeInput) pModeInput.value = 'M-Pesa';
                                                        formRef.current.requestSubmit();
                                                    });
                                                }}
                                            >
                                                📲 Request M-Pesa Payment (STK Push)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Finalization Protocol */}
                                <div style={{
                                background: 'linear-gradient(145deg, rgba(0, 242, 255, 0.05), transparent)',
                                padding: '24px',
                                borderRadius: '20px',
                                border: '1px solid rgba(0, 242, 255, 0.1)',
                                marginTop: '12px'
                            }}>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '20px',
                                        borderRadius: '16px',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        letterSpacing: '0.1em',
                                        background: 'linear-gradient(to right, #00f2ff, #0072ff)',
                                        color: '#000000',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 40px rgba(0, 242, 255, 0.3)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 242, 255, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 242, 255, 0.3)';
                                    }}
                                >
                                    ⚡ FINALIZE CUSTOM ORDER
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="card" style={{ minWidth: '520px' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Custom Tailoring Orders</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>{tailoringOrders?.length || 0} orders in the workflow</div>
                        </div>
                        <input
                            placeholder="Search Order/Phone..."
                            value={orderSearch}
                            onChange={e => setOrderSearch(e.target.value)}
                            style={{ maxWidth: '220px', fontSize: '0.9rem', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                        />
                    </div>
                    <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bespoke Details</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deadline</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Finances</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Details</th>
                                    <th style={{ textAlign: 'left', padding: '12px 10px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTailoring.map((o, index) => (
                                    <tr key={o.id} style={{ opacity: o.status === 'collected' ? 0.7 : 1 }}>
                                        <td style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>{index + 1}</td>
                                        <td style={{ fontFamily: 'monospace', color: '#00f2ff', fontWeight: 'bold' }}>{o.order_code}</td>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{o.customer_name}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{o.customer_phone}</div>
                                        </td>
                                        <td>
                                            {(() => {
                                                try {
                                                    return <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>{getMeasurementTypeLabel(o.measurements)}</div>;
                                                } catch { return null; }
                                            })()}
                                            <div style={{ fontSize: '0.8rem' }}>Fabric: {o.material_name || 'Provided'}</div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                background: o.status === 'collected' ? '#d1fae5' : '#fef3c7',
                                                color: o.status === 'collected' ? '#065f46' : '#92400e'
                                            }}>
                                                {o.status ? o.status.toUpperCase() : 'PENDING'}
                                            </span>
                                        </td>
                                        <td style={{ color: new Date(o.deadline) < new Date() ? 'red' : 'inherit', fontWeight: 'bold' }}>{o.deadline}</td>
                                        <td>
                                            <div style={{ fontWeight: '700' }}>Ksh {o.paid_amount}/{o.total_price}</div>
                                            <div style={{ fontSize: '0.7rem' }}>
                                                {o.paid_amount >= o.total_price ? <span style={{ color: '#10b981' }}>PAID FULL</span> : `BAL: Ksh ${o.total_price - o.paid_amount} `}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn" style={{ background: '#3b82f6', padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setTailoringOrderToView(o)}>View Specs</button>
                                        </td>
                                        <td>
                                            {o.paid_amount < o.total_price && (
                                                <button className="btn" style={{ background: '#10b981', padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handlePayOrder(o)}>Pay Balance</button>
                                            )}
                                            {o.paid_amount >= o.total_price && o.status !== 'collected' && (
                                                <button className="btn" style={{ background: '#7000ff', padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => window.api.updateTailoringPayment({ id: o.id, amount: 0, status: 'collected' }).then(loadData)}>Mark Collected</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {tailoringPayment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="card" style={{ width: '400px', background: 'white', padding: '24px' }}>
                        <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>Process Tailoring Payment</h2>
                        <div style={{ marginBottom: '15px', padding: '10px', background: '#f1f5f9', borderRadius: '6px', color: '#0f172a' }}>
                            <div><strong>Order:</strong> {tailoringPayment.order_code}</div>
                            <div><strong>Balance:</strong> Ksh {(tailoringPayment.total_price - tailoringPayment.paid_amount).toFixed(2)}</div>
                        </div>
                        <form onSubmit={handleProcessTailoringPayment}>
                            <div className="form-group">
                                <label className="label" style={{ color: '#64748b' }}>Amount to Pay</label>
                                <input name="amount" type="number" defaultValue={tailoringPayment.total_price - tailoringPayment.paid_amount} required />
                            </div>
                            <div className="form-group">
                                <label className="label" style={{ color: '#64748b' }}>Payment Mode</label>
                                <select name="payment_mode" className="input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} onChange={(e) => {
                                    const el = document.getElementById('tailoring_mpesa_code');
                                    if (el) el.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                    const stk = document.getElementById('tailoring_stk_btn');
                                    if (stk) stk.style.display = e.target.value === 'M-Pesa-STK' ? 'block' : 'none';
                                    const req = document.getElementById('tailoring_mpesa_input');
                                    if (req) req.required = e.target.value === 'M-Pesa';
                                }}>
                                    <option value="Cash">Cash</option>
                                    <option value="M-Pesa">M-Pesa (Offline)</option>
                                    <option value="M-Pesa-STK">M-Pesa (STK Push)</option>
                                </select>
                            </div>
                            <div id="tailoring_mpesa_code" style={{ display: 'none', marginBottom: '15px' }}>
                                <label className="label" style={{ color: '#64748b' }}>Select M-Pesa Payment</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
                                    onChange={(e) => {
                                        document.getElementById('tailoring_mpesa_input').value = e.target.value;
                                    }}
                                >
                                    <option value="">-- Select or type below --</option>
                                    {unclaimedMpesa?.map(u => (
                                        <option key={u.id} value={u.mpesa_receipt}>
                                            {u.mpesa_receipt} - Ksh {u.amount} ({u.phone})
                                        </option>
                                    ))}
                                </select>
                                <input id="tailoring_mpesa_input" name="mpesa_code" placeholder="Or type Confirmation Code" />
                            </div>
                            <div id="tailoring_stk_btn" style={{ display: 'none', marginBottom: '15px' }}>
                                <button 
                                    type="button" 
                                    className="btn" 
                                    style={{ background: '#10b981', color: 'white', width: '100%', fontWeight: 'bold' }}
                                    onClick={(e) => {
                                        const form = e.target.closest('form');
                                        triggerSTKPush(form.amount.value, tailoringPayment.customer_phone, (receipt) => {
                                            document.getElementById('tailoring_mpesa_input').value = receipt;
                                            form.payment_mode.value = 'M-Pesa';
                                            form.requestSubmit();
                                        });
                                    }}
                                >
                                    📲 Send STK Push
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>Confirm Payment</button>
                                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setTailoringPayment(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {tailoringOrderToView && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ 
                        width: '550px', 
                        background: 'white', 
                        padding: '0', 
                        borderRadius: '24px', 
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                        color: '#1e293b',
                        fontFamily: "'Outfit', sans-serif"
                    }}>
                        {/* Watermark Logo */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: '0.05',
                            width: '300px',
                            height: '300px',
                            backgroundImage: `url(${logo})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            pointerEvents: 'none',
                            zIndex: 0
                        }}></div>

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '30px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '800' }}>Order Specification</h2>
                                    <p style={{ color: '#38bdf8', fontSize: '1rem', fontWeight: 'bold', margin: '4px 0 0 0', fontFamily: 'monospace' }}>#{tailoringOrderToView.order_code}</p>
                                </div>
                                <button
                                    onClick={() => setTailoringOrderToView(null)}
                                    style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                >✕</button>
                            </div>

                            <div style={{ padding: '30px', maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                    <div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Customer</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{tailoringOrderToView.customer_name}</div>
                                        <div style={{ color: '#3b82f6', fontWeight: '600' }}>{tailoringOrderToView.customer_phone}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Collection Date</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: new Date(tailoringOrderToView.deadline) < new Date() ? '#ef4444' : '#10b981' }}>{tailoringOrderToView.deadline}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Fabric: {tailoringOrderToView.material_name || 'Provided'}</div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ 
                                        fontSize: '0.85rem', 
                                        fontWeight: '900', 
                                        color: '#0f172a', 
                                        marginBottom: '15px', 
                                        borderBottom: '2px solid #38bdf8', 
                                        display: 'inline-block',
                                        paddingBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        Measurement Protocol
                                    </div>
                                    <div style={{ background: '#ffffff', borderRadius: '12px' }}>
                                        {(() => {
                                            try {
                                                return renderMeasurementList(tailoringOrderToView.measurements);
                                            } catch { return <div style={{ color: '#ef4444' }}>Error reading measurements</div>; }
                                        })()}
                                    </div>
                                </div>

                                {tailoringOrderToView.notes && (
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#fffbeb', borderLeft: '4px solid #fbbf24', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>Special Instructions</div>
                                        <div style={{ fontStyle: 'italic', color: '#78350f', fontSize: '0.9rem' }}>"{tailoringOrderToView.notes}"</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '24px 30px', background: '#f8fafc', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    className="btn"
                                    style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', fontWeight: '700', padding: '12px 20px', borderRadius: '12px' }}
                                    onClick={() => printTailoringSpecs(tailoringOrderToView)}
                                >📏 Print Specs</button>
                                <button
                                    className="btn"
                                    style={{ background: '#0f172a', color: 'white', fontWeight: '700', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    onClick={() => printTailoringReceipt(tailoringOrderToView, 0)}
                                >📄 Print Receipt</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showGalleryModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                    <div className="card" style={{ 
                        width: '90%', 
                        maxWidth: '1100px', 
                        maxHeight: '85vh', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div className="card-header" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '24px 32px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>SELECT REFERENCE STYLE</span>
                            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setShowGalleryModal(false)}>✕</button>
                        </div>
                        <div className="card-body" style={{ overflowY: 'auto', padding: '32px' }}>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                                gap: '24px' 
                            }}>
                                <div 
                                    className="gallery-item-select" 
                                    style={{ 
                                        border: !selectedStyle ? '2px solid #00f2ff' : '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '16px', 
                                        padding: '24px', 
                                        textAlign: 'center', 
                                        cursor: 'pointer',
                                        background: !selectedStyle ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => { setSelectedStyle(null); setShowGalleryModal(false); }}
                                >
                                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✂️</div>
                                    <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>Custom Design</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No reference photo</div>
                                </div>
                                {gallery.map(item => (
                                    <div 
                                        key={item.id} 
                                        className="gallery-item-select" 
                                        style={{ 
                                            border: selectedStyle?.id === item.id ? '2px solid #00f2ff' : '1px solid rgba(255,255,255,0.05)', 
                                            borderRadius: '16px', 
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            background: selectedStyle?.id === item.id ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                        onClick={() => { setSelectedStyle(item); setShowGalleryModal(false); }}
                                    >
                                        <div style={{ position: 'relative', width: '100%', paddingBottom: '66.6%' }}>
                                            <img src={item.image_data} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', marginBottom: '2px' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#00f2ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.category}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <style>{`
                        .gallery-item-select:hover {
                            border-color: rgba(0, 242, 255, 0.5) !important;
                            transform: translateY(-4px);
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
