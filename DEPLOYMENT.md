# Current public deployment

The public storefront is live at **https://www.balajibambooworks.com/**, with **https://balajibambooworks.com/** also serving the store. The owner registered the domain with GoDaddy; its DNS and both HTTPS certificates are active. Sites provides the hosting using the existing account. The original platform address remains available. Maintained hosted source is in `hosting/sites/`, with a local working checkout at `../sites-deployment`. The Node/Render version below is an alternative, not the active deployment; no paid Render service or VPS was provisioned.

Hosted orders use D1 with authenticated AES-256-GCM encrypted documents. The private `/owner` portal uses the owner's email, a dedicated website password and an authenticator code. It does not require a ChatGPT account. Password instructions are stored only on this machine at `../sites-deployment/.private/Owner-Website-Login.txt`; the existing authenticator setup is at `../sites-deployment/.private/Owner-Authenticator-Setup.txt`. Never upload these files. Runtime secrets are configured in Sites. Existing local orders remain in the local Node store and were not uploaded. See `hosting/sites/OWNER-LOGIN.md` for password provisioning and recovery.

Platform quotas apply. Google Search Console ownership for `https://www.balajibambooworks.com/` is verified, and its 40-URL sitemap has been submitted. Public pages allow indexing and emit canonical URLs and structured data for the preferred www .com origin. Private orders, owner routes, checkout and payment stay excluded from indexing. Google controls crawling, indexing and ranking; submission is not proof of search inclusion. Current submission status and release evidence are recorded in `../sites-deployment/qa/`.

Direct owner login was introduced in release version 3, source commit `f6948c06b17f4fe2167a2029bf56ef11ff7023fc`, with runtime environment revision 4 adding the `OWNER_PASSWORD_HASH` secret. The existing order encryption key, authenticator secret, owner email and .com Google verification value are preserved. A salted scrypt password hash and current authenticator code are both required. Host-only secure sessions expire after 30 minutes, logout revokes the session, password rotation invalidates old sessions, and prior platform-based sessions are rejected. Nine backend tests, the production build and real-browser direct sign-in/logout passed; release evidence is in `../sites-deployment/qa/`.

---

# Render deployment

The instructions below apply only if migrating to Render in the future. The requested .com address is already registered by the owner and connected to Sites; do not apply Render DNS targets to the active deployment. No paid Render resource has been created.

## Fresh production secrets

Run `npm ci --ignore-scripts` then `npm run security:setup` yourself in an interactive terminal. Choose a new passphrase of at least 16 characters that has never been shared in chat. Input is hidden. The command saves `.private/production-secrets.env` and `.private/authenticator-setup.txt`; neither is printed or committed.

Import the authenticator setup key into a trusted app. Back up the secrets privately in your password manager. Enter these values into Render's environment secret fields:

- `OWNER_PASSWORD_HASH`: the complete scrypt hash, without the file's surrounding single quotes. Production never needs the plaintext password.
- `OWNER_TOTP_SECRET`: the authenticator setup secret.
- `ORDER_ENCRYPTION_KEY`: the generated base64-encoded 256-bit AES key. Keep the same value across deployments. Losing it makes encrypted orders unreadable.

These are for a fresh production installation. Existing local orders use the matching key in the local `.private` folder. Never copy encrypted orders to a server using a different key. Data migration requires the matching key and a deliberate private transfer; do not put customer data or keys in Git or the release archive.

## Render account setup

1. Sign into your own [Render account](https://dashboard.render.com/) and connect this repository. Create a **Blueprint** from `render.yaml` on `main`.
2. Review and approve the paid web-service compute and 1 GB persistent-disk charges in Render. The prepared region is Singapore. Preparing the Blueprint does not purchase resources.
3. Supply the three private values above and `PUBLIC_SITE_URL`, which must be an actual public HTTPS origin. Initially this can be the assigned `https://...onrender.com` address. Use the hostname Render actually gives you.
4. Render builds/checks the Docker image, runs the Node server on port 10000 and mounts encrypted order storage at `/app/storage`. The application runs as the unprivileged `node` user after storage ownership is established. `/api/health` must pass.
5. Keep `INDEXING_ENABLED=false` for temporary/staging hosting. Automatic deploys are disabled. Choose reviewed commits manually after tests pass.
6. Test catalogue, owner password + authenticator login, one synthetic request, approval, private customer tracking, QR and separate receipt verification. Do not make real payments or send real messages during QA.

Production fails closed without the required secrets and public HTTPS origin. Keep one running process and one persistent disk. The local test suite is not evidence of a cloud deployment. If the image build or health check fails, fix it before switching DNS.

## Register and connect the requested domain

1. Register `balajibambooworks.com` with a registrar if available. Complete the purchase and account security yourself. If another person owns it, you must obtain ownership or choose another address.
2. Add `www.balajibambooworks.com` in Render's custom-domain settings. Render supplies the actual DNS instructions and handles the corresponding root-domain redirect.
3. At your DNS provider, set the `www` CNAME to the real Render service hostname. Follow its exact root-domain instructions; do not guess IPs or replace email MX records.
4. Wait for ownership verification and HTTPS. Set `PUBLIC_SITE_URL=https://www.balajibambooworks.com` and test all flows on that origin.
5. Enable `INDEXING_ENABLED=true` only after custom-domain verification and browser checks. Check `/robots.txt`, `/sitemap.xml`, canonical URLs and the private-page noindex headers.

Render handles TLS termination. HSTS, nonce-based CSP, frame protection and browser permissions headers are applied by the server. Secure your GitHub, registrar, DNS and hosting accounts with MFA as well.

## Google visibility

The build emits 40 crawlable public pages, unique metadata, canonical URLs, a sitemap and factual Store/Product structured data. Owner and customer workflows are excluded from the sitemap and marked noindex.

After the domain is live, verify ownership in [Google Search Console](https://search.google.com/search-console), submit `https://www.balajibambooworks.com/sitemap.xml`, and create or claim the real [Google Business Profile](https://www.google.com/business/) for the Shidlaghatta workshop. Confirm the address, contact details, genuine photos and actual opening hours. Request honest reviews and avoid duplicate profiles.

Nobody can guarantee first position for every bamboo query. Google considers relevance, location, competition and other ranking systems. Advertising does not guarantee organic first place or authorize unlimited spending.

## Backup and rollback

Back up encrypted order storage and the matching AES key separately. Test recovery on an isolated instance. Password/TOTP recovery requires privileged hosting access; no public reset endpoint exists.

Record the last working commit. Roll back application code through Render while retaining the same persistent disk and encryption key. Do not restore older order data over newer customer requests or recreate the disk/key as a troubleshooting shortcut.

Official references: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [disks](https://render.com/docs/disks), [custom domains](https://render.com/docs/custom-domains), [DNS](https://render.com/docs/configure-other-dns), [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [local ranking](https://support.google.com/business/answer/7091), [ranking guarantees](https://developers.google.com/search/docs/fundamentals/do-i-need-seo).

## Private owner management

Bookmark `/owner` on the running website. Customer navigation and offline bundles have no owner sign-in link, approval forms or owner API handlers. The backend serves the separate login page and only serves `/api/owner/app.js` after owner authentication. Owner approvals, declines and receipt verification require the owner session plus the normal same-origin checks. Customers only receive their own status and approved payment amount through their private tracking key. No URL secrecy is relied on for authorization.

After updating this release in Render, deploy the latest tested commit manually and check owner sign-in, one synthetic approval and the customer view. Preserve the existing storage disk and encryption key.


## Published search visibility update — version 4

The hosted source snapshot now includes shared metadata for 40 public routes, product and breadcrumb structured data, image sitemap entries, www canonical URLs and visible buying guidance. See `hosting/sites/SEARCH-VISIBILITY.md`. The user approved the tested release and it is now live, preserving the direct owner login.

Published Sites version 4: `appgprj_6ad0cac89864819188997387f6b5264e~appgver_295df79fc6688191a934d8cc4e01f9a1`, source `5076d131d0516dfdffa1fba18f5a8bbf7f1d5bf4`, native artifact `sha256:2add47a749f91bef62e3c7d1b85b194c3aa8e05ced9345dfa0edc6af3f21fc0f`. Twelve hosted-source tests and 45 local HTTP checks passed; the production build and targeted desktop/mobile Chromium checks passed. Deployment `appgdep_6ad1db5929988191af79e0d8f624bd16` succeeded after explicit approval, preserving environment revision 4. All 49 production HTTP checks and the live-browser guide check passed with zero recorded console errors. Private runtime secrets and the owner's password file are excluded from Git and public archives.
