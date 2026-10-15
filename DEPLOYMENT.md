# Current public deployment

The requested free deployment is live on Sites at https://sri-balaji-bamboo-works.superolm64.chatgpt.site. Its maintained hosted source is in `hosting/sites/`, with a local working checkout at `../sites-deployment`. The Node/Render version remains available below as an alternative; no paid Render service or VPS was provisioned.

Hosted orders use D1 with authenticated AES-256-GCM encrypted documents. The private `/owner` portal uses the configured owner ChatGPT identity plus an authenticator code. The private authenticator setup file is stored only on this machine at `../sites-deployment/.private/Owner-Authenticator-Setup.txt`; never upload it. Runtime secrets are configured in Sites. Existing local orders remain in the local Node store and were not uploaded.

Platform quotas apply. A custom `balajibambooworks.com` domain still requires registration/ownership. Google submission status and release evidence are recorded in `../sites-deployment/qa/`.

---

# Render deployment

Requested address: **https://www.balajibambooworks.com**. Registration and ownership of this domain, hosting, and verification are separate from preparing this repository. No domain purchase or paid cloud resource has been created.

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
