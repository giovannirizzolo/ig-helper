"use client"
import { useEffect, useMemo, useState } from "react";
import {
    Users, UserPlus, Heart, UserMinus, UserX, ShieldBan, ShieldAlert, EyeOff,
    Clock, Send, Inbox, Sparkles, Star, BarChart3, CircleX, type LucideIcon
} from "lucide-react";
import NavBar from "@/components/nav-bar";
import Spinner from "@/components/spinner";
import { toast } from "sonner";

type CategoryStat = {
    key: string
    label: string
    count: number
    oldest: number | null
    newest: number | null
}

type FollowStats = {
    archive: string
    generatedAt: number
    categories: CategoryStat[]
    followersCount: number
    followingCount: number
    mutualCount: number
    notFollowingBackCount: number
    fansNotFollowedBackCount: number
}

type ArchiveOption = { dir: string; label: string }

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    blocked: ShieldBan,
    closeFriends: Heart,
    pendingRequests: Send,
    recentRequests: Send,
    requestsReceived: Inbox,
    recentlyUnfollowed: UserMinus,
    removedSuggestions: UserX,
    restricted: ShieldAlert,
    hiddenStoryFrom: EyeOff,
    favorited: Star,
}

function formatDate(ts: number | null): string {
    if (!ts) return '—'
    return new Date(ts * 1000).toLocaleDateString()
}

async function fetchExtractedArchives(): Promise<ArchiveOption[]> {
    try {
        const res = await fetch('/api/archives')
        if (!res.ok) return []
        const { archives } = await res.json()
        return (archives as { name: string; extracted: boolean; username: string; date: string }[])
            .filter(a => a.extracted)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(a => ({ dir: a.name.replace(/\.zip$/i, ''), label: `${a.username} — ${a.date}` }))
    } catch {
        return []
    }
}

async function fetchStats(archive: string): Promise<FollowStats | null> {
    try {
        const res = await fetch(`/api/stats?archive=${encodeURIComponent(archive)}`)
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

export default function StatsPage() {
    const [archives, setArchives] = useState<ArchiveOption[]>([]);
    const [selected, setSelected] = useState('');
    const [stats, setStats] = useState<FollowStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExtractedArchives().then(list => {
            setArchives(list);
            if (list.length) setSelected(list[0].dir);
            else setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!selected) return;
        setLoading(true);
        fetchStats(selected).then(result => {
            setStats(result);
            setLoading(false);
            if (!result) toast('Failed to load stats for this archive', { icon: <CircleX /> });
        });
    }, [selected]);

    const otherCategories = useMemo(
        () => stats?.categories.filter(c => c.key !== 'followers' && c.key !== 'following') ?? [],
        [stats]
    );

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
            <div className="w-full max-w-4xl">
                <NavBar />
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 size={22} className="text-indigo-500" />
                        Stats
                    </h1>
                    {!!archives.length && (
                        <select
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            className="px-3 py-2 text-sm border rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            {archives.map(a => (
                                <option key={a.dir} value={a.dir}>{a.label}</option>
                            ))}
                        </select>
                    )}
                </div>
                <p className="text-sm text-gray-500 mb-6">
                    Extracted from the followers and following data in your latest downloaded archive.
                </p>

                {loading && (
                    <div className="flex justify-center p-16">
                        <Spinner size={28} />
                    </div>
                )}

                {!loading && !archives.length && (
                    <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                        No extracted archives yet. Head to the{' '}
                        <a href="/archives" className="text-indigo-600 hover:underline">Archives</a> page to extract one.
                    </div>
                )}

                {!loading && stats && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                            <StatCard icon={Users} color="indigo" label="Followers" value={stats.followersCount} />
                            <StatCard icon={UserPlus} color="indigo" label="Following" value={stats.followingCount} />
                            <StatCard icon={Heart} color="emerald" label="Mutual" value={stats.mutualCount} />
                            <StatCard icon={UserX} color="rose" label="Not following you back" value={stats.notFollowingBackCount} />
                            <StatCard icon={Sparkles} color="amber" label="Fans you don't follow back" value={stats.fansNotFollowedBackCount} />
                        </div>

                        <h2 className="text-sm font-semibold text-slate-600 mb-3">Other activity</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {otherCategories.map(cat => {
                                const Icon = CATEGORY_ICONS[cat.key] ?? Clock
                                return (
                                    <div key={cat.key} className="bg-white rounded-xl border shadow-sm p-4">
                                        <div className="flex items-center gap-2 mb-1 text-gray-500">
                                            <Icon size={16} />
                                            <span className="text-xs font-medium">{cat.label}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-slate-800">{cat.count}</p>
                                        {cat.count > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(cat.oldest)} – {formatDate(cat.newest)}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, color, label, value }: {
    icon: LucideIcon
    color: 'indigo' | 'emerald' | 'rose' | 'amber'
    label: string
    value: number
}) {
    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        amber: 'bg-amber-50 text-amber-600',
    }
    return (
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${colorClasses[color]}`}>
                <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}
