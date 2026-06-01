const  BaseContainer  = require('../container/base-container');
const { executeRequest } = require('./bll-proxy');
const cache = require('./bll-cache');
const asyncLocalStorage = require('./request-context');

const convertBindsToObject = (bindsArray) => {
    return bindsArray.reduce((acc, bind) => {
        let value = bind.value;

        switch (bind.type) {
            case "number":
                value = Number(value);
                break;
            case "string":
                value = String(value);
                break;
            case "list":
                value = Array.isArray(value) ? value : [];
                break;
            // Add more type conversions if needed
        }

        acc[bind.name] = value;
        return acc;
    }, {});
};

const createExtRouter = (express, container) => {
    const router = express.Router();

    router.post('/ext', async (req, res) => {
        const JSONParam = JSON.parse(req.body.JSONParam);
        const { class: cls, method, parameters } = JSONParam;

        const requestContext = { userId : req.user.id };

        const rqs = { class: cls, method, parameters: convertBindsToObject(parameters || []) };

        asyncLocalStorage.run(requestContext, async () => {
            try {
                const result = await executeRequest(container, rqs);
                res.type('application/json');
                res.send(result);
            } catch (err) {
                console.error(`Error executing request for ${cls}.${method}:`, err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
        });
    });
    return router;
}

module.exports = createExtRouter;