// An invite key can arrive in the part of the address after the # (for example from the invite page's "Open the
// planner with my key" button). Browsers never send that part to a server. It is read once, checked like a pasted
// key, and removed from the address bar.

const MAX_KEY_LENGTH = 2000;
const KEY_CHARS = /^[A-Za-z0-9._-]*$/;

// Returns null when the address carries no key, '' when it carries something that can't be a key, otherwise the key text.
export function keyFromHash(hash: string): string | null {
  const params = hash.replace(/^#/, '').split('&');
  const entry = params.find(p => p.startsWith('key='));
  if (entry === undefined) return null;
  let value: string;
  try { value = decodeURIComponent(entry.slice(4)); } catch { return ''; }
  if (value.length > MAX_KEY_LENGTH || !KEY_CHARS.test(value)) return '';
  return value;
}

// Take the key out of the address bar so it isn't left in the history, a bookmark or a screenshot
export function clearKeyFromAddress() {
  try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* no history access */ }
}
