const { getStrategy, validDatabaseTypes } = require('./strategy/strategy-registry');
const { validateOptions } = require('./utils/validation');
const { injectCount, extractCTE, hasSubqueries, getCountQuery } = require('./utils/sql-utils');

/**
 * Paginate a SQL query using the appropriate database strategy.
 *
 * This function dynamically applies pagination to a SQL query based on the
 * database type and the provided options. It supports advanced features like
 * custom `ORDER BY` clauses, NULLS ordering, and row number-based pagination
 * for databases that require it.
 *
 * The function validates the input options, determines the query type (e.g., CTE, subquery),
 * and applies the appropriate database-specific strategy for pagination.
 *
 * @param {Object} options - The options for pagination.
 * @param {string} options.sql - The SQL query to paginate.
 * @param {number} options.page - The current page number (1-based index).
 * @param {number} options.pageSize - The number of records per page.
 * @param {Array<Object>} options.orderBy - Array of ordering rules.
 * @param {string} options.orderBy[].property - The column to order by.
 * @param {string} options.orderBy[].direction - The direction of ordering (`ASC` or `DESC`).
 * @param {string} [options.orderBy[].nulls] - NULLS ordering (`first` or `last`).
 * @param {string} [options.orderBy[].dateFormat] - Optional date format for the column.
 * @param {string} options.dbType - The database type (e.g., `postgresql`, `mysql`, `mssql`, etc.).
 * @param {boolean} [options.includeCount=false] - Whether to include a count query for total records.
 * @param {boolean} [options.useRowNumber=false] - Whether to use row number-based pagination (for databases like SQL Server).
 *
 * @returns {string} - The paginated SQL query as a string.
 *
 * @throws {Error} If the options are invalid or the database type is unsupported.
 *
 * @example
 * const options = {
 *   sql: 'SELECT * FROM users',
 *   page: 1,
 *   pageSize: 10,
 *   orderBy: [{ property: 'created_at', direction: 'DESC', nulls: 'last' }],
 *   dbType: 'postgresql',
 *   includeCount: true
 * };
 *
 * const result = paginateQuery(options);
 * console.log(result); // Paginated SQL query
 */
function paginateQuery(options) {
    const { sql, page, pageSize, sort, dbType, includeCount = false, useRowNumber = false } = options;

    // Validate inputs
    const validation = validateOptions(options);
    if (!validation.isValid) {
        throw new Error(`sql-paginate: ${validation.error}`);
    }

    // Detect query type
    const isCTE = /^\s*WITH\s+/i.test(sql);
    const isSubquery = hasSubqueries(sql);

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Get database strategy
    const strategy = getStrategy(dbType);

    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(sort, strategy);

    let modifiedSql = sql;
    const countSupportedDb = includeCount && validDatabaseTypes.includes(dbType.toLowerCase());

    // Handle CTE queries
    if (isCTE) {
        const { ctePart, selectPart } = extractCTE(sql);
        if (ctePart) {
            modifiedSql = countSupportedDb
                ? `${ctePart}SELECT *, COUNT(*) OVER() AS total_count FROM (${selectPart}) AS cte_result`
                : `${ctePart}SELECT * FROM (${selectPart}) AS cte_result`;
        }
    }

    // Handle subqueries
    if (isSubquery && !isCTE) {
        modifiedSql = countSupportedDb
            ? `SELECT *, COUNT(*) OVER() AS total_count FROM (${sql}) AS subquery_result`
            : `SELECT * FROM (${sql}) AS subquery_result`;
    }

    // Modify query for count if requested
    if (!isCTE && !isSubquery && countSupportedDb) {
        modifiedSql = injectCount(sql);
    }

    if(!orderByClause ){
        return sql; // ORDER BY is mandatory for pagination
    }
    
    // Apply pagination using strategy
    if (useRowNumber && strategy.paginateWithRowNumber) {
        return strategy.paginateWithRowNumber(modifiedSql, offset, pageSize, orderByClause);
    } else {
        return strategy.paginate(modifiedSql, offset, pageSize, orderByClause);
    }
}

/**
 * Build ORDER BY clause from array of ordering rules using strategy
 */
function buildOrderByClause(orderBy, strategy) {
    if (!Array.isArray(orderBy)) {
        return '';
    }

    if (orderBy.length === 0) {
        return '1 ASC';
    }
    
    return orderBy
        .map(o => {
            let column = o.dateFormat
                ? strategy.buildDateFormattedColumn(strategy.escapeIdentifier(o.property), o.dateFormat)
                : strategy.escapeIdentifier(o.property);

            // Handle NULLS ordering using strategy
            if (o.nulls) {
                return strategy.buildNullsOrdering(column, o.direction, o.nulls);
            }

            return `${column} ${o.direction}`;
        })
        .join(', ');
}

/**
 * Build paginated query with metadata
 */
function buildPaginatedQuery(options) {
    const countSupportedDb = options.includeCount && validDatabaseTypes.includes(options.dbType.toLowerCase());
    const paginatedSql = paginateQuery(options);
    const countSql = countSupportedDb
        ? null // Count included in main query
        : getCountQuery(options.sql, options.dbType);

    return {
        query: paginatedSql,
        countQuery: countSql,
        page: options.page,
        pageSize: options.pageSize,
        offset: (options.page - 1) * options.pageSize
    };
}


/*
Add Configuration Options:
Allow users to configure defaults (e.g., default pageSize, default dbType) or enable/disable features like automatic count queries.
Example:
javascriptexport function configurePaginate(defaults) {
    return {
        paginateQuery: (options) => paginateQuery({ ...defaults, ...options }),
        paginateComplexQuery: (options) => paginateComplexQuery({ ...defaults, ...options }),
        getCountQuery: (options) => getCountQuery({ ...defaults, ...options }),
    };
}
*/

module.exports = {
    paginateQuery,
    buildPaginatedQuery
};