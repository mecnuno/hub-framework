const BaseFormatter = require('./base-formatter');


class TabularJsonFormatter extends BaseFormatter {
    format(data) {
        const ret = { success: true, resultStatus: true, columns: [], rows: [], total: 0 };

        if (data && data.type === 'read') {
            let columns = data.columns || [],
                rows = data.rows || [];
            const formattedColumns = columns.map(col => ({ 
                name: col.name.toUpperCase(), 
                type: this.#inferType(col.type)
            }));
            const formattedRows = rows.map(row => columns.map(col => row[col.name]));
            return {
                ...ret,
                columns: formattedColumns,
                rows: formattedRows,
                total: formattedRows.length
            };
        }

        if (data && typeof data === 'object' && typeof data.changes === 'number') {
            return {
                ...ret,
                rowCount: data.changes,
                columns: [],
                rows: [],
                total: 0
            };
        }

        if (!Array.isArray(data) || data.length === 0) {
            return { ...ret, ...data, rowCount: data && data.changes };
        }

        const sample = data[0];
        let columns = Object.keys(sample).map(key => ({
            name: key.toUpperCase(),
            type: 'string',
            key
        }));
        const rows = data.map(row => columns.map(col => row[col.key]));
        columns.forEach(col => delete col.key);
        return { ...ret, columns, rows, total: data.length };
    }

    #inferType(typeToInfer) {
        if (!typeToInfer) return 'string';

        const t = typeToInfer.toLowerCase();
        if (['int', 'real', 'floa', 'doub'].some(k => t.includes(k))) return 'number';
        if (['char', 'clob', 'text'].some(k => t.includes(k))) return 'string';
        if (t.includes('blob')) return 'buffer';
        if (t.includes('bool')) return 'boolean';
        if (t.includes('date')) return 'date';
        if (t.includes('time')) return 'datetime';
        return 'string';
    }
}



module.exports = TabularJsonFormatter;


/*

      #inferType(data, key) {
        for (let row of data) {
            const value = row[key];
            if (value === null || value === undefined) continue;

            const t = typeof value;
            if (t === "number" || t === "boolean" || t === "string") {
                return t;
            }
            if (value instanceof Date) return "date";
            if (Array.isArray(value)) return "array";
            return "object";
        }

        return "string"; // fallback
    }
 
 */