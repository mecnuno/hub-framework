const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class TursoDriver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'turso',
            isTransaction: !!options.isTransaction,
        });

        this.executor = options.executor || rawDb;
    }

    async query(sql, binds) {
        const sqlText = sql.toString();
        const result = await this.executor.execute({
            sql: sqlText,
            args: safeBind(sqlText, binds) || [],
        });

        return {
            type:'read',
            rows: result.rows ?? [],
            columns: (result.columns || []).map((name) => ({
                name,
                type: 'unknown',
            })),
        };
    }

    async execute(sql, binds) {
        const sqlText = sql.toString();
        const result = await this.executor.execute({
            sql: sqlText,
            args: safeBind(sqlText, binds) || [],
        });

        return {
            type: 'write',
            changes: result.rowsAffected ?? 0,
            returning: [],
        };
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        let finalSql = sqlText;

        if (!/returning/i.test(finalSql) && /^(\s)*(insert|update|delete)\b/i.test(finalSql)) {
            finalSql = finalSql.replace(/;\s*$/, '') + ' RETURNING *';
        }

        const result = await this.executor.execute({
            sql: finalSql,
            args: safeBind(sqlText, binds) || [],
        });

        return {
            type: 'write',
            changes: result.rowsAffected ?? 0,
            returning: result.rows ?? [],
        };
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for turso driver');
        }

        const tx = await this.rawDb.transaction('write');
        return new TursoDriver(this.rawDb, this.dbPool, {
            isTransaction: true,
            executor: tx,
        });
    }

    async commit() {
        if (!this.isTransaction) {
            throw new Error('No active transaction to commit');
        }

        await this.executor.commit();
        if (typeof this.executor.close === 'function') {
            this.executor.close();
        }
    }

    async rollback() {
        if (!this.isTransaction) return;
        await this.executor.rollback();
        if (typeof this.executor.close === 'function') {
            this.executor.close();
        }
    }

    async close() {
        if (this.isTransaction) {
            if (this.executor && this.executor !== this.rawDb && typeof this.executor.close === 'function') {
                this.executor.close();
            }
            return;
        }

        await super.close();
    }
}

module.exports = TursoDriver;
