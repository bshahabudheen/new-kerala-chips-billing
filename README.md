# New Kerala Chips - Billing App v2

Built from the uploaded `nkc-billing.jsx`.

## Included
- Dashboard
- Product/items
- Purchase / Stock In
- Sales / Stock Out
- Production
- Purchase Return
- Sales Return
- Customer dues and payments
- Invoice print/share
- Reports
- Mobile responsive UI
- Offline browser storage fallback using localStorage
- PWA manifest/service worker for installable mobile web app

## Run
1. Install Node.js.
2. Open this folder in Terminal.
3. `npm install`
4. `npm run dev`
5. Open the Vite address on the phone or computer.

## Build
`npm run build`

## Next production step
For a real Android APK, wrap this web app with Capacitor and add native barcode/thermal-printer plugins. The current app's billing logic is ready, but native printer/barcode integration is not yet included.
