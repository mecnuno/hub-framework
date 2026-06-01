/**
 * Resolves and executes SQL methods when no BLL class exists
 */

const runSqlMethod = async (container, methodName, sessionValues) => {
    const queries = container.queries;
    const dmls = container.dmls;
    const bll = container.getBaseBll();
    let method = queries[methodName];
    let isQuery = true;

    if (!method) {
        isQuery = false;
        method = dmls[methodName];
    }

    if (!method) {
        throw new Error(`Method "${methodName}" not found in queries or DMLs!`);
    }

    const getHooks = (m) => (typeof m === 'object' && m !== null && m.hooks ? m.hooks : {});
    
    const hooks = getHooks(method);

    const execTarget = (typeof method === 'object' && method.sql) ? method.sql : method;

    try {
        if (typeof hooks.beforeExecute === 'function') {
            await hooks.beforeExecute(sessionValues, container);
        }

        let result;
        const action = isQuery
            ? () => bll.readPaginated(execTarget, sessionValues)
            : () => bll.withTransaction(() => bll.write(execTarget, sessionValues));

        result = await bll.withAdapter(action);

        if (typeof hooks.afterExecute === 'function') {
            await hooks.afterExecute(result, sessionValues, container);
        }

        return result;
    } catch (error) {
        console.error(`Error executing SQL method "${methodName}":`, error);
        throw error;
    }
};

module.exports =  runSqlMethod ;