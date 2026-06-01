/**
 * Microsoft SQL Server Database Strategy
 * Handles MSSQL-specific SQL generation, escaping, and pagination
 */

/**
 * MSSQL strategy implementation
 */
const mssqlStrategy = {
    name: 'mssql',

    /**
     * Escape SQL identifiers using square brackets
     */
    escapeIdentifier: (identifier) => {
        if (typeof identifier !== 'string') {
            throw new Error('Identifier must be a string');
        }

        // Check if already properly quoted
        if (identifier.startsWith('[') && identifier.endsWith(']')) {
            return identifier;
        }

        return `[${identifier.replace(/]/g, ']]')}]`;
    },

    /**
     * MSSQL pagination using OFFSET/FETCH
     */
    paginate: (sql, offset, limit, orderByClause) => {
        const orderedSql = `${sql} ORDER BY ${orderByClause}`;
        return `${orderedSql} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    },

    /**
     * MSSQL ROW_NUMBER() window function pagination
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
     * MSSQL NULLS emulation using CASE statement
     */
    buildNullsOrdering: (column, direction, nullsPosition) => {
        const nullsPos = nullsPosition.toLowerCase();
        const nullValue = nullsPos === 'first' ? 0 : 1;
        const nonNullValue = nullsPos === 'first' ? 1 : 0;
        return `CASE WHEN ${column} IS NULL THEN ${nullValue} ELSE ${nonNullValue} END, ${column} ${direction}`;
    },

    /**
     * MSSQL date formatting using CONVERT
     */
    buildDateFormattedColumn: (property, dateFormat) => {
        // MSSQL uses CONVERT with style numbers
        return `CONVERT(DATETIME, ${property}, 120)`;
    },

    /**
     * MSSQL capabilities
     */
    capabilities: {
        supportsNativeNulls: false,
        supportsWindowFunctions: true, // SQL Server 2005+
        supportsOffset: false,
        supportsLimitOffset: false,
        supportsOffsetFetch: true
    }
};

module.exports = mssqlStrategy;
