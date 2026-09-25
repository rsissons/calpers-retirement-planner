import type { FC } from 'react';
import type { Config } from '../config';
import { columnLabels, calculatePension, ageOn, rmdStartAge } from '../calpers';
import { FORMULAS } from '../formulas';
import { project403bAtRetirement, projectCashAtRetirement } from '../savings';
import { useConfigChange } from '../useConfigChange';
import { Card, DateField, Hint, NumberField, SliderField, TextField, Toggle } from './Fields';

interface Props {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
}

const $ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const CATEGORIES = [...new Set(FORMULAS.map(f => f.category))];

export const Settings: FC<Props> = ({ config, setConfig }) => {
  const onChange = useConfigChange(setConfig);
  const pension = calculatePension(config);
  const formula = pension.formula;
  const sys = pension.system;
  const strs = sys === 'CalSTRS';
  const my = strs ? 'myCalSTRS' : 'myCalPERS';
  const earliestAge = formula.earlyRetirement?.age ?? formula.minAge;
  const minAgeText = formula.earlyRetirement
    ? `${formula.minAge} (${formula.earlyRetirement.age} with ${formula.earlyRetirement.serviceYears}+ years of service)`
    : `${formula.minAge}`;
  const savings403b = project403bAtRetirement(config);
  const savingsCash = projectCashAtRetirement(config);
  const you = config.yourName || 'You';
  const partner = config.spouseName || 'Spouse';
  const spouseAgeAtYourRetirement = ageOn(config.spouseBirthDate, config.yourRetirementDate);

  const updateDebt = (i: number, field: 'name' | 'payment' | 'endDate', value: string) => {
    if (field === 'endDate' && !value) return;
    setConfig(prev => ({
      ...prev,
      debts: prev.debts.map((d, j) => j !== i ? d : { ...d, [field]: field === 'payment' ? parseFloat(value) || 0 : value }),
    }));
  };
  const addDebt = () => setConfig(prev => ({ ...prev, debts: [...prev.debts, { name: 'New loan', payment: 0, endDate: prev.yourRetirementDate }] }));
  const removeDebt = (i: number) => setConfig(prev => ({ ...prev, debts: prev.debts.filter((_, j) => j !== i) }));

  return (
    <div className="p-2 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0072B2] mb-2">Your Numbers</h2>
        <p className="text-gray-600 text-sm">
          Everything the projection uses. Changes apply instantly and are saved in this browser. All money is monthly unless it says otherwise.
          The User Guide lists where to find each number.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card title="About You">
          <TextField label="Plan name" name="planName" value={config.planName} onChange={onChange} hint="Shown at the top of the menu and on saved files." />
          <TextField label="Your first name" name="yourName" value={config.yourName} onChange={onChange} />
          <DateField label="Your birth date" name="yourBirthDate" value={config.yourBirthDate} onChange={onChange} />
          <DateField label="Your retirement date" name="yourRetirementDate" value={config.yourRetirementDate} onChange={onChange}
            hint="Your last day of work. The projection starts the month after." />
          <SliderField label="Retirement age" name="retirementAge" value={pension.ageYears} min={Math.max(50, earliestAge)} max={75} step={1}
            display={`${pension.ageYears}y ${pension.ageMonths}m`} onChange={onChange} hint="Moves the retirement date to that age, same month and day." />
          <NumberField label="Your Social Security (monthly, at your start age)" name="yourSS" value={config.yourSS} step={10} prefix="$" onChange={onChange}
            hint={strs
              ? "From your statement at ssa.gov/myaccount. Most teachers didn't pay Social Security on CalSTRS pay, so use what you earned from other jobs, or 0. The WEP and GPO cuts were repealed in January 2025."
              : "From your statement at ssa.gov/myaccount. Enter 0 if you don't get Social Security."} />
          <SliderField label="Your Social Security starts at" name="yourSSStartAge" value={config.yourSSStartAge} min={62} max={70} step={1}
            display={`Age ${config.yourSSStartAge}`} onChange={onChange} />
          <SliderField label="Plan through your age" name="projectionEndAge" value={config.projectionEndAge} min={80} max={105} step={1}
            display={`${config.projectionEndAge}`} onChange={onChange} hint="How long the money has to last. 95 is a common, careful choice." />
        </Card>

        <Card title="Spouse or Partner">
          <Toggle label="Plan for two people" name="hasSpouse" checked={config.hasSpouse} onChange={onChange}
            hint={config.hasSpouse ? 'Taxes are married filing jointly.' : 'Taxes are filed single. Turn this on to add a spouse or partner.'} />
          {config.hasSpouse && <>
            <TextField label="Their first name" name="spouseName" value={config.spouseName} onChange={onChange} />
            <DateField label="Their birth date" name="spouseBirthDate" value={config.spouseBirthDate} onChange={onChange}
              hint={`${partner} will be ${Math.floor(spouseAgeAtYourRetirement)} when ${you} retires.`} />
            <NumberField label={config.spousePayIsGross ? 'Their gross pay (monthly, while working)' : 'Their take-home pay (monthly, while working)'} name="spouseSalary" value={config.spouseSalary} step={10} prefix="$" onChange={onChange}
              hint={config.spousePayIsGross
                ? 'Gross pay from their paystub, before any taxes. Taxed with the pensions, plus FICA and CA SDI. 0 if not working.'
                : 'Net pay, not taxed again. This plan was saved before 1.2.0; tick the box below and enter gross pay for the full tax math.'} />
            <Toggle label="That's gross pay (before tax)" name="spousePayIsGross" checked={config.spousePayIsGross} onChange={onChange}
              hint="Leave this on. Off only keeps older plans that entered take-home pay." />
            <DateField label="Their retirement date" name="spouseRetirementDate" value={config.spouseRetirementDate} onChange={onChange}
              hint="Their pay stops; their own pension (below) starts." />
            <NumberField label="Their own pension (monthly, from their retirement)" name="spousePension" value={config.spousePension} step={10} prefix="$" onChange={onChange}
              hint="CalPERS, CalSTRS or any other pension. Taxable. 0 if none." />
            <NumberField label="Their Social Security (monthly, at their start age)" name="spouseSS" value={config.spouseSS} step={10} prefix="$" onChange={onChange} />
            <SliderField label="Their Social Security starts at" name="spouseSSStartAge" value={config.spouseSSStartAge} min={62} max={70} step={1}
              display={`Age ${config.spouseSSStartAge}`} onChange={onChange} />
          </>}
        </Card>

        <Card title="Work After Retirement">
          <NumberField label={`${you}'s job pay (gross, monthly)`} name="jobPay" value={config.jobPay} step={100} prefix="$" onChange={onChange}
            hint="Pay from a job after you retire, before tax. Starts the month after your retirement date. Taxed with your pension, plus FICA and CA SDI. 0 if none." />
          <SliderField label="Work until age" name="jobEndAge" value={config.jobEndAge} min={50} max={80} step={1}
            display={`${config.jobEndAge}`} onChange={onChange}
            hint="If you draw Social Security before full retirement age, $1 is held back for every $2 of wages over $24,480/yr (2026)." />
          <Toggle label={strs ? 'This job is in a California public school (CalSTRS rules)' : 'This job is with a CalPERS employer (retired annuitant)'}
            name="jobAtPensionEmployer" checked={config.jobAtPensionEmployer} onChange={onChange}
            hint={strs
              ? 'On: pay in the first 180 days after retiring comes off your pension dollar for dollar, and after that, pay over the yearly earnings limit ($59,565 for 2026-27) is withheld from it. Off: a job outside California public schools, which doesn\'t affect the pension.'
              : 'On: the job starts after the 180-day wait CalPERS requires. You can also work at most 960 hours per fiscal year (not modeled; keep the pay realistic). Off: private-sector work, which doesn\'t affect the pension.'} />
        </Card>

        <Card title={`${sys} Pension`} wide>
          <div>
            <label htmlFor="f-pensionFormulaId" className="block text-sm font-medium text-gray-700 mb-1">Your retirement formula</label>
            <select id="f-pensionFormulaId" name="pensionFormulaId" value={config.pensionFormulaId} onChange={onChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-sm">
              {CATEGORIES.map(cat => (
                <optgroup key={cat} label={cat}>
                  {FORMULAS.filter(f => f.category === cat).map(f => <option key={f.id} value={f.id}>{cat} · {f.name}</option>)}
                </optgroup>
              ))}
            </select>
            <Hint>
              {strs
                ? 'CalSTRS 2% at 60 if you were first hired into CalSTRS-covered work before 2013, 2% at 62 after. It\'s on your Retirement Progress Report in myCalSTRS.'
                : 'It\'s on your CalPERS Annual Member Statement and in myCalPERS.'} Minimum retirement age {minAgeText}
              {formula.maxPercent !== null ? ` · capped at ${pct(formula.maxPercent, 0)} of final compensation` : ''}
              {formula.careerFactor ? ` · +${pct(formula.careerFactor.add)} career factor with ${formula.careerFactor.serviceYears}+ years, up to ${pct(formula.careerFactor.max)}` : ''}.
              {' '}<a href={formula.source} target="_blank" rel="noreferrer" className="text-[#0072B2] underline">{strs ? 'CalSTRS Member Handbook' : 'CalPERS chart'}</a>
            </Hint>
          </div>

          <Toggle label="Calculate the pension from the formula" name="pensionFromFormula" checked={config.pensionFromFormula} onChange={onChange}
            hint={`Off: type in the monthly amount from your ${my} estimate instead.`} />

          {config.pensionFromFormula ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberField label="Final compensation (monthly)" name="finalCompensation" value={config.finalCompensation} step={1} prefix="$" onChange={onChange}
                hint={strs
                  ? 'Highest 36 consecutive months of pay, monthly. 2% at 60 members with 25+ years of service: highest 12 months. 2% at 62: subject to the PEPRA pay limit.'
                  : 'Classic members: highest 12 consecutive months of pay (some employers use 36). PEPRA members: highest 36 months, subject to the PEPRA pay limit.'} />
              <NumberField label="Service credit (years)" name="serviceCreditYears" value={config.serviceCreditYears} step={0.001} onChange={onChange}
                hint={strs ? 'From your Retirement Progress Report in myCalSTRS.' : 'From your Annual Member Statement or myCalPERS.'} />
              <DateField label="Service credit as of" name="serviceCreditAsOf" value={config.serviceCreditAsOf} onChange={onChange}
                hint="Adds 1/12 year per month from this date to retirement (full-time work)." />
              <SliderField label="Beneficiary option factor" name="beneficiaryOptionFactor" value={Number((config.beneficiaryOptionFactor * 100).toFixed(1))} min={70} max={100} step={0.1}
                display={pct(config.beneficiaryOptionFactor)} onChange={onChange}
                hint={strs
                  ? 'Your option amount ÷ the Member-Only Benefit on a myCalSTRS estimate. 100% = Member-Only Benefit (no survivor benefit).'
                  : 'Your option amount ÷ the unmodified amount on a myCalPERS estimate. 100% = unmodified (no survivor benefit).'} />
            </div>
          ) : (
            <NumberField label="Monthly pension" name="pensionStart" value={config.pensionStart} step={10} prefix="$" onChange={onChange}
              hint="After the beneficiary option you plan to choose, before tax." />
          )}

          <SliderField label="Pension COLA" name="pensionCOLA" value={Number((config.pensionCOLA * 100).toFixed(2))} min={0} max={5} step={0.25}
            display={`${pct(config.pensionCOLA)}/yr`} onChange={onChange}
            hint={strs
              ? 'CalSTRS adds 2% of your starting benefit every Sept 1 after the first year (simple, not compounded). This rate also grows Social Security and the spouse pension here.'
              : 'Most CalPERS contracts have a 2% COLA, compounded each May; some employers contracted for more. It also grows Social Security and the spouse pension here.'} />

          {config.pensionFromFormula && <>
            <div className="bg-gray-50 rounded p-4 text-sm text-gray-700 space-y-1">
              {pension.eligible ? (
                <>
                  <p>Age at retirement{strs ? ' (end of that month)' : ''}: <b>{pension.ageYears}y {pension.ageMonths}m</b> → {columnLabels(formula)[pension.column]} column · factor <b>{pct(pension.ageFactor, 3)}</b>
                    {pension.careerFactor > 0 && <> (includes {pct(pension.careerFactor, 3)} career factor)</>}</p>
                  <p>{pct(pension.ageFactor, 3)} × {pension.serviceYears.toFixed(2)} yrs = <b>{pct(pension.benefitPercent)}</b> of {$(config.finalCompensation)}
                    {pension.capped && <span className="text-[#D55E00]"> (capped by the formula)</span>}</p>
                  <p>{strs ? 'Member-Only Benefit' : 'Unmodified'}: <b>{$(pension.unmodified)}</b>/mo · With your option: <b className="text-[#009E73]">{$(pension.optionAmount)}</b>/mo</p>
                </>
              ) : (
                <p className="text-[#D55E00] font-semibold">Under this formula's minimum retirement age ({minAgeText}) on this date.</p>
              )}
              <p className="text-xs text-gray-500 pt-1">Check this against a {my} retirement estimate. If they differ, trust {sys} and adjust final compensation or switch the formula off and type in their number.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="p-1.5 text-left">Age</th>
                    {columnLabels(formula).map(q => <th key={q} className="p-1.5 whitespace-nowrap">{q}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {formula.table.map((row, r) => (
                    <tr key={row.age} className={row.age === pension.tableAge ? 'bg-blue-50' : 'border-t border-gray-100'}>
                      <td className="p-1.5 text-left font-semibold whitespace-nowrap">{row.age}{r === formula.table.length - 1 ? '+' : ''}{row.age < formula.minAge ? ' *' : ''}</td>
                      {row.factors.map((f, q) => {
                        const active = pension.eligible && row.age === pension.tableAge && q === pension.column;
                        return <td key={q} className={active ? 'p-1.5 font-bold text-white bg-[#0072B2] rounded' : 'p-1.5'}>{pct(f, 3)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {formula.table[0].age < formula.minAge && <Hint>* {formula.earlyRetirement
                ? `Before ${formula.minAge} only with ${formula.earlyRetirement.serviceYears} or more years of service credit.`
                : `Below the minimum retirement age of ${formula.minAge} (50 with combined classic and PEPRA service).`}</Hint>}
              {formula.careerFactor && <Hint>With {formula.careerFactor.serviceYears}+ years of service credit, add {pct(formula.careerFactor.add)} to the factor, up to {pct(formula.careerFactor.max)} (the career factor).</Hint>}
            </div>
          </>}
        </Card>

        <Card title="Savings & Investments">
          <NumberField label="403(b) / 457(b) balance today" name="current403b" value={config.current403b} step={100} prefix="$" onChange={onChange}
            hint="All pre-tax retirement accounts combined." />
          <DateField label="Balance as of" name="current403bAsOf" value={config.current403bAsOf} onChange={onChange} />
          <NumberField label="Added each month until retirement" name="monthly403bContribution" value={config.monthly403bContribution} step={25} prefix="$" onChange={onChange} />
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
            At retirement: <b className="text-[#0072B2]">{$(savings403b.balance)}</b>
            <Hint>{savings403b.months} months of contributions ({$(savings403b.contributions)}) plus growth at {pct(config.annualReturn)}/yr</Hint>
          </div>
          <NumberField label="Roth IRA balance at retirement" name="startingRoth" value={config.startingRoth} step={100} prefix="$" onChange={onChange} />
          <NumberField label="Cash savings today" name="currentSavings" value={config.currentSavings} step={100} prefix="$" onChange={onChange} />
          <DateField label="Savings as of" name="savingsAsOf" value={config.savingsAsOf} onChange={onChange} />
          <NumberField label="Added to savings each month until retirement" name="monthlySavingsContribution" value={config.monthlySavingsContribution} step={25} prefix="$" onChange={onChange} />
          <SliderField label="Savings interest rate" name="savingsRate" value={Number((config.savingsRate * 100).toFixed(2))} min={0} max={6} step={0.25}
            display={pct(config.savingsRate, 2)} onChange={onChange} />
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
            Savings at retirement: <b className="text-[#0072B2]">{$(savingsCash.balance)}</b>
            <Hint>Used first to cover shortfalls, before the 403(b).</Hint>
          </div>
          <SliderField label="Investment return" name="annualReturn" value={Number((config.annualReturn * 100).toFixed(1))} min={0} max={12} step={0.5}
            display={`${pct(config.annualReturn)}/yr`} onChange={onChange} hint="The 403(b) and Roth grow at this steady rate." />
          <NumberField label="Roth conversion (monthly, after retirement)" name="maxMonthlyConversion" value={config.maxMonthlyConversion} step={100} prefix="$" onChange={onChange}
            hint={`${$(config.maxMonthlyConversion * 12)}/yr moves from the 403(b) to the Roth until the 403(b) is empty. RMDs start at ${rmdStartAge(config.yourBirthDate)} on whatever is left. 0 = no conversions.`} />
        </Card>

        <Card title="Spending & Loans">
          <NumberField label="Essential spending (monthly, today)" name="essentialSpending" value={config.essentialSpending} step={50} prefix="$" onChange={onChange}
            hint="Food, utilities, insurance, property tax, gas, and so on. Leave out loan payments and health premiums; they're below." />
          <NumberField label="Discretionary spending (monthly, today)" name="discretionarySpending" value={config.discretionarySpending} step={50} prefix="$" onChange={onChange}
            hint="Travel, dining out, hobbies, gifts." />
          <NumberField label="Work costs that end at retirement" name="workCostsEnding" value={config.workCostsEnding} step={25} prefix="−$" onChange={onChange}
            hint="Commute gas, parking, work clothes. Comes off essential spending from the first month of retirement." />
          <SliderField label="Spending inflation" name="spendingInflation" value={Number((config.spendingInflation * 100).toFixed(1))} min={0} max={6} step={0.5}
            display={`${pct(config.spendingInflation)}/yr`} onChange={onChange}
            hint="If spending grows faster than the pension COLA, gaps grow over time." />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Loan payments (fixed; each stops after its final payment)</p>
            {config.debts.length === 0 && <Hint>No loans.</Hint>}
            {config.debts.map((d, i) => (
              <div key={i} className="mb-3 rounded border border-gray-100 p-2">
                <div className="flex gap-2 mb-2">
                  <input type="text" value={d.name} onChange={e => updateDebt(i, 'name', e.target.value)} aria-label="Loan name" className="flex-1 min-w-0 border border-gray-300 rounded-md p-1.5 bg-gray-50 text-sm" />
                  <button type="button" onClick={() => removeDebt(i)} className="text-xs text-gray-500 hover:text-[#D55E00] px-2">Remove</button>
                </div>
                <div className="flex gap-2">
                  <input type="number" min="0" step="1" value={d.payment} onChange={e => updateDebt(i, 'payment', e.target.value)} aria-label={`${d.name} monthly payment`} className="w-1/2 min-w-0 border border-gray-300 rounded-md p-1.5 bg-gray-50 text-sm" />
                  <input type="date" value={d.endDate} onChange={e => updateDebt(i, 'endDate', e.target.value)} aria-label={`${d.name} final payment date`} className="w-1/2 min-w-0 border border-gray-300 rounded-md p-1.5 bg-gray-50 text-sm" />
                </div>
              </div>
            ))}
            <button type="button" onClick={addDebt} className="text-sm font-semibold text-[#0072B2] hover:underline">+ Add a loan</button>
            <Hint>Monthly payment, then the month of the final payment. Payments don't grow with inflation.</Hint>
          </div>
        </Card>

        <Card title="Retiree Health">
          <NumberField label="Employer's health contribution in retirement (monthly)" name="healthEmployerCap" value={config.healthEmployerCap} step={1} prefix="$" onChange={onChange}
            hint="What your employer pays toward retiree premiums. Ask HR or check your MOU; it's often a fixed dollar amount that doesn't grow." />
          <NumberField label="Year of the premiums below" name="healthRatesYear" value={config.healthRatesYear} step={1} min={2020} onChange={onChange} />
          <NumberField label={config.hasSpouse ? 'Premium, neither on Medicare (2-party)' : 'Premium before Medicare'} name="healthPremiumNoMedicare" value={config.healthPremiumNoMedicare} step={0.01} prefix="$" onChange={onChange} />
          <NumberField label={config.hasSpouse ? 'Premium, one of you on Medicare' : 'Premium on Medicare (supplement or Medicare Advantage)'} name="healthPremiumOneMedicare" value={config.healthPremiumOneMedicare} step={0.01} prefix="$" onChange={onChange} />
          {config.hasSpouse && <NumberField label="Premium, both on Medicare" name="healthPremiumBothMedicare" value={config.healthPremiumBothMedicare} step={0.01} prefix="$" onChange={onChange} />}
          <Hint>{strs
            ? "CalSTRS has no retiree health plan; use your district's retiree plan rates, or your own plan's (monthly). The employer contribution is whatever your district pays for retirees, often $0 or only until 65. Without 40 Social Security quarters (yours or a spouse's), Medicare Part A isn't free; add its premium here."
            : "From the CalPERS health plan rates for your region and plan (monthly). You pay whatever is above the employer's contribution, plus Medicare Part B."}</Hint>
          <NumberField label={`Medicare Part B premium per person (${config.partBYear})`} name="partBPremium" value={config.partBPremium} step={0.1} prefix="$" onChange={onChange}
            hint="The standard premium. Higher incomes pay more (IRMAA), which isn't modeled." />
          <SliderField label="Healthcare inflation" name="healthcareInflation" value={Number((config.healthcareInflation * 100).toFixed(1))} min={0} max={10} step={0.5}
            display={`${pct(config.healthcareInflation)}/yr`} onChange={onChange} hint="Grows the premiums and Part B each January." />
        </Card>

        <Card title="Taxes & Leftover Money">
          <Toggle label="Bank leftover income in savings" name="bankSurplus" checked={config.bankSurplus} onChange={onChange}
            hint="On: a month with money left over adds it to savings. Off: it's assumed spent. Real life is usually in between." />
          <Toggle label="Use real federal + California tax brackets" name="taxFromBrackets" checked={config.taxFromBrackets} onChange={onChange}
            hint={config.taxFromBrackets
              ? `${config.hasSpouse ? 'Married filing jointly' : 'Single'}. 2026 federal / 2025 California brackets and standard deductions, indexed at spending inflation. Taxes pensions, 403(b) withdrawals and conversions; up to 85% of Social Security federally, none in California.`
              : 'Off: one flat rate on pensions and Social Security.'} />
          {!config.taxFromBrackets && (
            <SliderField label="Flat effective tax rate" name="effectiveTaxRate" value={Number((config.effectiveTaxRate * 100).toFixed(1))} min={0} max={35} step={0.5}
              display={pct(config.effectiveTaxRate)} onChange={onChange} />
          )}
        </Card>
      </div>
    </div>
  );
};
