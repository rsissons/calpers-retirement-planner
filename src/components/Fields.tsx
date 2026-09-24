import type { FC, ChangeEvent, ReactNode } from 'react';

// Shared form building blocks for the Settings page. Inputs are named after Config fields
// and all go through useConfigChange.

type OnChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

const inputClass = 'w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-sm';

export const Card: FC<{ title: string; wide?: boolean; children: ReactNode }> = ({ title, wide, children }) => (
  <section className={`bg-white p-5 sm:p-6 rounded-lg shadow-sm border border-gray-200 ${wide ? 'md:col-span-2' : ''}`}>
    <h3 className="text-lg font-bold text-[#1a365d] mb-4 border-b pb-2">{title}</h3>
    <div className="space-y-4">{children}</div>
  </section>
);

export const Hint: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-xs text-gray-500 mt-1">{children}</p>
);

interface FieldProps { label: string; name: string; onChange: OnChange; hint?: ReactNode }

export const TextField: FC<FieldProps & { value: string }> = ({ label, name, value, onChange, hint }) => (
  <div>
    <label htmlFor={`f-${name}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={`f-${name}`} type="text" name={name} value={value} onChange={onChange} className={inputClass} />
    {hint && <Hint>{hint}</Hint>}
  </div>
);

export const DateField: FC<FieldProps & { value: string }> = ({ label, name, value, onChange, hint }) => (
  <div>
    <label htmlFor={`f-${name}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={`f-${name}`} type="date" name={name} value={value} onChange={onChange} className={inputClass} />
    {hint && <Hint>{hint}</Hint>}
  </div>
);

// Dollar or plain number entry
export const NumberField: FC<FieldProps & { value: number; step?: number; min?: number; max?: number; prefix?: string; suffix?: string }> = ({ label, name, value, onChange, hint, step = 1, min = 0, max, prefix, suffix }) => (
  <div>
    <label htmlFor={`f-${name}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
      <input id={`f-${name}`} type="number" inputMode="decimal" name={name} value={Number.isFinite(value) ? value : 0} step={step} min={min} max={max} onChange={onChange} className={inputClass} />
      {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
    </div>
    {hint && <Hint>{hint}</Hint>}
  </div>
);

// Slider with the value shown on the right. `value` is in display units (percent, age).
export const SliderField: FC<FieldProps & { value: number; min: number; max: number; step: number; display: string }> = ({ label, name, value, onChange, hint, min, max, step, display }) => (
  <div>
    <label htmlFor={`f-${name}`} className="flex justify-between text-sm font-medium text-gray-700 mb-1">
      <span>{label}</span>
      <span className="font-bold text-[#0072B2] tabular-nums">{display}</span>
    </label>
    <input id={`f-${name}`} type="range" name={name} min={min} max={max} step={step} value={value} onChange={onChange} className="w-full accent-[#0072B2]" />
    {hint && <Hint>{hint}</Hint>}
  </div>
);

export const Toggle: FC<FieldProps & { checked: boolean }> = ({ label, name, checked, onChange, hint }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="w-4 h-4 accent-[#0072B2]" />
      {label}
    </label>
    {hint && <Hint>{hint}</Hint>}
  </div>
);
