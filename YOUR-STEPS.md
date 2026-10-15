# Your steps, in order (about 45 minutes total)

Nothing below needs code. Secrets (passwords, keys) you paste yourself; never share them in chat.

## A. Put the site live
1. GitHub repo `SaadProductive/wholesalesquishy`: Add file, Upload files, drag in everything from the latest zip. Commit. Vercel redeploys on its own.

## B. Email (do first, everything else uses it)
2. Make `support@wholesalesquishy.com` work (forwarding to your Gmail at the domain host, or a mailbox). Send it a test email.
3. Gmail: turn on 2-Step Verification, then myaccount.google.com/apppasswords, create "website", copy the 16 characters.

## C. Vercel: Settings, Environment Variables (then Redeploy)
| Name | Value |
|---|---|
| `GMAIL_USER` | your Gmail address |
| `GMAIL_APP_PASSWORD` | the 16-character app password |
| `CONTACT_TO` | where you want messages (your Gmail) |
| `ADMIN_LINK_SECRET` | any long random string you invent (30+ characters) |
| `GOOGLE_SHEET_ID` | `1rUhpfPH6E-JFFKLUNPnME4YIzLuzbeiiTB-4pyz0OHk` |
| `WAREHOUSE_SHEET_ID` | `1mZJu1KzA10kmQTng6iLYjXKq1JzXLZ7EB9wgL378cY0` |
| `SHEETS_SCRIPT_URL` | the Web app URL from step D (free, no Google Cloud) |
| `SHEETS_SCRIPT_TOKEN` | the same TOKEN text you put in the script properties in step D |
| `STRIPE_SECRET_KEY` | already set |
| `STRIPE_WEBHOOK_SECRET` | from step E |

## D. Google
4. FREE, no Google Cloud: script.google.com, New project, paste `apps-script/order-receiver.gs`. Project Settings (gear), Script properties, add `TOKEN` = a long random text. Deploy, New deployment, type Web app, Execute as: Me, Who has access: Anyone, Deploy, approve. Copy the Web app URL.
5. Put the URL in Vercel as `SHEETS_SCRIPT_URL` and the same random text as `SHEETS_SCRIPT_TOKEN`. Use the same Google account that owns both sheets.
6. Warehouse sheet: Extensions, Apps Script, paste `apps-script/warehouse-shipping-emails.gs`, run `installTrigger`, approve.

## E. Stripe
7. Developers, Webhooks, add endpoint `https://wholesalesquishy.com/api/stripe-webhook` with events `checkout.session.completed` and `invoice.paid`. Copy its signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`, redeploy.
8. Settings, Payments, Payment methods: enable ACH Direct Debit (for invoices).
9. Settings, Customer emails: turn on successful-payment receipts.

## F. Tracking (already in the code)
10. GTM `GTM-M5HRM57B` is published. After the site is live: GTM Preview on the site, GA4 Realtime, mark `purchase` and `generate_lead` as key events.
11. Later when ready: Google Ads and Bing tags (tell me the IDs).

## G. Test everything once (Stripe test mode)
12. Small order -> row in both sheets, confirmation email arrives.
13. Warehouse sheet: Carrier + Tracking + Status=Shipped -> shipped email arrives.
14. Contact form and Request a Quote form -> email arrives. Click the invoice button in a test quote.

## H. Content only you can supply
15. Real photos (cartons, warehouse, customers' shelves): upload to `images/gallery/<sku>-2.jpg` and they show on that product page.
16. Real buyer quotes (with permission): I add them to the homepage.
17. Safety certificates: tell me their names/standards and I add them to the safety page.
18. Phone number, business name/EIN details, product specs (size, weight).
