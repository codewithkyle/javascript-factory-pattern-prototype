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
        for (const table in tables) {
            const store = this.idb.createObjectStore(table, {
                keyPath: tables[table]?.keyPath ?? null,
                autoIncrement: tables[table]?.autoIncrement ?? false,
            });
            for (let i = 0; i < tables[table].indexes.length; i++){
                store.createIndex(
                    tables[table].indexes[i].name, 
                    tables[table].indexes[i]?.keyPath ?? tables[table].indexes[i].name, 
                    {
                        unique: tables[table].indexes[i]?.unique ?? false,
                        multiEntry: tables[table].indexes[i]?.multiEntry ?? false,
                        // @ts-expect-error
                        locale: tables[table].indexes[i]?.locale ?? null,
                    }
                );
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