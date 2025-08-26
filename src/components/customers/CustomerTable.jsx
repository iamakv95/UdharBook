import React from "react";
import { GoPencil, GoTrash, GoShare } from "react-icons/go";
import { inr } from "../../utils/format";

/**
 * CustomerTable
 * Props:
 *  - customers: array
 *  - txns: array of all transactions
 *  - onSelect: (customerId) => void
 *  - onDelete: (customerId) => void
 *  - onShare: (customerId) => void
 *  - onAddCustomer: () => void
 */
export default function CustomerTable({
  customers,
  txns,
  onSelect,
  onDelete,
  onShare,
  onAddCustomer,
}) {
  return (
    <div className="border-1 border-black/20 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-amber-50">
          <tr>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Phone</th>
            <th className="p-3 text-right">Balance (₹)</th>
            <th className="p-3 text-center">Action</th>
            <th className="p-3 text-center">Share</th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-500">
                No customers yet.{" "}
                <button className="btn-xs" onClick={onAddCustomer}>
                  Add one
                </button>
              </td>
            </tr>
          )}

          {customers.map((c) => {
            const cTxns = txns.filter((t) => t.customerId === c.id);
            const credit = cTxns
              .filter((t) => t.type === "credit")
              .reduce((s, t) => s + Number(t.amount), 0);
            const recv = cTxns
              .filter((t) => t.type === "payment")
              .reduce((s, t) => s + Number(t.amount), 0);
            const bal = credit - recv;

            return (
              <tr
                key={c.id}
                className="border-t border-black/20 hover:bg-gray-50"
              >
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">{c.phone || "-"}</td>
                <td
                  className={`p-2 text-right ${
                    bal > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  ₹{inr(bal)}
                </td>

                {/* Action: edit + delete */}
                <td className="p-2">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      className="btn-xs"
                      title="Open customer"
                      onClick={() => onSelect(c.id)}
                    >
                      <GoPencil />
                    </button>
                    <button
                      className="btn-xs text-red-600"
                      title="Delete customer"
                      onClick={() => onDelete(c.id)}
                    >
                      <GoTrash />
                    </button>
                  </div>
                </td>

                {/* Share: GoShare icon */}
                <td className="p-2">
                  <div className="flex items-center justify-center">
                    <button
                      className="btn-xs text-green-700"
                      title="Share due on WhatsApp"
                      onClick={() => onShare(c.id)}
                    >
                      <GoShare />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
