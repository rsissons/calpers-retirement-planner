import type { FC, ChangeEvent, ReactNode } from 'react';
import type { Config } from '../config';
import { calculatePension } from '../calpers';
import { useConfigChange } from '../useConfigChange';

interface Props {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
}

const $ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const Group: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</h4>
    {children}
  </section>
);

interface SliderProps {
  label: string;
  name: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const Slider: FC<SliderProps> = ({ label, name, display, value, min, max, step, hint, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <label htmlFor={`qa-${name}`} className="text-sm text-slate-700">{label}</label>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{display}</span>
    </div>
    <input id={`qa-${name}`} type="range" name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full accent-blue-600" />
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const DateField: FC<{ label: string; name: string; value: string; hint?: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, value, hint, onChange }) => (
  <div>
    <label htmlFor={`qa-${name}`} className="block text-sm text-slate-700 mb-1">{label}</label>
    <input id={`qa-${name}`} type="date" name={name} value={value} onChange={onChange} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm" />
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

// Slider ceiling: a fixed top, stretched only when a bigger value was typed in on Your Numbers
const rangeMax = (value: number, floor: number, step: number) => Math.max(floor, Math.ceil(value / step) * step);

// Compact, single-column panel with the levers worth adjusting often. Everything else is on Your Numbers.
export const QuickAdjust: FC<Props> = ({ config, setConfig }) => {
  const onChange = useConfigChange(setConfig);
  const pension = calculatePension(config);
  const pensionAmount = config.pensionFromFormula ? pension.optionAmount : config.pensionStart;
  const partner = config.spouseName || 'Spouse';

  return (
    <div className="space-y-8">
      <Group title="Timing">
        <DateField label="Your retirement date" name="yourRetirementDate" value={config.yourRetirementDate} onChange={onChange}
          hint={pension.eligible || !config.pensionFromFormula
            ? `Age ${pension.ageYears}y ${pension.ageMonths}m · pension ${$(pensionAmount)}/mo`
            : `Under the minimum retirement age (${pension.formula.minAge}) for your formula`} />
        {config.hasSpouse && (
          <DateField label={`${partner}'s retirement date`} name="spouseRetirementDate" value={config.spouseRetirementDate} onChange={onChange}
            hint="Their pay ends and their pension starts" />
        )}
        <Slider label="Your Social Security starts at" name="yourSSStartAge" display={`Age ${config.yourSSStartAge}`}
          value={config.yourSSStartAge} min={62} max={70} step={1} onChange={onChange} />
      </Group>

      <Group title="Work after retirement">
        <Slider label="Job pay (gross)" name="jobPay" display={config.jobPay > 0 ? `${$(config.jobPay)}/mo` : 'None'}
          value={config.jobPay} min={0} max={rangeMax(config.jobPay, 20000, 1000)} step={100} onChange={onChange}
          hint="Taxed on top of your pension, plus FICA and CA SDI. At a CalPERS employer: 180-day wait, max 960 hrs/yr." />
        <Slider label="Work until" name="jobEndAge" display={`Age ${config.jobEndAge}`}
          value={config.jobEndAge} min={50} max={80} step={1} onChange={onChange}
          hint={config.jobPay > 0 && config.jobEndAge > config.yourSSStartAge && config.yourSSStartAge < 67
            ? 'Overlaps your Social Security before full retirement age: the earnings test holds some back'
            : 'Starts the month after you retire'} />
      </Group>

      <Group title="Spending (monthly)">
        <Slider label="Essential" name="essentialSpending" display={$(config.essentialSpending)}
          value={config.essentialSpending} min={0} max={rangeMax(config.essentialSpending, 20000, 500)} step={50} onChange={onChange} hint="Excludes loan payments and health premiums" />
        <Slider label="Discretionary" name="discretionarySpending" display={$(config.discretionarySpending)}
          value={config.discretionarySpending} min={0} max={rangeMax(config.discretionarySpending, 12000, 500)} step={50} onChange={onChange} />
        <Slider label="Work costs that end at retirement" name="workCostsEnding" display={`−${$(config.workCostsEnding)}`}
          value={config.workCostsEnding} min={0} max={rangeMax(config.workCostsEnding, 1000, 100)} step={25} onChange={onChange} hint="Commute and the like, off Essential once retired" />
        <Slider label="Added to savings until retirement" name="monthlySavingsContribution" display={$(config.monthlySavingsContribution)}
          value={config.monthlySavingsContribution} min={0} max={rangeMax(config.monthlySavingsContribution, 3000, 250)} step={25} onChange={onChange} />
      </Group>

      <Group title="Investments">
        <Slider label="Roth conversion" name="maxMonthlyConversion" display={`${$(config.maxMonthlyConversion)}/mo`}
          value={config.maxMonthlyConversion} min={0} max={rangeMax(config.maxMonthlyConversion, 5000, 500)} step={100} onChange={onChange}
          hint={`${$(config.maxMonthlyConversion * 12)}/yr from the 403(b), after retirement`} />
        <Slider label="Annual return" name="annualReturn" display={`${(config.annualReturn * 100).toFixed(1)}%`}
          value={config.annualReturn * 100} min={0} max={12} step={0.5} onChange={onChange} />
      </Group>

      <Group title="Healthcare">
        <Slider label="Healthcare inflation" name="healthcareInflation" display={`${(config.healthcareInflation * 100).toFixed(1)}%/yr`}
          value={config.healthcareInflation * 100} min={0} max={10} step={0.5} onChange={onChange}
          hint="Premiums and Part B. A fixed employer contribution means increases are yours." />
      </Group>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">Everything else, including your CalPERS formula, loans, balances and taxes, is on the Your Numbers tab.</p>
    </div>
  );
};
