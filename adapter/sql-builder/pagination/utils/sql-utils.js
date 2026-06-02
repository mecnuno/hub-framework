function stripComments(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
        .replace(/--.*$/gm, '')           // line comments
        .trim();
}

function hasCTE(sql) {
    return /^\s*WITH\s+/i.test(sql);
}

/**
 * Safe CTE splitter (no regex dependency on structure)
 */
function splitCTE(sql) {
    const clean = stripComments(sql);

    if (!hasCTE(clean)) {
        return { ctePart: '', mainPart: clean };
    }

    let depth = 0;
    const upper = clean.toUpperCase();

    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];

        if (ch === '(') depth++;
        if (ch === ')') depth--;

        // detect SELECT at root level
        if (depth === 0 && upper.startsWith("SELECT", i)) {
            return {
                ctePart: clean.substring(0, i),
                mainPart: clean.substring(i)
            };
        }
    }

    return { ctePart: clean, mainPart: '' };
}

function injectCount(sql) {
    const clean = stripComments(sql);
    const { ctePart, mainPart } = splitCTE(clean);

    const fromIndex = mainPart.toUpperCase().indexOf('FROM');
    if (fromIndex === -1) {
        throw new Error("SQL invalid: missing FROM");
    }

    const selectPart = mainPart.substring(0, fromIndex);
    const rest = mainPart.substring(fromIndex);

    return `${ctePart}${selectPart}, COUNT(*) OVER() AS total_count ${rest}`;
}

function removeOrderBy(sql) {
    const clean = stripComments(sql);
    return clean.replace(/ORDER\s+BY\s+[^()]+?(?=$|\)|$)/i, '');
}

function hasSubqueries(sql) {
    const clean = stripComments(sql);
    const count = (clean.match(/\bSELECT\b/gi) || []).length;
    return count > 1 && !hasCTE(clean);
}

function hasJoins(sql) {
    return /\bJOIN\b/i.test(stripComments(sql));
}

function hasGroupBy(sql) {
    return /\bGROUP\s+BY\b/i.test(stripComments(sql));
}

function getCountQuery(sql) {
    const clean = stripComments(sql);

    if (!hasJoins(clean) && !hasGroupBy(clean)) {
        const m = clean.match(/FROM\s+([a-zA-Z0-9_]+)/i);
        if (m) return `SELECT COUNT(*) as total FROM ${m[1]}`;
    }

    return `SELECT COUNT(*) as total FROM (${removeOrderBy(clean)}) t`;
}

module.exports = {
    stripComments,
    hasCTE,
    splitCTE,
    injectCount,
    hasSubqueries,
    hasJoins,
    hasGroupBy,
    removeOrderBy,
    getCountQuery
};