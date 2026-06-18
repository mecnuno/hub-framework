class BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        this.rawDb = rawDb;
        this.dbPool = dbPool;
        this.type = options.type || 'unknown';
        this.isTransaction = !!options.isTransaction;
    }

    async query() {
        throw new Error('Must implement query(sql, binds)');
    }

    async execute() {
        throw new Error('Must implement execute(sql, binds)');
    }

    async returningExecute() {
        throw new Error('Must implement returningExecute(sql, binds)');
    }

    async withStatement(sql, binds, callback) {
        const sqlText = sql.toString();
        return callback({ sqlText, binds });
    }

    // Subclasses that manage raw statement objects (e.g. better-sqlite3) should
    // override withStatement to prepare the statement, pass it to the callback,
    // and free it in a finally block.

    async beginTransaction() {
        throw new Error('Must implement beginTransaction()');
    }

    async commit() {
        throw new Error(`${this.type} driver does not support commit()`);
    }

    async rollback() {
        throw new Error(`${this.type} driver does not support rollback()`);
    }

    async close() {
        if (this.isTransaction) {
            return;
        }

        if (this.dbPool?.release && this.rawDb) {
            await this.dbPool.release(this.rawDb);
        }
    }
}

module.exports = BaseDriver;
