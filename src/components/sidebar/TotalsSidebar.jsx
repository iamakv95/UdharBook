import React from "react";
import { inr } from "../../utils/format";

/**
 * TotalsSidebar
 * Shows overall totals and WhatsApp share buttons.
 *
 * Props:
 *  - totals: { credit, received, balance }
 *  - onShareBalance: () => void
 *  - onShareLast5: () => void
 */
export default function TotalsSidebar({ totals, onShareBalance, onShareLast5 }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-base font-semibold mb-2">Totals</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total Credit</span>
          <span>₹{inr(totals.credit)}</span>
        </div>
        <div className="flex justify-between">
          <span>Money Received</span>
          <span>₹{inr(totals.received)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Current Credit</span>
          <span
            className={
              totals.balance > 0 ? "text-amber-700" : "text-emerald-700"
            }
          >
            ₹{inr(totals.balance)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onShareBalance}
          className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex-1"
        >
          Share Balance
        </button>
        <button
          onClick={onShareLast5}
          className="px-3 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800 flex-1"
        >
          Share Last 5
        </button>
      </div>
    </div>
  );
}
