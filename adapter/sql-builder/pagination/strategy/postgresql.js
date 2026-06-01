/**
 * PostgreSQL Database Strategy
 * Handles PostgreSQL-specific SQL generation, escaping, and pagination
 */

/**
 * PostgreSQL strategy implementation
 */
const postgresqlStrategy = {
    name: 'postgresql',

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
     * Standard PostgreSQL pagination using LIMIT/OFFSET
     */
    paginate: (sql, offset, limit, orderByClause) => {

        const orderedSql = `${sql} ORDER BY ${orderByClause}`;
        return `${orderedSql} LIMIT ${limit} OFFSET ${offset}`;
    },

    /**
     * PostgreSQL ROW_NUMBER() window function pagination
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
     * PostgreSQL native NULLS FIRST/LAST support
     */
    buildNullsOrdering: (column, direction, nullsPosition) => {
        return `${column} ${direction} NULLS ${nullsPosition.toUpperCase()}`;
    },

    /**
     * PostgreSQL date formatting using TO_DATE
     */
    buildDateFormattedColumn: (property, dateFormat) => {
        return `TO_DATE(${property}, '${dateFormat}')`;
    },

    /**
     * PostgreSQL capabilities
     */
    capabilities: {
        supportsNativeNulls: true,
        supportsWindowFunctions: true,
        supportsOffset: true,
        supportsLimitOffset: true,
        supportsOffsetFetch: false
    }
};

module.exports = postgresqlStrategy;