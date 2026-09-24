import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore 
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance: Firestore;

try {
  // Use auto-detect long polling to prevent WebChannel/WebSocket disconnects in cloud iframe and proxy environments
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    config.firestoreDatabaseId || undefined
  );
} catch {
  // Fallback to existing or default instance if already initialized
  firestoreInstance = config.firestoreDatabaseId
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;

/**
 * Validate Firestore connection per Firebase integration guidelines
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || (error as any).code === 'unavailable')) {
      console.warn('Firestore is running in offline mode. Local cache active.');
    }
    return false;
  }
}

export default app;
