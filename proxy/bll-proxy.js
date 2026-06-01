/**
 * BLL Proxy - Main entry point
 * Provides a clean API for executing BLL methods with automatic fallback
 */

const { executeBllMethod } = require('./executor');
const cache = require('./bll-cache');

/**
 * Executes a request through the BLL proxy system
 * @param {Object} container - Application container with adapter and session
 * @param {Object} request - Request object
 * @param {string} request.class - BLL class name
 * @param {string} request.method - Method name to execute
 * @param {Object} request.parameters - Method parameters
 * @returns {Promise<any>} - Execution result
 */
const executeRequest = async (container, request) => {
    const { class: cls, method, parameters } = request;
    try {
        const result = await executeBllMethod(container, cls, method, parameters);
        if (result && result.success === false) {
            console.warn(`Method not found: ${cls}.${method}`);
        }
        return JSON.stringify(result);
    } catch (err) {
        console.error(`Request failed for ${cls}.${method}:`, err.message);
        throw err;
    } finally {
        
    }
};

module.exports = {
    executeRequest,
    cache // Export for monitoring/testing
};