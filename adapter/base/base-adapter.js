
class BaseAdapter {
    #binds = {}
    #transactionIsActive = false

    constructor() {
        if (new.target === BaseAdapter) {
            throw new Error('Cannot instantiate abstract class BaseAdapter directly')
        }
    }

    getBinds() {
        return this.#binds;
    }

    setBinds(newBinds) {
        this.#binds = { ...this.#binds, ...newBinds }
        return this;
    }

    clearBinds() {
        this.#binds = {}
        return this
    }

    #resolveBinds(localBinds) {
        const conflicts = Object.keys(localBinds).filter(key => key in this.#binds);
        if (conflicts.length > 0) {
            console.warn(`Local binds overwrite global binds: ${conflicts.join(', ')}`);
        }
        return { ...this.#binds, ...localBinds }
    }

    async query(queryStr, localBinds = {}) {
        try {
            const finalBinds = this.#resolveBinds(localBinds)
            return await this._runQuery(queryStr, finalBinds)
        } catch (error) {
            throw this.#enhanceError(error, queryStr);
        }
    }

    async dml(dmlStr, localBinds = {}) {
        try {
            const finalBinds = this.#resolveBinds(localBinds)
            return await this._runDML(dmlStr, finalBinds)
        } catch (error) {
            throw this.#enhanceError(error, dmlStr);
        }
    }

    async dmlReturning(dmlStr, localBinds = {}) {
        try {
            const finalBinds = this.#resolveBinds(localBinds);
            return await this._runDMLReturning(dmlStr, finalBinds);
        } catch (error) {
            throw this.#enhanceError(error, dmlStr);
        }
    }

        // Strict (use in application logic)
    async beginTransaction() {
        if (this.#transactionIsActive) {
            throw new Error('Transaction already active');
        }
        await this._beginTransaction();
        this.#transactionIsActive = true;
    }

    async commitTransaction() {
        if (!this.#transactionIsActive) {
            throw new Error('No active transaction to commit');
        }
        await this._commitTransaction();
        this.#transactionIsActive = false;
    }

    // Rollback is always safe (for error handlers)
    async rollbackTransaction() {
        if (!this.#transactionIsActive){
            return;
        } 
        await this._rollbackTransaction();
        this.#transactionIsActive = false;
    }

    // Optional: Add safe versions if needed
    async tryBeginTransaction() {
        if (this.#transactionIsActive) return false;
        await this._beginTransaction();
        this.#transactionIsActive = true;
        return true;
    }

    async tryCommitTransaction() {
        if (!this.#transactionIsActive) return false;
        await this._commitTransaction();
        this.#transactionIsActive = false;
        return true;
    }

    async ensureTransaction() {
        if (!this.#transactionIsActive) {
            await this._beginTransaction()
            this.#transactionIsActive = true
        }
    }

    isTransactionActive() {
        return this.#transactionIsActive
    }

    #enhanceError(error, sql) {
        error.sql = sql;
        error.message = `DB operation failed: ${error.message}\nSQL: ${sql}`;
        return error;
    }

    // Abstract methods to be implemented by concrete adapters
    _runQuery(queryStr, binds) {
        throw new Error('Subclasses must implement _runQuery')
    }

    _runDML(dmlStr, binds) {
        throw new Error('Subclasses must implement _runDML')
    }
    
    _runDMLReturning(dmlStr, binds) {
        throw new Error('Subclasses must implement _runDMLReturning');
    }

    _beginTransaction() {
        throw new Error('Subclasses must implement _beginTransaction')
    }

    _commitTransaction() {
        throw new Error('Subclasses must implement _commitTransaction')
    }

    _rollbackTransaction() {
        throw new Error('Subclasses must implement _rollbackTransaction')
    }
}

module.exports = BaseAdapter;
