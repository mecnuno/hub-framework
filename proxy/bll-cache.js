/**
 * BllCache - Caches route discovery and module loading
 * Routes: 'bll' | 'fallback' | 'missing'
 */
class BllCache {
    constructor() {
        // Cache structure: { 'ClassName.methodName': 'bll' | 'fallback' | 'missing' }
        this.routeCache = new Map();
        // Module cache for loaded BLL classes
        this.moduleCache = new Map();
    }

    getRoute(cls, method) {
        const key = `${cls}.${method}`;
        return this.routeCache.get(key);
    }

    setRoute(cls, method, type) {
        const key = `${cls}.${method}`;
        this.routeCache.set(key, type);
    }

    getModule(cls) {
        return this.moduleCache.get(cls);
    }

    setModule(cls, Module) {
        this.moduleCache.set(cls, Module);
    }

    clearModule(cls) {
        this.moduleCache.delete(cls);
        // Also clear all routes for this class
        for (const [key] of this.routeCache) {
            if (key.startsWith(`${cls}.`)) {
                this.routeCache.delete(key);
            }
        }
    }

    clear() {
        this.routeCache.clear();
        this.moduleCache.clear();
    }

    getStats() {
        return {
            routes: this.routeCache.size,
            modules: this.moduleCache.size,
            breakdown: {
                bll: Array.from(this.routeCache.values()).filter(v => v === 'bll').length,
                fallback: Array.from(this.routeCache.values()).filter(v => v === 'fallback').length,
                missing: Array.from(this.routeCache.values()).filter(v => v === 'missing').length
            }
        };
    }
}

// Export singleton instance
module.exports = new BllCache();