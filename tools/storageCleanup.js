/**
 * Storage cleanup helper (run manually or adapt into a Cloud Function).
 *
 * What it does:
 * 1) Deletes any file older than MAX_AGE_DAYS.
 * 2) Deletes orphaned feed uploads (no matching feed doc mediaUrl/thumbnail).
 *
 * Requirements:
 * - npm install firebase-admin
 * - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON with
 *   storage + firestore read/write.
 *
 * Usage:
 *   node tools/storageCleanup.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ---- CONFIGURE THESE ----
const PROJECT_ID = 'footyfeverz-599b3';
const BUCKET = 'footyfeverz-599b3.firebasestorage.app';
const MAX_AGE_DAYS = 90;
// -------------------------

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
  process.exit(1);
}

initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  projectId: PROJECT_ID,
  storageBucket: BUCKET,
});

const db = getFirestore();
const bucket = getStorage().bucket();

const isOld = (timeCreated) => {
  const ageMs = Date.now() - new Date(timeCreated).getTime();
  return ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
};

async function fetchFeedUrls() {
  const snap = await db.collection('feed').get();
  const urls = new Set();
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.mediaUrl) urls.add(d.mediaUrl);
    if (d.thumbnail) urls.add(d.thumbnail);
  });
  return urls;
}

async function main() {
  const feedUrls = await fetchFeedUrls();
  const [files] = await bucket.getFiles();
  let deleted = 0;

  for (const file of files) {
    const { timeCreated, name, metadata = {} } = file;
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
      name
    )}?alt=media`;

    const tooOld = isOld(timeCreated);
    const orphaned = !feedUrls.has(publicUrl);

    if (tooOld || orphaned) {
      try {
        await file.delete();
        deleted += 1;
        console.log('Deleted', name, tooOld ? '[old]' : '[orphan]');
      } catch (err) {
        console.warn('Failed to delete', name, err.message);
      }
    }
  }

  console.log(`Done. Deleted ${deleted} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
