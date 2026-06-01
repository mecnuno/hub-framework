/**
 * SQL Utility Functions
 * Shared functions for SQL manipulation and analysis
 */

/**
 * Check if SQL has ORDER BY clause in the outer query
 * @param {string} sql - SQL query to check
 * @returns {boolean} True if has ORDER BY, false otherwise
 */
function hasOrderBy(sql) {
    const normalizedSql = sql.toUpperCase();
    const lastSelectIndex = normalizedSql.lastIndexOf('SELECT');
    const sqlAfterLastSelect = normalizedSql.substring(lastSelectIndex);

    // Improved regex: matches ORDER BY not inside subqueries or CTEs
    const orderByRegex = /ORDER\s+BY\s+[^()]+?(?=$|\s+(LIMIT|OFFSET|FETCH|FOR|\)|\s*$))/i;
    return orderByRegex.test(sqlAfterLastSelect);
}

/**
 * Inject ORDER BY into SQL query
 * @param {string} sql - Original SQL query
 * @param {string} orderByClause - ORDER BY clause to inject
 * @returns {string} SQL with ORDER BY clause
 */
function injectOrderBy(sql, orderByClause) {
    // Remove trailing semicolon
    const cleanSql = sql.trim().replace(/;+$/, '');

    // Check if ORDER BY exists in the outer query
    const lastSelectIndex = cleanSql.toLowerCase().lastIndexOf('select');
    const fromLastSelect = cleanSql.substring(lastSelectIndex);

    // Improved regex to avoid inner ORDER BY
    const orderByRegex = /ORDER\s+BY\s+[^()]+?(?=$|\s+(LIMIT|OFFSET|FETCH|FOR|\)|\s*$))/i;
    if (orderByRegex.test(fromLastSelect)) {
        return cleanSql.replace(orderByRegex, `ORDER BY ${orderByClause}`);
    }

    return `${cleanSql} ORDER BY ${orderByClause}`;
}

/**
 * Inject COUNT(*) OVER() for supported databases
 * @param {string} sql - Original SQL query
 * @returns {string} SQL with COUNT(*) OVER() injected
 */
function injectCount(sql) {
    const cleanSql = sql.trim().replace(/;+$/, '');
    let withPart = '';
    let mainQuery = cleanSql;

    // Handle CTEs
    if (/^\s*WITH\s+/i.test(cleanSql)) {
        const withEndIndex = findWithSelectEnd(cleanSql);
        withPart = cleanSql.substring(0, withEndIndex);
        mainQuery = cleanSql.substring(withEndIndex);
    }

    // Find first FROM to inject count
    const fromIndex = mainQuery.toLowerCase().indexOf('from');
    if (fromIndex === -1) {
        throw new Error('Invalid SQL: No FROM clause found');
    }

    // Inject count after SELECT
    const selectEnd = mainQuery.indexOf(',', 6) > -1 && mainQuery.indexOf(',', 6) < fromIndex
        ? mainQuery.indexOf(',', 6)
        : mainQuery.indexOf('FROM', 6);
    return `${withPart}${mainQuery.substring(0, selectEnd)}, COUNT(*) OVER() AS total_count ${mainQuery.substring(selectEnd)}`;
}

/**
 * Find end of WITH clause (similar to Java's withSelectFinder)
 * @param {string} sql - SQL query with CTE
 * @returns {number} Index where WITH clause ends
 */
function findWithSelectEnd(sql) {
    let i = 0;
    const upperSql = sql.toUpperCase();
    while (true) {
        const selectIndex = upperSql.indexOf('SELECT', i);
        if (selectIndex === -1) return 0;

        let found = false;
        for (let j = selectIndex - 1; j >= 0; j--) {
            if (/\s/.test(upperSql[j])) continue;
            if (upperSql[j] === ')') {
                found = true;
                break;
            } else {
                break;
            }
        }
        if (found) {
            return selectIndex;
        }
        i = selectIndex + 1;
    }
}

/**
 * Check if SQL has subqueries
 * @param {string} sql - SQL query to check
 * @returns {boolean} True if has subqueries, false otherwise
 */
function hasSubqueries(sql) {
    const selectCount = (sql.match(/SELECT/gi) || []).length;
    return selectCount > 1;
}


/**
 * Check for JOINs in SQL
 * @param {string} sql - SQL query to check
 * @returns {boolean} True if has JOINs, false otherwise
 */
function hasJoins(sql) {
    return /\bJOIN\b/i.test(sql);
}

/**
 * Check for GROUP BY in SQL
 * @param {string} sql - SQL query to check
 * @returns {boolean} True if has GROUP BY, false otherwise
 */
function hasGroupBy(sql) {
    return /\bGROUP\s+BY\b/i.test(sql);
}

/**
 * Remove ORDER BY from query
 * @param {string} sql - SQL query
 * @returns {string} SQL without ORDER BY clause
 */
function removeOrderBy(sql) {
    const cleanSql = sql.trim().replace(/;+$/, '');
    const orderByRegex = /ORDER\s+BY\s+[^()]+?(?=$|\s+(LIMIT|OFFSET|FETCH|FOR|\)|\s*$))/i;
    return cleanSql.replace(orderByRegex, '');
}

/**
 * Generate count query for pagination
 * @param {string} sql - Original SQL query
 * @param {string} dbType - Database type
 * @returns {string} Count query
 */
function getCountQuery(sql, dbType) {
    const simpleSelectRegex = /^SELECT\s+(?:\*|[\w\s,.*]+)\s+FROM\s+(\w+)/i;
    const match = sql.match(simpleSelectRegex);

    if (match && !hasJoins(sql) && !hasGroupBy(sql)) {
        return `SELECT COUNT(*) as total FROM ${match[1]}`;
    }

    const sqlWithoutOrder = removeOrderBy(sql);
    return `SELECT COUNT(*) as total FROM (${sqlWithoutOrder}) AS count_query`;
}

/**
 * Extract CTE and main query parts
 * @param {string} sql - SQL query with potential CTE
 * @returns {Object} Object with ctePart and selectPart
 */
function extractCTE(sql) {
    const cteMatch = sql.match(/^(\s*WITH\s+.+?\s+)(\s*SELECT\s+.+)$/is);
    if (!cteMatch) {
        return { ctePart: '', selectPart: sql };
    }

    const [, ctePart, selectPart] = cteMatch;
    return { ctePart, selectPart };
}

/**
 * Check if query starts with CTE
 * @param {string} sql - SQL query to check
 * @returns {boolean} True if starts with CTE, false otherwise
 */
function hasCTE(sql) {
    return /^\s*WITH\s+/i.test(sql);
}

module.exports = {
    hasOrderBy,
    injectOrderBy,
    injectCount,
    hasSubqueries,
    hasJoins,
    hasGroupBy,
    removeOrderBy,
    getCountQuery,
    extractCTE,
    hasCTE
};
