const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class Mysql2Driver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'mysql2',
            isTransaction: !!options.isTransaction,
        });

        this.mysql = rawDb.promise();
    }

    async query(sql, binds) {
        const sqlText = sql.toString();
        const [rows, fields] = await this.mysql.execute(sqlText, safeBind(sqlText, binds));

        return {
            type:'read',
            rows,
            columns: fields.map((f) => ({
                name: f.name,
                type: f.columnType,
            })),
        };
    }

    async execute(sql, binds) {
        const sqlText = sql.toString();
        const [result] = await this.mysql.execute(sqlText, safeBind(sqlText, binds));

        return {
            type: 'write',
            changes: result.affectedRows ?? 0,
            returning: [],
        };
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        const [result] = await this.mysql.execute(sqlText, safeBind(sqlText, binds));

        return {
            type: 'write',
            changes: result.affectedRows ?? 0,
            returning: result.insertId !== undefined ? [{ insertId: result.insertId }] : [],
        };
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for mysql2 driver');
        }

        await this.mysql.beginTransaction();
        return new Mysql2Driver(this.rawDb, this.dbPool, { isTransaction: true });
    }

    async commit() {
        if (!this.isTransaction) {
            throw new Error('No active transaction to commit');
        }

        await this.mysql.commit();
    }

    async rollback() {
        if (!this.isTransaction) return;
        await this.mysql.rollback();
    }

}

module.exports = Mysql2Driver;
