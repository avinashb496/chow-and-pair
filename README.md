# The Chow & Pair — Booking System

Table reservations, lead pipeline and payment tracking for a mahjong academy
and studio. A plain static website plus a Postgres database. No build step,
no framework, no server of your own to maintain.

- **The site** is three files. Host it anywhere that serves static files.
- **The data** lives in your Supabase project. You own it, you can export it,
  you can point anything else at it.
- **The spreadsheet** is a live mirror in Google Sheets, updated every fifteen
  minutes, so anyone who just wants to read or sort the bookings never has to
  open the app.

---

## What it does

**Schedule.** Eight tables down the side, the trading day across the top in
half hour columns. Green blocks are To Play, plum are To Learn, diagonal
stripes mean somebody still owes money. Click an empty cell to book it. On a
phone it switches to a day list, which is far easier to read at the desk.

**Bookings.** Customer lookup by name or phone, booking type, guests, table,
teacher, payment status and amounts, internal notes.

**Pipeline.** New Lead → Confirmed → Paid → Checked-In → Completed, as a board
you drag cards across or a table you filter. Cancelled and no-shows sit in
their own section and release their table.

**Customers.** Every customer with their history, lifetime spend and anything
still outstanding.

**Dashboard.** Today at a glance, tables in use right now, money collected
against money expected, and the week ahead.

**Settings.** Teachers, tables, opening hours, session lengths, rates, and who
is allowed to sign in. Admins only.

---

## The double-booking guard

Two staff members can click "save" on the same table at the same instant. A
check written in JavaScript cannot stop that, because both browsers looked at
the world before either of them wrote to it.

So the rule lives in the database instead:

```sql
exclude using gist (
  table_id with =,
  tsrange(booking_date + start_time, booking_date + end_time) with &&
) where (stage not in ('Cancelled','No-Show'))
```

Postgres refuses to store a row whose table and time range overlap one that is
already there. The second person gets a clear message and no booking. The same
constraint applies to teachers, so one teacher cannot be on two tables at once.

The app still checks before saving, because instant feedback beats an error
message. But the check is the courtesy and the constraint is the guarantee.

---

## Setup

Roughly fifteen minutes end to end. Nothing here needs a credit card.

### 1. Create the database

1. Go to [supabase.com](https://supabase.com) and create a free project.
   Pick the region closest to Mumbai (usually Singapore or Mumbai itself).

   On the security options, set them like this:

   | Option | Set to | Why |
   |---|---|---|
   | Enable Data API | **on** | The app talks to Supabase through it. Nothing works without it. |
   | Automatically expose new tables | **off** | Supabase's own advice. `schema.sql` grants exactly the access it needs, table by table. |
   | Enable automatic RLS | **on** | Row level security on anything added later, without having to remember. |

2. Wait for it to finish provisioning, then open **SQL Editor**.
3. Paste the entire contents of `schema.sql` and press **Run**.

That creates every table, the security rules, the overlap constraints, and a
couple of weeks of sample bookings so you can see the thing working. If you
would rather start empty, delete the `SAMPLE DATA` section at the bottom of
the file before running it.

### 2. Point the site at it

1. In Supabase go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `config.js` and paste both in.

The anon key is public by design. It sits in every visitor's browser and grants
nothing on its own. The row level security in `schema.sql` is what actually
protects the data: only a signed-in, switched-on staff account can read or
write anything at all.

Never put the `service_role` key in `config.js`. That key ignores every
security rule. It belongs only in the Apps Script in step 4.

### 3. Put the site online

**GitHub Pages**

1. Create a new repository on GitHub.
2. Upload `index.html`, `app.js`, `config.js`, `logo.jpg` and `.nojekyll`.
   (`schema.sql`, `sheet-sync.gs` and this README can go in too; they are
   never served to visitors as anything but text, and they contain no secrets.)
3. **Settings → Pages → Source: Deploy from a branch**, pick `main` and `/root`.
4. Your site appears at `https://<your-username>.github.io/<repo>/` within a
   minute or two.

**Netlify, Vercel or Cloudflare Pages** all work the same way: drag the folder
onto their dashboard. Any static host will do. There is nothing to build.

### 4. Your first account

Open the site and choose **Create an account**.

The first person to sign up becomes the admin automatically and is switched on
straight away. Everybody who signs up after that is created **switched off**
and sees a holding screen until an admin activates them under
**Settings → Staff accounts**. Signing up on its own grants nothing.

So: sign up first, before you give anyone else the link.

If Supabase asks people to confirm their email and you would rather it didn't,
turn off **Confirm email** under **Authentication → Providers → Email**.

### 5. The Google Sheet mirror (optional)

1. Create a new Google Sheet.
2. **Extensions → Apps Script**.
3. Delete the starter code, paste all of `sheet-sync.gs`, save.
4. **Project Settings → Script Properties**, add two:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_SERVICE_KEY` — the `service_role` key from Project Settings → API
5. Select `installTrigger` from the function dropdown and press **Run**.
   Approve the permission prompt.

You now get a **Bookings** tab and a **Customers** tab, refreshed every fifteen
minutes, with a "Sync now" item added to the menu bar for when you want it
immediately.

The sync is one way. The sheet is a readable copy, not a second source of
truth. Editing a cell there changes nothing in the booking system and the next
sync will overwrite it.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell, all the styling |
| `app.js` | The whole application |
| `config.js` | Your two Supabase values. The only file you edit |
| `logo.jpg` | Studio logo, used in the nav and as the favicon |
| `schema.sql` | Database structure, security rules, sample data |
| `sheet-sync.gs` | Google Apps Script for the spreadsheet mirror |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

---

## Who can do what

| | Book and edit | Teachers, tables, rates | Staff accounts |
|---|---|---|---|
| **Admin** | yes | yes | yes |
| **Staff** | yes | no | no |
| **Switched off** | nothing at all | | |

Roles are set in the database, not in the browser, so changing the page source
gets nobody anything. Every read and write is checked by Postgres against the
signed-in account.

---

## Things worth knowing

**Deleting a customer** is blocked while they still have bookings. Delete the
bookings first, or keep the record.

**Changing your floor size.** Add or retire tables under Settings. Retired
tables disappear from the grid but keep their history.

**Backups.** Supabase's free tier keeps daily backups for seven days. The
Google Sheet is a second copy you control outright. For a real archive, use
**Database → Backups** in Supabase, or just download the sheet.

**Timezone.** Dates and times are stored without a timezone and read as studio
local time. That is the right call for a single venue. If you ever open a
second location in another timezone, this is the thing to revisit.

**Costs.** Supabase free tier covers a project of this size comfortably:
500 MB of database and 50,000 monthly active users. A studio with eight tables
will not come close. Free projects pause after a week of no activity and wake
on the next request, which a working studio will never trigger.
