/**
 * Paste into the WSQ - Warehouse sheet: Extensions > Apps Script.
 * What it does, whenever your packer edits "Status" or "Tracking #":
 *  1. keeps the Admin sheet in sync (Status + Tracking for that order)
 *  2. when Status = Shipped AND a tracking number exists, emails the buyer once (buyer email is read from the Admin sheet, packers never see it)
 * One-time setup: run installTrigger() once from the editor and approve the permissions.
 */
var ADMIN_SHEET_ID = '1rUhpfPH6E-JFFKLUNPnME4YIzLuzbeiiTB-4pyz0OHk';
var SUPPORT_EMAIL = 'support@wholesalesquishy.com';
var SENDER_NAME = 'Wholesale Squishy';

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onWarehouseEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

function colMap_(headers) {
  var m = {};
  headers.forEach(function (h, i) { m[String(h).trim()] = i; });
  return m;
}

function trackingLink_(carrier, num) {
  var n = encodeURIComponent(num);
  switch (String(carrier).toLowerCase()) {
    case 'usps': return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + n;
    case 'ups': return 'https://www.ups.com/track?tracknum=' + n;
    case 'fedex': return 'https://www.fedex.com/fedextrack/?trknbr=' + n;
    case 'dhl': return 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=' + n;
    default: return '';
  }
}

function onWarehouseEdit(e) {
  var sh = e.range.getSheet();
  if (e.range.getRow() < 2) return;
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var c = colMap_(headers);
  var editedCol = e.range.getColumn() - 1;
  if (editedCol !== c['Status'] && editedCol !== c['Tracking #'] && editedCol !== c['Carrier']) return;

  var row = sh.getRange(e.range.getRow(), 1, 1, lastCol).getValues()[0];
  var orderId = row[c['Order ID']];
  if (!orderId) return;
  var status = row[c['Status']], tracking = String(row[c['Tracking #']] || '').trim(), carrier = row[c['Carrier']];

  // 1) sync Admin sheet
  var admin = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheets()[0];
  var aHead = admin.getRange(1, 1, 1, admin.getLastColumn()).getValues()[0];
  var a = colMap_(aHead);
  var aData = admin.getDataRange().getValues();
  var buyerEmail = '', buyerName = '';
  for (var i = 1; i < aData.length; i++) {
    if (aData[i][a['Order ID']] === orderId) {
      if (!buyerEmail) { buyerEmail = aData[i][a['Email']]; buyerName = aData[i][a['Name']]; }
      if (editedCol === c['Status'] || editedCol === c['Tracking #']) {
        admin.getRange(i + 1, a['Status'] + 1).setValue(status);
        if (tracking) admin.getRange(i + 1, a['Tracking #'] + 1).setValue((carrier ? carrier + ' ' : '') + tracking);
      }
    }
  }

  // 2) shipped email, once per order
  if (status !== 'Shipped' || !tracking || !buyerEmail) return;
  var data = sh.getDataRange().getValues();
  var lines = [], rows = [];
  for (var r = 1; r < data.length; r++) {
    if (data[r][c['Order ID']] === orderId) {
      if (data[r][c['Buyer emailed']]) return;            // already emailed for this order
      rows.push(r + 1);
      lines.push('- ' + data[r][c['Product']] + ': ' + data[r][c['Cases']] + ' case(s), ' + data[r][c['Pieces']] + ' pcs');
    }
  }
  if (!rows.length) return;
  var link = trackingLink_(carrier, tracking);
  var first = String(buyerName || '').split(' ')[0];
  var body = 'Hi' + (first ? ' ' + first : '') + ',\n\nGreat news: your order #' + orderId + ' has shipped.\n\n' +
    lines.join('\n') + '\n\nCarrier: ' + (carrier || '-') + '\nTracking number: ' + tracking + (link ? '\nTrack it here: ' + link : '') +
    '\n\nMost orders arrive within a few business days. Tracking can take a few hours to show movement.\n' +
    'Questions? Just reply to this email or write to ' + SUPPORT_EMAIL + '.\n\nThank you,\n' + SENDER_NAME;
  MailApp.sendEmail({ to: buyerEmail, subject: 'Your order #' + orderId + ' has shipped', body: body, name: SENDER_NAME, replyTo: SUPPORT_EMAIL });
  var stamp = new Date();
  rows.forEach(function (rr) { sh.getRange(rr, c['Buyer emailed'] + 1).setValue(stamp); });
}
