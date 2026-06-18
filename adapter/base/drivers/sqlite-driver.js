const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class SqliteDriver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'sqlite',
            isTransaction: !!options.isTransaction,
        });
    }

    // better-sqlite3 prepare() returns a persistent C++ Statement object.
    // Override withStatement to ensure it is always freed after use.
    async withStatement(sql, binds, callback) {
        const sqlText = sql.toString();
        const stmt = this.rawDb.prepare(sqlText);
        try {
            return await callback({ stmt, sqlText, binds });
        } finally {
            if(stmt.close)
            stmt.close();
        }
    }

    async query(sql, binds) {
        return this.withStatement(sql, binds, ({ stmt, sqlText }) => {
            const rows = stmt.all(safeBind(sqlText, binds));
            const columns = stmt.columns().map((c) => ({
                name: c.name,
                type: c.type,
            }));

            return { type: 'read', rows, columns };
        });
    }

    async execute(sql, binds) {
        return this.withStatement(sql, binds, ({ stmt, sqlText }) => {
            const result = stmt.run(safeBind(sqlText, binds));

            return {
                type: 'write',
                changes: result.changes ?? 0,
                returning: [],
            };
        });
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        let finalSql = sqlText;

        if (!/returning/i.test(finalSql) && /^(\s)*(insert|update|delete)\b/i.test(finalSql)) {
            finalSql = finalSql.replace(/;\s*$/, '') + ' RETURNING *';
        }

        // Pass finalSql to withStatement (so the right SQL is prepared),
        // but use original sqlText for safeBind (param style detection).
        return this.withStatement(finalSql, binds, ({ stmt }) => {
            const rows = stmt.all(safeBind(sqlText, binds));

            return {
                type: 'write',
                changes: rows.length,
                returning: rows,
            };
        });
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for sqlite driver');
        }

        this.rawDb.exec('BEGIN');
        return new SqliteDriver(this.rawDb, this.dbPool, { isTransaction: true });
    }

    async commit() {
        if (!this.isTransaction) {
            throw new Error('No active transaction to commit');
        }

        this.rawDb.exec('COMMIT');
    }

    async rollback() {
        if (!this.isTransaction) return;
        this.rawDb.exec('ROLLBACK');
    }

}

module.exports = SqliteDriver;
