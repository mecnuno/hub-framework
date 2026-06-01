class BaseBll {
    #adapterInstance = null;
    
    constructor(container) {
        this.container = container;
    }

    async getAdapter ()  {
        if (!this.#adapterInstance) {
            this.#adapterInstance = await this.container.getAdapter();
        }
        return this.#adapterInstance;
    }

    async readPaginated(qryBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const query = qryBuilder({...sessionValues, dbType:adapter.getDbType()}).paginate();
        return await adapter.query(query, sessionValues);
    }

    async read(qryBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const query = qryBuilder(sessionValues);
        return await adapter.query(query, sessionValues);
    }

    async write(dmlBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const dml = dmlBuilder(sessionValues);
        return await adapter.dml(dml, sessionValues);
    }

    async writeReturning(dmlBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const dml = dmlBuilder(sessionValues);
        return await adapter.dmlReturning(dml, sessionValues);
    }
    
    async withTransaction(callback) {
        const adapter = await this.getAdapter();
        
        try {
            await adapter.beginTransaction();
            const result = await callback();
            await adapter.commitTransaction();
            return result;
        } catch (error) {
            await adapter.rollbackTransaction();
            throw error;
        }
    }

    async closeAdapter() {
        if (this.#adapterInstance && typeof this.#adapterInstance.close === 'function') {
            await this.#adapterInstance.close();
            this.#adapterInstance = null; 
        }
    }

    async withAdapter(callback) {
        try {
            return await callback(this);
        } finally {
            await this.closeAdapter();
        }
    }
}

module.exports = BaseBll;


