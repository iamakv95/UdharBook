import React, { useEffect } from "react";

/**
 * Simple confirm dialog.
 * Props:
 *  - text: string
 *  - onCancel: function
 *  - onConfirm: function
 */
export default function ConfirmModal({ text, onCancel, onConfirm }) {
  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-5">
        <div className="text-base mb-4">{text}</div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded-lg border"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-red-600 text-white"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
