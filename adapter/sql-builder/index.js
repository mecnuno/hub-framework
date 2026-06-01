const { paginateQuery } = require('./pagination/pagination-factory');

class SQL {
    constructor(binds = {}) {
        this.query = '';
        this.binds = binds;
    }

    _assertNoInterpolation(values) {
        if (values.length > 0) {
            throw new Error('SQL: Direct interpolation not supported. Use bind parameters (:name) instead.');
        }
    }

    _extractBindNames(str) {
        return [...str.matchAll(/:(\w+)/g)].map(m => m[1]);
    }

    _hasBinds(bindNames) {
        return bindNames.every(bind => this.binds[bind] != null);
    }

    _append(str) {
        this.query += str;
        return this;
    }

    _appendIf(condition, str) {
        if (condition) {
            this.query += str;
        }
        return this;
    }

    _(strings, ...values) {
        this._assertNoInterpolation(values);
        return this._append(strings[0]);
    }

    _$(arg, ...args) {
        // Usage: _$`...`
        if (Array.isArray(arg) && arg.raw) {
            this._assertNoInterpolation(args);

            const str = arg[0];
            const binds = this._extractBindNames(str);

            return this._appendIf(
                binds.length === 0 || this._hasBinds(binds),
                str
            );
        }

        // Usage: _$('status')`...`
        // Usage: _$('fromDate', 'toDate')`...`
        const requiredBinds = [arg, ...args];

        return (strings, ...values) => {
            this._assertNoInterpolation(values);

            return this._appendIf(
                this._hasBinds(requiredBinds),
                strings[0]
            );
        };
    }

    _$n(strings, ...values) {
        this._assertNoInterpolation(values);

        let str = strings[0];
        const binds = this._extractBindNames(str);

        if (binds.length === 0 || this._hasBinds(binds)) {
            return this._append(str);
        }

        binds.forEach(bind => {
            if (this.binds[bind] == null) {
                str = str.replace(`:${bind}`, 'NULL');
            }
        });

        return this._append(str);
    }

    toString() {
        return this.query;
    }

    /**
     * Shape the binds object into the format required by paginateQuery.
     * @returns {Object} - The shaped options object.
     */
    _shapePaginationOptions() {
        return {
            sql: this.query, // Use the current query as the base SQL
            page: this.binds.page || 1,
            pageSize: this.binds.pageSize || 1000,
            sort: this.binds.sort || [], // Default to an empty array if not provided
            dbType: this.binds.dbType,
            includeCount: this.binds.includeCount || false,
            useRowNumber: this.binds.useRowNumber || false
        };
    }

    /**
     * Add pagination to the query using existing pagination logic.
     * Assumes `binds` contains all required pagination options.
     * @returns {SqlBuilder} - The current SqlBuilder instance.
     */
    paginate() {
        const options = this._shapePaginationOptions(); // Shape the binds into the required format
        this.query = paginateQuery(options); // Use the existing paginateQuery function
        return this;
    }
}

module.exports = SQL;