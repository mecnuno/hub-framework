/**
 * Database Strategy Registry
 * Central registry for all database-specific strategies
 */

const postgresqlStrategy = require('./postgresql');
const mysqlStrategy = require('./mysql');
const mssqlStrategy = require('./mssql');
const oracleStrategy = require('./oracle');
const sqliteStrategy = require('./sqlite');

/**
 * Registry of all database strategies
 */
const dbStrategies = {
    postgresql: postgresqlStrategy,
    postgres: postgresqlStrategy, // Alias
    mysql: mysqlStrategy,
    mssql: mssqlStrategy,
    sqlserver: mssqlStrategy, // Alias
    oracle: oracleStrategy,
    sqlite: sqliteStrategy,
    turso: sqliteStrategy // Alias for SQLite-based Turso
};

/**
 * Get database strategy by database type
 * @param {string} dbType - Database type
 * @returns {Object} Database strategy object
 * @throws {Error} If database type is not supported
 */
function getStrategy(dbType) {
    if (!dbType || typeof dbType !== 'string') {
        throw new Error('Database type must be a non-empty string');
    }

    const strategy = dbStrategies[dbType.toLowerCase()];
    if (!strategy) {
        const supportedTypes = Object.keys(dbStrategies).join(', ');
        throw new Error(`Unsupported database type: ${dbType}. Supported types: ${supportedTypes}`);
    }

    return strategy;
}

/**
 * Get list of all supported database types
 * @returns {string[]} Array of supported database types
 */
function getSupportedDatabaseTypes() {
    return Object.keys(dbStrategies);
}

/**
 * Check if database type is supported
 * @param {string} dbType - Database type to check
 * @returns {boolean} True if supported, false otherwise
 */
function isSupported(dbType) {
    if (!dbType || typeof dbType !== 'string') {
        return false;
    }
    return Object.prototype.hasOwnProperty.call(dbStrategies, dbType.toLowerCase());
}

/**
 * Register a new database strategy
 * @param {string} name - Name of the database type
 * @param {Object} strategy - Strategy implementation
 */
function registerStrategy(name, strategy) {
    if (!name || typeof name !== 'string') {
        throw new Error('Strategy name must be a non-empty string');
    }

    if (!strategy || typeof strategy !== 'object') {
        throw new Error('Strategy must be an object');
    }

    // Validate required strategy methods
    const requiredMethods = ['escapeIdentifier', 'paginate', 'buildNullsOrdering', 'buildDateFormattedColumn'];
    for (const method of requiredMethods) {
        if (typeof strategy[method] !== 'function') {
            throw new Error(`Strategy must implement ${method} method`);
        }
    }

    dbStrategies[name.toLowerCase()] = strategy;
}

module.exports = {
    getStrategy,
    getSupportedDatabaseTypes,
    isSupported,
    registerStrategy,
    postgresqlStrategy,
    mysqlStrategy,
    mssqlStrategy,
    oracleStrategy,
    sqliteStrategy,
    validDatabaseTypes: Object.keys(dbStrategies)
};
