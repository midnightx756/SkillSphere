/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {setGlobalOptions} = require("firebase-functions");
// const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
// setGlobalOptions({maxInstances: 10});

// functions/index.js
// Remove: const functions = require("firebase-functions");

// Add these 2nd Gen specific imports at the top
// const {onAfterCreate} = require("firebase-functions/v2/auth");
// const functions = require("firebase-functions");
const {onUserCreated} = require("firebase-functions/v2/auth");
const {onObjectFinalized, onObjectDeleted} = require("firebase-functions/v2/storage");

const admin = require("firebase-admin");
admin.initializeApp();// Don't forget this!

// Quota for each user (5 GB)
const USER_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// Function to create a storage stats document for new users
// exports.initializeUserStorageStats = functions.auth.user().onCreate(async (user) => { ... });
exports.initializeUserStorageStats = onUserCreated(async (event) => {
  const user = event.data; // The user object is now in event.data
  const userRef = admin.firestore().collection("userStorageStats").doc(user.uid);
  try {
    await userRef.set({
      totalBytesUsed: 0,
      quotaLimitBytes: USER_STORAGE_QUOTA_BYTES,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Initialized storage stats for user: ${user.uid}`);
  } catch (error) {
    console.error(`Error initializing storage stats for user ${user.uid}:`, error);
  }
});


// ... (admin.initializeApp() and USER_STORAGE_QUOTA_BYTES from above) ...

// Function to enforce storage quota on new file uploads
// exports.enforceStorageQuota = functions.storage.object().onFinalize(async (object) => {
exports.enforceStorageQuota = onObjectFinalized(async (event) => {
  const object = event.data;
  const filePath = object.name; // Full path to the file
  const fileSize = object.size ? parseInt(object.size) : 0; // Size of the uploaded file

  // Extract userId from the file path (e.g., 'users/UID/myimage.jpg')
  const pathParts = filePath.split("/");
  if (pathParts[0] !== "users" || !pathParts[1]) {
    console.log(`File not in a user folder, skipping quota check: ${filePath}`);
    return null;
  }
  const userId = pathParts[1];

  if (!userId || fileSize === 0) {
    console.log(
        `Missing userId or zero file size for path: ${filePath}, skipping quota enforcement.`,
    );
    return null;
  }

  const userStatsRef = admin.firestore().collection("userStorageStats").doc(userId);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(userStatsRef);

      if (!doc.exists) {
        console.warn(
            `User storage stats document not found for user: ${userId}. Creating one.`,
        );
        // If doc doesn't exist (e.g., for existing users before this function was deployed),
        // initialize it. This part handles legacy users or race conditions.
        transaction.set(userStatsRef, {
          totalBytesUsed: fileSize, // Start with this file's size
          quotaLimitBytes: USER_STORAGE_QUOTA_BYTES,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        return;
      }

      const {totalBytesUsed, quotaLimitBytes} = doc.data();
      const newTotalBytesUsed = totalBytesUsed + fileSize;

      if (newTotalBytesUsed > quotaLimitBytes) {
        console.warn(
            `User ${userId} exceeded quota! File ${filePath} (size: ${fileSize} bytes) will be deleted.`,
        );
        // Delete the file from Cloud Storage
        await admin.storage().bucket(object.bucket).file(filePath).delete();
        // Optionally update Firestore to mark user as over quota or send notification
        transaction.update(userStatsRef, {
          status: "over_quota_after_upload",
          lastAttemptedUploadSize: fileSize,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Update the total bytes used
        transaction.update(userStatsRef, {
          totalBytesUsed: newTotalBytesUsed,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`User ${userId} now using ${newTotalBytesUsed} bytes.`);
      }
    });
    return null;
  } catch (error) {
    console.error(
        `Error during quota enforcement for user ${userId}, file ${filePath}:`, error,
    );
    // Important: If an error occurs, the transaction will rollback,
    // but the file might remain if deletion happened before transaction failed.
    // Consider a retry mechanism or a separate cleanup function if this is critical.
    return null;
  }
});

// ... (admin.initializeApp() and USER_STORAGE_QUOTA_BYTES from above) ...

// Function to adjust storage quota on file deletions
exports.adjustStorageQuota = onObjectDeleted(async (event) => {
  const object = event.data;
  const filePath = object.name; // Full path to the file
  const fileSize = object.size ? parseInt(object.size) : 0; // Size of the deleted file

  // Extract userId from the file path
  const pathParts = filePath.split("/");
  if (pathParts[0] !== "users" || !pathParts[1]) {
    console.log(
        `File not in a user folder, skipping quota adjustment: ${filePath}`,
    );
    return null;
  }
  const userId = pathParts[1];

  if (!userId || fileSize === 0) {
    console.log(`Missing userId or zero file size for path: ${filePath}, skipping quota adjustment.`);
    return null;
  }

  const userStatsRef = admin.firestore().collection("userStorageStats").doc(userId);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(userStatsRef);

      if (!doc.exists) {
        console.warn(
            `User storage stats document not found for user: ${userId}. Cannot adjust quota.`,
        );
        return; // Nothing to adjust if stats don't exist
      }

      const {totalBytesUsed} = doc.data();
      // Ensure it doesn't go below 0
      const newTotalBytesUsed = Math.max(0, totalBytesUsed - fileSize);

      transaction.update(userStatsRef, {
        totalBytesUsed: newTotalBytesUsed,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(
          `User ${userId} now using ${newTotalBytesUsed} bytes after deletion of ${filePath}.`,
      );
    });
    return null;
  } catch (error) {
    console.error(
        `Error during quota adjustment for user ${userId}, file ${filePath}:`, error,
    );
    return null;
  }
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
