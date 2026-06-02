const { getStrategy, validDatabaseTypes } = require('./strategy/strategy-registry');
const { validateOptions } = require('./utils/validation');
const {
    splitCTE,
    injectCount,
    hasSubqueries,
    getCountQuery,
    stripComments
} = require('./utils/sql-utils');

function paginateQuery(options) {
    const { sql, page, pageSize, sort, dbType, includeCount = false, useRowNumber = false } = options;

    if (!sql || typeof sql !== 'string') {
        throw new Error("Invalid SQL input");
    }

    const validation = validateOptions(options);
    if (!validation.isValid) {
        throw new Error(`sql-paginate: ${validation.error}`);
    }

    const cleanSql = stripComments(sql);
    const isCTE = /^\s*WITH\s+/i.test(cleanSql);
    const isSubquery = hasSubqueries(cleanSql);

    const offset = (page - 1) * pageSize;
    const strategy = getStrategy(dbType);

    const orderByClause = buildOrderByClause(sort, strategy);
    if (!orderByClause) return sql;

    const countSupported =
        includeCount &&
        validDatabaseTypes.includes(dbType.toLowerCase());

    let modifiedSql = cleanSql;

    /**
     * CTE handling
     */
    if (isCTE) {
        const { ctePart, mainPart } = splitCTE(cleanSql);

        modifiedSql = countSupported
            ? `${ctePart}SELECT *, COUNT(*) OVER() AS total_count FROM (${mainPart}) x`
            : `${ctePart}SELECT * FROM (${mainPart}) x`;
    }

    /**
     * Subquery handling
     */
    else if (isSubquery) {
        modifiedSql = countSupported
            ? `SELECT *, COUNT(*) OVER() AS total_count FROM (${cleanSql}) x`
            : `SELECT * FROM (${cleanSql}) x`;
    }

    /**
     * Simple query
     */
    else if (countSupported) {
        modifiedSql = injectCount(cleanSql);
    }

    if (useRowNumber && strategy.paginateWithRowNumber) {
        return strategy.paginateWithRowNumber(modifiedSql, offset, pageSize, orderByClause);
    }

    return strategy.paginate(modifiedSql, offset, pageSize, orderByClause);
}

function buildOrderByClause(orderBy, strategy) {
    if (!Array.isArray(orderBy) || orderBy.length === 0) {
        return '1 ASC';
    }

    return orderBy.map(o => {
        let column = o.dateFormat
            ? strategy.buildDateFormattedColumn(strategy.escapeIdentifier(o.property), o.dateFormat)
            : strategy.escapeIdentifier(o.property);

        if (o.nulls) {
            return strategy.buildNullsOrdering(column, o.direction, o.nulls);
        }

        return `${column} ${o.direction}`;
    }).join(', ');
}

function buildPaginatedQuery(options) {
    const countSupported =
        options.includeCount &&
        validDatabaseTypes.includes(options.dbType.toLowerCase());

    return {
        query: paginateQuery(options),
        countQuery: countSupported ? null : getCountQuery(options.sql),
        page: options.page,
        pageSize: options.pageSize,
        offset: (options.page - 1) * options.pageSize
    };
}

/**
 * Optional safety wrapper (HIGHLY recommended)
 */
function safePaginate(fn, fallbackFn) {
    return function (options) {
        try {
            return fn(options);
        } catch (err) {
            console.error("SQL paginate fallback triggered:", err.message);
            return fallbackFn(options);
        }
    };
}

module.exports = {
    paginateQuery,
    buildPaginatedQuery,
    safePaginate
};