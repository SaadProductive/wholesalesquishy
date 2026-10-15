/**
 * @OnlyCurrentDoc
 * Put this INSIDE each sheet (sheet > Extensions > Apps Script). It only touches that sheet.
 * FREE alternative to a Google Cloud service account.
 * A tiny web app that receives each paid order from the website (Vercel) and writes it into BOTH sheets.
 * It runs as YOU, so it can already open your sheets. No Google Cloud, no billing, no card.
 *
 * Setup (5 minutes): script.google.com > New project > paste this file > Project Settings (gear) >
 *   Script properties > add  TOKEN = (any long random text; you also put the same text in Vercel as SHEETS_SCRIPT_TOKEN)
 * Then Deploy > New deployment > type "Web app" > Execute as: Me > Who has access: Anyone > Deploy > approve permissions.
 * Copy the Web app URL into Vercel as SHEETS_SCRIPT_URL.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var p = JSON.parse(e.postData.contents);
    var want = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!want || p.token !== want) return out_({ ok: false, error: 'bad token' });
    return out_({ ok: true, result: write_(p) });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out_({ ok: true, hello: 'order receiver is running' }); }

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function write_(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheets()[0];
  var n = p.headers.length;
  var empty = sh.getLastRow() === 0 || !String(sh.getRange(1, 1).getValue());
  if (empty) setup_(sh, p);
  else {
    var last = sh.getLastRow();
    if (last > 1) {
      var ab = sh.getRange(2, 1, last - 1, 2).getValues();
      for (var i = 0; i < ab.length; i++) if (ab[i][0] === p.orderId || ab[i][1] === p.orderId) return 'duplicate';
    }
  }
  var row = Math.max(sh.getLastRow(), 1) + 1;
  if (row + p.rows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), p.rows.length + 50);
  sh.getRange(row, 1, p.rows.length, n).setValues(p.rows);   // strings starting with "=" (the product image) become formulas
  SpreadsheetApp.flush();
  return 'logged';
}

function setup_(sh, p) {
  var n = p.headers.length;
  var maxRows = Math.max(sh.getMaxRows(), 1000);
  if (sh.getMaxRows() < maxRows) sh.insertRowsAfter(sh.getMaxRows(), maxRows - sh.getMaxRows());
  sh.getRange(1, 1, 1, n).setValues([p.headers]).setBackground('#2b2421').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1);
  sh.getRange(2, 1, maxRows - 1, n).setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeights(2, maxRows - 1, 100);
  p.widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  var sc = p.headers.indexOf(p.statusCol) + 1;
  var cc = p.headers.indexOf('Carrier') + 1;
  sh.getRange(2, sc, maxRows - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(p.statuses, true).setAllowInvalid(true).build());
  if (cc) sh.getRange(2, cc, maxRows - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(p.carriers, true).setAllowInvalid(true).build());
  var rules = p.statuses.map(function (st) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(st).setBackground(p.statusColors[st]).setRanges([sh.getRange(2, sc, maxRows - 1, 1)]).build();
  });
  sh.setConditionalFormatRules(rules);
  if (!sh.getFilter()) sh.getRange(1, 1, maxRows, n).createFilter();
}
