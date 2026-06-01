const BaseFormatter = require('./base-formatter');

class JsonFormatter extends BaseFormatter {
    format(data) {
        // here i dont need stringify i need raw object to be returned and not string
        return data;
    }
}

module.exports = JsonFormatter; 