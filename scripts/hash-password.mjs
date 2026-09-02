import { hash } from '@node-rs/argon2';

const password = process.argv[2];

if (!password) {
	console.error('Usage: pnpm hash:password "your-password"');
	process.exit(1);
}

const hashed = await hash(password);
console.log(hashed);
