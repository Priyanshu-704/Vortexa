import mongoose from 'mongoose';
import { MONGO_URI } from './config';
import { User } from './db';

async function main() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({});
  console.log('--- USERS IN MONGO ---');
  for (const u of users) {
    console.log(`Username: ${u.username} | Email: ${u.email} | Status: ${u.status} | Code: ${u.verification_code}`);
  }
  await mongoose.disconnect();
}

main().catch(console.error);
