import { useState, useMemo } from 'react';

export default function TailoringView({
    user, tailoringOrders, gallery, materials, loadData, onBack,
    printTailoringReceipt,
    printTailoringSpecs
}) {
    const [garmentType, setGarmentType] = useState('shirt');
    const [orderSearch, setOrderSearch] = useState('');
    const [tailoringPayment, setTailoringPayment] = useState(null);
    const [tailoringOrderToView, setTailoringOrderToView] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

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
        const measurements = {
            type: garmentType,
            neck: fd.get('m_neck'),
            shoulder: fd.get('m_shoulder'),
            chest: fd.get('m_chest'),
            waist: fd.get('m_waist'),
            hips: fd.get('m_hips'),
            sleeve_length: fd.get('m_sleeve_length'),
            armhole: fd.get('m_armhole'),
            cuff: fd.get('m_cuff'),
            shirt_length: fd.get('m_shirt_length'),
            front_width: fd.get('m_front_width'),
            back_width: fd.get('m_back_width'),
            jacket_length: fd.get('m_jacket_length'),
            thigh: fd.get('m_thigh'),
            knee: fd.get('m_knee'),
            calf: fd.get('m_calf'),
            inseam: fd.get('m_inseam'),
            outseam: fd.get('m_outseam'),
            rise: fd.get('m_rise'),
            skirt_length: fd.get('m_skirt_length'),
            dress_length: fd.get('m_dress_length'),
            notes: fd.get('m_notes')
        };

        const data = {
            customer_name: fd.get('customer_name'),
            customer_phone: fd.get('customer_phone'),
            style_id: fd.get('style_id') || null,
            material_id: fd.get('material_id') || null,
            measurements,
            total_price: Number(fd.get('total_price')),
            paid_amount: Number(fd.get('paid_amount')),
            deadline: fd.get('deadline'),
            payment_mode: fd.get('payment_mode_tailor'),
            mpesa_code: fd.get('mpesa_code_tailor'),
            cashier_name: user.full_name,
            cashier_id: user.id
        };

        const res = await window.api.addTailoringOrder(data);
        if (res.success) {
            alert(`Tailoring Order Created.Code: ${res.code} `);
            const style = gallery.find(g => g.id == data.style_id);
            const material = materials.find(m => m.id == data.material_id);
            printTailoringReceipt({ ...data, order_code: res.code, style_name: style?.title, material_name: material?.name }, data.paid_amount);
            e.target.reset();
            loadData();
        } else alert(res.message);
    };

    const handlePayOrder = (ord) => {
        setTailoringPayment(ord);
    };

    const handleProcessTailoringPayment = async (e) => {
        e.preventDefault();
        const ord = tailoringPayment;
        if (!ord) return;

        const numericAmount = Number(e.target.amount.value);
        const pMode = e.target.payment_mode.value;
        const mCode = e.target.mpesa_code?.value || '';

        const res = await window.api.updateTailoringPayment({
            id: ord.id,
            amount: numericAmount,
            payment_mode: pMode,
            mpesa_code: mCode,
            cashier_name: user.full_name,
            cashier_id: user.id
        });

        if (res.success) {
            printTailoringReceipt({ ...ord, paid_amount: ord.paid_amount + numericAmount }, numericAmount);
            setTailoringPayment(null);
            loadData();
        } else alert(res.message);
    };

    return (
        <div className="app">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn-back-nav" onClick={onBack}>← Dashboard</button>
                    <div className="brand">CUSTOM TAILORING WORKFLOW</div>
                </div>
            </header>

            <main className="main" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', padding: '2rem' }}>
                <div className="card">
                    <div className="card-header">New Custom Order Intake</div>
                    <div className="card-body">
                        <form onSubmit={handleAddOrder}>
                            <div className="form-group">
                                <label className="label">Customer Name</label>
                                <input name="customer_name" required />
                            </div>
                            <div className="form-group">
                                <label className="label">Phone / Contact</label>
                                <input name="customer_phone" required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label className="label">Style Reference</label>
                                    <select name="style_id" className="input" style={{ width: '100%' }}>
                                        <option value="">-- Custom Design --</option>
                                        {gallery.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Fabric / Material</label>
                                    <select name="material_id" className="input" style={{ width: '100%' }}>
                                        <option value="">-- Customer Provided --</option>
                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                <div className="form-group">
                                    <label className="label" style={{ color: '#00f2ff' }}>Garment Type</label>
                                    <select className="input" style={{ width: '100%' }} value={garmentType} onChange={e => setGarmentType(e.target.value)}>
                                        <option value="shirt">Shirt / Top</option>
                                        <option value="trouser">Trouser / Pants</option>
                                        <option value="jacket">Jacket / Coat</option>
                                        <option value="dress">Dress / Gown</option>
                                        <option value="skirt">Skirt</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    {garmentType === 'shirt' && (
                                        <>
                                            <input name="m_neck" placeholder="Neck" />
                                            <input name="m_shoulder" placeholder="Shoulder" />
                                            <input name="m_chest" placeholder="Chest" />
                                            <input name="m_sleeve_length" placeholder="Sleeve L" />
                                            <input name="m_shirt_length" placeholder="Length" />
                                            <input name="m_cuff" placeholder="Cuff" />
                                        </>
                                    )}
                                    {garmentType === 'trouser' && (
                                        <>
                                            <input name="m_waist" placeholder="Waist" />
                                            <input name="m_hips" placeholder="Hips" />
                                            <input name="m_thigh" placeholder="Thigh" />
                                            <input name="m_knee" placeholder="Knee" />
                                            <input name="m_calf" placeholder="Calf" />
                                            <input name="m_inseam" placeholder="Inseam" />
                                            <input name="m_outseam" placeholder="Outseam" />
                                            <input name="m_rise" placeholder="Rise" />
                                        </>
                                    )}
                                    {garmentType === 'jacket' && (
                                        <>
                                            <input name="m_shoulder" placeholder="Shoulder" />
                                            <input name="m_chest" placeholder="Chest" />
                                            <input name="m_waist" placeholder="Waist" />
                                            <input name="m_jacket_length" placeholder="Length" />
                                            <input name="m_sleeve_length" placeholder="Sleeve" />
                                            <input name="m_front_width" placeholder="F. Width" />
                                            <input name="m_back_width" placeholder="B. Width" />
                                        </>
                                    )}
                                    {garmentType === 'dress' && (
                                        <>
                                            <input name="m_shoulder" placeholder="Shoulder" />
                                            <input name="m_bust" placeholder="Bust" />
                                            <input name="m_waist" placeholder="Waist" />
                                            <input name="m_hips" placeholder="Hips" />
                                            <input name="m_dress_length" placeholder="Length" />
                                            <input name="m_armhole" placeholder="Armhole" />
                                        </>
                                    )}
                                    {garmentType === 'skirt' && (
                                        <>
                                            <input name="m_waist" placeholder="Waist" />
                                            <input name="m_hips" placeholder="Hips" />
                                            <input name="m_skirt_length" placeholder="Length" />
                                        </>
                                    )}
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: '#64748b', marginBottom: '5px' }}>Deadline & Extras</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                        <div style={{ gridColumn: 'span 3' }}>
                                            <label className="label" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Deadline Date</label>
                                            <input name="deadline" type="date" required style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    <textarea name="m_notes" placeholder="Additional style or fit notes..." style={{ width: '100%', marginTop: '10px', height: '60px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}></textarea>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label className="label">Total Price</label>
                                    <input type="number" name="total_price" required />
                                </div>
                                <div className="form-group">
                                    <label className="label">Deposit</label>
                                    <input type="number" name="paid_amount" required />
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                                <label className="label">Payment Mode</label>
                                <select name="payment_mode_tailor" className="input" style={{ width: '100%', marginBottom: '10px' }} onChange={(e) => {
                                    const mpesaField = document.getElementById('mpesa-field-tailor');
                                    if (mpesaField) mpesaField.style.display = e.target.value === 'M-Pesa' ? 'block' : 'none';
                                }}>
                                    <option value="Cash">Cash</option>
                                    <option value="M-Pesa">M-Pesa</option>
                                </select>
                                <div id="mpesa-field-tailor" style={{ display: 'none' }}>
                                    <input name="mpesa_code_tailor" placeholder="M-Pesa Confirmation Code" />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: '#00f2ff', color: '#0f172a' }}>Submit Custom Order</button>
                        </form>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Custom Tailoring Orders</span>
                        <input
                            placeholder="Search Order/Phone..."
                            value={orderSearch}
                            onChange={e => setOrderSearch(e.target.value)}
                            style={{ maxWidth: '200px', fontSize: '0.8rem' }}
                        />
                    </div>
                    <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Customer</th>
                                    <th>Bespoke Details</th>
                                    <th>Status</th>
                                    <th>Deadline</th>
                                    <th>Finances</th>
                                    <th>Details</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTailoring.map(o => (
                                    <tr key={o.id} style={{ opacity: o.status === 'collected' ? 0.7 : 1 }}>
                                        <td style={{ fontFamily: 'monospace', color: '#00f2ff', fontWeight: 'bold' }}>{o.order_code}</td>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{o.customer_name}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{o.customer_phone}</div>
                                        </td>
                                        <td>
                                            {(() => {
                                                try {
                                                    const m = JSON.parse(o.measurements || '{}');
                                                    return <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>{m.type || 'Custom'}</div>;
                                                } catch (e) { return null; }
                                            })()}
                                            <div style={{ fontSize: '0.8rem' }}>Style: <span style={{ color: '#00f2ff' }}>{o.style_name || 'Custom'}</span></div>
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
                                    const req = document.getElementById('tailoring_mpesa_input');
                                    if (req) req.required = e.target.value === 'M-Pesa';
                                }}>
                                    <option value="Cash">Cash</option>
                                    <option value="M-Pesa">M-Pesa</option>
                                </select>
                            </div>
                            <div id="tailoring_mpesa_code" style={{ display: 'none', marginBottom: '15px' }}>
                                <label className="label" style={{ color: '#64748b' }}>M-Pesa Code</label>
                                <input id="tailoring_mpesa_input" name="mpesa_code" placeholder="Confirmation Code" />
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(5px)' }}>
                    <div className="card" style={{ width: '600px', background: '#1e293b', padding: '0', border: '1px solid #334155', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', padding: '20px' }}>
                            <div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>ORDER DETAILS</h2>
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>#{tailoringOrderToView.order_code}</div>
                            </div>
                            <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setTailoringOrderToView(null)}>×</button>
                        </div>
                        <div className="card-body" style={{ padding: '24px', overflowY: 'auto', color: '#e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{tailoringOrderToView.customer_name}</div>
                                    <div style={{ color: '#00f2ff' }}>{tailoringOrderToView.customer_phone}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Deadline</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: new Date(tailoringOrderToView.deadline) < new Date() ? '#ef4444' : '#10b981' }}>{tailoringOrderToView.deadline}</div>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        {tailoringOrderToView.style_image && (
                                            <img
                                                src={tailoringOrderToView.style_image}
                                                alt="Style Ref"
                                                onClick={() => setPreviewImage(tailoringOrderToView.style_image)}
                                                style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155', cursor: 'zoom-in' }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Style Reference</div>
                                            <div style={{ fontWeight: '600' }}>{tailoringOrderToView.style_name || 'Custom Design'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Material Selected</div>
                                        <div style={{ fontWeight: '600' }}>{tailoringOrderToView.material_name || 'Customer Provided'}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#00f2ff', marginBottom: '12px', borderBottom: '1px solid rgba(0,242,255,0.2)', paddingBottom: '8px' }}>MEASUREMENTS & NOTES</div>
                                {(() => {
                                    try {
                                        const m = JSON.parse(tailoringOrderToView.measurements || '{}');
                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {Object.entries(m)
                                                    .filter(([k, v]) => k !== 'notes' && k !== 'type' && v)
                                                    .map(([k, v]) => (
                                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                                            <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{k.replace(/_/g, ' ')}</span>
                                                            <span style={{ fontWeight: 'bold' }}>{v}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        );
                                    } catch (e) { return null; }
                                })()}
                                {(() => {
                                    try {
                                        const m = JSON.parse(tailoringOrderToView.measurements || '{}');
                                        return m.notes ? <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,0,0.1)', color: '#fef08a', borderRadius: '6px', fontStyle: 'italic' }}>"{m.notes}"</div> : null;
                                    } catch (e) { return null; }
                                })()}
                            </div>
                        </div>
                        <div className="card-footer" style={{ padding: '20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                className="btn btn-primary"
                                style={{ background: '#10b981', color: 'white' }}
                                onClick={() => printTailoringSpecs(tailoringOrderToView)}
                            >
                                🖨️ Print Measurements
                            </button>
                            <button className="btn btn-primary" onClick={() => setTailoringOrderToView(null)}>Close Details</button>
                        </div>
                    </div>
                </div>
            )}

            {previewImage && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(10px)' }}
                    onClick={() => setPreviewImage(null)}
                >
                    <img
                        src={previewImage}
                        alt="Preview"
                        style={{ maxWidth: '85%', maxHeight: '85%', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}
                    />
                    <button
                        style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '50px', height: '50px', fontSize: '1.5rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                        onClick={() => setPreviewImage(null)}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
