const BaseFormatter = require('./base-formatter');

const { create } = require('xmlbuilder2');

class XmlFormatter extends BaseFormatter {
    format(data) {
        const doc = create({ version: '1.0' })
            .ele('response')
            .ele('records')
            .ele(data.rows).up().up();
        return doc.end({ prettyPrint: true });
    }
}
module.exports = XmlFormatter;
