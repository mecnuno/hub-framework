/**
 * MySQL Database Strategy
 * Handles MySQL-specific SQL generation, escaping, and pagination
 */

/**
 * Convert date format strings for MySQL
 */
function convertDateFormatMySQL(format) {
    const formatMap = {
        'YYYY-MM-DD': '%Y-%m-%d',
        'YYYY-MM-DD HH24:MI:SS': '%Y-%m-%d %H:%i:%s',
        'DD/MM/YYYY': '%d/%m/%Y'
    };
    return formatMap[format] || format;
}

/**
 * MySQL strategy implementation
 */
const mysqlStrategy = {
    name: 'mysql',

    /**
     * Escape SQL identifiers using backticks
     */
    escapeIdentifier: (identifier) => {
        if (typeof identifier !== 'string') {
            throw new Error('Identifier must be a string');
        }

        // Check if already properly quoted
        if (identifier.startsWith('`') && identifier.endsWith('`')) {
            return identifier;
        }

        return `\`${identifier.replace(/`/g, '``')}\``;
    },

    /**
     * MySQL pagination using LIMIT offset, count
     */
    paginate: (sql, offset, limit, orderByClause) => {
        const orderedSql = `${sql} ORDER BY ${orderByClause}`;
        return `${orderedSql} LIMIT ${offset}, ${limit}`;
    },

    /**
     * MySQL ROW_NUMBER() window function pagination (MySQL 8.0+)
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
     * MySQL NULLS emulation using ISNULL() function
     */
    buildNullsOrdering: (column, direction, nullsPosition) => {
        const nullsPos = nullsPosition.toLowerCase();
        if (nullsPos === 'first') {
            return direction === 'ASC'
                ? `ISNULL(${column}) DESC, ${column} ${direction}`
                : `ISNULL(${column}) DESC, ${column} ${direction}`;
        } else {
            return direction === 'ASC'
                ? `ISNULL(${column}) ASC, ${column} ${direction}`
                : `ISNULL(${column}) ASC, ${column} ${direction}`;
        }
    },

    /**
     * MySQL date formatting using STR_TO_DATE
     */
    buildDateFormattedColumn: (property, dateFormat) => {
        const mysqlFormat = convertDateFormatMySQL(dateFormat);
        return `STR_TO_DATE(${property}, '${mysqlFormat}')`;
    },

    /**
     * MySQL capabilities
     */
    capabilities: {
        supportsNativeNulls: false,
        supportsWindowFunctions: true, // MySQL 8.0+
        supportsOffset: false,
        supportsLimitOffset: true,
        supportsOffsetFetch: false
    }
};

module.exports = mysqlStrategy;