const BaseFormatter  = require('./base-formatter');
class RestJsonFormatter extends BaseFormatter {
    format(data) {
        return {
            status: 'success',
            timestamp: new Date().toISOString(),
            resultCount: Array.isArray(data.rows) ? data.rows.length : 1,
            data: data
        };
    }
}
module.exports = RestJsonFormatter;