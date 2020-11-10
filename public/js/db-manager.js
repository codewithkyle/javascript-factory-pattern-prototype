class DBManager {
    constructor() {
        this.worker = new Worker(`${location.origin}/js/db-worker.js`);
        this.worker.onmessage = this.inbox.bind(this);
        this.ready = false;
        this.init();
    }
    async init() {
        const request = await fetch(`${location.origin}/api/schema.json`, {
            headers: new Headers({
                Accept: "application/json",
            }),
        });
        if (request.ok) {
            const response = await request.json();
            this.worker.postMessage({
                type: "init",
                data: {
                    database: response.database,
                    version: response.version,
                    tables: response.tables,
                },
            });
        }
    }
    inbox(event) {
        const e = event.data;
        switch (e.type) {
            case "ready":
                this.ready = true;
                this.worker.postMessage({
                    type: "sync",
                    data: [
                        {
                            table: "colors",
                            url: `${location.origin}/api/colors.json`,
                        },
                        {
                            table: "patterns",
                            url: `${location.origin}/api/patterns.json`,
                        }
                    ]
                });
                break;
            case "error":
                console.error(e.data);
                break;
            default:
                console.warn(`Unhandled DB Worker response message type: ${e.type}`);
                break;
        }
    }
}
const idb = new DBManager();
export { idb };
