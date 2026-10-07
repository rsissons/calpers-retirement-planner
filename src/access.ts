// What a visitor can do without a license key. Anyone can look at everything and try Quick Adjust on the
// sample; entering or saving their own numbers needs the full planner (a valid key, checked on the device).
// This is an honor-level gate: the planner is open source, so it keeps honest people honest and nothing more.

export type Gate = { licensed: boolean };

export const canEditOwnNumbers = ({ licensed }: Gate) => licensed;
export const canSaveAndOpenFiles = ({ licensed }: Gate) => licensed;

// Autosave only for the person's own plan, and only with the full planner
export const shouldAutosave = ({ licensed }: Gate, isSample: boolean) => licensed && !isSample;
