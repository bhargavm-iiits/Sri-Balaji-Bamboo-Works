import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {hashOwnerPassword,encodeOwnerHash,base32} from '../backend/security.mjs';
if(!process.stdin.isTTY)throw new Error('Run this command yourself in an interactive terminal. Passwords are never read from command arguments.');
const directory=fileURLToPath(new URL('../.private/',import.meta.url));await mkdir(directory,{recursive:true});const target=path.join(directory,'production-secrets.env');
try{await access(target);throw new Error('Production secrets already exist. Back them up and follow the key rotation instructions before replacing them.');}catch(e){if(e.code!=='ENOENT')throw e;}
const hidden=new Writable({write(chunk,encoding,done){done();}});const reader=createInterface({input:process.stdin,output:hidden,terminal:true});
const ask=prompt=>new Promise(resolve=>{process.stdout.write(prompt);reader.question('',answer=>{process.stdout.write('\n');resolve(answer);});});
try{
 const password=await ask('Choose a NEW owner passphrase (at least 16 characters; input hidden): ');if(password.length<16||password.length>256)throw new Error('Choose a passphrase between 16 and 256 characters.');const confirmation=await ask('Repeat the passphrase (input hidden): ');if(password!==confirmation)throw new Error('Passphrases did not match. Nothing was saved.');
 const hash=encodeOwnerHash(await hashOwnerPassword(password));const mfa=base32(randomBytes(20)),key=randomBytes(32).toString('base64');const uri=`otpauth://totp/Sri%20Balaji%20Bamboo%20Works:Owner?secret=${mfa}&issuer=Sri%20Balaji%20Bamboo%20Works&algorithm=SHA1&digits=6&period=30`;
 await writeFile(target,`OWNER_PASSWORD_HASH='${hash}'\nOWNER_TOTP_SECRET=${mfa}\nORDER_ENCRYPTION_KEY=${key}\n`,{flag:'wx',mode:0o600});
 await writeFile(path.join(directory,'authenticator-setup.txt'),`PRIVATE — owner authenticator setup\n\nImport this setup key into your authenticator app:\n${mfa}\n\nOr import this standard authenticator URI using a trusted app:\n${uri}\n\nAccount: Sri Balaji Bamboo Works / Owner\n6 digits, SHA1, 30 seconds. Keep this setup key and the production encryption key in your private password manager. Never commit or upload this file.\n`,{flag:'wx',mode:0o600});
 console.log('Private setup saved in .private/production-secrets.env and .private/authenticator-setup.txt. No password or key was printed. Enter the individual values in your hosting secret settings; omit surrounding quotes. Back them up securely.');
}finally{reader.close();}
