const BaseDriver = require('./base-driver');
const { safeBind } = require('./utils');

class SqlServerDriver extends BaseDriver {
    constructor(rawDb, dbPool, options = {}) {
        super(rawDb, dbPool, {
            type: 'sqlserver',
            isTransaction: !!options.isTransaction,
        });

        this.transaction = options.transaction || null;
    }

    createRequest() {
        if (this.transaction) {
            return new this.rawDb.Request(this.transaction);
        }

        return new this.rawDb.Request();
    }

    bindPositional(request, sql, binds) {
        const values = safeBind(sql, binds);
        if (Array.isArray(values)) {
            values.forEach((value, index) => request.input(`p${index}`, value));
            return;
        }

        Object.entries(values || {}).forEach(([key, value]) => request.input(key, value));
    }

    async query(sql, binds) {
        const sqlText = sql.toString();
        const request = this.createRequest();
        this.bindPositional(request, sqlText, binds);

        const res = await request.query(sqlText);
        const rows = res.recordset || [];

        return {
            type:'read',
            rows,
            columns: Object.keys(rows.columns || {}).map((name) => ({ name, type: 'unknown' })),
        };
    }

    async execute(sql, binds) {
        const sqlText = sql.toString();
        const request = this.createRequest();
        this.bindPositional(request, sqlText, binds);

        const res = await request.query(sqlText);
        const changed = Array.isArray(res.rowsAffected)
            ? res.rowsAffected.reduce((sum, v) => sum + v, 0)
            : 0;

        return {
            type: 'write',
            changes: changed,
            returning: [],
        };
    }

    async returningExecute(sql, binds) {
        const sqlText = sql.toString();
        const request = this.createRequest();
        this.bindPositional(request, sqlText, binds);

        const res = await request.query(sqlText);
        const changed = Array.isArray(res.rowsAffected)
            ? res.rowsAffected.reduce((sum, v) => sum + v, 0)
            : 0;

        return {
            type: 'write',
            changes: changed,
            returning: res.recordset || [],
        };
    }

    async beginTransaction() {
        if (this.isTransaction) {
            throw new Error('Nested transactions are not supported for sqlserver driver');
        }

        const tx = new this.rawDb.Transaction();
        await tx.begin();
        return new SqlServerDriver(this.rawDb, this.dbPool, {
            isTransaction: true,
            transaction: tx,
        });
    }

    async commit() {
        if (!this.isTransaction || !this.transaction) {
            throw new Error('No active transaction to commit');
        }

        await this.transaction.commit();
    }

    async rollback() {
        if (!this.isTransaction || !this.transaction) return;
        await this.transaction.rollback();
    }

}

module.exports = SqlServerDriver;
