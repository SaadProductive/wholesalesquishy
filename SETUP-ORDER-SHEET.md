# Log every Stripe order to a Google Sheet (one-time setup, about 15 minutes)

Do these steps yourself. Never paste keys into a chat; they go only into Vercel.

## 1. Google side
1. Two Sheets already exist in your Drive: **WSQ - Orders (Admin)** (all details, money, payment) and **WSQ - Warehouse** (no prices/payment, safe to share with packers). Leave the first tab as is.
2. console.cloud.google.com: create or pick a project, enable the **Google Sheets API**.
3. IAM & Admin, Service Accounts: create a service account, then Keys, Add key, JSON. Download the file.
4. Share BOTH sheets with the service account's `client_email` as **Editor**.
5. Sheet IDs: Orders `1rUhpfPH6E-JFFKLUNPnME4YIzLuzbeiiTB-4pyz0OHk`, Warehouse `1mZJu1KzA10kmQTng6iLYjXKq1JzXLZ7EB9wgL378cY0`.

## 2. Vercel environment variables (Project, Settings, Environment Variables)
| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | Orders sheet ID (above) |
| `WAREHOUSE_SHEET_ID` | Warehouse sheet ID (above) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON file |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON file (keep the `\n` characters as they are) |
| `STRIPE_WEBHOOK_SECRET` | from step 3 below |
| `STRIPE_SECRET_KEY` | already set |

## 3. Stripe webhook
Stripe Dashboard, Developers, Webhooks, Add endpoint:
- URL: `https://wholesalesquishy.com/api/stripe-webhook`
- Event: `checkout.session.completed`
- Copy the "Signing secret" (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`, then redeploy.

## 4. Test
Place a small test order in Stripe test mode. A row should appear within seconds.
Headers, dropdowns (New/Confirmed/Packing/Shipped/Delivered/On hold/Out of stock), colours, filters and product images are set up automatically on the first order. One row per product line. Status, Carrier, Tracking # and Notes are yours to fill in.

Past orders: Stripe Dashboard, Payments, Export (CSV), then File, Import into a second tab.

---

# Contact form -> your Gmail (5 minutes)
The contact/quote form now emails you directly (reply goes to the buyer).
1. In the Gmail account that will send the mail: myaccount.google.com, Security, turn on **2-Step Verification**.
2. Go to myaccount.google.com/apppasswords, create an app password named "website". Copy the 16 characters.
3. In Vercel, Settings, Environment Variables, add:

| Name | Value |
|---|---|
| `GMAIL_USER` | the Gmail address that sends |
| `GMAIL_APP_PASSWORD` | the 16-character app password |
| `CONTACT_TO` | the Gmail where you want to receive messages (can be the same one) |

4. Redeploy, then send yourself a test message from the Contact page.
Never paste the app password into a chat. If the form fails, the buyer's mail app opens as a fallback, so no lead is lost.

---

# Emails after the order

## 1. Payment receipt (Stripe, already works)
Stripe Dashboard, Settings, Customer emails: turn on "Successful payments". Add logo/colours under Settings, Branding.

## 2. Order confirmation (automatic, from our webhook)
Uses the same Vercel variables as the contact form (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO`). The buyer gets the email within seconds of paying; `CONTACT_TO` gets a BCC copy.
Optional: `SUPPORT_EMAIL` (reply-to address, default support@wholesalesquishy.com).
Nothing to do beyond the contact-form setup. If the variables are missing the email is simply skipped.

## 3. Shipped email with tracking (Apps Script in the Warehouse sheet)
1. Open **WSQ - Warehouse**, Extensions, Apps Script.
2. Delete what is there, paste the file `apps-script/warehouse-shipping-emails.gs`, Save.
3. Top menu: choose function `installTrigger`, click Run, approve the permissions (Google shows a "not verified" warning for your own script: Advanced, Go to project).
4. Test: put a fake order row in, set Status = Shipped, Carrier = UPS, Tracking # = anything. The buyer email (looked up in the Admin sheet) gets the message once. Use your own email in a test row first.
Packer rule: fill Carrier and Tracking # first, then set Status to Shipped for ALL lines of that order. The script also copies Status and Tracking into the Admin sheet.
The email is sent from the Google account that owns the Warehouse sheet (Gmail limit ~100/day for personal accounts, 1,500 for Workspace).
