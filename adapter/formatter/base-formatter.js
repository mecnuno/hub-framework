class BaseFormatter {
    format(data) {
        throw new Error('format() must be implemented');
    }
}
module.exports = BaseFormatter;
