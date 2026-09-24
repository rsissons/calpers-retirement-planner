import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { Config } from './config';
import { dateAtAge } from './calpers';

const DATE_FIELDS = ['yourRetirementDate', 'spouseRetirementDate', 'yourBirthDate', 'spouseBirthDate', 'serviceCreditAsOf', 'current403bAsOf', 'savingsAsOf'];
const PERCENT_FIELDS = ['annualReturn', 'spendingInflation', 'pensionCOLA', 'effectiveTaxRate', 'healthcareInflation', 'beneficiaryOptionFactor', 'savingsRate'];
const TEXT_FIELDS = ['planName', 'yourName', 'spouseName', 'pensionFormulaId'];
const CHECKBOX_FIELDS = ['pensionFromFormula', 'taxFromBrackets', 'bankSurplus', 'hasSpouse'];

// Shared input handler for Settings and Quick Adjust: inputs are named after Config fields.
// Percent sliders are stored as decimals; the retirement age slider moves the retirement date.
export function useConfigChange(setConfig: Dispatch<SetStateAction<Config>>) {
  return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (CHECKBOX_FIELDS.includes(name)) {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (TEXT_FIELDS.includes(name)) {
      setConfig(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (DATE_FIELDS.includes(name)) {
      if (!value) return;
      setConfig(prev => ({ ...prev, [name]: value }));
      return;
    }

    // A cleared box counts as 0, so a field can be emptied and retyped
    let numValue = value.trim() === '' ? 0 : parseFloat(value);
    if (Number.isNaN(numValue)) return;
    if (PERCENT_FIELDS.includes(name)) numValue = numValue / 100;

    setConfig(prev => {
      // The age slider moves the retirement date to the same month/day at that age
      if (name === 'retirementAge') {
        return { ...prev, yourRetirementDate: dateAtAge(prev.yourBirthDate, prev.yourRetirementDate, numValue) };
      }
      return { ...prev, [name]: numValue };
    });
  };
}
