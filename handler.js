'use strict';
const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

module.exports.write = async event => {
  if(!event.body) {
    return formatResponse(400, { message: 'body is missing' });
  }
  const body = JSON.parse(event.body);

  if(!body.cells || !Array.isArray(body.cells)) {
    return formatResponse(400, { message: '"cells" should be an array' })
  }

  // load up everything that's necessary to work with cells
  await spreadsheetAuth(doc);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells();
  console.log('loaded spreadsheet correctly');
  for(const { identifier, content } of body.cells) {
    const cell = sheet.getCellByA1(identifier);
    cell.value = content;
  }
  await sheet.saveUpdatedCells();
  return formatResponse(200, { message: 'Cells saved successfully'});
};

module.exports.read = async event => {
  console.log('Starting read function');
  if(!event || !event.queryStringParameters || !event.queryStringParameters.cells) {
    return formatResponse(400, { message: 'Invalid parameters' });
  }

  const cells = event.queryStringParameters.cells;

  const isValidInput = cells.split(',').every(cell => isValidCellInput(cell));
  if(!isValidInput) {
    return formatResponse(400, { message: 'Invalid parameters' });
  }

  await spreadsheetAuth(doc);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells();
  console.log('loaded spreadsheet correctly');
  const contents = cells.split(',').map(cell => sheet.getCellByA1(cell).value);
  return formatResponse(200, { contents });
};

function isLetter(str){
  // allow only capital letters
  return str.match(/^[A-Z]+$/) !== null;
}

function isNumber(str){
  return str.match(/^\d+$/) !== null;
}

function isValidCellInput(cell) {
  if(cell.length != 2) {
    return false;
  }

  if(!isLetter(cell.split('')[0]) || !isNumber(cell.split('')[1])) {
    return false;
  }

  return true;
}

function spreadsheetAuth(document) {
  return document.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/gm, '\n'),
  });
}

function formatResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(
      payload,
      null,
      2
    ),
  };
}