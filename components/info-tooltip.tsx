"use client"
import { Info } from "lucide-react";

export default function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="relative inline-flex group">
            <Info size={16} className="text-gray-400 hover:text-gray-600 cursor-help" />
            <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 w-56 rounded-md bg-slate-800 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-10"
            >
                {text}
            </span>
        </span>
    );
}
