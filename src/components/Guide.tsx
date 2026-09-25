import type { FC, ReactNode } from 'react';

// In-app help: what to gather, where each number comes from, and what the model assumes.
// Kept short on purpose; docs/USER_GUIDE.md and docs/ASSUMPTIONS.md have the long versions.

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sm:p-6">
    <h3 className="text-lg font-bold text-[#1a365d] mb-3">{title}</h3>
    <div className="text-sm text-gray-700 space-y-2 leading-relaxed">{children}</div>
  </section>
);

// A label and where to find it: side by side on wider screens, or stacked (inside the narrower system cards)
const Item: FC<{ what: string; where: ReactNode; stacked?: boolean }> = ({ what, where, stacked }) => (
  <li className={`flex flex-col py-1.5 border-b border-gray-100 last:border-0 ${stacked ? '' : 'sm:flex-row sm:gap-3'}`}>
    <span className={`font-semibold text-gray-800 shrink-0 ${stacked ? '' : 'sm:w-56'}`}>{what}</span>
    <span className="text-gray-600">{where}</span>
  </li>
);

const SystemList: FC<{ name: string; link: ReactNode; children: ReactNode }> = ({ name, link, children }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
    <p className="font-bold text-[#15325b]">If you're in {name}</p>
    <p className="text-xs text-gray-500 mb-2">Sign in at {link}</p>
    <ul>{children}</ul>
  </div>
);

export const Guide: FC = () => (
  <div className="p-0 sm:p-2 max-w-4xl mx-auto space-y-5">
    <Section title="How to use this planner">
      <ol className="list-decimal pl-5 space-y-1">
        <li>Gather the numbers in the checklist below. Most come from myCalPERS or myCalSTRS and your Social Security statement.</li>
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
      <p><b>First, which system are you in?</b> Teachers and other certificated school staff (K-12 and community college) are in <b>CalSTRS</b>. State, city, county and special-district employees, and classified school staff (office, custodial, transportation, IT), are in <b>CalPERS</b>. Your paystub shows which one takes your retirement contribution. Gather the list for your system, plus the list for everyone.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <SystemList name="CalPERS" link={<a className="text-[#0072B2] underline" href="https://my.calpers.ca.gov" target="_blank" rel="noreferrer">my.calpers.ca.gov</a>}>
          <Item stacked what="Retirement formula" where="Your Annual Member Statement or myCalPERS. Pick the matching one in the list (School, Local or State; Miscellaneous or Safety). Hired before 2013 is usually classic; 2013 or later is PEPRA." />
          <Item stacked what="Service credit" where="Annual Member Statement or myCalPERS, with the date it's as of." />
          <Item stacked what="Final compensation" where="Highest 12 consecutive months of pay (classic; some employers use 36) or 36 months (PEPRA), monthly." />
          <Item stacked what="Retirement estimate" where="myCalPERS Retirement Estimate Calculator, for your planned date. Divide your option's amount by the unmodified amount for the option factor." />
          <Item stacked what="Retiree health" where="CalPERS health plan rates for your region and plan, and your employer's retiree contribution (HR or your MOU)." />
          <Item stacked what="Social Security" where="Many CalPERS agencies pay into Social Security and some don't. If your paystub shows Social Security (OASDI) tax, you're earning it." />
        </SystemList>
        <SystemList name="CalSTRS" link={<a className="text-[#0072B2] underline" href="https://www.calstrs.com/mycalstrs" target="_blank" rel="noreferrer">calstrs.com/mycalstrs</a>}>
          <Item stacked what="Retirement formula" where="2% at 60 if you were first hired into CalSTRS-covered work before 2013; 2% at 62 after. It's on your Retirement Progress Report in myCalSTRS." />
          <Item stacked what="Service credit" where="Retirement Progress Report, with the date it's as of." />
          <Item stacked what="Final compensation" where="Highest 36 consecutive months of pay, monthly; 12 months if you're 2% at 60 with 25+ years." />
          <Item stacked what="Retirement estimate" where="A myCalSTRS retirement estimate for your planned date. Divide your option's amount by the Member-Only Benefit for the option factor." />
          <Item stacked what="Retiree health" where="CalSTRS has no retiree health plan. Get your district's retiree plan rates and what the district pays for retirees (often $0, or only until 65)." />
          <Item stacked what="Social Security" where="Teaching pay usually isn't covered. Use your SSA statement for other work, or 0. Without 40 quarters, Medicare Part A isn't free." />
        </SystemList>
      </div>
      <p className="font-semibold text-gray-800 pt-3">Everyone</p>
      <ul>
        <Item what="Social Security" where={<>Your statement at <a className="text-[#0072B2] underline" href="https://www.ssa.gov/myaccount/" target="_blank" rel="noreferrer">ssa.gov/myaccount</a>, at the age you plan to start.</>} />
        <Item what="403(b) / 457(b), Roth, savings" where="Your latest statements, with their dates. Include a CalSTRS Defined Benefit Supplement balance in savings." />
        <Item what="Spending" where="A year of bank and card statements, or a budgeting app. Split it into essential and discretionary; list loans separately." />
        <Item what="Spouse or partner" where="Their gross pay (paystub), any pension of their own, and their Social Security estimate." />
      </ul>
    </Section>

    <Section title="What the model assumes">
      <ul className="list-disc pl-5 space-y-1">
        <li>Monthly simulation from the month after you retire through your chosen end age.</li>
        <li>Pension from your formula's age factor chart × service × final compensation × option factor, capped where the chart says so.</li>
        <li>CalPERS: quarter-year age factors; the COLA compounds, first on May 1 of the second calendar year after retiring. CalSTRS: monthly age factors at your age on the last day of the retirement month, the 0.2% career factor with 30+ years under 2% at 60, and a simple 2% of the starting benefit every Sept 1 after the first year.</li>
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
        <li>Only CalPERS and CalSTRS Defined Benefit pensions and California taxes. No CalSTRS Defined Benefit Supplement (add its balance to savings), no purchasing-power top-ups, no other states.</li>
      </ul>
      <p className="pt-2 font-semibold text-gray-800">This is a planning tool, not financial, tax or legal advice. Confirm your pension with CalPERS before you make decisions, and consider a fee-only fiduciary planner.</p>
    </Section>
  </div>
);
