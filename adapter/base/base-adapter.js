class BaseAdapter {
    #binds = {};

    constructor() {
        if (new.target === BaseAdapter) {
            throw new Error('Cannot instantiate BaseAdapter directly');
        }
    }

    // -------------------------
    // Bind handling
    // -------------------------

    getBinds() {
        return this.#binds;
    }

    setBinds(newBinds) {
        this.#binds = { ...this.#binds, ...newBinds };
        return this;
    }

    clearBinds() {
        this.#binds = {};
        return this;
    }

    #resolveBinds(localBinds) {
        const conflicts = Object.keys(localBinds).filter(k => k in this.#binds);

        if (conflicts.length) {
            console.warn(`Local binds overwrite global binds: ${conflicts.join(', ')}`);
        }

        return { ...this.#binds, ...localBinds };
    }

    // -------------------------
    // Public API
    // -------------------------

    async query(sql, binds = {}) {
        const finalBinds = this.#resolveBinds(binds);
        return this._runQuery(sql, finalBinds);
    }

    async dml(sql, binds = {}) {
        const finalBinds = this.#resolveBinds(binds);
        return this._runDML(sql, finalBinds);
    }

    async dmlReturning(sql, binds = {}) {
        const finalBinds = this.#resolveBinds(binds);
        return this._runDMLReturning(sql, finalBinds);
    }

    // -------------------------
    // Transaction API (NOW PROPER)
    // -------------------------

    async beginTransaction() {
        return this._beginTransaction();
    }

    async commitTransaction() {
        return this._commitTransaction();
    }

    async rollbackTransaction() {
        return this._rollbackTransaction();
    }

    async ensureTransaction() {
        if (!this.getTransactionContext()) {
            await this._beginTransaction();
        }
    }

    isTransactionActive() {
        return !!this.getTransactionContext();
    }

    // -------------------------
    // Error handling
    // -------------------------

    #enhanceError(error, sql) {
        error.sql = sql;
        error.message = `DB operation failed: ${error.message}\nSQL: ${sql}`;
        return error;
    }

    // wrap errors consistently
    async _safe(fn, sql) {
        try {
            return await fn();
        } catch (err) {
            throw this.#enhanceError(err, sql);
        }
    }

    // -------------------------
    // Abstracts
    // -------------------------

    _runQuery() {
        throw new Error('Must implement _runQuery');
    }

    _runDML() {
        throw new Error('Must implement _runDML');
    }

    _runDMLReturning() {
        throw new Error('Must implement _runDMLReturning');
    }

    _beginTransaction() {
        throw new Error('Must implement _beginTransaction');
    }

    _commitTransaction() {
        throw new Error('Must implement _commitTransaction');
    }

    _rollbackTransaction() {
        throw new Error('Must implement _rollbackTransaction');
    }

    getTransactionContext() {
        throw new Error('Must implement getTransactionContext');
    }
}

module.exports = BaseAdapter;