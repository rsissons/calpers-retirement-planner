# CalPERS Retirement Planner

A private retirement planner for CalPERS members in California. You enter your pension details, Social Security, savings, spending and retiree health costs. It projects your household month by month from the day you retire to age 95 (or whatever age you choose), with real federal and California taxes, and shows whether the money lasts.

It runs entirely in your web browser. There's no account, no server and no tracking, and your numbers never leave your device.

## What you need

**To use it:** a current web browser (Chrome, Edge, Safari or Firefox) on a computer, tablet or phone. That's all. You don't need to install anything, and you don't need an internet connection once you have the file.

**To use it well:** about 30 minutes and these documents:

| You need | Where to get it |
|---|---|
| Your CalPERS retirement formula, service credit and final compensation | Your CalPERS Annual Member Statement, or [myCalPERS](https://my.calpers.ca.gov) |
| A myCalPERS retirement estimate (to check the pension and get your beneficiary option factor) | myCalPERS, "Retirement Estimate Calculator" |
| Your Social Security estimate | [ssa.gov/myaccount](https://www.ssa.gov/myaccount/) |
| 403(b), 457(b), Roth IRA and savings balances | Your latest statements |
| Retiree health premiums and your employer's retiree contribution | CalPERS health plan rates for your region, plus HR or your bargaining unit's MOU |
| Monthly spending, split into essential and discretionary, and your loan payments | A year of bank and card statements, or a budgeting app |

[docs/USER_GUIDE.md](docs/USER_GUIDE.md) walks through each one.

## Who it's for

- **CalPERS members:** School, State (Miscellaneous & Industrial, and Safety) and Local (Miscellaneous and Safety), classic or PEPRA. All 32 benefit factor charts CalPERS publishes are built in.
- **California residents**, single or married filing jointly.

It isn't built for CalSTRS members, other states' taxes, or other pension systems. A spouse's pension from any system can be entered as a flat monthly amount, though.

## Getting started

**Use it online:** https://rsissons.github.io/calpers-retirement-planner/ (works on phones and tablets too). The page runs in your browser like the file does; nothing you type is sent anywhere.

**Or download it** to use offline:

1. Download `CalPERS-Retirement-Planner-1.0.0.html` from the [latest release](https://github.com/rsissons/calpers-retirement-planner/releases/latest) and save it anywhere, like your Documents folder.
2. Double-click it. It opens in your browser.
3. It opens on the **Guide** with a made-up sample household loaded. Click **Enter my numbers** and replace the sample figures with yours.
4. Your numbers save automatically in that browser. Use **Save to file** in the menu (☰) to keep a backup you can move to another computer or browser.

**On an iPad or iPhone:** use the online link above. Tapping a saved HTML file in the Files app shows a preview, not a working page.

## Your privacy

- The planner makes no network requests. The math, the charts and the page itself are all inside the one file. The only outside addresses are ordinary links (CalPERS charts, myCalPERS, ssa.gov) that open only if you click them.
- Your numbers are saved only in your browser's local storage, on your device. Clearing your browser data erases them. So does "Start over with the sample" in the menu.
- "Save to file" downloads a plain JSON file with your numbers. Treat it like any financial document.
- Anyone who uses the same browser profile on the same device can open the planner and see your numbers.

## What it models, and what it doesn't

The short version is on the Guide page inside the planner. [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) has every rule and every source. The main limits:

- There's no survivor scenario. Both people are assumed alive for the whole plan.
- Investment returns are a steady rate every year, so there's no market-crash or sequence-of-returns risk.
- It doesn't model IRMAA (the Medicare surcharge at higher incomes), long-term care, or big one-time expenses.

**This is a planning tool, not financial, tax or legal advice.** Confirm your pension with CalPERS before making decisions.

---

## For developers

Built with React 19, TypeScript, Vite 8, Tailwind CSS 4 and Recharts. There's no backend.

**Requirements:** Node.js 20.19+ or 22.12+ (npm comes with it).

```bash
npm install            # install dependencies
npm run dev            # local dev server at http://localhost:5173
npm test               # model checks: tax math, all 32 formulas, caps, plan files
npm run build:single   # release/CalPERS-Retirement-Planner-<version>.html, the one-file version to hand out
npm run build          # dist/, a normal static site for hosting
npm run publish:pages  # checks, builds, and publishes the online version
npm run lint
```

### Code map

| File | What it does |
|---|---|
| `src/formulas.ts` | All 32 CalPERS benefit factor tables, minimum ages and caps, from CalPERS's charts |
| `src/calpers.ts` | Pension calculation, date and age helpers, RMD start age |
| `src/tax.ts` | Federal and California brackets, joint and single, and Social Security taxation |
| `src/savings.ts` | Grows today's balances to the retirement date |
| `src/projection.ts` | The month-by-month simulation |
| `src/model.ts` | Prepares the config for a run; browser saving; plan file import and export |
| `src/config.ts` | The settings shape and the made-up sample household |
| `src/components/` | Pages: Overview, charts, Data Table, Your Numbers (Settings), Quick Adjust, Guide |
| `scripts/check.mjs` | The model checks behind `npm test` |

### Hosting it

The online version is GitHub Pages serving the `gh-pages` branch; `npm run publish:pages` updates it. `npm run build` makes the same static site in `dist/`, which works from any folder because it uses relative paths. Put it on GitHub Pages, Netlify, Cloudflare Pages or any web server. A hosted copy is the easiest way to reach iPhone and iPad users. It stays just as private, since the page never sends data anywhere.

### Updating the yearly numbers

These go stale and should be checked each year:

- **Tax brackets and deductions** in `src/tax.ts`: IRS Rev. Proc. for the new year; FTB Form 540 tax rate schedules and booklet.
- **Part B premium** in the sample in `src/config.ts`: the CMS announcement each fall.
- **Sample health premiums** in `src/config.ts`: CalPERS health rates.
- **Benefit factors** in `src/formulas.ts`: these rarely change, but re-check them against the [CalPERS charts](https://www.calpers.ca.gov/members/retirement-benefits/benefit-factor-charts) if CalPERS revises them.

After any change, run `npm test` and `npm run build:single`. Then `npm run publish:pages` updates the online version (it runs the checks, builds, and pushes `dist/` to the `gh-pages` branch), and the new single file goes on a GitHub release.

## License

MIT. See [LICENSE](LICENSE).
