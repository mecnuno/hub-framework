/**
 * SQLite Database Strategy
 * Handles SQLite-specific SQL generation, escaping, and pagination
 */

/**
 * SQLite strategy implementation
 */
const sqliteStrategy = {
    name: 'sqlite',

    /**
     * Escape SQL identifiers using double quotes
     */
    escapeIdentifier: (identifier) => {
        if (typeof identifier !== 'string') {
            throw new Error('Identifier must be a string');
        }

        // Check if already properly quoted
        if (identifier.startsWith('"') && identifier.endsWith('"')) {
            return identifier;
        }

        return `"${identifier.replace(/"/g, '""')}"`;
    },

    /**
     * SQLite pagination using LIMIT/OFFSET (same as PostgreSQL)
     */
    paginate: (sql, offset, limit, orderByClause) => {
        const orderedSql = `${sql} ORDER BY ${orderByClause}`;
        return `${orderedSql} LIMIT ${limit} OFFSET ${offset}`;
    },

    /**
     * SQLite ROW_NUMBER() window function pagination (SQLite 3.25+)
     */
    paginateWithRowNumber: (sql, offset, limit, orderByClause) => {
        const startRow = offset + 1;
        const endRow = offset + limit;
        return `SELECT * FROM (
            SELECT a.*, ROW_NUMBER() OVER (ORDER BY ${orderByClause}) AS row_num 
            FROM (${sql}) a
        ) ranked WHERE row_num BETWEEN ${startRow} AND ${endRow}`;
    },

    /**
     * SQLite native NULLS FIRST/LAST support
     */
    buildNullsOrdering: (column, direction, nullsPosition) => {
        return `${column} ${direction} NULLS ${nullsPosition.toUpperCase()}`;
    },

    /**
     * SQLite date formatting using datetime()
     */
    buildDateFormattedColumn: (property, dateFormat) => {
        // SQLite uses datetime() function for date handling
        return `datetime(${property})`;
    },

    /**
     * SQLite capabilities
     */
    capabilities: {
        supportsNativeNulls: true,
        supportsWindowFunctions: true, // SQLite 3.25+
        supportsOffset: true,
        supportsLimitOffset: true,
        supportsOffsetFetch: false
    }
};

module.exports = sqliteStrategy;
