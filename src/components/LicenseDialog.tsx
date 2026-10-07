import { useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { BadgeCheck, KeyRound, X } from 'lucide-react';
import { verifyLicense, messageFor, saveKey, clearKey, loadStoredKey, downloadKeyFile } from '../license';
import type { LicensePayload } from '../license';

interface Props {
  open: boolean;
  onClose: () => void;
  license: LicensePayload | null;               // the key that is accepted on this device, if any
  onAccepted: (payload: LicensePayload) => void;
  onRemoved: () => void;
}

const issuedOn = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Enter an invite key by pasting it or choosing the file downloaded from the invite page. Checking happens on this device.
// The body only exists while the dialog is open, so it starts fresh every time. Accepting a key changes `license`,
// and that must not wipe the "Key accepted" message, which is why nothing resets on a prop change.
export const LicenseDialog: FC<Props> = ({ open, ...rest }) => (open ? <LicenseDialogBody {...rest} /> : null);

const LicenseDialogBody: FC<Omit<Props, 'open'>> = ({ onClose, license, onAccepted, onRemoved }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [acceptedKey, setAcceptedKey] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const check = async (raw: string) => {
    setBusy(true);
    setMessage(null);
    const result = await verifyLicense(raw);
    setBusy(false);
    if (!result.valid) {
      setMessage({ text: messageFor(result.reason), bad: true });
      return;
    }
    const cleaned = raw.replace(/["'\s]+/g, '');
    const saved = saveKey(cleaned);
    setAcceptedKey(cleaned);
    onAccepted(result.payload);
    setMessage({
      text: saved
        ? 'Key accepted. Full planner on this device.'
        : "Key accepted for now, but your browser wouldn't let me remember it, so you'll need to enter it again next time.",
      bad: false,
    });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let content: string;
    try { content = await file.text(); } catch { setMessage({ text: "That file couldn't be read. Try pasting the key instead.", bad: true }); return; }
    setText(content.trim());
    await check(content);
  };

  const remove = () => {
    clearKey();
    setAcceptedKey(null);
    onRemoved();
    setText('');
    setMessage({ text: 'Key removed from this browser.', bad: false });
  };

  // The key accepted in this dialog, or the one remembered from an earlier visit or the invite link
  const keyText = license ? (acceptedKey ?? loadStoredKey()) : null;

  const primary ='bg-[#0072B2] hover:bg-[#005f94] text-white font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';
  const secondary = 'border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="license-title"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="license-title" className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {license ? <BadgeCheck size={20} className="text-emerald-600" /> : <KeyRound size={20} className="text-[#0072B2]" />}
            {license ? 'Full planner' : 'Enter your license key'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 -mt-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {license ? (
          <>
            <p className="text-sm text-slate-600">
              Your key is accepted on this device{issuedOn(license.iat) ? <>. It was issued on <b>{issuedOn(license.iat)}</b></> : null}. Your own numbers, saving and opening plan files are unlocked.
            </p>
            {message && <p role="status" className={message.bad ? 'text-sm font-medium text-red-700' : 'text-sm font-medium text-emerald-700'}>{message.text}</p>}
            <p className="text-sm text-slate-600">
              Keep a copy of your key somewhere safe. You'll need it again in another browser or on another device. The key file is only the key; it is not your plan.
              Your numbers are saved separately with <b>Save to file</b> in the menu.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={onClose} className={primary}>Done</button>
              {keyText && <button onClick={() => downloadKeyFile(keyText)} className={secondary}>Download key file</button>}
              <button onClick={remove} className={secondary}>Remove key</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              If you got an invite, paste the key from the invite page below, or choose the key file you downloaded. Checking happens on your device and works offline.
            </p>
            <div>
              <label htmlFor="license-key" className="block text-sm font-medium text-slate-700 mb-1">License key</label>
              <textarea autoFocus id="license-key" value={text} onChange={e => setText(e.target.value)}
                rows={4} spellCheck={false} autoComplete="off" autoCapitalize="off" placeholder="PP1.…"
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0072B2]" />
            </div>
            {message && <p role="status" className={message.bad ? 'text-sm font-medium text-red-700' : 'text-sm font-medium text-emerald-700'}>{message.text}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => check(text)} disabled={busy} className={primary}>{busy ? 'Checking…' : 'Check key'}</button>
              <button onClick={() => fileInput.current?.click()} disabled={busy} className={secondary}>Choose key file</button>
              <input ref={fileInput} type="file" accept=".txt,.key,text/plain" className="hidden" onChange={onFile} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
