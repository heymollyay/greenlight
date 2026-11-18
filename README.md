# GreenLight website

Static site for GreenLight, a student carpooling service at William & Mary. It has no build step.

## Run it locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. Opening `index.html` directly works too, but the hero video and saved rides behave best when served.

## Where things live

| What | Where |
| --- | --- |
| Page content and sections | `index.html` |
| Colors, fonts, layout | `css/styles.css` (brand tokens are at the top under `:root`) |
| Menu, destinations, route map, ride board | `js/app.js` |
| Chip-in guide ($10/hour, $5 minimum) | `CHIP_IN` constant at the top of `js/app.js` |
| Sample rides on the board | `seedRides()` in `js/app.js` |
| Web-ready images and video | `assets/` (generated from the originals in `Media/`) |

## To fill in before launch

- **About/Team**: replace the placeholder names, roles and bios.
- **FAQ**: review the answers, especially payment, insurance and eligibility.
- **Contact email**: `hello@greenlight.example` is a placeholder.
- **Ride board**: it's a demo that saves rides to the visitor's own browser (`localStorage`). Real accounts, @wm.edu verification and shared rides need a backend. Swap `RideStore` in `js/app.js` for API calls.
