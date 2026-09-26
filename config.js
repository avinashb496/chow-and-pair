/* ------------------------------------------------------------------
   The Chow & Pair — connection settings

   Filled in for The Chow & Pair, project kutdpfpwwavfzlcttjpr,
   region ap-south-1 (Mumbai).

   The publishable key below is MEANT to be public. It sits in every
   visitor's browser and grants nothing on its own. What actually
   guards the data is the row level security installed by schema.sql:
   only a signed-in staff account that has been switched on can read
   or write anything at all.

   NEVER put a key starting with sb_secret_ in this file. That one
   bypasses every security rule. It belongs only in the Apps Script
   that syncs your Google Sheet.

   If sign-in ever fails with "Invalid API key", open Supabase ->
   Project Settings -> API Keys -> the "Legacy anon, service_role API
   keys" tab, and paste the long anon key here instead. Both work.
------------------------------------------------------------------- */

var CONFIG = {
  url:     "https://kutdpfpwwavfzlcttjpr.supabase.co",
  anonKey: "sb_publishable_YhsMy-Dn18SRFOjS5s6Xkg_Ot1YdYE"
};
