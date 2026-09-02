/**
 * Lumina Gallery - Main Application Controller
 * Handles gallery state, rendering, client-side IndexedDB persistence,
 * automated EXIF telemetry extraction, interactive Lightbox inspection,
 * and high-end micro-animations.
 */

import { luminaDB } from './db.js';
import { ExifParser } from './exif.js';
import { INITIAL_PHOTOGRAPHS } from './gallery-data.js';

class LuminaApp {
    constructor() {
        this.photos = [];
        this.filteredPhotos = [];
        this.activeCategory = 'all';
        this.ratingFilter = 'all';
        this.searchQuery = '';
        this.sortOrder = 'rating-desc';
        this.layoutMode = 'masonry';
        
        // Lightbox state
        this.currentPhotoIndex = 0;
        this.isLightboxOpen = false;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        // Upload state
        this.currentUploadedDataUrl = null;
        this.currentUploadFile = null;

        // DOM elements cache
        this.elements = {};
    }

    async init() {
        this.cacheDomElements();
        this.setupEventListeners();
        await this.loadGalleryData();
        this.applyFiltersAndRender();
        this.updateHeroFeatured();
        this.updateMetrics();
        this.initLucideIcons();
    }

    cacheDomElements() {
        this.elements = {
            // Gallery
            galleryContainer: document.getElementById('gallery-container'),
            emptyState: document.getElementById('gallery-empty-state'),
            searchInput: document.getElementById('gallery-search'),
            ratingSelect: document.getElementById('filter-rating'),
            sortSelect: document.getElementById('gallery-sort'),
            categoryPills: document.querySelectorAll('.category-pill'),
            
            // Layout buttons
            btnLayoutMasonry: document.getElementById('btn-layout-masonry'),
            btnLayoutEditorial: document.getElementById('btn-layout-editorial'),
            btnLayoutCompact: document.getElementById('btn-layout-compact'),

            // Hero
            heroImg: document.getElementById('hero-featured-img'),
            heroBadge: document.getElementById('hero-featured-badge'),
            heroRating: document.getElementById('hero-featured-rating'),
            heroLocation: document.getElementById('hero-featured-location'),
            heroTitle: document.getElementById('hero-featured-title'),
            heroTelemetry: document.getElementById('hero-featured-telemetry'),
            heroContainer: document.getElementById('hero-featured-container'),

            // Metrics
            statTotal: document.getElementById('stat-total-photos'),
            statFiveStars: document.getElementById('stat-five-stars'),
            statAvgRating: document.getElementById('stat-avg-rating'),
            statCameras: document.getElementById('stat-cameras'),

            // Upload Modal
            uploadModal: document.getElementById('upload-modal'),
            btnOpenUpload: document.getElementById('btn-open-upload'),
            btnCloseUpload: document.getElementById('btn-close-upload'),
            btnCancelUpload: document.getElementById('btn-cancel-upload'),
            uploadForm: document.getElementById('upload-form'),
            dropzone: document.getElementById('dropzone'),
            fileInput: document.getElementById('file-input'),
            dropzonePrompt: document.getElementById('dropzone-prompt'),
            dropzonePreviewContainer: document.getElementById('dropzone-preview-container'),
            dropzonePreviewImg: document.getElementById('dropzone-preview-img'),
            dropzoneFileInfo: document.getElementById('dropzone-file-info'),
            exifStatusBadge: document.getElementById('exif-status-badge'),
            starRatingPicker: document.getElementById('star-rating-picker'),
            ratingScoreDisplay: document.getElementById('rating-score-display'),
            uploadRatingInput: document.getElementById('upload-rating'),

            // Upload Fields
            inputTitle: document.getElementById('upload-title'),
            inputCategory: document.getElementById('upload-category'),
            inputBadge: document.getElementById('upload-badge'),
            inputLocation: document.getElementById('upload-location'),
            inputCamera: document.getElementById('upload-camera'),
            inputLens: document.getElementById('upload-lens'),
            inputAperture: document.getElementById('upload-aperture'),
            inputShutter: document.getElementById('upload-shutter'),
            inputIso: document.getElementById('upload-iso'),
            inputFocal: document.getElementById('upload-focal'),
            inputDescription: document.getElementById('upload-description'),

            // Lightbox
            lightboxModal: document.getElementById('lightbox-modal'),
            lightboxClose: document.getElementById('lightbox-close'),
            lightboxTitle: document.getElementById('lightbox-title'),
            lightboxLocationTop: document.getElementById('lightbox-location-top'),
            lightboxRating: document.getElementById('lightbox-rating'),
            lightboxImage: document.getElementById('lightbox-image'),
            lightboxPrev: document.getElementById('lightbox-prev'),
            lightboxNext: document.getElementById('lightbox-next'),
            lightboxBtnFav: document.getElementById('lightbox-btn-fav'),
            lightboxBtnFullscreen: document.getElementById('lightbox-btn-fullscreen'),
            lightboxBtnDownload: document.getElementById('lightbox-btn-download'),
            lightboxBtnInfo: document.getElementById('lightbox-btn-info'),
            lightboxDrawer: document.getElementById('lightbox-drawer'),
            lightboxZoomIn: document.getElementById('lightbox-zoom-in'),
            lightboxZoomOut: document.getElementById('lightbox-zoom-out'),
            lightboxZoomLevel: document.getElementById('lightbox-zoom-level'),
            zoomStage: document.getElementById('zoom-stage'),
            histogramBars: document.getElementById('histogram-bars'),

            // Lightbox Drawer elements
            drawerBadge: document.getElementById('drawer-badge'),
            drawerCameraModel: document.getElementById('drawer-camera-model'),
            drawerLensModel: document.getElementById('drawer-lens-model'),
            drawerAperture: document.getElementById('drawer-aperture'),
            drawerShutter: document.getElementById('drawer-shutter'),
            drawerIso: document.getElementById('drawer-iso'),
            drawerFocal: document.getElementById('drawer-focal'),
            drawerDescription: document.getElementById('drawer-description'),
            drawerLocation: document.getElementById('drawer-location'),
            drawerDate: document.getElementById('drawer-date'),
            drawerViews: document.getElementById('drawer-views'),
            drawerBtnDelete: document.getElementById('drawer-btn-delete'),

            // Miscellaneous
            btnExportBackup: document.getElementById('btn-export-backup'),
            footerBtnReset: document.getElementById('footer-btn-reset'),
            toastContainer: document.getElementById('toast-container')
        };
    }

    async loadGalleryData() {
        try {
            let stored = await luminaDB.getAll();
            if (!stored || stored.length === 0) {
                await luminaDB.addMultiple(INITIAL_PHOTOGRAPHS);
                this.photos = [...INITIAL_PHOTOGRAPHS];
            } else if (stored.length < INITIAL_PHOTOGRAPHS.length) {
                const existingIds = new Set(stored.map(p => p.id));
                const newPhotos = INITIAL_PHOTOGRAPHS.filter(p => !existingIds.has(p.id));
                if (newPhotos.length > 0) {
                    await luminaDB.addMultiple(newPhotos);
                    stored = await luminaDB.getAll();
                }
                this.photos = stored;
            } else {
                this.photos = stored;
            }
        } catch (err) {
            console.error('Failed to load from IndexedDB, falling back to static data:', err);
            this.photos = [...INITIAL_PHOTOGRAPHS];
        }
    }

    setupEventListeners() {
        // Search & Filter
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.applyFiltersAndRender();
        });

        this.elements.ratingSelect.addEventListener('change', (e) => {
            this.ratingFilter = e.target.value;
            this.applyFiltersAndRender();
        });

        this.elements.sortSelect.addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.applyFiltersAndRender();
        });

        // Category Pills
        this.elements.categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.elements.categoryPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.activeCategory = pill.getAttribute('data-category');
                this.applyFiltersAndRender();
            });
        });

        // Layout switches
        this.elements.btnLayoutMasonry.addEventListener('click', () => this.setLayout('masonry'));
        this.elements.btnLayoutEditorial.addEventListener('click', () => this.setLayout('editorial'));
        this.elements.btnLayoutCompact.addEventListener('click', () => this.setLayout('compact'));

        // Upload Modal Controls
        this.elements.btnOpenUpload.addEventListener('click', () => this.openUploadModal());
        this.elements.btnCloseUpload.addEventListener('click', () => this.closeUploadModal());
        this.elements.btnCancelUpload.addEventListener('click', () => this.closeUploadModal());
        this.elements.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.elements.uploadModal) this.closeUploadModal();
        });

        // Dropzone drag & drop
        this.setupDropzone();

        // Rating picker in upload modal
        this.setupStarRatingPicker();

        // Form Submit
        this.elements.uploadForm.addEventListener('submit', (e) => this.handleUploadSubmit(e));

        // Lightbox events
        this.elements.lightboxClose.addEventListener('click', () => this.closeLightbox());
        this.elements.lightboxPrev.addEventListener('click', () => this.navigateLightbox(-1));
        this.elements.lightboxNext.addEventListener('click', () => this.navigateLightbox(1));
        this.elements.lightboxBtnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.elements.lightboxBtnInfo.addEventListener('click', () => this.toggleLightboxDrawer());
        this.elements.lightboxBtnFav.addEventListener('click', () => this.toggleFavoriteCurrentPhoto());
        this.elements.drawerBtnDelete.addEventListener('click', () => this.deleteCurrentPhoto());

        // Zoom & Pan in Lightbox
        this.setupZoomAndPan();

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Export Backup & Reset
        this.elements.btnExportBackup.addEventListener('click', () => this.exportBackupJSON());
        this.elements.footerBtnReset.addEventListener('click', () => this.resetDemoGallery());
    }

    setLayout(mode) {
        this.layoutMode = mode;
        const container = this.elements.galleryContainer;
        
        container.className = '';
        if (mode === 'masonry') container.className = 'view-masonry';
        if (mode === 'editorial') container.className = 'view-editorial';
        if (mode === 'compact') container.className = 'view-compact';

        const buttons = [
            { btn: this.elements.btnLayoutMasonry, mode: 'masonry' },
            { btn: this.elements.btnLayoutEditorial, mode: 'editorial' },
            { btn: this.elements.btnLayoutCompact, mode: 'compact' }
        ];

        buttons.forEach(({ btn, mode: m }) => {
            if (m === mode) {
                btn.className = 'p-1.5 rounded-full text-white bg-white/10 transition-all';
            } else {
                btn.className = 'p-1.5 rounded-full text-neutral-400 hover:text-white transition-all';
            }
        });
    }

    applyFiltersAndRender() {
        let list = [...this.photos];

        if (this.activeCategory !== 'all') {
            list = list.filter(p => p.category === this.activeCategory);
        }

        if (this.ratingFilter === '5') {
            list = list.filter(p => p.rating === 5.0);
        } else if (this.ratingFilter === '4.8') {
            list = list.filter(p => p.rating >= 4.8);
        } else if (this.ratingFilter === 'favorites') {
            list = list.filter(p => p.favorite === true);
        }

        if (this.searchQuery) {
            const q = this.searchQuery;
            list = list.filter(p => {
                const title = (p.title || '').toLowerCase();
                const camera = (p.camera || '').toLowerCase();
                const lens = (p.lens || '').toLowerCase();
                const location = (p.location || '').toLowerCase();
                const category = (p.category || '').toLowerCase();
                const badge = (p.badge || '').toLowerCase();
                return title.includes(q) || camera.includes(q) || lens.includes(q) || location.includes(q) || category.includes(q) || badge.includes(q);
            });
        }

        if (this.sortOrder === 'rating-desc') {
            list.sort((a, b) => b.rating - a.rating || (b.dateUploaded || 0) - (a.dateUploaded || 0));
        } else if (this.sortOrder === 'newest') {
            list.sort((a, b) => (b.dateUploaded || 0) - (a.dateUploaded || 0));
        } else if (this.sortOrder === 'views-desc') {
            list.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (this.sortOrder === 'title-asc') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }

        this.filteredPhotos = list;
        this.renderGallery(list);
    }

    renderGallery(photos) {
        const container = this.elements.galleryContainer;
        const emptyState = this.elements.emptyState;

        container.innerHTML = '';

        if (!photos || photos.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        photos.forEach((photo, index) => {
            const card = document.createElement('div');
            card.className = 'photo-card group animate-fade-up';
            card.style.animationDelay = `${Math.min(index * 45, 450)}ms`;

            card.innerHTML = `
                <img src="${photo.thumbnailUrl || photo.url}" alt="${this.escapeHtml(photo.title)}" loading="lazy" class="w-full h-full object-cover">
                
                <div class="photo-card-overlay">
                    <div class="flex items-center justify-between w-full">
                        <span class="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-gold-300 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
                            ${this.escapeHtml(photo.badge || photo.category)}
                        </span>
                        
                        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md">
                            <span class="flex items-center gap-0.5 text-amber-400">
                                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i>
                            </span>
                            <span class="text-[11px] font-bold text-white">${Number(photo.rating).toFixed(1)}</span>
                        </div>
                    </div>

                    <div class="space-y-2 w-full pt-6">
                        <div class="flex items-center gap-1.5 text-[11px] text-neutral-300 truncate">
                            <i data-lucide="map-pin" class="w-3 h-3 text-gold-400 flex-shrink-0"></i>
                            <span class="truncate">${this.escapeHtml(photo.location || 'Exhibition Collection')}</span>
                        </div>

                        <h3 class="font-serif text-lg sm:text-xl font-normal text-white truncate group-hover:text-gold-300 transition-colors">
                            ${this.escapeHtml(photo.title)}
                        </h3>

                        <div class="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-neutral-300">
                            ${photo.camera ? `<span class="telemetry-chip"><i data-lucide="camera" class="w-3 h-3 text-gold-400"></i> ${this.escapeHtml(photo.camera)}</span>` : ''}
                            ${photo.aperture ? `<span class="telemetry-chip">${this.escapeHtml(photo.aperture)}</span>` : ''}
                            ${photo.shutterSpeed ? `<span class="telemetry-chip">${this.escapeHtml(photo.shutterSpeed)}</span>` : ''}
                            ${photo.iso ? `<span class="telemetry-chip">${this.escapeHtml(photo.iso)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                this.openLightbox(index);
            });

            container.appendChild(card);
        });

        this.initLucideIcons();
    }

    updateHeroFeatured() {
        const topRated = this.photos.find(p => p.rating === 5.0) || this.photos[0];
        if (!topRated) return;

        this.elements.heroImg.src = topRated.url;
        this.elements.heroBadge.textContent = topRated.badge || "Curator's Choice";
        this.elements.heroRating.textContent = Number(topRated.rating).toFixed(1);
        this.elements.heroLocation.textContent = topRated.location || "Exhibition Studio";
        this.elements.heroTitle.textContent = topRated.title;

        this.elements.heroTelemetry.innerHTML = `
            ${topRated.camera ? `<span class="telemetry-chip"><i data-lucide="camera" class="w-3 h-3 text-gold-400"></i> ${this.escapeHtml(topRated.camera)}</span>` : ''}
            ${topRated.lens ? `<span class="telemetry-chip">${this.escapeHtml(topRated.lens)}</span>` : ''}
            ${topRated.aperture ? `<span class="telemetry-chip">${this.escapeHtml(topRated.aperture)}</span>` : ''}
            ${topRated.shutterSpeed ? `<span class="telemetry-chip">${this.escapeHtml(topRated.shutterSpeed)}</span>` : ''}
            ${topRated.iso ? `<span class="telemetry-chip">${this.escapeHtml(topRated.iso)}</span>` : ''}
        `;

        this.elements.heroContainer.onclick = () => {
            const index = this.filteredPhotos.findIndex(p => p.id === topRated.id);
            if (index !== -1) this.openLightbox(index);
            else this.openLightbox(0);
        };

        this.initLucideIcons();
    }

    updateMetrics() {
        const total = this.photos.length;
        const fiveStars = this.photos.filter(p => p.rating === 5.0).length;
        const avg = total > 0 ? (this.photos.reduce((sum, p) => sum + (p.rating || 0), 0) / total).toFixed(1) : '5.0';
        const cameras = new Set(this.photos.map(p => p.camera).filter(Boolean));

        this.elements.statTotal.textContent = total;
        this.elements.statFiveStars.textContent = fiveStars;
        this.elements.statAvgRating.textContent = avg;
        this.elements.statCameras.textContent = cameras.size;
    }

    openLightbox(index) {
        if (!this.filteredPhotos[index]) return;
        this.currentPhotoIndex = index;
        this.isLightboxOpen = true;

        const photo = this.filteredPhotos[index];
        this.renderLightboxPhoto(photo);

        this.elements.lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        photo.views = (photo.views || 0) + 1;
        luminaDB.update(photo.id, { views: photo.views }).catch(console.warn);
    }

    renderLightboxPhoto(photo) {
        this.resetZoom();

        this.elements.lightboxTitle.textContent = photo.title;
        this.elements.lightboxLocationTop.textContent = photo.location || photo.category;
        this.elements.lightboxRating.textContent = Number(photo.rating).toFixed(1);
        this.elements.lightboxImage.src = photo.url;
        this.elements.lightboxImage.alt = photo.title;

        this.elements.drawerBadge.textContent = photo.badge || photo.category;
        this.elements.drawerCameraModel.textContent = photo.camera || "Format Undefined";
        this.elements.drawerLensModel.textContent = photo.lens || "Precision Optics";
        this.elements.drawerAperture.textContent = photo.aperture || "—";
        this.elements.drawerShutter.textContent = photo.shutterSpeed || "—";
        this.elements.drawerIso.textContent = photo.iso || "—";
        this.elements.drawerFocal.textContent = photo.focalLength || "—";
        this.elements.drawerDescription.textContent = photo.description ? `"${photo.description}"` : "Masterpiece photographic archive.";
        this.elements.drawerLocation.textContent = photo.location || "Exhibition Studio";
        this.elements.drawerDate.textContent = photo.dateTaken || "Archived 2026";
        this.elements.drawerViews.textContent = (photo.views || 1).toLocaleString();

        this.updateFavoriteButton(photo.favorite);

        this.elements.lightboxBtnDownload.href = photo.url;
        this.elements.lightboxBtnDownload.download = `${photo.title.replace(/\s+/g, '_')}.jpg`;

        this.renderHistogram();
        this.initLucideIcons();
    }

    closeLightbox() {
        this.isLightboxOpen = false;
        this.elements.lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
        this.resetZoom();
    }

    navigateLightbox(direction) {
        if (!this.filteredPhotos.length) return;
        let newIndex = this.currentPhotoIndex + direction;
        if (newIndex < 0) newIndex = this.filteredPhotos.length - 1;
        if (newIndex >= this.filteredPhotos.length) newIndex = 0;

        this.currentPhotoIndex = newIndex;
        this.renderLightboxPhoto(this.filteredPhotos[newIndex]);
    }

    setupZoomAndPan() {
        const stage = this.elements.zoomStage;

        stage.addEventListener('click', (e) => {
            if (this.isPanning) return;
            if (this.zoomLevel === 1) {
                this.setZoom(2.2);
            } else {
                this.resetZoom();
            }
        });

        this.elements.lightboxZoomIn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setZoom(Math.min(this.zoomLevel + 0.5, 4.0));
        });

        this.elements.lightboxZoomOut.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setZoom(Math.max(this.zoomLevel - 0.5, 1.0));
        });

        stage.addEventListener('mousedown', (e) => {
            if (this.zoomLevel <= 1) return;
            this.isPanning = true;
            this.startX = e.clientX - this.panX;
            this.startY = e.clientY - this.panY;
            stage.classList.add('zoomed');
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.panX = e.clientX - this.startX;
            this.panY = e.clientY - this.startY;
            this.applyTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
        });
    }

    setZoom(level) {
        this.zoomLevel = level;
        if (this.zoomLevel <= 1) {
            this.panX = 0;
            this.panY = 0;
            this.elements.zoomStage.classList.remove('zoomed');
        } else {
            this.elements.zoomStage.classList.add('zoomed');
        }
        this.elements.lightboxZoomLevel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        this.applyTransform();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.elements.zoomStage.classList.remove('zoomed');
        this.elements.lightboxZoomLevel.textContent = '100%';
        this.applyTransform();
    }

    applyTransform() {
        this.elements.lightboxImage.style.transform = `scale(${this.zoomLevel}) translate(${this.panX / this.zoomLevel}px, ${this.panY / this.zoomLevel}px)`;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.warn);
        } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(console.warn);
        }
    }

    toggleLightboxDrawer() {
        this.elements.lightboxDrawer.classList.toggle('hidden');
    }

    async toggleFavoriteCurrentPhoto() {
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;

        photo.favorite = !photo.favorite;
        await luminaDB.update(photo.id, { favorite: photo.favorite });
        this.updateFavoriteButton(photo.favorite);
        
        this.showToast(
            photo.favorite ? 'Saved to Favorites' : 'Removed from Favorites',
            `"${photo.title}" has been updated in your vault.`,
            'gold'
        );

        const mainP = this.photos.find(p => p.id === photo.id);
        if (mainP) mainP.favorite = photo.favorite;
    }

    updateFavoriteButton(isFav) {
        const btn = this.elements.lightboxBtnFav;
        if (isFav) {
            btn.innerHTML = `<i data-lucide="heart" class="w-4 h-4 fill-rose-500 text-rose-500"></i>`;
        } else {
            btn.innerHTML = `<i data-lucide="heart" class="w-4 h-4 text-neutral-400"></i>`;
        }
        this.initLucideIcons();
    }

    async deleteCurrentPhoto() {
        const photo = this.filteredPhotos[this.currentPhotoIndex];
        if (!photo) return;

        if (!confirm(`Are you sure you wish to remove "${photo.title}" from your exhibition archive?`)) {
            return;
        }

        await luminaDB.delete(photo.id);
        this.photos = this.photos.filter(p => p.id !== photo.id);
        this.closeLightbox();
        this.applyFiltersAndRender();
        this.updateMetrics();
        this.updateHeroFeatured();

        this.showToast('Photograph Removed', `"${photo.title}" was removed from the vault.`, 'info');
    }

    renderHistogram() {
        const container = this.elements.histogramBars;
        container.innerHTML = '';
        const barCount = 48;
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'histogram-bar';
            
            const x = (i - barCount / 2.2) / (barCount / 4);
            const heightFactor = Math.exp(-0.5 * x * x);
            const jitter = 0.85 + Math.random() * 0.3;
            const heightPercent = Math.max(8, Math.min(95, Math.round(heightFactor * 90 * jitter)));
            
            bar.style.height = `${heightPercent}%`;
            
            if (i < barCount * 0.3) {
                bar.style.backgroundColor = '#38bdf8';
            } else if (i < barCount * 0.7) {
                bar.style.backgroundColor = '#d4af37';
            } else {
                bar.style.backgroundColor = '#f87171';
            }

            container.appendChild(bar);
        }
    }

    openUploadModal() {
        this.elements.uploadModal.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';
    }

    closeUploadModal() {
        this.elements.uploadModal.classList.add('opacity-0', 'pointer-events-none');
        document.body.style.overflow = '';
        this.resetUploadForm();
    }

    resetUploadForm() {
        this.elements.uploadForm.reset();
        this.currentUploadedDataUrl = null;
        this.currentUploadFile = null;
        this.elements.dropzonePrompt.classList.remove('hidden');
        this.elements.dropzonePreviewContainer.classList.add('hidden');
        this.elements.dropzonePreviewImg.src = '';
        this.elements.exifStatusBadge.classList.add('hidden');
        this.setStarRating(5.0);
    }

    setupDropzone() {
        const dropzone = this.elements.dropzone;
        const fileInput = this.elements.fileInput;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-over');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processUploadedFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length > 0) {
                this.processUploadedFile(fileInput.files[0]);
            }
        });
    }

    async processUploadedFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPEG, PNG, WebP, etc.)');
            return;
        }

        this.currentUploadFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentUploadedDataUrl = e.target.result;
            this.elements.dropzonePrompt.classList.add('hidden');
            this.elements.dropzonePreviewContainer.classList.remove('hidden');
            this.elements.dropzonePreviewImg.src = this.currentUploadedDataUrl;

            const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
            this.elements.dropzoneFileInfo.textContent = `${file.name} • ${sizeMb} MB`;
        };
        reader.readAsDataURL(file);

        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        this.elements.inputTitle.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

        try {
            const exif = await ExifParser.parse(file);
            if (exif) {
                if (exif.camera) this.elements.inputCamera.value = exif.camera;
                if (exif.lensModel) this.elements.inputLens.value = exif.lensModel;
                if (exif.aperture) this.elements.inputAperture.value = exif.aperture;
                if (exif.shutterSpeed) this.elements.inputShutter.value = exif.shutterSpeed;
                if (exif.iso) this.elements.inputIso.value = exif.iso;
                if (exif.focalLength) this.elements.inputFocal.value = exif.focalLength;
                
                this.elements.exifStatusBadge.classList.remove('hidden');
                this.elements.exifStatusBadge.classList.add('flex');
            }
        } catch (err) {
            console.warn('EXIF parse notice:', err);
        }
    }

    setupStarRatingPicker() {
        const picker = this.elements.starRatingPicker;
        const stars = picker.querySelectorAll('[data-index]');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const score = parseFloat(star.getAttribute('data-index'));
                this.setStarRating(score);
            });
        });
    }

    setStarRating(rating) {
        this.elements.uploadRatingInput.value = rating.toFixed(1);
        const stars = this.elements.starRatingPicker.querySelectorAll('[data-index]');
        
        stars.forEach(s => {
            const idx = parseFloat(s.getAttribute('data-index'));
            if (idx <= rating) {
                s.className = 'w-6 h-6 star-filled fill-amber-400 text-amber-400 hover:scale-110 transition-transform';
            } else {
                s.className = 'w-6 h-6 star-empty text-neutral-600 hover:scale-110 transition-transform';
            }
        });

        let label = `${rating.toFixed(1)} ★`;
        if (rating === 5) label += ' (Masterpiece)';
        else if (rating >= 4) label += ' (Excellence)';
        else label += ' (Portfolio Standard)';
        
        this.elements.ratingScoreDisplay.textContent = label;
        this.initLucideIcons();
    }

    async handleUploadSubmit(e) {
        e.preventDefault();

        if (!this.currentUploadedDataUrl) {
            alert('Please select or drop an image file first.');
            return;
        }

        const newPhoto = {
            id: `lumina-${Date.now()}`,
            title: this.elements.inputTitle.value.trim() || 'Untitled Frame',
            category: this.elements.inputCategory.value,
            rating: parseFloat(this.elements.uploadRatingInput.value) || 5.0,
            badge: this.elements.inputBadge.value.trim() || 'Masterpiece 2026',
            location: this.elements.inputLocation.value.trim() || 'Archived Studio',
            camera: this.elements.inputCamera.value.trim() || 'Leica Camera System',
            lens: this.elements.inputLens.value.trim() || 'Prime Optics',
            aperture: this.elements.inputAperture.value.trim() || 'ƒ/1.4',
            shutterSpeed: this.elements.inputShutter.value.trim() || '1/250s',
            iso: this.elements.inputIso.value.trim() || 'ISO 100',
            focalLength: this.elements.inputFocal.value.trim() || '50mm',
            description: this.elements.inputDescription.value.trim() || 'Captured with precision and preserved in high-fidelity archive.',
            url: this.currentUploadedDataUrl,
            thumbnailUrl: this.currentUploadedDataUrl,
            favorite: false,
            views: 1,
            dateTaken: new Date().toISOString().split('T')[0],
            dateUploaded: Date.now()
        };

        await luminaDB.add(newPhoto);
        this.photos.unshift(newPhoto);

        this.closeUploadModal();
        this.applyFiltersAndRender();
        this.updateMetrics();
        this.updateHeroFeatured();

        this.showToast(
            'Masterpiece Published!',
            `"${newPhoto.title}" has been successfully added to your vault.`,
            'gold'
        );
    }

    handleKeyboardShortcuts(e) {
        if (!this.isLightboxOpen) {
            if (e.key === 'u' || e.key === 'U') {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    this.openUploadModal();
                }
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                this.closeLightbox();
                break;
            case 'ArrowLeft':
                this.navigateLightbox(-1);
                break;
            case 'ArrowRight':
                this.navigateLightbox(1);
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            case 'z':
            case 'Z':
                if (this.zoomLevel === 1) this.setZoom(2.2);
                else this.resetZoom();
                break;
            case 'i':
            case 'I':
                this.toggleLightboxDrawer();
                break;
            case 'l':
            case 'L':
                this.toggleFavoriteCurrentPhoto();
                break;
        }
    }

    showToast(title, message, type = 'gold') {
        const container = this.elements.toastContainer;
        const toast = document.createElement('div');
        toast.className = 'toast-item glass-panel border border-gold-500/40 p-4 rounded-xl shadow-2xl flex items-start gap-3 w-80 max-w-sm';

        toast.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-4 h-4"></i>
            </div>
            <div class="space-y-0.5 flex-1">
                <h4 class="text-xs font-bold text-white tracking-wide">${this.escapeHtml(title)}</h4>
                <p class="text-[11px] text-neutral-400 leading-tight">${this.escapeHtml(message)}</p>
            </div>
        `;

        container.appendChild(toast);
        this.initLucideIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    exportBackupJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.photos, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `lumina_archive_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        this.showToast('Backup Exported', 'Your entire photography archive has been exported to JSON.', 'gold');
    }

    async resetDemoGallery() {
        if (!confirm("Reset the archive to the original 8 curated masterpieces? Your custom uploads will be replaced.")) {
            return;
        }

        await luminaDB.clear();
        await luminaDB.addMultiple(INITIAL_PHOTOGRAPHS);
        this.photos = [...INITIAL_PHOTOGRAPHS];
        this.applyFiltersAndRender();
        this.updateMetrics();
        this.updateHeroFeatured();

        this.showToast('Vault Re-initialized', 'Curated master collection has been restored.', 'info');
    }

    initLucideIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new LuminaApp();
    app.init();
});
