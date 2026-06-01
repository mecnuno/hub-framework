const asyncLocalStorage = require('./proxy/request-context');

module.exports = {
    BaseBll: require('./bll/base-bll'),
    SQL: require('./adapter/sql-builder'),
    BaseContainer: require('./container/base-container'),
    executeRequest: require('./proxy/bll-proxy').executeRequest,
    bllCache: require('./proxy/bll-proxy').cache,
    asyncLocalStorage: require('./proxy/request-context'),
    createExtRouter: require('./proxy/ext.proxy'),
    ouputFormats:{
        json: require('./adapter/formatter/json'),
        tabularJson: require('./adapter/formatter/tabular-json'),
        restJson:require('./adapter/formatter/rest-json'),
        xml: require('./adapter/formatter/xml')
    }
};