# RIVAL — Production Polish

## Jersey image
Place the supplied jersey image at:

`assets/jersey.jpg`

The site uses that file for the primary Nova United jersey on the home, shop, and product pages. JPG, PNG, or WebP can be used, but if you choose another filename/extension, update the `assets/jersey.jpg` references in the HTML.

A local `assets/jersey-placeholder.svg` is included so a missing/broken jersey asset does not create a broken-image UI.

## Run locally
Open `index.html` through a local static server for the most reliable browser behavior.

Examples:
- VS Code Live Server
- `python -m http.server 8000`

Then visit `http://localhost:8000/`.

## Files
- `index.html` — home page
- `shop.html` — collection, filters, sorting, quick add
- `product.html` — product gallery, sizes, quantity, cart
- `about.html` — brand/about page
- `contact.html` — contact form
- `brand.css` — styling and responsive polish
- `main.js` — dependency-free site behavior
- `assets/jersey.jpg` — required supplied jersey asset
- `assets/jersey-placeholder.svg` — safe fallback

## Notes
The contact form currently validates and shows a success state in the browser; it does not transmit data to a server. Checkout similarly needs a real payment/order backend before accepting live payments.
