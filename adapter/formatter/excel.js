const BaseFormatter = require('./base-formatter');
const XLSX = require('xlsx');

class ExcelFormatter extends BaseFormatter {
    format(data) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
module.exports = ExcelFormatter;