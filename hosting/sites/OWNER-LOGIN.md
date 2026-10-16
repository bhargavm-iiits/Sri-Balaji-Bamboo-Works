# Direct owner website login

Owner login is at `/owner`, using the configured owner email, a dedicated website password, and the existing authenticator code. Customer pages do not link to this private inbox. No platform sign-in is used for owner authorization.

`OWNER_PASSWORD_HASH` is a required runtime secret for owner login. Generate a fresh independent password locally:

```text
node scripts/setup-owner-login.mjs --email owner@example.com
```

The command writes the random password only to ignored `.private/Owner-Website-Login.txt` and the hash to ignored `.private/owner-website-runtime.json`. It prints neither value. Configure the hash through the hosting secret mechanism, preserving the existing owner email, order encryption key and authenticator secret. Publish the tested saved release to activate the runtime change. Never copy `.private` into an archive or repository.

The password is salted with 128 random bits and hashed using scrypt (N=32768, r=8, p=3, 64-byte output, 64 MiB memory ceiling). Generated passwords have 192 bits of entropy. Login requires both the password and a valid unreplayed TOTP. Requests have persistent rate limits and same-origin enforcement. Hosted sessions use a Secure, HttpOnly, SameSite=Strict, host-only cookie, are stored only as hashes, and expire after 30 minutes. Replacing the password hash invalidates existing sessions; logout revokes the current session. Old platform-based sessions are not accepted.

Password recovery/rotation is an administrator action using this local command and a hosting secret update; there is no public password-reset or account-signup endpoint. Rotating the website password does not rotate the order encryption key or authenticator. Keep backups private. A failed sign-in never confirms whether the email, password or code was incorrect.
