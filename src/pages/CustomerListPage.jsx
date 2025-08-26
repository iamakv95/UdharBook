import React from "react";
import CustomerTable from "../components/customers/CustomerTable";

/**
 * CustomerListPage
 * Props:
 *  - customers: array                // filtered customers to display
 *  - txns: array                     // all transactions (for balances)
 *  - onAddCustomer: () => void
 *  - onSelectCustomer: (id) => void
 *  - onDeleteCustomer: (id) => void
 *  - onShareCustomer: (id) => void
 */
export default function CustomerListPage({
  customers,
  txns,
  onAddCustomer,
  onSelectCustomer,
  onDeleteCustomer,
  onShareCustomer,
}) {
  return (
    <section className="bg-transparent">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Customer List</h2>
        <button
          onClick={onAddCustomer}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add Customer
        </button>
      </div>

      <CustomerTable
        customers={customers}
        txns={txns}
        onSelect={onSelectCustomer}
        onDelete={onDeleteCustomer}
        onShare={onShareCustomer}
        onAddCustomer={onAddCustomer}
      />
    </section>
  );
}
