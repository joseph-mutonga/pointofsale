import { useState, useMemo } from 'react';

export default function GalleryView({ gallery, loadData, onBack, showToast, processing, setProcessing }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newImage, setNewImage] = useState(null);
    const [newImagePath, setNewImagePath] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    const categories = useMemo(() => {
        const cats = new Set((gallery || []).map(item => item.category).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [gallery]);

    const filteredGallery = useMemo(() => {
        return (gallery || []).filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [gallery, searchTerm, categoryFilter]);

    const handleUpload = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            title: fd.get('title'),
            category: fd.get('category'),
            image_data: newImage, // fallback for small images if path fails
            image_path: newImagePath // The new physical file path for the backend
        };

        if (!newImage) {
            showToast('Please select or take an image first', 'error');
            return;
        }

        setProcessing(true);
        try {
            console.log('Uploading image to gallery...', data.title);
            const res = await window.api.addGalleryItem(data);
            if (res.success) {
                console.log('Upload successful. Refreshing data...');
                await loadData();
                showToast('Success: Image saved to database!', 'success');
                setShowUploadModal(false);
                setNewImage(null);
                setNewImagePath(null);
            } else {
                console.error('Upload failed:', res.message);
                showToast(`Error: ${res.message}`, 'error');
            }
        } catch (error) {
            console.error('Gallery upload error:', error);
            showToast('Fatal Error: Failed to communicate with database', 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="app" style={{ 
            background: '#0f172a', 
            height: '100vh', 
            overflow: 'hidden', 
            color: 'white',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {processing && (
                <div className="processing-overlay" style={{ zIndex: 100000 }}>
                    <div className="spinner"></div>
                    <div style={{ fontWeight: 'bold' }}>Uploading to Gallery...</div>
                </div>
            )}

            <header className="header" style={{ 
                background: 'rgba(30, 41, 59, 0.7)', 
                backdropFilter: 'blur(10px)', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '1rem 2rem',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button className="btn-back-nav" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>← Dashboard</button>
                    <div className="brand" style={{ letterSpacing: '2px' }}>DESIGN & STYLE <span style={{ color: '#00f2ff' }}>GALLERY</span></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn" onClick={async () => {
                        showToast('Refreshing gallery...', 'info');
                        await loadData();
                    }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        🔄 Refresh
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ background: 'linear-gradient(135deg, #00f2ff 0%, #00d4ff 100%)', color: '#0f172a', fontWeight: 'bold', boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)' }}>
                        + UPLOAD PHOTO
                    </button>
                </div>
            </header>

            <main style={{ 
                padding: '2rem', 
                maxWidth: '1400px', 
                margin: '0 auto',
                width: '100%',
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#00f2ff rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <input 
                            placeholder="Search styles, categories..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '12px 20px', 
                                borderRadius: '12px', 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    background: categoryFilter === cat ? '#00f2ff' : 'rgba(255,255,255,0.05)',
                                    color: categoryFilter === cat ? '#0f172a' : '#94a3b8',
                                    border: 'none',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 'bold',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                    gap: '24px 16px',
                    padding: '20px'
                }}>
                    {filteredGallery.map(item => (
                        <div 
                            key={item.id} 
                            className="gallery-card-container"
                            style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                            onClick={() => setPreviewImage(item.image_data)}
                        >
                            <div style={{ 
                                position: 'relative', 
                                width: '100%', 
                                paddingBottom: '66.6%', 
                                borderRadius: '16px', 
                                overflow: 'hidden', 
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                marginBottom: '10px'
                            }}>
                                <img 
                                    src={item.image_data} 
                                    alt={item.title} 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0, 
                                        left: 0, 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        transition: 'transform 0.5s'
                                    }} 
                                    className="gallery-img"
                                />
                                <button 
                                    className="btn-delete-overlay"
                                    style={{ 
                                        position: 'absolute', 
                                        top: '10px', 
                                        right: '10px', 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.4)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        backdropFilter: 'blur(4px)',
                                        zIndex: 5
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Remove this style?')) {
                                            window.api.deleteGalleryItem(item.id).then(res => {
                                                if (res.success) loadData();
                                            });
                                        }
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ padding: '0 4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{ 
                                        width: '18px', 
                                        height: '18px', 
                                        borderRadius: '4px', 
                                        background: '#00f2ff', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        color: '#0f172a',
                                        fontWeight: 'bold'
                                    }}>
                                        {item.category ? item.category[0].toUpperCase() : 'S'}
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#cbd5e1', 
                                        fontWeight: '400',
                                        letterSpacing: '0.3px'
                                    }}>
                                        {item.category || 'Style Gallery'}
                                    </span>
                                </div>
                                <div style={{ 
                                    fontSize: '0.95rem', 
                                    fontWeight: '400', 
                                    color: '#f8fafc',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.4'
                                }}>
                                    {item.title}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredGallery.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
                        <h3>No images found in this collection</h3>
                        <p>Try a different search term or category</p>
                    </div>
                )}
            </main>

            {showUploadModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
                    <div className="card" style={{ width: '420px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#fff', fontSize: '1.5rem', fontWeight: '600' }}>Add to Collection</h2>
                        <form onSubmit={handleUpload}>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>STYLE TITLE</label>
                                <input 
                                    name="title" 
                                    placeholder="e.g. Slim Fit Tuxedo" 
                                    required 
                                    style={{ 
                                        background: '#0f172a', 
                                        border: '1px solid #334155', 
                                        borderRadius: '12px', 
                                        padding: '14px',
                                        color: '#ffffff',
                                        width: '100%',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                    }} 
                                />
                            </div>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>CATEGORY</label>
                                <input 
                                    name="category" 
                                    placeholder="e.g. Men's Wear" 
                                    required 
                                    style={{ 
                                        background: '#0f172a', 
                                        border: '1px solid #334155', 
                                        borderRadius: '12px', 
                                        padding: '14px',
                                        color: '#ffffff',
                                        width: '100%',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                    }} 
                                />
                            </div>
                            <div className="form-group">
                                <label className="label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>REFERENCE PHOTO</label>
                                <div 
                                    style={{ 
                                        height: '180px', 
                                        border: '2px dashed rgba(255,255,255,0.1)', 
                                        borderRadius: '16px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        background: 'rgba(0,0,0,0.2)',
                                        transition: 'all 0.3s'
                                    }}
                                    onClick={() => document.getElementById('gallery-upload-input').click()}
                                >
                                    {newImage ? (
                                        <img src={newImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '2.5rem', marginBottom: '10px', opacity: 0.5 }}>📸</span>
                                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Tap to capture or upload</span>
                                        </>
                                    )}
                                    <input 
                                        id="gallery-upload-input" 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        style={{ display: 'none' }} 
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setNewImagePath(file.path);
                                                const reader = new FileReader();
                                                reader.onloadend = () => setNewImage(reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '14px', background: '#00f2ff', color: '#0f172a', fontWeight: 'bold', borderRadius: '12px' }}>SAVE STYLE</button>
                                <button type="button" className="btn" style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} onClick={() => setShowUploadModal(false)}>CANCEL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewImage && (
                <div 
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200000, cursor: 'zoom-out' }}
                    onClick={() => setPreviewImage(null)}
                >
                    <img src={previewImage} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
                    <button 
                        style={{ position: 'absolute', top: '30px', right: '30px', background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.5rem', cursor: 'pointer' }}
                        onClick={() => setPreviewImage(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            <style>{`
                .gallery-card-container:hover .gallery-img {
                    transform: scale(1.05);
                }
                .gallery-card-container:hover {
                    opacity: 0.8;
                }
            `}</style>
        </div>
    );
}
