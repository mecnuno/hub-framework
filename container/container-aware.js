class ContainerAware {
    constructor(container) {
        this.container = container;
    }

    get db() { return this.container.db; }
    get adapter() { return this.container.AsyncRDBMSAdapter; }
    get bllAdapter() { return this.container.BllAdapter; }
    get sqlBuilder() { return this.container.SQL; }
    get logger() { return this.container.logger; }
    get redis() { return this.container.redis; }
    get rabbitmq() { return this.container.rabbitmq; }
    get cache() { return this.container.BllCache; }
    get config() { return this.container.config; }
}

module.exports = { ContainerAware };