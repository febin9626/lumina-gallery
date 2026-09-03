<div align="center">

# ✦ L U M I N A ✦
### Fine Art Photography Exhibition & Telemetry Archive

[![Live Exhibition](https://img.shields.io/badge/Live%20Exhibition-febin9626.github.io-gold?style=for-the-badge&logo=google-chrome&logoColor=black)](https://febin9626.github.io/lumina-gallery/)
[![Photographs](https://img.shields.io/badge/Photographs-400%2B%20Curated-black?style=for-the-badge&logo=unsplash&logoColor=gold)](https://febin9626.github.io/lumina-gallery/)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB%20Local-10b981?style=for-the-badge&logo=safari&logoColor=white)](https://febin9626.github.io/lumina-gallery/)
[![License](https://img.shields.io/badge/License-MIT-neutral?style=for-the-badge)](LICENSE)

*An ultra-clean, obsidian-themed digital darkroom showcasing high-fidelity photography, automated EXIF telemetry analysis, and museum-grade exhibition viewing.*

[**Explore Live Exhibition →**](https://febin9626.github.io/lumina-gallery/)

---

</div>

## 🌌 Overview

**Lumina Gallery** is a bespoke, luxury web application engineered for discerning photographers. Built with an obsidian darkroom palette (`#060608`), micro-fine borders, and gold accentuation, it provides a distraction-free environment for viewing high-resolution imagery with zero compression artifacts.

Every photograph is paired with complete camera telemetry—capturing camera make, body model, lens, aperture, shutter speed, ISO, and 35mm-equivalent focal length.

---

## ✨ Key Features

### 🏛️ Exhibition Lightbox & Zoom Inspector
* **Microscopic Inspection**: Continuous 1x to 4x pan-and-zoom inspection to examine sharpness, sensor grain, and micro-contrast.
* **14-Bit RAW Histogram**: Simulated real-time RGB histogram breakdown for tonal distribution analysis.
* **Telemetry HUD**: Detailed slide-out metadata drawer displaying shooting coordinates, timestamps, and equipment profiles.

### 📸 Curated 400+ Masterpiece Archive
Pre-seeded with 408 award-winning photographs spanning 7 photographic disciplines:
* 🏔️ **Landscape** (Dolomites, Geirangerfjord, Patagonia, Redwood mists)
* 🏮 **Street & Documentary** (Tokyo neon, Kyoto rain, Broadway canyons, Parisian bistros)
* 👤 **Fine Art Portraiture** (Studio chiaroscuro, artisan character studies, natural light)
* 🏛️ **Architecture** (Calatrava curves, brutalist monoliths, spiral staircases)
* 🌌 **Astrophotography** (Milky Way arches, deep space nebulae, arctic auroras)
* 🐆 **Wildlife** (Snow leopards, breaching humpbacks, tundra foxes)
* 🎨 **Fine Art & Abstract** (Braided glacial rivers, iridescent macro pigments)

Representing **24 iconic camera platforms** including *Hasselblad X2D 100C*, *Leica M11 Monochrom*, *Fujifilm GFX 100 II*, *Phase One IQ4 150MP*, *Sony α1*, *Canon EOS R5*, and *Nikon Z9*.

### ⚡ Lossless Local Database (IndexedDB)
* **Zero Storage Caps**: Bypasses the 5MB browser quota limitations using native browser IndexedDB (`LuminaGalleryDB`).
* **Offline First**: All images, custom uploads, and camera telemetry are persisted offline on your device.
* **Auto-Sync Engine**: Upgrades existing visitor databases automatically without overwriting custom uploads.

### 📥 1-Click Cross-Device Archive Sync
* **Export Portfolio (Download)**: Generates a single `.json` package containing all uploaded shots, custom EXIF data, and 5-star ratings.
* **Import Portfolio (Upload)**: Seamlessly load an archive file on your phone, iPad, or another computer in seconds with zero cloud friction.

### 🎛️ Three Curated Layout Perspectives
* **Masonry Flow**: Natural organic vertical staggering honoring individual image aspect ratios.
* **Editorial 2-Column**: Large format magazine spreads with prominent typography.
* **Compact Minimalist Grid**: High-density square grid for rapid portfolio scanning.

---

## ⌨️ Exhibition Keyboard Navigation

| Key | Action |
| :---: | :--- |
| `←` / `→` | Navigate Previous / Next photograph in Lightbox |
| `ESC` | Close Lightbox or Upload Studio modal |
| `F` | Toggle Fullscreen exhibition mode |
| `Z` | Toggle 220% precision 1:1 zoom inspection |
| `I` | Toggle Telemetry & EXIF metadata slide drawer |
| `L` | Favorite / Unfavorite current photograph |
| `U` | Quick launch Upload Studio (from main gallery) |

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla ECMAScript Modules (`ESM`) — zero build tools, bundlers, or compilation latency.
* **Styling**: Tailwind CSS CDN + bespoke CSS design system (`glass-panel`, `glass-pill`, subtle ambient glows).
* **Storage**: Browser IndexedDB API via native promise-based wrapper.
* **Metadata Engine**: Client-side binary EXIF parser decoding JPEG APP1 markers and TIFF tags.
* **Icons**: [Lucide Icons](https://lucide.dev/) vector library.
* **Hosting**: GitHub Pages globally distributed edge CDN.

---

## 🚀 Getting Started Locally

Clone the repository and spin up a lightweight local server:

```bash
# Clone repository
git clone https://github.com/febin9626/lumina-gallery.git

# Navigate into directory
cd lumina-gallery

# Start with Python
python -m http.server 8000
```

Then visit `http://localhost:8000` in any modern web browser.

---

## 👤 Author

**Febin**
* GitHub: [@febin9626](https://github.com/febin9626)
* Exhibition: [febin9626.github.io/lumina-gallery](https://febin9626.github.io/lumina-gallery/)

---

<div align="center">
  <sub>Engineered with precision for the art of photography. ✦ 2026</sub>
</div>
