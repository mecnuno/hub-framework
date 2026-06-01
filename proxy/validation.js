/**
 * Validation utilities for BLL proxy
 * Prevents path injection and invalid inputs
 */

const validateClassName = (cls) => {
    if (!cls || typeof cls !== 'string') {
        throw new Error('Class name must be a non-empty string');
    }
    if (!/^[A-Za-z0-9_.]+$/.test(cls)) {
        throw new Error(`Invalid class name: ${cls}`);
    }
    return true;
};

const validateMethodName = (method) => {
    if (!method || typeof method !== 'string') {
        throw new Error('Method name must be a non-empty string');
    }
    if (!/^[A-Za-z0-9_]+$/.test(method)) {
        throw new Error(`Invalid method name: ${method}`);
    }
    return true;
};

module.exports = {
    validateClassName,
    validateMethodName
};
