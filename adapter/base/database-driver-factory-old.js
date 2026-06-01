
function detectDatabaseType(db) {
    if (db && db.constructor.name === 'Connection' && db._oracleDB) {
        // If it's an Oracle connection (using oracledb module)
        return 'oracle';
    }

    if (db && db.constructor.name === 'ConnectionPool') {
        // If it's a SQL Server connection pool (using mssql module)
        return 'sqlserver';
    }

    if (db && db.constructor.name === 'Database') {
        // If it's SQLite (better-sqlite3)
        return 'better-sqlite3';
    }

    if (db && db.constructor.name === 'Connection') {
        // If it's MySQL connection (mysql2)
        return 'mysql2';
    }

    if (db && db.constructor.name === 'Client') {
        // If it's PostgreSQL client (pg)
        return 'pg';
    }

    throw new Error('Unknown database type or unsupported db object');
}


/**
 * Creates a database adapter driver interface for the given raw database connection and type.
 *
 * Supports multiple SQL database clients with a unified async interface.
 *
 * @function createDbDriverAdapter
 * @returns {{
 *   prepare: (sql: string) => {
 *     run: (binds?: any[]) => Promise<any>,
 *     all: (binds?: any[]) => Promise<any[]>
 *   },
 *   exec: (sql: string) => Promise<any>,
 *   close: () => Promise<void>
 * }}
 *
 * @throws {Error} If the DB type is unknown.
 */
async function createDatabaseDriver(dbPool) {
    const rawDb = await dbPool.get();
    const type = detectDatabaseType(rawDb);

    const adapters = {
        'better-sqlite3': () => {
            const wrapStmt = (stmt) => ({
                run: async (binds) => stmt.run(binds),
                returningRun: async (binds) => stmt.run(binds), // Returns { changes, lastInsertRowid }
                all: async (binds) => {
                    console.log("\n\t------------------------\n!!!!stmt-> ", stmt.source, '\n\t--------------------\n');
                    return await stmt.all(binds)
                },
            });

            return {
                type: 'sqlite',
                prepare: (sql) => wrapStmt(rawDb.prepare(sql.toString())),
                exec: async (sql) => rawDb.exec(sql.toString()),
                close: async () => dbPool.release(rawDb),
            };
        },

        'mysql2': () => {
            const mysql = rawDb?.promise?.();

            return {
                type: 'mysql2',
                prepare: (sql) => ({
                    run: async (binds) => {
                        const [result] = await mysql.execute(sql.toString(), binds);
                        return { changes: result.affectedRows };
                    },
                    returningRun: async (binds) => {
                        const [result] = await mysql.execute(sql.toString(), binds);
                        return { changes: result.affectedRows, lastInsertId: result.insertId };
                    },
                    all: async (binds) => {
                        const [rows] = await mysql.execute(sql.toString(), binds);
                        return rows;
                    },
                }),
                exec: async (sql) => {
                    const [result] = await mysql.query(sql);
                    return result;
                },
                close: async () => dbPool.release(rawDb),
            };
        },

        'pg': () => {
            return {
                type: 'pg',
                prepare: (sql) => ({
                    run: async (binds) => {
                        const result = await rawDb.query(sql.toString(), binds);
                        return { changes: result.rowCount };
                    },
                    returningRun: async (binds) => {
                        let finalSql = sql.toString();
                        if (!finalSql.match(/RETURNING/i) && finalSql.match(/^(INSERT|UPDATE|DELETE)/i)) {
                            finalSql += ' RETURNING *';
                        }
                        const result = await rawDb.query(finalSql, binds);
                        return { changes: result.rowCount, returning: result.rows };
                    },
                    all: async (binds) => {
                        const result = await rawDb.query(sql.toString(), binds);
                        return result.rows;
                    },
                }),
                exec: async (sql) => {
                    const result = await rawDb.query(sql.toString());
                    return result;
                },
                close: async () => dbPool.release(rawDb),
            };
        },

        'oracle': () => {
            const wrapStmt = (stmt) => ({
                run: async (binds) => stmt.execute(binds),
                returningRun: async (binds) => stmt.execute(binds), // Oracle returns outBinds if RETURNING clause present
                all: async (binds) => stmt.execute(binds),
            });

            return {
                type: 'oracle',
                prepare: (sql) => wrapStmt(rawDb.prepare(sql.toString())),
                exec: async (sql) => rawDb.execute(sql.toString()),
                close: async () => dbPool.release(rawDb),
            };
        },

        'sqlserver': () => {
            const sql = rawDb;

            return {
                type: 'sqlserver',
                prepare: (sqlText) => ({
                    run: async (binds) => {
                        const request = new sql.Request();
                        binds.forEach((bind, idx) => request.input(`param${idx}`, bind));
                        const result = await request.query(sqlText.toString());
                        return { changes: result.rowsAffected };
                    },
                    returningRun: async (binds) => {
                        const request = new sql.Request();
                        binds.forEach((bind, idx) => request.input(`param${idx}`, bind));
                        let finalSql = sqlText.toString();
                        if (!finalSql.match(/OUTPUT/i) && finalSql.match(/^INSERT/i)) {
                            finalSql = finalSql.replace(/VALUES/i, 'OUTPUT INSERTED.* VALUES');
                        }
                        const result = await request.query(finalSql);
                        return { changes: result.rowsAffected, returning: result.recordset };
                    },
                    all: async (binds) => {
                        const request = new sql.Request();
                        binds.forEach((bind, idx) => request.input(`param${idx}`, bind));
                        const result = await request.query(sqlText.toString());
                        return result.recordset;
                    },
                }),
                exec: async (sqlText) => {
                    const request = new sql.Request();
                    return await request.query(sqlText.toString);
                },
                close: async () => dbPool.release(rawDb),
            };
        },
    };

    const driverFactory = adapters[type];
    if (!driverFactory) {
        throw new Error(`Unsupported database type detected: ${type}`);
    }
    return driverFactory();
}

module.exports = createDatabaseDriver;