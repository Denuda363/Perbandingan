import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Supplier, AppSettings, DEFAULT_APP_SETTINGS } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to remove undefined properties before saving to Firestore
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

const PRODUCTS_COLLECTION = 'products';
const SUPPLIERS_COLLECTION = 'suppliers';
const SETTINGS_COLLECTION = 'settings';
const APP_CONFIG_DOC_ID = 'app_config';

/**
 * Subscribe to real-time updates for products with offline fallback
 */
export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Product;
        items.push({
          ...data,
          id: docSnap.id,
          quotes: Array.isArray(data.quotes) ? data.quotes : [],
        });
      });
      onUpdate(items);
    },
    (err) => {
      const isOfflineOrUnavailable = 
        err.code === 'unavailable' || 
        err.message.includes('offline') || 
        err.message.includes('Could not reach Cloud Firestore');

      if (isOfflineOrUnavailable) {
        console.info('Products sync operating in local offline mode.');
      } else {
        console.error('Realtime products listener error:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time updates for suppliers with offline fallback
 */
export function subscribeToSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, SUPPLIERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Supplier;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (err) => {
      const isOfflineOrUnavailable = 
        err.code === 'unavailable' || 
        err.message.includes('offline') || 
        err.message.includes('Could not reach Cloud Firestore');

      if (isOfflineOrUnavailable) {
        console.info('Suppliers sync operating in local offline mode.');
      } else {
        console.error('Realtime suppliers listener error:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a single product in Firestore
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const cleanData = sanitizeForFirestore(product);
  try {
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

/**
 * Delete a product from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Save or update a supplier in Firestore
 */
export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  const docRef = doc(db, SUPPLIERS_COLLECTION, supplier.id);
  const cleanData = sanitizeForFirestore(supplier);
  try {
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SUPPLIERS_COLLECTION}/${supplier.id}`);
  }
}

/**
 * Delete a supplier from Firestore
 */
export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const docRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUPPLIERS_COLLECTION}/${supplierId}`);
  }
}

/**
 * Bulk save products and suppliers into Firestore (e.g. after Excel import)
 */
export async function batchSaveToFirestore(
  products: Product[],
  suppliers: Supplier[]
): Promise<void> {
  try {
    const batch = writeBatch(db);

    products.forEach((p) => {
      const pRef = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(pRef, sanitizeForFirestore(p), { merge: true });
    });

    suppliers.forEach((s) => {
      const sRef = doc(db, SUPPLIERS_COLLECTION, s.id);
      batch.set(sRef, sanitizeForFirestore(s), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batchSaveToFirestore');
  }
}

/**
 * Check if database has any existing data; if not, seed with initial data safely
 */
export async function seedInitialDataIfEmpty(
  initialProducts: Product[],
  initialSuppliers: Supplier[]
): Promise<boolean> {
  try {
    const pSnapshot = await getDocs(query(collection(db, PRODUCTS_COLLECTION), limit(1)));
    const sSnapshot = await getDocs(query(collection(db, SUPPLIERS_COLLECTION), limit(1)));

    if (pSnapshot.empty && sSnapshot.empty) {
      console.log('Firestore is empty. Seeding initial products and suppliers...');
      await batchSaveToFirestore(initialProducts, initialSuppliers);
      return true;
    }
    return false;
  } catch (err) {
    console.info('Note: Seed skipped or running in offline mode:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Subscribe to real-time updates for application settings (PPN, margin)
 */
export function subscribeToSettings(
  onUpdate: (settings: AppSettings) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AppSettings>;
        onUpdate({
          ...DEFAULT_APP_SETTINGS,
          ...data,
        });
      } else {
        onUpdate(DEFAULT_APP_SETTINGS);
      }
    },
    (err) => {
      const isOfflineOrUnavailable = 
        err.code === 'unavailable' || 
        err.message.includes('offline') || 
        err.message.includes('Could not reach Cloud Firestore');

      if (isOfflineOrUnavailable) {
        console.info('Settings sync operating in local offline mode.');
      } else {
        console.error('Realtime settings listener error:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Save application settings (PPN & Margin) to Firestore
 */
export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, APP_CONFIG_DOC_ID);
  const cleanData = sanitizeForFirestore(settings);
  try {
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${APP_CONFIG_DOC_ID}`);
  }
}
