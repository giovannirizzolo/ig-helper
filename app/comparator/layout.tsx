// app/layout.tsx or components/Layout.tsx
import React from "react";
import NavBar from "@/components/nav-bar";
import { Users } from "lucide-react";

type LayoutProps = {
    children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-50 via-indigo-50/40 to-slate-100 py-8">
            <div className="w-full max-w-6xl px-4">
                <NavBar />
                <div className="flex flex-col items-center gap-2 mb-8">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600">
                        <Users size={22} />
                    </div>
                    <h1 className="text-3xl font-bold text-center tracking-tight text-slate-900">User List Comparison</h1>
                    <p className="text-sm text-slate-500 text-center max-w-md">
                        Paste your exported followers and following JSON to see who doesn&apos;t follow you back.
                    </p>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}