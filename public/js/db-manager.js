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
                    database: "demo",
                    version: 2,
                    tables: response,
                },
            });
        }
    }
    inbox(event) {
        const e = event.data;
        switch (e.type) {
            case "ready":
                break;
            default:
                console.warn(`Unhandled DB Worker response message type: ${e.type}`);
                break;
        }
    }
}
const idb = new DBManager();
export { idb };
