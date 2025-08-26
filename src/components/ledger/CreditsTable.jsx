import React from "react";
import { fmtDate, inr } from "../../utils/format";

/**
 * CreditsTable
 * Renders a customer's credit transactions with sticky header, count, and delete action.
 *
 * Props:
 *  - credits: array                    // the list to display (already sliced if needed)
 *  - totalCount: number                // total credits count (for "(x of N)" + toggle text)
 *  - showAll: boolean                  // whether we are showing all or just the first 5
 *  - onToggleShowAll: () => void       // toggles between show all / show less
 *  - onDelete: (txnId: string) => void // delete a credit transaction
 *  - onAddCredit: () => void           // open add-credit modal
 */
export default function CreditsTable({
  credits = [],
  totalCount = 0,
  showAll = false,
  onToggleShowAll,
  onDelete,
  onAddCredit,
}) {
  const visibleCount = Math.min(5, totalCount);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">
          Credits{" "}
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
          <thead className="bg-amber-50 sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2">Items</th>
              <th className="p-2 text-right">Amount (₹)</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {credits.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No credit entries.{" "}
                  <button className="btn-xs" onClick={onAddCredit}>
                    + Add credit
                  </button>
                </td>
              </tr>
            )}

            {credits.map((t) => (
              <tr key={t.id} className="border-top align-top border-t">
                <td className="p-2 whitespace-nowrap">{fmtDate(t.dateISO)}</td>

                <td className="p-2 text-xs">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {(t.items || []).map((i, idx) => (
                      <li key={idx}>
                        {i.name} — {i.qty} x ₹{inr(i.price)}
                      </li>
                    ))}
                  </ul>
                </td>

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
