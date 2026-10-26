import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

let r2ClientInstance = null;

export function getR2Client() {
  if (r2ClientInstance) return r2ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('⚠️ Cloudflare R2 credentials missing. Running in local fallback mode.');
    return null;
  }

  r2ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2ClientInstance;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'musicapp';
export const R2_PREFIX = process.env.R2_DATA_PREFIX || 'leadspro/';

export default getR2Client;
