const { validDatabaseTypes } = require('../strategy/strategy-registry');

/**
 * Validation Utilities
 * Input validation and error handling functions
 */

/**
 * Enhanced validation for NULLS ordering
 * @param {Array} orderBy - Array of ordering rules
 * @returns {Object} Validation result
 */
function validateNullsOrdering(orderBy) {
    for (const order of orderBy) {
        if (order.nulls) {
            const nullsPos = order.nulls.toLowerCase();
            if (!['first', 'last'].includes(nullsPos)) {
                return {
                    isValid: false,
                    error: 'nulls position must be either "first" or "last"'
                };
            }

            // Additional validation: warn about potential performance issues
            if (order.property && typeof order.property === 'string' && order.property.includes('(')) {
                console.warn('Warning: Using functions in ORDER BY with NULLS may impact performance');
            }
        }
    }
    return { isValid: true };
}

/**
 * Validate input options for pagination
 * @param {Object} options - Pagination options
 * @returns {Object} Validation result
 */
function validateOptions(options) {
    if (!options.sql || typeof options.sql !== 'string') {
        return { isValid: false, error: 'SQL query is required and must be a string' };
    }

    if (!options.page || options.page < 1) {
        return { isValid: false, error: 'Page must be a positive integer starting from 1' };
    }

    if (!options.pageSize || options.pageSize < 1) {
        return { isValid: false, error: 'Page size must be a positive integer' };
    }

    // Set default orderBy if empty
    if (!Array.isArray(options.orderBy) || options.orderBy.length === 0) {
        options.orderBy = [{ property: '1', direction: 'DESC' }];
    }

    for (const order of options.orderBy) {
        if (!order.property || !order.direction) {
            return { isValid: false, error: 'Each ORDER BY must have property and direction' };
        }
        if (!['ASC', 'DESC'].includes(order.direction.toUpperCase())) {
            return { isValid: false, error: 'Direction must be ASC or DESC' };
        }
        if (order.dateFormat && typeof order.dateFormat !== 'string') {
            return { isValid: false, error: 'dateFormat must be a string' };
        }
    }

    // Enhanced NULLS validation
    const nullsValidation = validateNullsOrdering(options.orderBy);
    if (!nullsValidation.isValid) {
        return nullsValidation;
    }

    if (!validDatabaseTypes.includes(options.dbType?.toLowerCase())) {
        return { isValid: false, error: `Database type must be one of: ${validDatabaseTypes.join(', ')}` };
    }

    return { isValid: true };
}

/**
 * Validate database strategy implementation
 * @param {Object} strategy - Database strategy object
 * @returns {Object} Validation result
 */
function validateStrategy(strategy) {
    if (!strategy || typeof strategy !== 'object') {
        return { isValid: false, error: 'Strategy must be an object' };
    }

    const requiredMethods = [
        'escapeIdentifier',
        'paginate',
        'buildNullsOrdering',
        'buildDateFormattedColumn'
    ];

    for (const method of requiredMethods) {
        if (typeof strategy[method] !== 'function') {
            return {
                isValid: false,
                error: `Strategy must implement ${method} method`
            };
        }
    }

    const optionalMethods = ['paginateWithRowNumber'];
    for (const method of optionalMethods) {
        if (strategy[method] && typeof strategy[method] !== 'function') {
            return {
                isValid: false,
                error: `Strategy ${method} must be a function if provided`
            };
        }
    }

    if (strategy.capabilities && typeof strategy.capabilities !== 'object') {
        return {
            isValid: false,
            error: 'Strategy capabilities must be an object'
        };
    }

    return { isValid: true };
}

module.exports = {
    validateNullsOrdering,
    validateOptions,
    validateStrategy
};