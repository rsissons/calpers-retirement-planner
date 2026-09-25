# User Guide

How to fill in the CalPERS & CalSTRS Retirement Planner, where each number comes from, and how to read what it tells you.

All money is **monthly** unless the label says otherwise. Every change applies instantly.

---

## 1. Before you start: gather these

**First, which system are you in?**
- **CalSTRS:** teachers and other certificated school staff (K-12 and community college).
- **CalPERS:** state, city, county and special-district employees, and classified school staff (office, custodial, transportation, IT).

Your paystub shows which one takes your retirement contribution. In the planner, pick it first: it's the top card on **Your Numbers**. The sample plan starts on CalPERS.

### If you're in CalPERS

| Item | Where to find it |
|---|---|
| Retirement formula (for example "School 2% at 55" or "Local Miscellaneous 2% at 62"; hired before 2013 is usually classic, 2013 or later PEPRA) | Annual Member Statement, or myCalPERS (my.calpers.ca.gov) |
| Service credit, and the date it's as of | Annual Member Statement or myCalPERS |
| Final compensation: highest 12 months (classic; some employers use 36) or 36 months (PEPRA) | A myCalPERS retirement estimate shows the figure CalPERS used |
| A retirement estimate for your planned date (for the option factor and to check the planner) | myCalPERS Retirement Estimate Calculator |
| Retiree health premiums and your employer's retiree contribution | CalPERS health plan rates for your region and plan; HR or your MOU |
| Whether you're earning Social Security | Your paystub (Social Security or OASDI tax); many CalPERS agencies pay in, some don't |

### If you're in CalSTRS

| Item | Where to find it |
|---|---|
| Retirement formula: 2% at 60 if first hired into CalSTRS-covered work before 2013, 2% at 62 after | Retirement Progress Report in myCalSTRS (calstrs.com/mycalstrs) |
| Service credit, and the date it's as of | Retirement Progress Report |
| Final compensation: highest 36 months, or 12 months for 2% at 60 with 25+ years | A myCalSTRS retirement estimate |
| A retirement estimate for your planned date (the option factor uses the Member-Only Benefit) | myCalSTRS |
| Retiree health: CalSTRS has none, so your district's retiree plan rates and what the district pays for retirees (often $0, or only until 65) | District HR or benefits office |
| Social Security: teaching pay usually isn't covered, so use other work's record or 0. Without 40 quarters, Medicare Part A isn't free | ssa.gov/myaccount |

### Everyone

| Item | Where to find it | Used for |
|---|---|---|
| Social Security estimate at the age you plan to start | ssa.gov/myaccount | Income |
| 403(b), 457(b), Roth IRA and savings balances, with dates (include a CalSTRS Defined Benefit Supplement balance in savings) | Latest statements | Savings |
| Monthly retirement contributions | Paystub | Savings growth until you retire |
| Monthly spending, and each loan's payment and payoff date | Bank and card statements, loan statements | Expenses |

If your spouse or partner is included, you'll also want their gross pay (from a paystub), any pension of their own, and their Social Security estimate.

---

## 2. Filling in "Your Numbers"

Open the menu (☰, top left) and choose **Your Numbers**.

### About You

- **Plan name / first name:** labels only. They show up in the menu, on the charts and on saved files.
- **Birth date and retirement date:** the retirement date is your last day of work, and the projection starts the following month. The **Retirement age** slider moves that date to the same month and day at a different age.
- **Your Social Security:** the monthly amount at your chosen start age, from your SSA statement. Enter 0 if you don't get Social Security.
- **Plan through your age:** how long the money must last. 95 is a careful default; many planners use 90 to 100.

### Spouse or Partner

Switch **Plan for two people** off if you're single; taxes then use single-filer brackets. When it's on:

- **Gross pay:** their pay *before* taxes, monthly, from a paystub (biweekly gross × 26 ÷ 12). The planner taxes it with the pensions through the brackets, and takes out FICA (Social Security and Medicare) and California SDI. Enter 0 if they don't work.
- **"That's gross pay" box:** leave it on. Plans saved before version 1.2.0 entered take-home pay instead, and they open with the box off so their numbers don't change. To switch one over, tick the box and type in gross pay.
- **Their retirement date:** their pay stops and their own pension (if any) starts.
- **Their own pension:** any pension (CalPERS, CalSTRS, private) as a flat monthly amount. It's taxed, and it grows at the COLA rate you set for yours.
- **Their Social Security and start age:** from their SSA statement.

### Work After Retirement

For a job you'd take after retiring, full-time or part-time. Leave the pay at 0 if you won't work.

- **Job pay:** gross monthly pay, before tax. It starts the month after your retirement date. It's taxed on top of your pension, plus FICA and California SDI, so with a pension already in place a good share of each extra dollar goes to tax.
- **Work until age:** the pay stops in the month you reach this age.
- **Social Security earnings test:** if you draw Social Security before full retirement age (67 for anyone born 1960 or later), $1 is held back for every $2 you earn over $24,480 a year (2026). In the year you reach full retirement age it's $1 for every $3 over $65,160. The planner takes that out of your checks. SSA pays it back later by raising your benefit, but the planner doesn't count that, so it's slightly cautious.
- **"This job is with a CalPERS employer" / "in a California public school"** (the box's wording follows your formula). Leave it off for private-sector work, which doesn't affect the pension. Turn it on to apply your system's rules:
  - **CalPERS (retired annuitant):** the job starts after the required 180-day wait. You can also work at most 960 hours per fiscal year (July to June) across all CalPERS employers. That limit isn't modeled, so keep the pay realistic for 960 hours.
  - **CalSTRS (California public schools, including substitute teaching):** pay in the first 180 days after retiring comes off your pension dollar for dollar. After that, pay over the yearly earnings limit is withheld from your pension until it's collected. The limit is $59,565 for July 2026 to June 2027; it was $80,245 the year before, under a temporary law that ended.

### Your Pension (CalPERS or CalSTRS)

This is the first card on Your Numbers, because everything else follows it.

- **Pension system:** tap CalPERS or CalSTRS. Switching moves the formula to that system's first choice (CalPERS School 2% at 55, or CalSTRS 2% at 60). The formula list then shows only that system's formulas. The header's system button, shown on every page, brings you back here.
- **Retirement formula:** pick yours from the list.
  - **CalPERS:** it's printed on your Annual Member Statement. Classic members hired before 2013 usually have a "2% at 55"-style formula; PEPRA members hired in 2013 or later usually have "2% at 62" (miscellaneous) or "2%/2.5%/2.7% at 57" (safety).
  - **CalSTRS:** "2% at 60" if you were first hired into CalSTRS-covered work before 2013, "2% at 62" after. It's on your Retirement Progress Report. The page's labels, hints and COLA rules switch to CalSTRS when you pick one.
- **Calculate the pension from the formula:** on by default. Switch it off to type in the monthly amount straight from a myCalPERS or myCalSTRS estimate.
- **Final compensation:** your monthly final compensation.
  - **CalPERS classic:** usually your highest 12 consecutive months of pay (some employers use 36).
  - **CalPERS PEPRA:** your highest 36 months, subject to the PEPRA pensionable pay limit.
  - **CalSTRS:** your highest 36 consecutive months. 2% at 60 members with 25 or more years of service use their highest 12 months. 2% at 62 is subject to the PEPRA limit.
  - A retirement estimate shows the figure the system used.
- **Service credit and "as of" date:** from your statement. The planner adds 1/12 of a year for each month you work between that date and retirement, assuming full-time work.
- **Beneficiary option factor:** the planner starts from the *unmodified* allowance (CalSTRS calls it the Member-Only Benefit), then multiplies by this factor for the option you'll choose. To get it, run a retirement estimate and divide your option's monthly amount by the unmodified amount. For example, $4,650 ÷ $5,000 = 93%. Use 100% if you'll take the unmodified allowance (no survivor benefit).
- **Pension COLA:**
  - **CalPERS:** most contracts have a 2% cost-of-living adjustment, compounded; some employers contracted for more. The first COLA arrives May 1 of the second calendar year after you retire.
  - **CalSTRS:** a 2% benefit adjustment of your *starting* benefit (simple, not compounded) every Sept 1 after the first anniversary of retiring. After 10 years that's +20%, where a compounded 2% would be about +22%.
- **CalSTRS age factors** go up by the month, and they use your age on the last day of the month you retire. 2% at 60 members with 30 or more years of service get a 0.2% career factor, up to 2.4%. The table under the summary shows every factor, with yours highlighted.

**Check it:** the summary box shows the age factor, the percentage of pay and the monthly amount. Compare it with a myCalPERS or myCalSTRS estimate for the same date. If they differ, trust the system: adjust final compensation, or switch formula mode off and type in their number.

### Savings & Investments

- **403(b) / 457(b) balance today:** all pre-tax retirement accounts combined, with the statement date. Contributions are added every month until you retire, and the balance grows at the investment return.
- **Roth IRA balance at retirement:** what you expect to have in Roth accounts on your retirement date.
- **Cash savings today, and monthly additions:** checking and savings you'd use in retirement. Savings pay for shortfalls first.
- **Investment return:** one steady yearly rate for the 403(b) and Roth. 5 to 6% is a common planning figure for a balanced portfolio; try a lower number to stress-test.
- **Roth conversion:** a monthly amount moved from the 403(b) to the Roth after you retire, with its tax paid from the 403(b). This can lower required distributions later. Enter 0 for none.

### Spending & Loans

- **Essential spending:** today's monthly cost of necessities: food, utilities, insurance, property tax and escrow, gas, phone. Leave out loan payments and health premiums; they're entered separately.
- **Discretionary spending:** travel, dining out, hobbies, gifts.
- **Work costs that end at retirement:** commuting, parking and similar costs that stop when you retire. They come off essential spending from your first retired month.
- **Spending inflation:** how fast spending grows each year. When it outpaces the pension COLA, gaps widen over time.
- **Loans:** each one's monthly payment and the month of its final payment. Payments stay fixed and stop after that month. Use **+ Add a loan** and **Remove** to manage the list.

A simple way to estimate spending: add up 12 months of bank and credit card statements, subtract loan payments and health premiums, and divide by 12.

### Retiree Health

- **Employer's contribution:** what your employer pays each month toward retiree health premiums. It's often a fixed dollar amount that doesn't grow; ask HR or check your MOU.
- **Premiums:** your plan's monthly premiums for each stage (neither of you on Medicare, one on Medicare, both on Medicare). CalPERS publishes rates by region and plan each year; enter the year they're from.
- **Part B premium:** the standard Medicare Part B premium per person. It's added for each person from age 65.
- **Healthcare inflation:** how fast premiums and Part B grow each January. Healthcare has historically risen faster than general prices; 4 to 6% is a common planning range.

### Taxes & Leftover Money

- **Bank leftover income in savings:** on means any monthly surplus goes into savings. Off means it's assumed spent. Most households land somewhere between, so try both.
- **Real federal + California tax brackets:** on by default. Off uses one flat rate you choose.

---

## 3. Reading the results

- **Overview:** the headline numbers. It shows your first-month net income against spending, your starting pension and where it ends up, and the age your money is **funded through**. It also covers how any shortfall is covered (savings, then 403(b), then Roth), a liquid-asset chart, and your key milestones.
- **Income vs Spending:** each income source stacked by year, with total spending (including health and taxes) as a red line. Where the line rises above the bars, savings are being drawn down.
- **Funding Source:** which account covers each year's shortfall.
- **Account Balances:** savings, 403(b) and Roth over time.
- **Data Table:** every number, by year or by month, with notes on events such as Social Security starting, Medicare, loan payoffs and required distributions. It scrolls sideways.
- **Quick Adjust** (the sliders button, top right): the most-used levers in one panel, for quick "what if" checks.

---

## 4. Saving, backing up, and moving to another device

- Your numbers **save automatically** in the browser you're using, on that device. The header badge says **Saved in this browser** once they do.
- **Save to file** (in the menu) downloads your plan as a `.json` file. Keep it as a backup, or use it to move your plan to another computer or browser.
- **Open file** loads a saved plan. It replaces the numbers on screen.
- **Start over with the sample** erases your numbers from this browser and reloads the made-up sample. Save to a file first if you want to keep them.
- Clearing your browser's history or site data also erases the saved numbers, and so does using a private window. Keep a saved file.

---

## 5. Troubleshooting

**My numbers disappeared.** The browser's storage was cleared, you're in a private window, or you opened the planner in a different browser or from a different copy of the file. Use **Open file** with your saved plan.

**The pension doesn't match my myCalPERS or myCalSTRS estimate.** Check the formula, the service credit date, and final compensation, which is usually the cause. PEPRA members may be subject to the pay limit, and some members have service under two formulas, which the planner doesn't split. When in doubt, switch formula mode off and enter the myCalPERS amount.

**It says I'm under the minimum retirement age.** Each formula has one (50 for most CalPERS formulas, 52 for PEPRA 2% at 62, 55 for State 1.25% formulas, and 55 for CalSTRS, or 50 with 30+ years under CalSTRS 2% at 60). PEPRA members with prior classic service may retire at 50; if that's you, switch formula mode off and use your estimate.

**My formula isn't in the list.** The list covers every benefit factor chart CalPERS publishes and both CalSTRS formulas. If yours is different (for example, a split between two formulas), use your myCalPERS estimate with formula mode off.

**It won't open on my iPhone or iPad.** Opening a saved HTML file from the Files app shows a preview, not a working page. Use the online version at https://rsissons.github.io/calpers-retirement-planner/ instead.

---

*This planner is a planning tool, not financial, tax or legal advice. Confirm your pension with CalPERS or CalSTRS before making retirement decisions, and consider talking to a fee-only fiduciary financial planner.*
