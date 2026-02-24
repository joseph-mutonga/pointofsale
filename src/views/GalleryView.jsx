import { useState, useMemo } from 'react';

export default function GalleryView({ user, gallery, loadData, onBack }) {
    const [gallerySearchTerm, setGallerySearchTerm] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [editItem, setEditItem] = useState(null);

    const filteredGallery = useMemo(() => gallery.filter(g =>
        g.title.toLowerCase().includes(gallerySearchTerm.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(gallerySearchTerm.toLowerCase()))
    ), [gallery, gallerySearchTerm]);

    const handleAddGallery = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const file = e.target.image.files[0];

        if (!file) return alert('Please select an image');

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const res = await window.api.addGalleryItem({
                title: fd.get('title'),
                description: fd.get('description'),
                image_data: reader.result
            });
            if (res.success) { e.target.reset(); loadData(); }
            else alert(res.message);
        };
    };

    const handleUpdateGallery = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const file = e.target.image.files[0];

        const updateData = {
            id: editItem.id,
            title: fd.get('title'),
            description: fd.get('description'),
        };

        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                updateData.image_data = reader.result;
                const res = await window.api.updateGalleryItem(updateData);
                if (res.success) { setEditItem(null); loadData(); }
                else alert(res.message);
            };
        } else {
            const res = await window.api.updateGalleryItem(updateData);
            if (res.success) { setEditItem(null); loadData(); }
            else alert(res.message);
        }
    };

    return (
        <div className="gallery-screen">
            <nav className="gallery-navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <button className="btn-back-nav" onClick={onBack}>← Dashboard</button>
                    <h1 className="brand" style={{ margin: 0, fontSize: '1.5rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>STYLE GALLERY</h1>
                </div>

                <div className="gallery-search-container">
                    <span style={{ opacity: 0.5 }}>🔍</span>
                    <input
                        placeholder="Search designs or styles..."
                        value={gallerySearchTerm}
                        onChange={e => setGallerySearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="gallery-badge">{filteredGallery.length} DESIGNS</div>
                    <div className="hub-user-futuristic" style={{ padding: '5px 15px', fontSize: '0.8rem' }}>
                        {user.full_name}
                    </div>
                </div>
            </nav>

            <main style={{ maxWidth: '1600px', margin: '0 auto' }}>
                {user.role === 'admin' && (
                    <div className="gallery-upload-card">
                        <h2 style={{ marginBottom: '20px', color: '#38bdf8' }}>Upload New Masterpiece</h2>
                        <form onSubmit={handleAddGallery} className="gallery-upload-form">
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Title / Design Name</label>
                                <input name="title" placeholder="e.g. Italian Slim Fit Suit" required style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Brief Description</label>
                                <input name="description" placeholder="Short details..." style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Image File</label>
                                <input type="file" name="image" accept="image/*" required style={{ border: 'none', padding: '6px', width: '100%' }} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: 'auto', background: '#38bdf8', color: '#0f172a', padding: '12px 30px' }}>Upload Design</button>
                        </form>
                    </div>
                )}

                <div className="gallery-grid">
                    {filteredGallery.map(g => (
                        <div key={g.id} className="gallery-card">
                            <div className="gallery-image-wrapper" onClick={() => setPreviewImage(g.image_data)} style={{ cursor: 'zoom-in' }}>
                                <img src={g.image_data} alt={g.title} />
                                <div className="gallery-overlay"></div>
                                <div className="gallery-image-text">
                                    <div className="gallery-title-on-image">{g.title}</div>
                                    <div className="gallery-desc-on-image">{g.description || 'No description provided.'}</div>
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{new Date(g.created_at).toLocaleDateString()}</span>
                                        <div className="gallery-badge" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>MASTERPIECE</div>
                                    </div>
                                </div>
                                {user.role === 'admin' && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                                        <button
                                            className="gallery-edit-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditItem(g);
                                            }}
                                            title="Edit Design"
                                            style={{
                                                background: '#38bdf8',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                color: '#0f172a',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            className="gallery-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this design from gallery?')) {
                                                    window.api.deleteGalleryItem(g.id).then(loadData);
                                                }
                                            }}
                                            title="Delete Design"
                                            style={{
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredGallery.length === 0 && (
                        <div className="gallery-empty">
                            <h2>No Designs Found</h2>
                            <p>Try adjusting your search or add new designs to the gallery.</p>
                        </div>
                    )}
                </div>
            </main>

            {editItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(8px)' }}>
                    <div className="card" style={{ width: '500px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(to right, #38bdf8, #818cf8)', padding: '20px', color: 'white', textAlign: 'center' }}>
                            <h2 style={{ margin: 0 }}>Update Design</h2>
                        </div>
                        <form onSubmit={handleUpdateGallery} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8' }}>Title / Design Name</label>
                                <input name="title" defaultValue={editItem.title} required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid #334155' }} />
                            </div>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8' }}>Brief Description</label>
                                <input name="description" defaultValue={editItem.description} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid #334155' }} />
                            </div>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8' }}>Change Image (optional)</label>
                                <input type="file" name="image" accept="image/*" style={{ border: 'none', padding: '6px', width: '100%', color: '#94a3b8' }} />
                                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>Leave empty to keep current image.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#38bdf8', color: '#0f172a' }}>Save Changes</button>
                                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setEditItem(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {previewImage && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(10px)' }}
                    onClick={() => setPreviewImage(null)}
                >
                    {(() => {
                        const idx = filteredGallery.findIndex(g => g.image_data === previewImage);
                        if (idx === -1) return null;

                        const navBtnStyle = {
                            position: 'absolute',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            fontSize: '2rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            zIndex: 310
                        };

                        return (
                            <>
                                <button
                                    style={{ ...navBtnStyle, left: '30px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextIdx = (idx - 1 + filteredGallery.length) % filteredGallery.length;
                                        setPreviewImage(filteredGallery[nextIdx].image_data);
                                    }}
                                >
                                    ‹
                                </button>
                                <button
                                    style={{ ...navBtnStyle, right: '30px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextIdx = (idx + 1) % filteredGallery.length;
                                        setPreviewImage(filteredGallery[nextIdx].image_data);
                                    }}
                                >
                                    ›
                                </button>
                            </>
                        );
                    })()}

                    <img
                        src={previewImage}
                        alt="Large Preview"
                        style={{ maxWidth: '85%', maxHeight: '85%', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.8)', cursor: 'zoom-out' }}
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
