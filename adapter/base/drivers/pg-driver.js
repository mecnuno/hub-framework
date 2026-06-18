const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class PgDriver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'pg',
            isTransaction: !!options.isTransaction,
        });
    }

    async query(sql, binds) {
        const sqlText = sql.toString();
        const res = await this.rawDb.query(sqlText, safeBind(sqlText, binds));

        return {
            type:'read',
            rows: res.rows,
            columns: res.fields?.map((f) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
            })) ?? [],
        };
    }

    async execute(sql, binds) {
        const sqlText = sql.toString();
        const res = await this.rawDb.query(sqlText, safeBind(sqlText, binds));

        return {
            type: 'write',
            changes: res.rowCount ?? 0,
            returning: [],
        };
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        let finalSql = sqlText;

        if (!/returning/i.test(finalSql) && /^(\s)*(insert|update|delete)\b/i.test(finalSql)) {
            finalSql = finalSql.replace(/;\s*$/, '') + ' RETURNING *';
        }

        const res = await this.rawDb.query(finalSql, safeBind(sqlText, binds));

        return {
            type: 'write',
            changes: res.rowCount ?? 0,
            returning: res.rows ?? [],
        };
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for pg driver');
        }

        await this.rawDb.query('BEGIN');
        return new PgDriver(this.rawDb, this.dbPool, { isTransaction: true });
    }

    async commit() {
        if (!this.isTransaction) {
            throw new Error('No active transaction to commit');
        }

        await this.rawDb.query('COMMIT');
    }

    async rollback() {
        if (!this.isTransaction) return;
        await this.rawDb.query('ROLLBACK');
    }

}

module.exports = PgDriver;
