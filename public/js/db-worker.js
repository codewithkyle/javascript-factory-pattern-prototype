// idbRequest.onupgradeneeded = (event) => {
//     
//     
//     objectStore.createIndex("hp", "hp", { unique: false });
//     objectStore.createIndex("ac", "ac", { unique: false });
//     objectStore.createIndex("str", "str", { unique: false });
//     objectStore.createIndex("int", "int", { unique: false });
//     objectStore.createIndex("wis", "wis", { unique: false });
//     objectStore.createIndex("cha", "cha", { unique: false });
//     objectStore.createIndex("dex", "dex", { unique: false });
//     objectStore.createIndex("con", "con", { unique: false });
//     objectStore.createIndex("actions", "actions", { unique: false });
//     objectStore.createIndex("abilities", "abilities", { unique: false });
// };
class IDBWorker {
    constructor() {
        self.onmessage = this.inbox.bind(this);
        this.idb = null;
    }
    async upgradeDatabase(tables) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        for (let t = 0; t < tables.length; t++) {
            try {
                const transaction = this.idb.transaction(tables[t].name, "readwrite");
                // Do nothing when transactions are successful, we can't modify existing tables in IDB
            }
            catch (e) {
                // Transactions fail when the object store doesn't exist meaning it's "safe" to create the object store
                const store = this.idb.createObjectStore(tables[t].name, {
                    keyPath: (_b = (_a = tables[t]) === null || _a === void 0 ? void 0 : _a.keyPath) !== null && _b !== void 0 ? _b : null,
                    autoIncrement: (_d = (_c = tables[t]) === null || _c === void 0 ? void 0 : _c.autoIncrement) !== null && _d !== void 0 ? _d : false,
                });
                for (let i = 0; i < tables[t].indexes.length; i++) {
                    store.createIndex(tables[t].indexes[i].name, (_f = (_e = tables[t].indexes[i]) === null || _e === void 0 ? void 0 : _e.keyPath) !== null && _f !== void 0 ? _f : tables[t].indexes[i].name, {
                        unique: (_h = (_g = tables[t].indexes[i]) === null || _g === void 0 ? void 0 : _g.unique) !== null && _h !== void 0 ? _h : false,
                        multiEntry: (_k = (_j = tables[t].indexes[i]) === null || _j === void 0 ? void 0 : _j.multiEntry) !== null && _k !== void 0 ? _k : false,
                        // @ts-expect-error
                        locale: (_m = (_l = tables[t].indexes[i]) === null || _l === void 0 ? void 0 : _l.locale) !== null && _m !== void 0 ? _m : null,
                    });
                }
            }
        }
        return;
    }
    init(database, version, tables) {
        return new Promise((resolve, reject) => {
            const idbRequest = indexedDB.open(database, version);
            idbRequest.onsuccess = (event) => {
                this.idb = event.target.result;
                resolve();
            };
            idbRequest.onupgradeneeded = async (event) => {
                this.idb = event.target.result;
                await this.upgradeDatabase(tables);
                resolve();
            };
            idbRequest.onerror = () => {
                reject(`Failed to open IDB ${database}`);
            };
        });
    }
    /**
     * Sends a message back to the main thread.
     */
    send(type, data = null) {
        // @ts-ignore
        self.postMessage({
            type: type,
            data: data,
        });
    }
    /**
     * Fields all incoming messages sent to the worker's thread.
     */
    inbox(event) {
        const e = event.data;
        switch (e.type) {
            case "init":
                this.init(e.data.database, e.data.version, e.data.tables)
                    .then(() => {
                    this.send("ready");
                })
                    .catch((error) => {
                    this.send("error", error);
                });
                break;
            default:
                console.warn(`Uncaught DB Worker message type: ${e.data.type}`);
                break;
        }
    }
}
new IDBWorker();
