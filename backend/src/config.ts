import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const JWT_SECRET = process.env.JWT_SECRET || 'vortexa_default_super_secret_key_change_me_in_prod';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vortexa_default_refresh_secret_key_change_me_in_prod';

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vortexa';

export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vortexa_encryption_32_byte_key_!@#'; // 32 bytes for AES-256

if (NODE_ENV === 'production') {
  if (JWT_SECRET === 'vortexa_default_super_secret_key_change_me_in_prod' ||
      JWT_REFRESH_SECRET === 'vortexa_default_refresh_secret_key_change_me_in_prod') {
    console.warn('[WARNING] Using insecure default secrets in production! Set JWT_SECRET and JWT_REFRESH_SECRET env variables.');
  }
  if (ENCRYPTION_KEY === 'vortexa_encryption_32_byte_key_!@#') {
    console.warn('[WARNING] Using insecure default encryption key in production! Set ENCRYPTION_KEY env variable.');
  }
}
