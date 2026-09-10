"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
    { href: "/", label: "Dashboard" },
    { href: "/comparator", label: "Comparator" },
    { href: "/whitelist", label: "Whitelist" },
    { href: "/ghosts", label: "Ghosts" },
    { href: "/archives", label: "Archives" },
    { href: "/stats", label: "Stats" },
];

export default function NavBar() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-2 justify-center mb-6">
            {links.map(link => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === link.href
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-200"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
