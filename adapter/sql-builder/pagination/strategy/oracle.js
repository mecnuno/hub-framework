/**
 * Oracle Database Strategy
 * Handles Oracle-specific SQL generation, escaping, and pagination
 */

/**
 * Oracle strategy implementation
 */
const oracleStrategy = {
    name: 'oracle',

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
     * Oracle pagination using ROWNUM subqueries
     */
    paginate: (sql, offset, limit, orderByClause) => {
        const orderedSql = `${sql} ORDER BY ${orderByClause}`;
        const endRow = offset + limit;
        return `SELECT * FROM (SELECT a.*, ROWNUM rn FROM (${orderedSql}) a WHERE ROWNUM <= ${endRow}) WHERE rn > ${offset}`;
    },

    /**
     * Oracle ROW_NUMBER() window function pagination
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
     * Oracle native NULLS FIRST/LAST support
     */
    buildNullsOrdering: (column, direction, nullsPosition) => {
        return `${column} ${direction} NULLS ${nullsPosition.toUpperCase()}`;
    },

    /**
     * Oracle date formatting using TO_DATE
     */
    buildDateFormattedColumn: (property, dateFormat) => {
        return `TO_DATE(${property}, '${dateFormat}')`;
    },

    /**
     * Oracle capabilities
     */
    capabilities: {
        supportsNativeNulls: true,
        supportsWindowFunctions: true, // Oracle 9i+
        supportsOffset: false,
        supportsLimitOffset: false,
        supportsOffsetFetch: false,
        supportsRownum: true
    }
};

module.exports = oracleStrategy;
