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
import { Product, Supplier, SupplierQuote, AppSettings, DEFAULT_APP_SETTINGS } from '../types';

// Helper to remove undefined properties before saving to Firestore
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

const PRODUCTS_COLLECTION = 'products';
const SUPPLIERS_COLLECTION = 'suppliers';
const SETTINGS_COLLECTION = 'settings';
const APP_CONFIG_DOC_ID = 'app_config';

/**
 * Subscribe to real-time updates for products
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
      console.error('Realtime products listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time updates for suppliers
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
      console.error('Realtime suppliers listener error:', err);
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
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Delete a product from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}

/**
 * Save or update a supplier in Firestore
 */
export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  const docRef = doc(db, SUPPLIERS_COLLECTION, supplier.id);
  const cleanData = sanitizeForFirestore(supplier);
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Delete a supplier from Firestore
 */
export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const docRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  await deleteDoc(docRef);
}

/**
 * Bulk save products and suppliers into Firestore (e.g. after Excel import)
 */
export async function batchSaveToFirestore(
  products: Product[],
  suppliers: Supplier[]
): Promise<void> {
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
}

/**
 * Check if database has any existing data; if not, seed with initial data
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
    console.error('Failed to seed initial Firestore data:', err);
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
        // Document does not exist yet, fallback to default
        onUpdate(DEFAULT_APP_SETTINGS);
      }
    },
    (err) => {
      console.error('Realtime settings listener error:', err);
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
  await setDoc(docRef, cleanData, { merge: true });
}
