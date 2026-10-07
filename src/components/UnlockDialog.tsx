import type { FC } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onEnterKey: () => void;
}

// Shown when someone without a license key tries to use their own numbers or save and open plan files
export const UnlockDialog: FC<Props> = ({ open, onClose, onEnterKey }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="unlock-title"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="unlock-title" className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lock size={20} className="text-[#0072B2]" /> Using your own numbers needs the full planner
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 -mt-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          You can look at everything and try Quick Adjust on the sample household for free. Entering your own figures, saving
          your plan and opening plan files need a license key. If you have an invite, enter the key and everything unlocks.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={onEnterKey} className="bg-[#0072B2] hover:bg-[#005f94] text-white font-semibold px-4 py-2.5 rounded-lg">Enter license key</button>
          <button onClick={onClose} className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg">Keep exploring the sample</button>
        </div>
      </div>
    </div>
  );
};
