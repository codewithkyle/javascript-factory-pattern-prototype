class IDBWorker{
    private idb:IDBDatabase;

    constructor(){
        self.onmessage = this.inbox.bind(this);
        this.idb = null;
    }

    private sync(
        data:Array<{
            table: string,
            url: string,
        }>,
    ): Promise<void>{
        let synced = 0;
        return new Promise((resolve, reject) => {
            for (let i = 0; i < data.length; i++){
                fetch(data[i].url, {
                    headers: new Headers({
                        Accept: "application/json"
                    })
                })
                .then(request => request.json())
                .then(response => {
                    const tx = this.idb.transaction(data[i].table, 'readwrite');
                    const store = tx.objectStore(data[i].table);
                    store.getAll().onsuccess = (event:any) => {
                        const items = event.target.result;

                        // Add or update existing data
                        for (let k = 0; k < response.data.length; k++){
                            let isNew = true;
                            for (let p = 0; p < items.length; p++){
                                for (const itemKey in items[p]){
                                    for (const dataKey in response.data[k]){
                                        if (itemKey === dataKey){
                                            if (response.data[k][dataKey] === items[p][itemKey]){
                                                isNew = false;
                                                break;
                                            }
                                        }
                                    }
                                    if (!isNew){
                                        break;
                                    }
                                }
                                if (!isNew){
                                    break;
                                }
                            }
                            if (isNew){
                                store.add(response.data[k]);
                            }else{
                                store.delete(items[i][Object.keys(response.data[k])[0]]);
                                store.put(response.data[k]);
                            }
                        }

                        // Delete old data
                        for (let i = 0; i < items.length; i++){
                            let isDead = true;
                            for (let d = 0; d < response.data.length; d++){
                                for (const itemKey in items[i]){
                                    for (const dataKey in response.data[d]){
                                        if (itemKey === dataKey){
                                            if (response.data[d][dataKey] === items[i][itemKey]){
                                                isDead = false;
                                                break;
                                            }
                                        }
                                    }
                                    if (!isDead){
                                        break;
                                    }
                                }
                                if (!isDead){
                                    break;
                                }
                            }
                            if (isDead){
                                store.delete(items[i][Object.keys(items[i])[0]]);
                            }
                        }
                        tx.oncomplete = () => {
                            synced++;
                            if (synced === data.length){
                                resolve();
                            }
                        }
                        tx.onerror = (error) => {
                            console.error(error);
                            reject(`Failed to sync data in the ${data[i].table} table`);
                        }
                    };
                })
                .catch(() => {
                    reject(`Failed to fetch: ${data[i].url}`);
                });
            }
        });
    }

    /**
     * Updates the database by generating new object stores (tables) when needed.
     */
    private async upgradeDatabase(tables:any){
        for (let t = 0; t < tables.length; t++) {
            let isNew = true;
            for (const table in this.idb.objectStoreNames){
                if (this.idb.objectStoreNames[table] === tables[t].name){
                    isNew = false;
                    break;
                }
            }
            if (isNew){
                const store = this.idb.createObjectStore(tables[t].name, {
                    keyPath: tables[t].indexes[0].name,
                    autoIncrement: false,
                });
                for (let i = 0; i < tables[t].indexes.length; i++){
                    store.createIndex(
                        tables[t].indexes[i].name, 
                        tables[t].indexes[i].name, 
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

    /**
     * Creates the database and handles upgrading.
     */
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
            case "sync":
                this.sync(e.data)
                    .then(() => {
                        this.send("synced");
                    })
                    .catch(error => {
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