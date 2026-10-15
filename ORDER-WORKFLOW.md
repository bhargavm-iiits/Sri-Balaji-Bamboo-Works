# Owner approval and customer payment

Run `npm start` from storefront and use http://localhost:4173/. This workflow requires the Node backend; opening HTML files directly supports catalogue browsing only.

1. Customer adds products and submits the checkout form. The backend validates the selection, calculates the catalogue estimate and saves a pending request.
2. The customer sees My orders. Automatic WhatsApp alerts are disabled until configured. The manual Notify owner on WhatsApp button prepares a message to 9591457484; the customer sends it. It contains the order reference and owner-inbox URL, never a password or customer tracking key.
3. Owner opens /owner and signs in. For this local installation, open `.private/owner-access.txt` on the server to obtain the generated password. This file is never served over HTTP or packaged with the website. Knowing the public phone number does not grant owner access.
4. Owner reviews customer details, specifications and availability; enters the final total including delivery and any applicable charges; then approves the request. Approval freezes the final total for this request. Pending requests can also be declined with a reason.
5. Customer returns using the same browser and selects My orders. The page refreshes status every 15 seconds while visible and on window focus. Other website pages show an approved-order banner on entry. Confirm & pay opens the QR with the owner-approved amount. Customers can save their private tracking link and open it on another device. No order lookup is granted using only a public phone number.
6. After paying externally, the customer submits their UPI reference. This changes the status to verification pending, never paid. The owner checks the actual merchant account receipt, then separately confirms payment received.

States: pending -> approved -> payment_reported -> paid. The owner may verify receipt directly from approved if they independently received the payment. Declining is available only while pending. No real payment is initiated by the server, and the static QR cannot provide automatic bank verification.

## Storage and access

Orders are saved in `.private/orders.json` using authenticated AES-256-GCM encryption and serialized atomic writes. Production passwords use strong salted scrypt hashes and require TOTP MFA. Owner sessions use HttpOnly, SameSite=Strict cookies with a 30-minute expiry; HTTPS configuration adds Secure. Sessions end on server restart. Customer tracking keys are random bearer credentials, saved in the browser and hashed in server storage. Keep private links private. Server APIs check authentication, request origin, size limits, order state and basic rate limits. Credentials and order data stay outside dist, Git and the portable website ZIP.

The current backend is for one running Node process with local persistent storage. Before an actual public release, configure HTTPS, the public origin, a strong OWNER_PASSWORD_HASH plus OWNER_TOTP_SECRET and ORDER_ENCRYPTION_KEY and durable private storage/backups on the hosting server. Do not run multiple independent copies against the same JSON store. There has been no production deployment.

## Automatic owner WhatsApp alerts — setup

The integration is prepared but **not connected**. No WhatsApp message was sent during development or QA.

1. Use Meta for Developers / WhatsApp Business Platform to set up a WhatsApp Cloud API app and sender. Begin with Meta's test sender and explicitly verified test recipients. Recipient for these owner alerts is +91 95914 57484. Use a sender that can message this owner recipient; do not assume the same phone account can send an alert to itself, or migrate your existing app number without checking Meta's supported setup.
2. Obtain the sender **Phone Number ID**, a server access token with `whatsapp_business_messaging` permission and a currently supported Graph API version from your Meta API setup. Keep these on the server. Never paste the access token into chat or frontend configuration.
3. Create an appropriate Meta-approved template with two positional body parameters. Suggested body for Meta review: `New order request {{1}}. Review availability and final pricing in the owner inbox: {{2}}`. Parameter 1 is the order reference; parameter 2 is the owner inbox URL. The integration expects exactly these two body parameters and the configured language. Template approval and pricing are controlled by Meta.
4. Once the website has an approved public HTTPS deployment, copy `.env.example` to `.env` privately on its server. Set PUBLIC_SITE_URL to the site's origin, e.g. `https://your-domain.example` (no path, query or fragment). Configure the required production access secrets from DEPLOYMENT.md, then set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, WHATSAPP_OWNER_TEMPLATE and the template language. Set WHATSAPP_NOTIFICATIONS_ENABLED=true only when ready to send alerts to the owner. Restart the Node server to load changes.
5. With your own approved test recipient and authorization, test one synthetic submission. Provider acceptance is displayed as **submitted to the provider, delivery not verified**. There is no delivery webhook in this release. Failures retain the request in the owner inbox and offer manual notification. Duplicate retries do not send a second alert. A customer’s transaction reference does not trigger an automatic receipt confirmation.

`localhost` links cannot be opened from another person's phone. The owner and customers need access to the same published backend for real use. A static-only website host cannot run this workflow. Public hosting and account onboarding have not been performed.

Official references: [Meta WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [Meta message templates](https://whatsappbusiness.com/blog/manage-message-templates-whatsapp-business-api/), [Meta send-message endpoint](https://www.postman.com/meta/whatsapp-business-platform/request/8gvd47s/send-text-message).
