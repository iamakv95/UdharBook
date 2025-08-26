import React from "react";
import { GoSearch, GoX, GoArrowLeft } from "react-icons/go";

/**
 * App Header
 * Props:
 *  - title: string
 *  - mode: "list" | "details"
 *  - showSearch: boolean (list mode only)
 *  - onToggleSearch: () => void
 *  - onBack: () => void (details mode only)
 */
export default function Header({
  title = "🧾 Kirana Customer Ledger",
  mode = "list",
  showSearch = false,
  onToggleSearch,
  onBack,
}) {
  return (
    <header className="sticky top-0 z-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <span className="text-xl font-semibold">{title}</span>

        {mode === "list" ? (
          <div className="ml-auto flex gap-4">
            <button
              onClick={onToggleSearch}
              className="p-1 flex items-center justify-center"
              title={showSearch ? "Close search" : "Open search"}
            >
              {showSearch ? (
                <GoX className="h-7 w-7 text-gray-700" />
              ) : (
                <GoSearch className="h-7 w-7 text-gray-700" />
              )}
            </button>
          </div>
        ) : (
          <div className="ml-auto flex gap-2">
            <button
              onClick={onBack}
              className="p-2 flex items-center gap-1 hover:bg-gray-100"
            >
              <GoArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
