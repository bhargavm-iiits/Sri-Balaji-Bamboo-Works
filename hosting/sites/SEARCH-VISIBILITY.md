# Search visibility: Sri Balaji Bamboo Works

Primary public address: https://www.balajibambooworks.com/.

## Implemented search setup

The 40 public routes are rendered as HTML before JavaScript: seven information/catalogue pages, nine collection pages and 24 product pages. `public/search-content.js` is the shared source for page titles, descriptions, canonical origin, structured data and visible buying guidance. `npm run build` first runs `scripts/enrich-seo.mjs` to update the server page map. Edit shared content, not the generated JSON alone.

All three public hostnames point search engines to the www .com canonical URL. This consolidates metadata without redirecting cart, order tracking or owner sessions between origins. Relative customer navigation and API calls retain their current origin. The sitemap always lists the www URLs, with product image locations. No invented modification dates, reviews, stock status, opening hours or delivery coverage are included.

Product schema retains the owner's price ranges and confirmed units. Products without confirmed units and representative-photo products omit offers. These are requests subject to workshop approval; structured data does not make the site eligible for every shopping feature. Confirm shipping, returns, availability and any remaining unit details before expanding merchant claims.

Private owner, cart, checkout, payment and order pages remain noindex. Staging with `INDEXING_ENABLED=false` remains noindex after client navigation. Invalid product/category paths return 404 and stay noindex. Never add owner links, credentials or customer details to search content, sitemaps or screenshots.

## Google status recorded 16 October 2026

The www property was verified in Google Search Console. Google processed the 40-URL sitemap successfully, and accepted the homepage indexing request. Acceptance is not proof that pages are indexed or ranked. The earlier report and screenshots are under ignored `qa/com-seo-report.md` and `qa/com-*.jpg`.

The updated sitemap uses the same submitted URL; Google can fetch changes there. Do not repeatedly request indexing, automate bulk URL submissions or claim a guaranteed crawl date or first position.

## Business actions that require the owner's facts/access

- Claim or verify the real Google Business Profile, if not already managed by the owner, and add the exact www website, business name, public phone and address. Enter opening hours only when confirmed. Do not create duplicate listings.
- Keep authentic product photos and descriptions current; confirm measurements, remaining price units, availability, delivery and returns with the workshop. Preserve Kannada labels supplied by the owner.
- Ask actual customers for honest reviews through the business's own channels. Never buy reviews, links, traffic or guaranteed ranking services.
- Review Search Console indexing, query impressions and clicks after Google has crawled the release. Compare relevant product and Shidlaghatta/Chikkaballapur searches; a new site cannot be promised worldwide placement for the broad word “bamboo”.

## Validation and release

Run `node --test tests/*.test.mjs` and `npm run build`. Tests cover public HTML/assets, truthful schema, consistent canonicals across hostnames, protected workflows, encryption, password/MFA and indexing controls. Use the approved real browser to check client navigation, shop search/cart, mobile layout, guide disclosures and console errors. Never place live orders or make payments for SEO QA.

Production publication follows the project's `ecommerce-qa-deploy` approval gate. A saved Sites version is a prepared release; it is not automatically a staging or production deployment. Rollback to the prior saved version only with the existing environment secrets preserved, especially the order encryption and authenticator keys.
