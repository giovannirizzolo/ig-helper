// app/layout.tsx or components/Layout.tsx
import React from "react";

type LayoutProps = {
    children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="w-full max-w-6xl p-4">
                <h1 className="text-2xl font-bold text-center mb-6">User List Comparison</h1>
                <div>{children}</div>
            </div>
        </div>
    );
}