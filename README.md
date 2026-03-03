# Build Digital Fitting Room MVP

A lightweight browser MVP for trying digital garments on a user-uploaded photo.

## What's included
- Upload a model photo.
- Choose one of multiple garment overlays.
- Adjust scale and vertical offset to align the garment.
- Download a composed preview image.

## Run locally
Because this is a static app, you can run it with any local file server:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173> in your browser.

## Files
- `index.html` — app structure and controls
- `styles.css` — layout and visual styling
- `app.js` — canvas rendering and fitting interactions
