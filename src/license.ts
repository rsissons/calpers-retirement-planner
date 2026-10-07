// License keys. An invite key is signed by the author and checked here, on the person's own device, against the
// public key below. Nothing is sent anywhere, so the planner still makes no network requests. A valid key shows a
// "Full planner" tag; it does not switch any feature on or off yet.
//
// The public key is safe to publish. If the signing key it belongs to is ever replaced, replace this too.
export const PUBLIC_KEY = 'UFNLpbm-stZ1f2xA2a3qsya6LBCCoo0-2JVM7MOsR_Y';

const PREFIX = 'PP1';
const STORAGE_KEY = 'calpers-retirement-planner:license';

export interface LicensePayload { v: number; id: string; tier: string; iat: string }
export type FailReason = 'empty' | 'malformed' | 'bad_signature' | 'wrong_version' | 'unsupported';
export type LicenseResult = { valid: true; payload: LicensePayload } | { valid: false; reason: FailReason };

function fromB64u(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// Pasted keys come with stray spaces, line breaks and sometimes quotes; none of those are part of the key.
const clean = (text: string) => text.replace(/["'\s]+/g, '');

export async function verifyLicense(text: string, publicKey: string = PUBLIC_KEY): Promise<LicenseResult> {
  const key = clean(String(text ?? ''));
  if (!key) return { valid: false, reason: 'empty' };

  const parts = key.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) return { valid: false, reason: 'malformed' };

  // A browser that can't do Ed25519 (or has no WebCrypto, such as a plain-http address) is not the person's fault,
  // so it gets its own answer instead of looking like a bad key.
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { valid: false, reason: 'unsupported' };
  let verifyKey: CryptoKey;
  try {
    verifyKey = await subtle.importKey('raw', fromB64u(publicKey) as BufferSource, 'Ed25519', false, ['verify']);
  } catch {
    return { valid: false, reason: 'unsupported' };
  }

  // Check the signature first: a key that was edited anywhere should read as "changed", whatever the edit broke.
  let signed: boolean;
  try {
    signed = await subtle.verify('Ed25519', verifyKey, fromB64u(parts[2]) as BufferSource, new TextEncoder().encode(PREFIX + '.' + parts[1]));
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (!signed) return { valid: false, reason: 'bad_signature' };

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64u(parts[1])));
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  const p = payload as Partial<LicensePayload> | null;
  if (!p || typeof p !== 'object' || p.v !== 1 || p.tier !== 'full' || typeof p.id !== 'string' || typeof p.iat !== 'string') {
    return { valid: false, reason: 'wrong_version' };
  }
  return { valid: true, payload: p as LicensePayload };
}

// What to tell the person when a key doesn't work. Plain words only.
export function messageFor(reason: FailReason): string {
  switch (reason) {
    case 'empty': return 'Paste your key or choose the key file you downloaded.';
    case 'malformed': return "That doesn't look like a license key. Copy the whole key from the invite page, including the part that starts with PP1.";
    case 'bad_signature': return "That key didn't check out. It may have been changed or copied incompletely. Try downloading the key file again from the invite page.";
    case 'wrong_version': return 'That key is for a different version of the planner. Make sure you are using the newest planner and the newest invite page.';
    case 'unsupported': return "This browser can't check license keys. Try a recent Chrome, Edge, Firefox or Safari (version 17 or newer).";
  }
}

// --- Remembering the key in this browser. Storage can be blocked, so nothing here ever throws. ---

export function loadStoredKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function saveKey(key: string): boolean {
  try { localStorage.setItem(STORAGE_KEY, key); return true; } catch { return false; }
}

export function clearKey() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
}

// Download the key as a small text file, so it can be kept somewhere safe and entered again in another browser.
// It is only the key; the person's numbers are in the plan file, which is a separate download.
export const KEY_FILE_NAME = 'planner-license-key.txt';

export function downloadKeyFile(key: string) {
  const blob = new Blob([key + '\n'], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = KEY_FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
