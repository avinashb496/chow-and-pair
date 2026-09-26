/**
 * The Chow & Pair — Google Sheet mirror
 *
 * Copies every booking, customer and enquiry out of Supabase into
 * this spreadsheet. One way only: the sheet is a readable, sortable,
 * downloadable copy. Editing a cell here changes nothing in the
 * booking system, and the next sync overwrites it.
 *
 * SETUP (about three minutes)
 *   1. In your Google Sheet: Extensions -> Apps Script.
 *   2. Delete whatever is in the editor, paste this whole file, save.
 *   3. Project Settings (the gear) -> Script Properties -> Add:
 *          SUPABASE_URL          https://your-project.supabase.co
 *          SUPABASE_SERVICE_KEY  the service_role key
 *      Both are in Supabase under Project Settings -> API.
 *   4. Back in the editor, pick installTrigger from the function list
 *      and press Run. Approve the permission prompt. That schedules a
 *      sync every 15 minutes.
 *   5. Pick syncNow and Run once to fill the sheet immediately.
 *
 * The service_role key ignores every security rule in the database,
 * which is exactly why it lives here in Script Properties, on Google's
 * servers under your account, and never in the website's code.
 */

var SYNC_MINUTES = 15;

function props_() {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty('SUPABASE_URL');
  var key = p.getProperty('SUPABASE_SERVICE_KEY');
  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Project Settings -> Script Properties first.');
  }
  return { url: url.replace(/\/+$/, ''), key: key };
}

function fetchRows_(path) {
  var p = props_();
  var res = UrlFetchApp.fetch(p.url + '/rest/v1/' + path, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      apikey: p.key,
      Authorization: 'Bearer ' + p.key,
      Accept: 'application/json'
    }
  });
  var code = res.getResponseCode();
  var body = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Supabase returned ' + code + ': ' + body.slice(0, 400));
  }
  return JSON.parse(body);
}

function writeSheet_(name, header, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold')
    .setBackground('#132340')
    .setFontColor('#FBF7EC');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, header.length);
}

function money_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function syncNow() {
  var bookings = fetchRows_(
    'bookings?select=id,customer_id,booking_date,start_time,end_time,type,guests,payment,' +
    'amount_due,amount_paid,stage,notes,created_by,created_at,' +
    'customers(name,phone,email,source),teachers(name),tables(num)' +
    '&order=booking_date.desc,start_time.asc'
  );

  var header = ['Booking ID', 'Date', 'Day', 'Start', 'End', 'Type', 'Customer',
                'Phone', 'Email', 'Source', 'Guests', 'Table', 'Teacher',
                'Payment', 'Amount due', 'Amount paid', 'Balance', 'Stage',
                'Notes', 'Booked by', 'Created'];

  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  var rows = bookings.map(function (b) {
    var c = b.customers || {};
    var due = money_(b.amount_due);
    var paid = money_(b.amount_paid);
    var parts = String(b.booking_date).split('-');
    var day = days[new Date(+parts[0], +parts[1] - 1, +parts[2]).getDay()];
    return [
      b.id,
      b.booking_date,
      day,
      String(b.start_time).slice(0, 5),
      String(b.end_time).slice(0, 5),
      b.type === 'learn' ? 'To Learn' : 'To Play',
      c.name || '',
      c.phone || '',
      c.email || '',
      c.source || '',
      b.guests,
      b.tables ? b.tables.num : '',
      b.teachers ? b.teachers.name : '',
      b.payment,
      due,
      paid,
      Math.max(0, due - paid),
      b.stage,
      b.notes || '',
      b.created_by || '',
      b.created_at || ''
    ];
  });

  writeSheet_('Bookings', header, rows);

  var customers = fetchRows_('customers?select=*&order=name.asc');
  var custHeader = ['Customer ID', 'Name', 'Phone', 'Email', 'Source', 'Notes',
                    'Bookings', 'Lifetime paid', 'Outstanding', 'Last visit'];

  var stats = {};
  bookings.forEach(function (b) {
    var k = b.customer_id || (b.customers && b.customers.name);
    if (!k) return;
    if (!stats[k]) stats[k] = { n: 0, paid: 0, due: 0, last: '' };
    stats[k].n++;
    stats[k].paid += money_(b.amount_paid);
    stats[k].due += Math.max(0, money_(b.amount_due) - money_(b.amount_paid));
    if (b.booking_date > stats[k].last) stats[k].last = b.booking_date;
  });

  var custRows = customers.map(function (c) {
    var s = stats[c.id] || { n: 0, paid: 0, due: 0, last: '' };
    return [c.id, c.name, c.phone || '', c.email || '', c.source || '',
            c.notes || '', s.n, s.paid, s.due, s.last];
  });

  writeSheet_('Customers', custHeader, custRows);

  var leads = fetchRows_('leads?select=*&order=created_at.desc');
  var leadHeader = ['Lead ID', 'Name', 'Phone', 'Email', 'Source', 'Wants',
                    'Classes', 'Price quoted', 'Stage', 'Became customer', 'Notes', 'Added'];
  var leadRows = leads.map(function (l) {
    return [
      l.id,
      l.name,
      l.phone || '',
      l.email || '',
      l.source || '',
      l.service === 'learn' ? 'To Learn' : 'To Play',
      l.learn_classes == null ? '' : l.learn_classes,
      l.service === 'learn' ? money_(l.learn_price) : money_(l.play_price),
      l.stage,
      l.customer_id || '',
      l.notes || '',
      l.created_at || ''
    ];
  });
  writeSheet_('Enquiries', leadHeader, leadRows);

  var meta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bookings');
  meta.getRange(1, header.length + 2).setValue(
    'Last synced: ' + Utilities.formatDate(new Date(),
      Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm')
  );
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncNow').timeBased().everyMinutes(SYNC_MINUTES).create();
  syncNow();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Chow & Pair')
    .addItem('Sync now', 'syncNow')
    .addToUi();
}
