import React, { useEffect } from "react";

/**
 * Reusable centered modal with backdrop.
 * Props:
 *  - title: string
 *  - onClose: function
 *  - children: node
 */
export default function Modal({ title, children, onClose }) {
  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="px-2 py-1 rounded-md border bg-white hover:bg-gray-100 text-xs"
            onClick={onClose}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
