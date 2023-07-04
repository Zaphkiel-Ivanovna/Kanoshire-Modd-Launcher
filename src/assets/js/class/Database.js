function genKey(int) {
  let key = 0;
  [...int].forEach((c) => {
    key = Math.imul(key, 31) + c.charCodeAt(0);
    key = key < 0 ? key + 0xFFFFFFFF + 1 : key; // replace bitwise operation
  });
  return key;
}

class Database {
  init() {
    return new Promise((resolve) => {
      const request = indexedDB.open('database', 1);
      const objectStores = [
        'accounts',
        'accounts-selected',
        'java-path',
        'java-args',
        'launcher',
        'profile',
        'ram',
      ];

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        objectStores.forEach((os) => {
          if (!db.objectStoreNames.contains(os)) {
            db.createObjectStore(os, { keyPath: 'key' });
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this);
      };
    });
  }

  add(data, type) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(type);
      const request = store.add({ key: genKey(data.uuid), value: data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  get(keys, type) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(type);
      const Key = genKey(keys);
      const get = store.get(Key);
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
  }

  getAll(type) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(type);
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    });
  }

  update(data, type) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(type);
      const keyCursor = store.openCursor(genKey(data.uuid));
      keyCursor.onsuccess = (event) => {
        const cursor = event.target.result;
        cursor.value.value = data;
        const request = cursor.update(cursor.value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };
    });
  }

  delete(key, type) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(type);
      const request = store.delete(genKey(key));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getStore(type) {
    return this.db.transaction(type, 'readwrite').objectStore(type);
  }
}

export default new Database();
