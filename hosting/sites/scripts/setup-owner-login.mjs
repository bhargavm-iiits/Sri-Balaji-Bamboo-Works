import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {hashPassword} from '../server/security.mjs';

const emailIndex=process.argv.indexOf('--email');
const email=process.argv[emailIndex+1]?.trim().toLowerCase();
if(emailIndex<0||!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Run: node scripts/setup-owner-login.mjs --email owner@example.com');
const password=randomBytes(24).toString('base64url');
const passwordHash=await hashPassword(password);
await mkdir(new URL('../.private/',import.meta.url),{recursive:true});
await writeFile(new URL('../.private/owner-website-runtime.json',import.meta.url),JSON.stringify({OWNER_EMAIL:email,OWNER_PASSWORD_HASH:passwordHash},null,2)+'\n',{mode:0o600});
await writeFile(new URL('../.private/Owner-Website-Login.txt',import.meta.url),`PRIVATE OWNER WEBSITE SIGN-IN\n\nWebsite: https://www.balajibambooworks.com/owner\nOwner email: ${email}\nWebsite password: ${password}\n\nEnter your current 6-digit authenticator code as the third field. Use the authenticator account you already set up; its QR and secret have not changed.\n\nKeep this file private and save the password in your password manager. Do not upload it or paste it into chat. This password is separate from all other accounts.\n\nFor deployment, configure OWNER_PASSWORD_HASH from the adjacent private runtime JSON as a secret. Keep the existing ORDER_ENCRYPTION_KEY and OWNER_TOTP_SECRET unchanged.\n`,{mode:0o600});
console.log('Created private owner login instructions and password hash in .private. No password was printed.');
