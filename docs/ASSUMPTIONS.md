# Assumptions, Rules and Sources

Exactly how the planner calculates, so anyone can check it. The code references are in `src/`.

## Timeline

- The simulation runs **monthly**, starting the month after your retirement date and ending with the plan year in which you reach your chosen end age (default 95).
- A plan year runs from your retirement month to the same month a year later. Ages in the tables are your age at the start of each plan year.
- Your age, your spouse's age and every start date (Social Security, Medicare, RMDs) come from actual birth dates, not rounded ages.

## CalPERS pension (`calpers.ts`, `formulas.ts`)

- **Unmodified allowance** = benefit factor × service credit × final compensation.
- The **benefit factor** comes from CalPERS's published chart for your formula, looked up by your age in whole years and quarter years at retirement. At or past the chart's top age, the top factor applies. Under the formula's minimum retirement age, the pension is $0.
- **Caps:** where a chart states a maximum percentage of final compensation, it's applied. That's 90% for most Safety formulas, and 80% for State Safety 2% at 55, 2.5% at 55 (State Safety) and 2.5% at 60.
- **Service credit** grows by 1/12 of a year for each month between the "as of" date and retirement (full-time work).
- **Beneficiary option:** the unmodified amount is multiplied by the option factor you enter. The planner doesn't compute CalPERS's actuarial option factors; get yours from a myCalPERS estimate.
- **COLA:** the first increase is May 1 of the second calendar year after retirement, then every May, at the rate you set (2% default).
- **Not modeled:** split service under two formulas, reciprocal systems, the PEPRA pensionable compensation limit (enter final compensation that already reflects it), Social Security offsets to final compensation, purchased service, and sick leave conversion (add those to service credit yourself).

## Other income (`projection.ts`)

- **Social Security** (each person) starts in the month that person reaches their chosen start age. Enter the amount for that age from the SSA statement. It grows each plan year at the pension COLA rate.
- **Spouse's take-home pay** continues every month that starts before their retirement date. It's net pay, so it isn't taxed again.
- **Spouse's pension** starts after their retirement date and grows each plan year at the pension COLA rate. It's taxable.

## Savings and withdrawals (`savings.ts`, `projection.ts`)

- Before retirement, today's 403(b)/457(b) and cash savings grow monthly at their rates, with your monthly contributions added, up to the retirement date. The Roth balance is entered as of retirement.
- In retirement, the 403(b) and Roth compound monthly at the investment return, and savings at the savings rate.
- **Roth conversions** move up to your monthly amount from the 403(b) to the Roth each month until the 403(b) is empty. The tax they add is paid from the 403(b), not from spending.
- **Shortfalls** (spending + loans + health + income tax above income) come from cash savings first, then the 403(b), then the Roth.
- **Surpluses** are added to savings when "bank leftover income" is on; otherwise they're treated as spent.
- **Required minimum distributions** begin in the year you reach age 75 if born 1960 or later, or 73 if born 1951 to 1959 (SECURE 2.0). Each year's RMD is the 403(b) balance at the start of the year divided by the IRS Uniform Lifetime Table factor for your age at year end. Conversions and withdrawals count toward it; any remainder is withdrawn in the last month, taxed, and put into savings.

## Spending

- Essential and discretionary spending start at today's amounts. Work costs that end at retirement come off essential spending from the first month. Both grow each plan year at spending inflation.
- Loan payments are fixed (not inflated) and stop after each loan's final payment month.

## Healthcare

- Out-of-pocket premium = the plan premium for the current stage (neither, one or both on Medicare) − the employer's fixed monthly contribution, never below $0.
- Premiums and Part B grow each January at healthcare inflation from the year they're entered for. The employer contribution doesn't grow.
- Medicare Part B is added for each person from age 65, at the standard premium. IRMAA surcharges aren't modeled.

## Income tax (`tax.ts`)

- Filing status: married filing jointly with a spouse, single without.
- **Taxable (ordinary) income:** pensions, 403(b) withdrawals, Roth conversions and RMDs. Take-home pay isn't included, since it was already taxed.
- **Federal:** 2026 brackets, standard deduction, and the additional deduction for each person 65+. Up to 85% of Social Security is taxable, using the provisional-income base amounts, which are fixed in law.
- **California:** 2025 brackets and standard deduction, and personal and senior exemption credits. Social Security isn't taxed.
- Brackets, deductions and credits are indexed forward each year at the spending inflation rate.
- Each year's tax is solved iteratively, because 403(b) withdrawals are taxable and some of them pay the tax. It's then spread evenly across the year's months.
- **Not modeled:** the temporary 2025 to 2028 federal senior deduction, itemized deductions, capital gains, the tax on savings interest, the California exemption credit phase-out at high incomes, and the Social Security earnings test.

## Other simplifications

- Returns are the same every year, so there's no market volatility or sequence-of-returns risk. Test lower returns to see the sensitivity.
- Both people are assumed alive for the whole plan. There's no survivor scenario (single filing, one Social Security check, and the survivor's share of the pension).
- No long-term care, home sale, inheritance, or other one-time events.

## Sources

| What | Source |
|---|---|
| Benefit factors, minimum ages, caps (all 32 formulas) | CalPERS Benefit Factor Charts, https://www.calpers.ca.gov/members/retirement-benefits/benefit-factor-charts (downloaded September 24, 2026). Each formula links to its own chart in `formulas.ts` and in the app. |
| Federal brackets, standard deductions, 65+ additional deduction (2026) | IRS Revenue Procedure 2025-32 |
| Taxable Social Security base amounts ($25,000/$34,000 single; $32,000/$44,000 joint) | IRS Publication 915 |
| California brackets (2025) | FTB 2025 California Tax Rate Schedules (Schedules X and Y) |
| California standard deduction and exemption credits (2025) | FTB 2025 Form 540 booklet |
| Uniform Lifetime Table | IRS Publication 590-B, Appendix B, Table III |
| RMD starting ages | SECURE 2.0 Act |
| Sample Part B premium (2026, $202.90) | CMS |
| Sample health premiums (2027 Kaiser, Region 3) | CalPERS 2027 health plan rates |

The sample household (Pat and Jordan) is made up. Its numbers are illustrations, not recommendations.
