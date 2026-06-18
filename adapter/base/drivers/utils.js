// Helper functions moved outside the main loop for better memory efficiency
const isNameStart = (ch) => /[A-Za-z_]/.test(ch);
const isNameChar = (ch) => /[A-Za-z0-9_]/.test(ch);

function extractNamedParams(sql, params = {}) {
    if (!params || typeof params !== 'object') return {};

    const used = findNamedPlaceholders(sql);
    const filtered = {};

    for (const key of used) {
        if (params[key] !== undefined) {
            filtered[key] = params[key];
        } else {
            // Throws an error to prevent silent failures when a parameter is missing
            throw new Error(`Missing value for SQL parameter: :${key}`);
        }
    }

    return filtered;
}

function safeBind(sql, binds) {
    if (!binds) return undefined;

    if (Array.isArray(binds)) return binds;

    if (typeof binds === 'object') {
        return extractNamedParams(sql, binds);
    }

    return undefined;
}

function findNamedPlaceholders(sql) {
    const used = new Set();
    if (typeof sql !== 'string' || sql.length === 0) {
        return used;
    }

    let i = 0;
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    while (i < sql.length) {
        const ch = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            if (ch === '\n') {
                inLineComment = false;
            }
            i += 1;
            continue;
        }

        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if (inSingle) {
            if (ch === "'" && next === "'") {
                i += 2;
                continue;
            }
            if (ch === "'") {
                inSingle = false;
                i += 1;
                continue;
            }
            if (ch === '\\' && next !== undefined) {
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if (inDouble) {
            if (ch === '"' && next === '"') {
                i += 2;
                continue;
            }
            if (ch === '"') {
                inDouble = false;
                i += 1;
                continue;
            }
            // Added backslash escaping to double quotes for consistency
            if (ch === '\\' && next !== undefined) {
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if (inBacktick) {
            if (ch === '`') {
                inBacktick = false;
            }
            i += 1;
            continue;
        }

        if (ch === '-' && next === '-') {
            inLineComment = true;
            i += 2;
            continue;
        }

        if (ch === '/' && next === '*') {
            inBlockComment = true;
            i += 2;
            continue;
        }

        if (ch === "'") {
            inSingle = true;
            i += 1;
            continue;
        }

        if (ch === '"') {
            inDouble = true;
            i += 1;
            continue;
        }

        if (ch === '`') {
            inBacktick = true;
            i += 1;
            continue;
        }

        if (ch === ':') {
            // Skips PostgreSQL type casting (e.g., ::text)
            if (next === ':') {
                i += 2;
                continue;
            }

            if (isNameStart(next)) {
                let j = i + 2;
                while (j < sql.length && isNameChar(sql[j])) {
                    j += 1;
                }
                used.add(sql.slice(i + 1, j));
                i = j;
                continue;
            }
        }

        i += 1;
    }

    return used;
}

module.exports = {
    extractNamedParams,
    safeBind,
};
