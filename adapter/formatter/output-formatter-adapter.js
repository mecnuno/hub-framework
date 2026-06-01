
const TabularJsonFormatter = require('./tabular-json');
const RestJsonFormatter = require('./rest-json');
const XmlFormatter = require('./xml');
const ExcelFormatter = require('./excel');
const JsonFormatter = require('./json');

function createOutputFormatterAdapter(type) {
    switch (type.toLowerCase()) {
        case 'json': return new TabularJsonFormatter();
        case 'rest-json': return new RestJsonFormatter();
        case 'xml': return new XmlFormatter();
        case 'excel': return new ExcelFormatter();
        // Add more...
        default: throw new Error(`Unknown formatter type: ${type}`);
    }
}

module.exports = createOutputFormatterAdapter;
