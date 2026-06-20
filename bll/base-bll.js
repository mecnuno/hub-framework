class BaseBll {
    #adapterInstance = null;
    
    constructor(container) {
        this.container = container;
        this.logger = container.logger;
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
        this.logger.debug({ query: query.query, sessionValues }, 'Executing paginated query');
        return await adapter.query(query, sessionValues);
    }

    async read(qryBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const query = qryBuilder(sessionValues);
        this.logger.debug({ query: query.query, sessionValues }, 'Executing query');
        return await adapter.query(query, sessionValues);
    }

    async write(dmlBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const dml = dmlBuilder(sessionValues);
        this.logger.debug({ dml: dml.query, sessionValues }, 'Executing DML');
        return await adapter.dml(dml, sessionValues);
    }

    async writeReturning(dmlBuilder, sessionValues) {
        const adapter = await this.getAdapter();
        const dml = dmlBuilder(sessionValues);
        this.logger.debug({ dml: dml.query, sessionValues }, 'Executing DML with returning');
        return await adapter.dmlReturning(dml, sessionValues);
    }
    
    async withTransaction(callback) {
        const adapter = await this.getAdapter();
        this.logger.debug('Starting transaction');
        try {
            const result = await adapter.withTransaction(callback);
            this.logger.debug('Transaction committed');
            return result;
        } catch (error) {
            this.logger.debug('Transaction rolled back');
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


