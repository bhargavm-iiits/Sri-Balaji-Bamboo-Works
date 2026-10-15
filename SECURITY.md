# Security model

Orders are encrypted at rest with AES-256-GCM, a fresh random 96-bit nonce per write, a 128-bit authentication tag and fixed application-specific authenticated context. Existing plaintext order files migrate atomically on startup. Wrong keys and tampered ciphertext fail closed. Production requires a separately managed AES key; local keys remain outside the public directory. Encryption does not protect against an attacker who controls both the running server and its keys.

Production owner access requires a salted scrypt hash (N=131072, r=8, p=1) and six-digit TOTP. Expired and reused authenticator codes are rejected within the running process. Password verification is asynchronous and concurrency-limited. Random session credentials use HttpOnly, SameSite=Strict cookies, Secure on HTTPS, with a 30-minute absolute expiry. Restarts revoke sessions. Legacy local credentials are for local development only. A public phone number does not grant owner access.

Customer order access requires a random private tracking key, stored only as a hash on the server. Tracking URLs carry the key in the fragment and remove it after import. Keys are saved in the customer's browser and are not included in WhatsApp alerts. A compromised browser can read its saved keys; keep private links private.

Approval, the immutable final total, customer payment reporting and owner receipt verification are separate server-enforced states. Customers cannot approve requests or mark them paid. Screenshots and transaction references are not bank verification. No payment gateway or automated bank receipt check is claimed.

The server applies mutation-origin validation, body/header limits, owner login throttling, request limits, timeouts and server-side selection validation. Browser protections include CSP, no-referrer, no-sniff, frame protection and restricted permissions. Production requires HTTPS hosting. Google Fonts is an optional browser resource with local fallbacks.

Private keys, passwords, order records, logs and QA fixtures are excluded from Git, Docker build contexts and release packages. Public contact information and the merchant UPI QR are intentional business assets. Secrets never belong in frontend configuration.

Storage supports one Node process and one persistent disk. Sessions, replay tracking and throttles are process-local. A distributed deployment needs shared transactional storage and session/rate-limit handling. Configure platform monitoring and appropriate traffic protection. No claim of absolute security, penetration-test certification, regulatory compliance or independent audit is made.

Report vulnerabilities privately to balajibambooworks@gmail.com. Do not publish secrets or customer data in GitHub issues, and obtain authorization before testing live payments or causing external messages.

References: [OWASP cryptographic storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238).
