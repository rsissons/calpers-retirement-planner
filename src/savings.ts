import type { Config } from './config';
import { monthsBetween } from './calpers';

export interface BalanceProjection {
  months: number;         // Months of growth/contributions until retirement
  contributions: number;  // Total new contributions
  balance: number;        // Projected balance at retirement
}

// Grow a balance to the retirement date: monthly compounding at annualRate,
// with a contribution at the end of each month worked.
function projectToRetirement(
  config: Config, balance: number, asOf: string, monthly: number, annualRate: number,
): BalanceProjection {
  const months = Math.max(0, monthsBetween(asOf, config.yourRetirementDate));
  const r = annualRate / 12;
  const growth = Math.pow(1 + r, months);
  const contributionsFV = r === 0 ? monthly * months : monthly * (growth - 1) / r;

  return {
    months,
    contributions: monthly * months,
    balance: balance * growth + contributionsFV,
  };
}

export function project403bAtRetirement(config: Config): BalanceProjection {
  return projectToRetirement(config, config.current403b, config.current403bAsOf,
    config.monthly403bContribution, config.annualReturn);
}

export function projectCashAtRetirement(config: Config): BalanceProjection {
  return projectToRetirement(config, config.currentSavings, config.savingsAsOf,
    config.monthlySavingsContribution, config.savingsRate);
}

// Config with starting403b and startingCash replaced by their projected balances at retirement
export function withProjectedBalances(config: Config): Config {
  return {
    ...config,
    starting403b: project403bAtRetirement(config).balance,
    startingCash: projectCashAtRetirement(config).balance,
  };
}
