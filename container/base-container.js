const Bottle = require('bottlejs');
const BaseBll  = require('../bll/base-bll');
const DBDriver = require('../adapter/base/database-driver-factory');
const RDBMSAdapter = require('../adapter/rdbms-adapter');

class BaseContainer {
    constructor() {
        this.bottle = new Bottle();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            return this.bottle.container;
        }
        this.registerSyncDependencies();
        this.afterSyncRegisters();
        await this.registerAsyncDependencies();
        await this.afterAsyncRegisters();
        this.initialized = true;
        return this.bottle.container;
    }

    registerSyncDependencies() { }
    async registerAsyncDependencies() { }

    afterSyncRegisters() {
        this.bottle.factory('getBaseBll', (container) => () => new BaseBll(container));   
    }
    
    async afterAsyncRegisters() { 
        this.bottle.factory('getAdapter', (container) => {
            return async () => {
                const db = await DBDriver(container.dbPool);
                const adapter = new RDBMSAdapter(db, container.adapterFormatter);
                return adapter;
            }
        });
    }

}

module.exports =  BaseContainer ;