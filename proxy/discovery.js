/**
 * Route discovery logic
 * Determines if a method should use BLL or fallback
 */

const fs = require('fs');
const cache = require('./bll-cache');

/**
 * Discovers the route for a given class/method combination
 * @param {string} cls - Class name
 * @param {string} method - Method name
 * @param {string} modulePath - Full path to the module file
 * @returns {'bll'|'fallback'} - Route type
 */
const discoverRoute = (cls, method, modulePath) => {
    // Check if file exists
    if (!fs.existsSync(modulePath)) {
        return 'fallback'; // File doesn't exist, use fallback
    }

    try {
        // Load module (cached by Node.js)
        let Module = cache.getModule(cls);

        if (!Module) {
            // For development: optionally clear require cache
            // delete require.cache[require.resolve(modulePath)];
            Module = require(modulePath);
            cache.setModule(cls, Module);
        }

        // Check if method exists without instantiation
        const prototype = Module.prototype || Module;
        if (typeof prototype[method] === 'function' ||
            typeof Module[method] === 'function') {
            return 'bll';
        }

        return 'fallback'; // Method doesn't exist
    } catch (err) {
        console.warn(`Failed to load module ${cls}:`, err.message);
        return 'fallback';
    }
};

/**
 * Detects if an error indicates a method was not found
 * Customize these patterns based on your SQL adapter's errors
 * @param {Error} err - Error object
 * @returns {boolean} - True if this is a "not found" error
 */
const isNotFoundError = (err) => {
    const notFoundPatterns = [
        /not found/i,
        /does not exist/i,
        /unknown method/i,
        /no such/i,
        /ENOENT/,
        // Add your specific SQL adapter error patterns here
    ];

    return notFoundPatterns.some(pattern => pattern.test(err.message));
};

module.exports = {
    discoverRoute,
    isNotFoundError
};