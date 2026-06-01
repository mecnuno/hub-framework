# Hub Framework

The **Hub Framework** is a modular, dependency-injection-friendly Node.js library for building scalable business logic layers (BLL) with support for caching, SQL building, and flexible proxy execution. It is designed to be used as a library in your Node.js projects, providing a clean API for executing BLL methods, managing cache, and integrating with your infrastructure container.

---

## Features

- **Dependency Injection Ready:** Easily integrate with your own container or use the provided `BaseContainer` as a foundation.
- **BLL Proxy Execution:** Execute BLL methods with automatic fallback and caching.
- **SQL Builder:** Build SQL queries in a database-agnostic way.
- **Cache Support:** In-memory caching for routes and results.
- **Extensible:** Override or extend components as needed for your project.
- **RDBMS Adapter:** Unified interface for SQL database operations and transactions.

---

## Installation

Install via npm (after publishing) or use as a local dependency:

```sh
npm install hub-framework
# or
npm install /path/to/hub-framework
```

---

## Usage

### 1. Infrastructure Container

Create your own infrastructure container by extending or instantiating the provided `BaseContainer`.  
The container manages dependencies such as logger, database pool, config, cache, and more.

**Example: `infrastructure-container.js`**
```js
const { BaseContainer } = require('hub-framework');
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 0 });
const path = require('path');
const { getDb, releaseDb } = require('./config/db');
const { cnfg } = require('./config/config-exports');
const queries = require('./db/sql/dynamic-qry');
const dmls = require('./db/sql/dynamic-dml');

class InfrastructureContainer extends BaseContainer {
    static #instance = null;

    constructor() {
        if (InfrastructureContainer.#instance) {
            return InfrastructureContainer.#instance;
        }
        super();
        InfrastructureContainer.#instance = this;
    }

    static getInstance() {
        if (!InfrastructureContainer.#instance) {
            InfrastructureContainer.#instance = new InfrastructureContainer();
        }
        return InfrastructureContainer.#instance;
    }

    registerSyncDependencies() {
        this.bottle.value('logger', require('./config/logger'));
        this.bottle.value('dbPool', {
            get: getDb,
            release: releaseDb
        });
        this.bottle.value('config', cnfg.getConfig());
        this.bottle.value('memCache', cache);
        this.bottle.value('bllDirectory', path.join(__dirname, '../../module/bll'));
        this.bottle.value('queries', queries);
        this.bottle.value('dmls', dmls);    
    }

    async registerAsyncDependencies() {
        // Register async dependencies here if needed
    }
}

module.exports = { InfrastructureContainer };
```

---

### 2. Main Application Example

**Example: `index.js`**
```js
const { InfrastructureContainer } = require('./src/infrastructure-container');
const { executeRequest, cache: bllCache } = require('hub-framework');
const queries = require('./src/db/sql/dynamic-qry');
const dmls = require('./src/db/sql/dynamic-dml');

const main = async () => {
    const infra = InfrastructureContainer.getInstance();
    const container = await infra.initialize();
    const logger = container.logger;

    const sessionValues = {
        id: 14,
        someOtherId: Math.floor(Math.random() * 1000),
        some_name: 'Session-' + Date.now(),
        createdAt: new Date(),
        sort: [
            { "property": "NAME", "direction": "DESC" },
            { "property": "UPDATED_AT", "direction": "ASC", nulls: 'last' }
        ],
        page: 1,
        pageSize: 20
    };

    const request = {
        class: "MyExampleBll",
        method: "getExampleData",
        parameters: { ...sessionValues }
    };

    try {        
        const adapter = await container.getAdapter();
        const adapterResult = await adapter.query('select * from inventory', sessionValues)
        logger.info(`Result for adapter: ${adapterResult}`);

        const baseBll = await container.getBaseBll();
        const baseBllResult = await baseBll.readPaginated(queries.getExampleSql, sessionValues);
        logger.info(`Result for baseBll: ${baseBllResult}`);

        let dmlResult = await baseBll.withTransaction(
            async () => await baseBll.writeReturning(
                dmls.newInventoryRecord, { ...sessionValues, barcode: 'barcode1'}
            )
        );

        logger.info(`Result for dml: ${dmlResult}`);

        const result = await executeRequest(container, request);
        logger.info(`Result for existing route & bll: ${result}`);

        logger.info(`Cache: ${JSON.stringify(bllCache.getStats())}`);

        logger.info('---Waiting 3 seconds ---');
        await new Promise(resolve => setTimeout(resolve, 3000));
        logger.info('_____________Exiting after wait__________');
    } catch (err) {
        logger.error('Request failed:', err);
        throw err;
    }
};

main().catch(console.error).finally(() => console.log("\n---Main is completed! Do some cleanup here---"));
```

---

## API

### Exports

From `hub-framework` you get:

- **executeRequest**  
  Executes a BLL method via the proxy system.
  ```js
  const { executeRequest } = require('hub-framework');
  ```

- **cache**  
  Access to the internal BLL cache for monitoring or testing.
  ```js
  const { cache } = require('hub-framework');
  ```

- **BaseBll**  
  Base class for your BLLs, providing CRUD and transaction helpers.
  ```js
  const { BaseBll } = require('hub-framework');
  ```

- **RDBMSAdapter**  
  Unified SQL database adapter for various drivers.
  ```js
  const { RDBMSAdapter } = require('hub-framework');
  ```

- **BaseContainer**  
  Extend this for your own dependency injection container.
  ```js
  const { BaseContainer } = require('hub-framework');
  ```

---

## BaseContainer Pattern

The `BaseContainer` class provides a foundation for dependency injection.  
You can extend it to register your own dependencies and manage singleton instances.

**Key methods:**
- `registerSyncDependencies()` — Register synchronous dependencies.
- `registerAsyncDependencies()` — Register asynchronous dependencies.
- `initialize()` — Initializes the container and returns the dependency graph.

---

## BaseBll Pattern

The `BaseBll` class provides:
- Adapter management (lazy loading)
- `read`, `readPaginated`, `write`, `writeReturning` methods for CRUD operations
- `withTransaction` for transactional logic

Extend `BaseBll` for your own business logic classes.

---

## RDBMSAdapter

A generic, promise-based SQL database adapter that wraps any database client conforming to a unified interface.  
Supports drivers like `better-sqlite3`, `mysql2`, `pg`, and is extensible.

---

## Example Project Structure

```
your-project/
│
├─ src/
│   ├─ infrastructure-container.js
│   └─ index.js
│
└─ node_modules/
    └─ hub-framework/
```

---

## Extending & Customization

- **Override BLL Directory:**  
  Pass a custom `bllDirectory` to your container if your BLL modules are in a different location.
- **Custom Logger:**  
  Inject your own logger via the container for custom logging.
- **Add More Dependencies:**  
  Use `registerSyncDependencies` and `registerAsyncDependencies` in your container.

---

## Development

- See the `src/hub` directory for all framework source code.
- Only selected utilities (like `executeRequest`, `cache`, `BaseBll`, `RDBMSAdapter`, `BaseContainer`) are exported for use; internal modules are not exposed by default.

---

## License

MIT
