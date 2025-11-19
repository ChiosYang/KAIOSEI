/**
 * Polyfill Web Storage APIs (localStorage/sessionStorage) for the Node runtime.
 * Node 20+ exposes a placeholder object for these globals, but without the
 * standard methods. Some dependencies only guard on the existence of the
 * global, so we provide a minimal in-memory implementation to avoid crashes.
 */

type SupportedStorage = "localStorage" | "sessionStorage";

interface StorageShape {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

function createMemoryStorage(): StorageShape {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

function needsPolyfill(storage: unknown): boolean {
  if (!storage) {
    return true;
  }

  const candidate = storage as Partial<StorageShape>;
  return typeof candidate.getItem !== "function" || typeof candidate.setItem !== "function";
}

function ensureStorage(name: SupportedStorage) {
  if (typeof globalThis === "undefined") {
    return;
  }

  const current = (globalThis as Record<string, unknown>)[name];
  if (needsPolyfill(current)) {
    (globalThis as Record<string, unknown>)[name] = createMemoryStorage();
  }
}

// Only patch when rendering on the server (window is undefined).
if (typeof window === "undefined") {
  ensureStorage("localStorage");
  ensureStorage("sessionStorage");
}
