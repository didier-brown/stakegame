# StakeRun MVP

StakeRun is a mobile-first, single-page prototype to prove the feel of a fitness commitment and staking loop. It is **local-only**, uses **fake money**, and generates **fake activity**—no login, no GPS.

## How it works

- Create a steps challenge (date range, entry fee in pennies, target steps/day average).
- Join the challenge to deduct your stake from the wallet.
- Mock steps for today or a date range.
- Evaluate the challenge to see if you completed the goal and receive a fake payout.
- Review the wallet ledger for stakes and prizes.

## Files

- `index.html` — single-page layout
- `styles.css` — mobile-first styling
- `app.js` — localStorage state, challenge logic, mock activity generation
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline cache

## Running locally

Open `index.html` in a browser (iPhone Safari friendly). For full PWA behavior, serve the folder with a simple local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` on your device.

## iOS Add to Home Screen

1. Open StakeRun in Safari on iPhone.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Name it “StakeRun” and tap **Add**.

## Notes

- All data is stored in `localStorage`.
- Fake steps are generated only for demos.
