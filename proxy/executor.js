/**
 * Execution logic for BLL methods and fallback
 */

const { join } = require('path');
const cache = require('./bll-cache');
const { discoverRoute, isNotFoundError } = require('./discovery');
const { validateClassName, validateMethodName } = require('./validation');

/**
 * Executes a BLL method with caching and fallback support
 * @param {Object} adapter - Database adapter instance
 * @param {string} cls - Class name
 * @param {string} method - Method name
 * @param {Object} parameters - Method parameters
 * @returns {Promise<any>} - Method result
 */
const executeBllMethod = async (container, cls, method, parameters) => {
    validateClassName(cls);
    validateMethodName(method);

    // Check cache first (FAST PATH)
    let route = cache.getRoute(cls, method);

    // If not cached, discover (SLOW PATH - but only once per method)
    if (!route) {
        const modulePath = join(container.bllDirectory, `${cls.replace(/\./g, '/')}.js`);
        route = discoverRoute(cls, method, modulePath);
        cache.setRoute(cls, method, route);
    }

    if (route === 'missing') {
        // Return error object instead of throwing
        return {
            success: false,
            error: 'METHOD_NOT_FOUND',
            message: `Method ${cls}.${method} is not available`,
            class: cls,
            method: method
        };
    }
    
    if (route === 'bll') {
        try {
            const Module = cache.getModule(cls);
            const instance = await new Module(container, parameters);
            return await instance.withAdapter(() => instance.withTransaction(() => instance[method]()));
        } catch (err) {
            // Real error during execution (not discovery)
            console.error(`BLL execution error in ${cls}.${method}:`, err);
            throw err;
        }
    } else if (route === 'fallback') {
        return await executeFallback(container, cls, method, parameters);
    } 
    // This should never happen, but just in case
    return {
        success: false,
        error: 'UNKNOWN_ROUTE',
        message: `Unknown route type: ${route}`,
        class: cls,
        method: method
    };
};

/**
 * Executes fallback SQL method and detects if truly missing
 * @param {Object} container - Container instance
 * @param {string} cls - Class name (for error reporting)
 * @param {string} method - Method name
 * @param {Object} parameters - Method parameters
 * @returns {Promise<any>} - Method result
 */
const executeFallback = async (container, cls, method, parameters) => {
    const  runSqlMethod  = require('../bll/bll-method-resolver');

    try {
        return await runSqlMethod(container, method, parameters);
    } catch (err) {
        // Check if it's a "not found" error vs execution error
        if (isNotFoundError(err)) {
            // Mark as truly missing - neither BLL nor SQL exists
            cache.setRoute(cls, method, 'missing');
            throw new Error(`Method ${cls}.${method} not found in BLL or fallback SQL`);
        }
        // Real execution error - don't mark as missing, just propagate
        throw err;
    }
};

module.exports = {
    executeBllMethod,
    executeFallback
};