# Sri Balaji Bamboo Works

Bilingual bamboo catalogue and owner-approved ordering for the workshop at 5, Garden Road, Shidlaghatta, Chikkaballapur, Karnataka 562105. Public contact: +91 95914 57484, balajibambooworks@gmail.com.

The storefront includes 24 products in nine collections, English/Kannada search, category filters, range/pair/ladder pricing, local shopping bags, customer request tracking, a protected owner inbox and approved-order UPI payment. Product photographs show the actual collection; selected images are enhanced or cropped, and the Small Basket photograph is explicitly representative. Final specifications, units, availability and delivery are confirmed with the owner.

## Run locally

Requires Node.js 24. No runtime dependencies are installed.

```powershell
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm start
```

Open http://localhost:4173/. Owner sign-in is /owner; customer tracking is /orders. A local first run creates private development access and encryption-key files under .private. Existing local plaintext requests are migrated atomically to authenticated AES-256-GCM storage. Keep the key safe. Opening HTML files directly supports catalogue viewing only; order approval requires the backend.

## Source layout

- dist/app.js, catalogue.js, prices.js and store.js: views, bilingual catalogue and quotation logic.
- dist/order-flow.js: customer tracking, owner review, approval and payment-reference submission.
- dist/landing.js, motion.js and CSS: bamboo landing animation, scrolling journey, photo depth and reduced-motion controls.
- backend/: encrypted storage, owner authentication/MFA and optional WhatsApp alerts.
- server.mjs: protected order API and pre-rendered page delivery.
- build-offline.mjs and scripts/prerender.mjs: offline entry points plus 40 public crawlable pages, metadata and sitemap.
- tests/: catalogue, pricing, motion, order API, encryption, MFA and SEO regression tests.

Edit source modules and shell.html, then rebuild. dist/index.html, offline.html, .pages and seo-manifest.json are generated. Owner-supplied values and units are documented in PRICE-LIST.md.

## Ordering and payment

A submitted request waits for owner approval. The owner confirms the final amount including delivery, then the customer's Confirm & pay button opens the merchant QR. UPI payments happen outside the website. A submitted reference remains unverified until the owner checks actual receipt. No payment gateway or automatic bank confirmation is present.

Automatic WhatsApp owner alerts are disabled until the server has a configured Meta sender, secret token and approved template. The manual notification button prepares a message to the owner; the customer sends it. See ORDER-WORKFLOW.md.

## Production

Use the prepared Render Blueprint and Dockerfile with a persistent private disk. Fresh production access requires a strong scrypt hash, an authenticator secret, a separately backed-up AES key and an actual public HTTPS origin. Generate secrets yourself with npm run security:setup, then enter them privately in the hosting account. Never commit .env, .private or customer data.

The requested canonical domain is https://www.balajibambooworks.com. It must be registered and verified before use. Temporary hosting is excluded from search indexing by default. Domain registration, DNS changes and live cloud deployment are not implied by the presence of configuration files.

See DEPLOYMENT.md for Render, DNS, Search Console and rollback steps, and SECURITY.md for the security model and remaining operational limits. One process and one persistent disk are supported; distributed writes require a transactional database redesign. No first-position Google ranking or absolute-security guarantee is made.
