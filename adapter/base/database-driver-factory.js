function detectDatabaseType(db) {
    if (db && db.constructor.name === 'Connection' && db._oracleDB) return 'oracle';
    if (db && db.constructor.name === 'ConnectionPool') return 'sqlserver';
    if (db && db.constructor.name === 'Database') return 'better-sqlite3';
    if (db && db.constructor.name === 'Connection') return 'mysql2';
    if (db && db.constructor.name === 'Client') return 'pg';
    throw new Error('Unknown database type or unsupported db object');
}

async function createDatabaseDriver(dbPool) {
    const rawDb = await dbPool.get();
    const type = detectDatabaseType(rawDb);

    const adapters = {

        'better-sqlite3': () => {
            const wrapStmt = (stmt) => ({
                run: async (binds) => stmt.run(binds),
                returningRun: async (binds) => stmt.run(binds),
                all: async (binds) => {
                    const rows = await stmt.all(binds);
                    const columns = stmt.columns().map(col => ({
                        name: col.name,
                        type: col.type
                    }));
                    return { type: 'read', rows, columns };
                },
                columns: async () => stmt.columns().map(col => ({
                    name: col.name,
                    type: col.type
                }))
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

            const wrapStmt = (sql) => ({
                run: async (binds) => {
                    const [result] = await mysql.execute(sql.toString(), binds);
                    return { changes: result.affectedRows };
                },
                returningRun: async (binds) => {
                    const [result] = await mysql.execute(sql.toString(), binds);
                    return { changes: result.affectedRows, lastInsertId: result.insertId };
                },
                all: async (binds) => {
                    const [rows, fields] = await mysql.execute(sql.toString(), binds);
                    return { type: 'read', rows, columns: fields.map(f => ({ name: f.name, type: f.columnType })) };
                },
                columns: async () => {
                    const [rows, fields] = await mysql.execute(sql.toString() + ' LIMIT 0');
                    return fields.map(f => ({ name: f.name, type: f.columnType }));
                }
            });

            return {
                type: 'mysql2',
                prepare: wrapStmt,
                exec: async (sql) => {
                    const [result] = await mysql.query(sql.toString());
                    return result;
                },
                close: async () => dbPool.release(rawDb),
            };
        },

        'pg': () => {
            const wrapStmt = (sql) => ({
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
                    return { type: 'read', rows: result.rows, columns: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) };
                },
                columns: async () => {
                    const result = await rawDb.query(sql.toString() + ' LIMIT 0');
                    return result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }));
                }
            });

            return {
                type: 'pg',
                prepare: wrapStmt,
                exec: async (sql) => rawDb.query(sql.toString()),
                close: async () => dbPool.release(rawDb),
            };
        },

        'oracle': () => {
            const wrapStmt = (sql) => ({
                run: async (binds) => stmt.execute(binds),
                returningRun: async (binds) => stmt.execute(binds),
                all: async (binds) => {
                    const stmtObj = await rawDb.prepare(sql.toString());
                    const result = await stmtObj.execute(binds);
                    return {
                        type: 'read',
                        rows: result.rows,
                        columns: stmtObj.metaData.map(col => ({
                            name: col.name,
                            type: col.dbType
                        }))
                    };
                },
                columns: async () => {
                    const stmt = await rawDb.prepare(sql.toString());
                    return stmt.metaData.map(col => ({
                        name: col.name,
                        type: col.dbType
                    }));
                }
            });

            return {
                type: 'oracle',
                prepare: wrapStmt,
                exec: async (sql) => rawDb.execute(sql.toString()),
                close: async () => dbPool.release(rawDb),
            };
        },

        'sqlserver': () => {
            const sql = rawDb;

            const wrapStmt = (sqlText) => ({
                run: async (binds) => {
                    const request = new sql.Request();
                    binds?.forEach((bind, idx) => request.input(`param${idx}`, bind));
                    const result = await request.query(sqlText.toString());
                    return { changes: result.rowsAffected };
                },
                returningRun: async (binds) => {
                    const request = new sql.Request();
                    binds?.forEach((bind, idx) => request.input(`param${idx}`, bind));
                    let finalSql = sqlText.toString();
                    if (!finalSql.match(/OUTPUT/i) && finalSql.match(/^INSERT/i)) {
                        finalSql = finalSql.replace(/VALUES/i, 'OUTPUT INSERTED.* VALUES');
                    }
                    const result = await request.query(finalSql);
                    return { changes: result.rowsAffected, returning: result.recordset };
                },
                all: async (binds) => {
                    const request = new sql.Request();
                    binds?.forEach((bind, idx) => request.input(`param${idx}`, bind));
                    const result = await request.query(sqlText.toString());
                    return { type: 'read', rows: result.recordset, columns: Object.keys(result.recordset.columns || {}).map(name => ({ name })) };
                },
                columns: async () => {
                    const result = await sql.query(sqlText.toString() + ' WHERE 1=0');
                    return Object.keys(result.recordset.columns || {}).map(name => ({ name }));
                }
            });

            return {
                type: 'sqlserver',
                prepare: wrapStmt,
                exec: async (sqlText) => new sql.Request().query(sqlText.toString()),
                close: async () => dbPool.release(rawDb),
            };
        },
    };

    const driverFactory = adapters[type];
    if (!driverFactory) throw new Error(`Unsupported database type detected: ${type}`);
    return driverFactory();
}

module.exports = createDatabaseDriver;
