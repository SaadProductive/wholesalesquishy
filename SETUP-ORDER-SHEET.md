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
