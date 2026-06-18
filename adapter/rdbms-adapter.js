const JsonFormatter = require('./formatter/json');
const BaseAdapter = require('./base/base-adapter');

class RDBMSAdapter extends BaseAdapter {
    #db;
    #formatter;
    #isClosed = false;
    #txDriver = null;

    constructor(driver, formatter = new JsonFormatter()) {
        super();
        this.#db = driver;
        this.#formatter = formatter;
    }

    setDbDriver(driver) {
        this.#db = driver;
        this.#txDriver = null;
        this.#isClosed = false;
        return this;
    }

    getDbType() {
        return this.#db.type;
    }

    setFormatter(f) {
        this.#formatter = f;
        return this;
    }

    async formatOutput(data) {
        return this.#formatter.format(data);
    }
    async query(sql, binds) {
        const res = await super.query(sql, binds);
        return this.formatOutput(res);
    }

    async dml(sql, binds) {
        const res = await super.dml(sql, binds);
        return this.formatOutput({ changes: res.changes });
    }

    async dmlReturning(sql, binds) {
        const res = await super.dmlReturning(sql, binds);
        return this.formatOutput(res);
    }

    async close() {
        if (this.#isClosed) return;

        try {
            if (this.isTransactionActive()) {
                await this.rollbackTransaction();
            }
            await this.#db.close();
        } finally {
            this.#isClosed = true;
        }
    }

    isOpen() {
        return !this.#isClosed;
    }

    getTransactionContext() {
        return this.#txDriver;
    }

    async _beginTransaction() {
        this.#check();

        if (this.#txDriver) {
            throw new Error('Transaction already active');
        }

        this.#txDriver = await this.#db.beginTransaction();
        return this.#txDriver;
    }

    async _commitTransaction() {
        this.#check();

        if (!this.#txDriver) {
            throw new Error('No active transaction');
        }

        await this.#txDriver.commit();
        this.#txDriver = null;
    }

    async _rollbackTransaction() {
        if (!this.#txDriver) return;

        await this.#txDriver.rollback();
        this.#txDriver = null;
    }

    async _runQuery(sql, binds) {
        this.#check();

        return this._safe(async () => {
            const executor = this.#txDriver ?? this.#db;
            return executor.query(sql, binds);
        }, sql);
    }

    async _runDML(sql, binds) {
        this.#check();

        return this._safe(async () => {
            const executor = this.#txDriver ?? this.#db;
            return executor.execute(sql, binds);
        }, sql);
    }

    async _runDMLReturning(sql, binds) {
        this.#check();

        return this._safe(async () => {
            const executor = this.#txDriver ?? this.#db;
            return executor.returningExecute(sql, binds);
        }, sql);
    }

    #check() {
        if (this.#isClosed) {
            throw new Error('Database connection closed');
        }
    }
}

module.exports = RDBMSAdapter;