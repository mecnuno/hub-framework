const SqliteDriver = require('./drivers/sqlite-driver');
const TursoDriver = require('./drivers/turso-driver');
const Mysql2Driver = require('./drivers/mysql2-driver');
const PgDriver = require('./drivers/pg-driver');
const SqlServerDriver = require('./drivers/sqlserver-driver');
const OracleDriver = require('./drivers/oracle-driver');

function detectDatabaseType(db) {
    if (!db) throw new Error('No database instance provided');

    if (db.constructor?.name === 'Connection' && db._oracleDB) return 'oracle';
    if (db.constructor?.name === 'ConnectionPool') return 'sqlserver';
    if (db.constructor?.name === 'Database') return 'better-sqlite3';
    if (db.constructor?.name === 'Connection') return 'mysql2';
    if (db.constructor?.name === 'Client') return 'pg';

    if (typeof db.execute === 'function' && typeof db.batch === 'function') {
        return 'turso';
    }

    throw new Error('Unknown or unsupported database type');
}

function createDriverByType(type, rawDb, dbPool) {
    const strategies = {
        'better-sqlite3': SqliteDriver,
        turso: TursoDriver,
        mysql2: Mysql2Driver,
        pg: PgDriver,
        sqlserver: SqlServerDriver,
        oracle: OracleDriver,
    };

    const DriverClass = strategies[type];
    if (!DriverClass) {
        throw new Error(`Unsupported database type: ${type}`);
    }

    return new DriverClass(rawDb, dbPool);
}

async function createDbAdapterDriver(dbPool) {
    const rawDb = await dbPool.get();
    const type = detectDatabaseType(rawDb);
    return createDriverByType(type, rawDb, dbPool);
}

module.exports = createDbAdapterDriver;
