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
- **Working for a CalPERS employer after retiring** (when you tick the box, as a retired annuitant): the job starts after the 180-day wait and the pension isn't affected. The 960-hour-per-fiscal-year limit isn't modeled; keep the pay realistic for it.
- **Not modeled:** split service under two formulas, reciprocal systems, the PEPRA pensionable compensation limit (enter final compensation that already reflects it), Social Security offsets to final compensation, purchased service, and sick leave conversion (add those to service credit yourself).

## CalSTRS pension (`calpers.ts`, `formulas.ts`, `projection.ts`)

- **Member-Only Benefit** = age factor × service credit × final compensation, then × the option factor you enter.
- **Age factors** come from the CalSTRS Member Handbook 2026 age factor tables (pages 78-79), one factor per month of age, at your age on the **last day of the month** your retirement is effective.
  - 2% at 60: 1.1% at 50 to 2.4% at 63. Minimum age 55, or 50 with 30 or more years of service.
  - 2% at 62: 1.16% at 55 to 2.4% at 65. Minimum age 55.
- **Career factor** (2% at 60 only): +0.2% with 30 or more years of service credit, up to a 2.4% total.
- **Final compensation** is entered by you: 36 months, or 12 months for 2% at 60 members with 25+ years.
- **Benefit adjustment (COLA):** a simple 2% of the starting benefit (the rate you set), first on the Sept 1 after the first anniversary of retiring (a retirement on or after Sept 1 waits until the Sept 1 two years later), then every Sept 1. Not compounded.
- **Working in California public schools after retiring** (when you tick the box): pay in the first 180 days comes off the pension dollar for dollar. After that, pay beyond the fiscal-year (July-June) postretirement earnings limit is withheld from later checks until collected in full, up to one year's benefit per fiscal year. The limit is $59,565 for 2026-27, indexed at spending inflation after that. The narrow critical-need exemption isn't modeled.
- **Social Security:** CalSTRS pay usually isn't covered by Social Security. Enter what you earned elsewhere, or 0. WEP and GPO no longer reduce benefits (Social Security Fairness Act, January 2025).
- **Not modeled:** the Defined Benefit Supplement (add its balance to savings), Supplemental Benefit Maintenance Account purchasing-power payments, the one-time death benefit, and service credit purchases (add those to service credit yourself).

## Other income (`projection.ts`)

- **Social Security** (each person) starts in the month that person reaches their chosen start age. Enter the amount for that age from the SSA statement. It grows each plan year at the pension COLA rate.
- **Spouse's pay** is gross pay. It continues every month that starts before their retirement date. It's taxed as ordinary income and pays payroll tax (below). Plans saved before 1.2.0 entered take-home pay; they load with "That's gross pay" off, and that pay is left untaxed as before.
- **Your job after retiring** is gross pay from the month after your retirement date until you reach the "work until" age. It's taxed the same way as the spouse's pay.
- **Social Security earnings test:** each person's wages in a plan year before their full retirement age (66 to 67 by birth year) are compared with $24,480 (2026). $1 of that person's Social Security is held back for every $2 over it. In the plan year they reach full retirement age, the rule is $1 for every $3 over $65,160, counting only wages before that month. The limits are indexed at spending inflation. The holdback is spread evenly over the months they draw benefits before full retirement age. SSA later raises the benefit to give it back; that credit isn't modeled.
- **Spouse's pension** starts after their retirement date and grows each plan year at the pension COLA rate. It's taxable.

## Savings and withdrawals (`savings.ts`, `projection.ts`)

- Before retirement, today's 403(b)/457(b) and cash savings grow monthly at their rates, with your monthly contributions added, up to the retirement date. The Roth balance is entered as of retirement.
- In retirement, the 403(b) and Roth compound monthly at the investment return, and savings at the savings rate.
- **Roth conversions** move up to your monthly amount from the 403(b) to the Roth each month until the 403(b) is empty. The tax they add is paid from the 403(b), not from spending.
- **Shortfalls** (spending + loans + health + income and payroll tax above income) come from cash savings first, then the 403(b), then the Roth.
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
- **Taxable (ordinary) income:** pensions, gross wages, 403(b) withdrawals, Roth conversions and RMDs. Take-home pay from older plans isn't included, since it was already taxed.
- **Payroll tax on wages:** Social Security 6.2% up to each worker's wage base ($184,500 in 2026, indexed), Medicare 1.45%, plus 0.9% additional Medicare on the household's wages over $250,000 (joint) or $200,000 (single), and California SDI 1.3% with no wage cap. Each plan year's wages are counted from its first month.
- **Federal:** 2026 brackets, standard deduction, and the additional deduction for each person 65+. Up to 85% of Social Security is taxable, using the provisional-income base amounts, which are fixed in law.
- **California:** 2025 brackets and standard deduction, and personal and senior exemption credits. Social Security isn't taxed.
- Brackets, deductions and credits are indexed forward each year at the spending inflation rate.
- Each year's tax is solved iteratively, because 403(b) withdrawals are taxable and some of them pay the tax. It's then spread evenly across the year's months.
- **Not modeled:** the temporary 2025 to 2028 federal senior deduction, itemized deductions, capital gains, the tax on savings interest, the California exemption credit phase-out at high incomes, and the earnings-test credit SSA gives back after full retirement age.

## Other simplifications

- Returns are the same every year, so there's no market volatility or sequence-of-returns risk. Test lower returns to see the sensitivity.
- Both people are assumed alive for the whole plan. There's no survivor scenario (single filing, one Social Security check, and the survivor's share of the pension).
- No long-term care, home sale, inheritance, or other one-time events.

## Sources

| What | Source |
|---|---|
| CalSTRS age factors, minimum ages, career factor, final compensation, benefit adjustment, 180-day rule, earnings limit mechanics | CalSTRS Member Handbook 2026, https://www.calstrs.com/files/44f960e51/MemberHandbook2026.pdf |
| CalSTRS postretirement earnings limit ($59,565 for 2026-27; $80,245 for 2025-26 under SB 765) | https://www.calstrs.com/limits |
| Benefit factors, minimum ages, caps (all 32 CalPERS formulas) | CalPERS Benefit Factor Charts, https://www.calpers.ca.gov/members/retirement-benefits/benefit-factor-charts (downloaded September 24, 2026). Each formula links to its own chart in `formulas.ts` and in the app. |
| Federal brackets, standard deductions, 65+ additional deduction (2026) | IRS Revenue Procedure 2025-32 |
| Taxable Social Security base amounts ($25,000/$34,000 single; $32,000/$44,000 joint) | IRS Publication 915 |
| California brackets (2025) | FTB 2025 California Tax Rate Schedules (Schedules X and Y) |
| California standard deduction and exemption credits (2025) | FTB 2025 Form 540 booklet |
| Uniform Lifetime Table | IRS Publication 590-B, Appendix B, Table III |
| RMD starting ages | SECURE 2.0 Act |
| Social Security wage base ($184,500), earnings test limits ($24,480 / $65,160), full retirement ages (2026) | SSA 2026 COLA fact sheet; ssa.gov |
| Medicare tax and the 0.9% additional Medicare tax | IRS Topic 560 |
| California SDI rate (1.3%, no wage cap, 2026) | EDD contribution rates |
| Sample Part B premium (2026, $202.90) | CMS |
| Sample health premiums (2027 Kaiser, Region 3) | CalPERS 2027 health plan rates |

The sample household (Pat and Jordan) is made up. Its numbers are illustrations, not recommendations.
