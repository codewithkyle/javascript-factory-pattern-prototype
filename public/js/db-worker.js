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
        for (const table in tables) {
            const store = this.idb.createObjectStore(table, {
                keyPath: (_b = (_a = tables[table]) === null || _a === void 0 ? void 0 : _a.keyPath) !== null && _b !== void 0 ? _b : null,
                autoIncrement: (_d = (_c = tables[table]) === null || _c === void 0 ? void 0 : _c.autoIncrement) !== null && _d !== void 0 ? _d : false,
            });
            for (let i = 0; i < tables[table].indexes.length; i++) {
                store.createIndex(tables[table].indexes[i].name, (_f = (_e = tables[table].indexes[i]) === null || _e === void 0 ? void 0 : _e.keyPath) !== null && _f !== void 0 ? _f : tables[table].indexes[i].name, {
                    unique: (_h = (_g = tables[table].indexes[i]) === null || _g === void 0 ? void 0 : _g.unique) !== null && _h !== void 0 ? _h : false,
                    multiEntry: (_k = (_j = tables[table].indexes[i]) === null || _j === void 0 ? void 0 : _j.multiEntry) !== null && _k !== void 0 ? _k : false,
                    // @ts-expect-error
                    locale: (_m = (_l = tables[table].indexes[i]) === null || _l === void 0 ? void 0 : _l.locale) !== null && _m !== void 0 ? _m : null,
                });
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
                console.log("needs update");
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
