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

class IDBWorker{
    private idb:IDBDatabase;

    constructor(){
        self.onmessage = this.inbox.bind(this);
        this.idb = null;
    }

    private async upgradeDatabase(tables:any){
        for (let t = 0; t < tables.length; t++) {
            try{
                const transaction = this.idb.transaction(tables[t].name, "readwrite");
                // Do nothing when transactions are successful, we can't modify existing tables in IDB
            }catch (e){
                // Transactions fail when the object store doesn't exist meaning it's "safe" to create the object store
                const store = this.idb.createObjectStore(tables[t].name, {
                    keyPath: tables[t]?.keyPath ?? null,
                    autoIncrement: tables[t]?.autoIncrement ?? false,
                });
                for (let i = 0; i < tables[t].indexes.length; i++){
                    store.createIndex(
                        tables[t].indexes[i].name, 
                        tables[t].indexes[i]?.keyPath ?? tables[t].indexes[i].name, 
                        {
                            unique: tables[t].indexes[i]?.unique ?? false,
                            multiEntry: tables[t].indexes[i]?.multiEntry ?? false,
                            // @ts-expect-error
                            locale: tables[t].indexes[i]?.locale ?? null,
                        }
                    );
                }
            }
        }
        return;
    }

    private init(database:string, version:number, tables:unknown): Promise<void>{
        return new Promise((resolve, reject) => {
            const idbRequest:any = indexedDB.open(database, version);
            idbRequest.onsuccess = (event) => {
                this.idb = event.target.result;
                resolve();
            };
            idbRequest.onupgradeneeded = async (event) => {
                this.idb = event.target.result;
                await this.upgradeDatabase(tables);
                resolve();
            }
            idbRequest.onerror = () => {
                reject(`Failed to open IDB ${database}`);
            }
        });
    }

    /**
     * Sends a message back to the main thread.
     */
    private send(type:string, data:any = null){
        // @ts-ignore
        self.postMessage({
            type: type,
            data: data,
        });
    }

    /**
     * Fields all incoming messages sent to the worker's thread.
     */
    private inbox(event:MessageEvent){
        const e = event.data;
        switch (e.type) {
            case "init":
                this.init(e.data.database, e.data.version, e.data.tables)
                    .then(()=>{
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