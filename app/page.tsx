import Link from "next/link";
import { Archive, BarChart3, Ghost, ListChecks, ShieldCheck } from "lucide-react";

const cards = [
  {
    href: "/comparator",
    icon: ListChecks,
    title: "Comparator",
    description: "Compare your followers and following lists to see who doesn't follow you back.",
  },
  {
    href: "/whitelist",
    icon: ShieldCheck,
    title: "Whitelist",
    description: "Manage the accounts that are always protected from being flagged for unfollowing.",
  },
  {
    href: "/ghosts",
    icon: Ghost,
    title: "Ghost Accounts",
    description: "Track dead or long-disabled accounts to exclude from the not-following-back list.",
  },
  {
    href: "/archives",
    icon: Archive,
    title: "Archives",
    description: "Find your downloaded Instagram export zips and extract them for the comparator.",
  },
  {
    href: "/stats",
    icon: BarChart3,
    title: "Stats",
    description: "See everything extracted from your followers and following export data.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-2">Auto Unfollow</h1>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-2">
          Find out who you follow on Instagram that doesn&apos;t follow you back, then keep a
          persistent whitelist of accounts you want to keep following anyway.
        </p>
        <p className="text-gray-500 text-center mb-10">Pick where you&apos;d like to go.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 p-6 bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
            >
              <Icon className="text-blue-500" size={28} />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-gray-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
