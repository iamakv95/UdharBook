import React from "react";
import { fmtDate, inr } from "../../utils/format";

/**
 * PaymentsTable
 * Renders a customer's payment transactions with sticky header, count, and delete action.
 *
 * Props:
 *  - payments: array                    // the list to display (already sliced if needed)
 *  - totalCount: number                 // total payments count (for "(x of N)" + toggle text)
 *  - showAll: boolean                   // whether we are showing all or just the first 5
 *  - onToggleShowAll: () => void        // toggles between show all / show less
 *  - onDelete: (txnId: string) => void  // delete a payment transaction
 *  - onAddPayment: () => void           // open add-payment modal
 */
export default function PaymentsTable({
  payments = [],
  totalCount = 0,
  showAll = false,
  onToggleShowAll,
  onDelete,
  onAddPayment,
}) {
  const visibleCount = Math.min(5, totalCount);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">
          Payments{" "}
          <span className="ml-1 text-xs text-gray-500">
            ({visibleCount} of {totalCount})
          </span>
        </h3>

        {totalCount > 5 && (
          <button className="btn-xs" onClick={onToggleShowAll}>
            {showAll ? "View less" : `View all (${totalCount})`}
          </button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2">Method</th>
              <th className="p-2">Note</th>
              <th className="p-2 text-right">Amount (₹)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No payments.{" "}
                  <button className="btn-xs" onClick={onAddPayment}>
                    + Add payment
                  </button>
                </td>
              </tr>
            )}

            {payments.map((t) => (
              <tr key={t.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>
                <td className="p-2">{t.method || "—"}</td>
                <td className="p-2 text-xs">{t.note || "—"}</td>
                <td className="p-2 text-right">₹{inr(t.amount)}</td>

                <td className="p-2 text-center">
                  <button
                    className="btn-xs text-red-600"
                    onClick={() => onDelete(t.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
