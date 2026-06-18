const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class OracleDriver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'oracle',
            isTransaction: !!options.isTransaction,
        });
    }

    async query(sql, binds) {
        const sqlText = sql.toString();
        const result = await this.rawDb.execute(sqlText, safeBind(sqlText, binds));

        return {
            type:'read',
            rows: result.rows || [],
            columns: (result.metaData || []).map((c) => ({
                name: c.name,
                type: c.dbType,
            })),
        };
    }

    async execute(sql, binds) {
        const sqlText = sql.toString();
        const result = await this.rawDb.execute(sqlText, safeBind(sqlText, binds), {
            autoCommit: false,
        });

        return {
            type: 'write',
            changes: result.rowsAffected ?? 0,
            returning: [],
        };
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        const result = await this.rawDb.execute(sqlText, safeBind(sqlText, binds), {
            autoCommit: false,
        });

        return {
            type: 'write',
            changes: result.rowsAffected ?? 0,
            returning: result.outBinds ? [result.outBinds] : [],
        };
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for oracle driver');
        }

        return new OracleDriver(this.rawDb, this.dbPool, { isTransaction: true });
    }

    async commit() {
        if (!this.isTransaction) {
            throw new Error('No active transaction to commit');
        }

        await this.rawDb.commit();
    }

    async rollback() {
        if (!this.isTransaction) return;
        await this.rawDb.rollback();
    }

}

module.exports = OracleDriver;
