import type { FC, ReactNode } from 'react';

// In-app help: what to gather, where each number comes from, and what the model assumes.
// Kept short on purpose; docs/USER_GUIDE.md and docs/ASSUMPTIONS.md have the long versions.

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sm:p-6">
    <h3 className="text-lg font-bold text-[#1a365d] mb-3">{title}</h3>
    <div className="text-sm text-gray-700 space-y-2 leading-relaxed">{children}</div>
  </section>
);

const Item: FC<{ what: string; where: ReactNode }> = ({ what, where }) => (
  <li className="flex flex-col sm:flex-row sm:gap-3 py-1.5 border-b border-gray-100 last:border-0">
    <span className="font-semibold text-gray-800 sm:w-56 shrink-0">{what}</span>
    <span className="text-gray-600">{where}</span>
  </li>
);

export const Guide: FC = () => (
  <div className="p-0 sm:p-2 max-w-4xl mx-auto space-y-5">
    <Section title="How to use this planner">
      <ol className="list-decimal pl-5 space-y-1">
        <li>Gather the numbers in the checklist below. Most come from myCalPERS and your Social Security statement.</li>
        <li>Open <b>Your Numbers</b> and replace the sample figures with yours. Changes apply instantly.</li>
        <li>Read the <b>Overview</b>: how long the money lasts, your first-month budget, and when savings run out.</li>
        <li>Try different retirement dates and spending levels in <b>Quick Adjust</b> (the sliders button, top right).</li>
        <li>Use <b>Save to file</b> in the menu to keep a copy. Your numbers also stay in this browser until you clear them.</li>
      </ol>
      <p className="text-xs text-gray-500">Nothing you type leaves your device. There's no account and no server; the math runs in this page.</p>
      <p className="text-xs text-gray-500">
        Online version, downloads and source: <a className="text-[#0072B2] underline" href="https://rsissons.github.io/calpers-retirement-planner/" target="_blank" rel="noreferrer">rsissons.github.io/calpers-retirement-planner</a>
        {' · '}<a className="text-[#0072B2] underline" href="https://github.com/rsissons/calpers-retirement-planner" target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </Section>

    <Section title="What to gather">
      <ul>
        <Item what="Retirement formula" where={<>CalPERS Annual Member Statement, or myCalPERS (<a className="text-[#0072B2] underline" href="https://my.calpers.ca.gov" target="_blank" rel="noreferrer">my.calpers.ca.gov</a>).</>} />
        <Item what="Service credit" where="Annual Member Statement or myCalPERS, with the date it's as of." />
        <Item what="Final compensation" where="Your highest 12 (classic) or 36 (PEPRA) consecutive months of pay, monthly. A myCalPERS estimate shows the figure it used." />
        <Item what="Beneficiary option factor" where="Run a myCalPERS estimate and divide your chosen option's amount by the unmodified amount. 100% if you'll take unmodified." />
        <Item what="Social Security" where={<>Your statement at <a className="text-[#0072B2] underline" href="https://www.ssa.gov/myaccount/" target="_blank" rel="noreferrer">ssa.gov/myaccount</a>, at the age you plan to start.</>} />
        <Item what="403(b) / 457(b), Roth, savings" where="Your latest statements, with their dates." />
        <Item what="Retiree health" where="CalPERS health plan rates for your region and plan, and your employer's retiree contribution (HR or your MOU)." />
        <Item what="Spending" where="A year of bank and card statements, or a budgeting app. Split it into essential and discretionary; list loans separately." />
      </ul>
    </Section>

    <Section title="What the model assumes">
      <ul className="list-disc pl-5 space-y-1">
        <li>Monthly simulation from the month after you retire through your chosen end age.</li>
        <li>Pension from the CalPERS benefit factor chart for your formula × service × final compensation × option factor, capped where the chart says so. The first CalPERS COLA is May 1 of the second calendar year after retiring.</li>
        <li>Shortfalls come from cash savings first, then the 403(b), then the Roth. Roth conversions (if any) run from the 403(b) until it's empty.</li>
        <li>Federal and California income tax from real brackets (2026 federal, 2025 California), joint or single, indexed at spending inflation. Up to 85% of Social Security is federally taxable; California doesn't tax it.</li>
        <li>Wages (your spouse's pay and any job you take after retiring) are entered gross. They're taxed with the pensions and also pay FICA and California SDI. Before full retirement age, Social Security is reduced by the earnings test.</li>
        <li>Required minimum distributions start at 75 (born 1960 or later) or 73 (born 1951–1959), using the IRS Uniform Lifetime Table.</li>
        <li>Health premiums grow at healthcare inflation; the employer's contribution stays fixed. Part B is added for each person 65+.</li>
        <li>Returns are a steady rate every year: no market crashes, no sequence-of-returns risk.</li>
      </ul>
    </Section>

    <Section title="What it doesn't do">
      <ul className="list-disc pl-5 space-y-1">
        <li>No survivor scenario: both people are assumed alive for the whole plan.</li>
        <li>No IRMAA (higher Medicare premiums at high incomes), long-term care, or one-time big expenses.</li>
        <li>No taxes on savings interest, and Social Security held back by the earnings test isn't credited back after full retirement age (a little conservative).</li>
        <li>Only CalPERS formulas and California taxes. It isn't built for CalSTRS members or other states.</li>
      </ul>
      <p className="pt-2 font-semibold text-gray-800">This is a planning tool, not financial, tax or legal advice. Confirm your pension with CalPERS before you make decisions, and consider a fee-only fiduciary planner.</p>
    </Section>
  </div>
);
