"use client"
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleX, Instagram, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import NavBar from "@/components/nav-bar";
import InfoTooltip from "@/components/info-tooltip";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { fuzzyFilter } from "@/lib/fuzzy-search";

async function fetchList(apiPath: string): Promise<string[]> {
    try {
        const res = await fetch(apiPath)
        if (!res.ok) return []
        return await res.json()
    } catch {
        return []
    }
}

async function saveList(apiPath: string, usernames: string[]): Promise<string[] | null> {
    try {
        const res = await fetch(apiPath, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usernames),
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

export type UsernameListPageProps = {
    apiPath: string
    title: string
    icon: LucideIcon
    infoText: string
    searchPlaceholder: string
    addPlaceholder: string
    emptyText: string
    footerText: string
    saveErrorText: string
}

export default function UsernameListPage({
    apiPath, title, icon: Icon, infoText, searchPlaceholder, addPlaceholder, emptyText, footerText, saveErrorText,
}: UsernameListPageProps) {
    const [usernames, setUsernames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [search, setSearch] = useState('');

    const filteredUsernames = useMemo(
        () => fuzzyFilter(usernames, search, u => u),
        [usernames, search]
    );

    useEffect(() => {
        fetchList(apiPath).then(list => {
            setUsernames(list);
            setLoading(false);
        });
    }, [apiPath]);

    const persist = async (next: string[]) => {
        setUsernames(next);
        setSaving(true);
        const saved = await saveList(apiPath, next);
        setSaving(false);
        if (!saved) {
            toast(saveErrorText, { icon: <CircleX /> });
            return;
        }
        setUsernames(saved);
    }

    const handleAdd = () => {
        const trimmed = newUsername.trim();
        if (!trimmed) return;
        if (usernames.includes(trimmed)) {
            toast(`${trimmed} is already in the list`, { icon: <CircleX /> });
            return;
        }
        persist([...usernames, trimmed]);
        setNewUsername('');
    }

    const handleRemove = (username: string) => {
        persist(usernames.filter(u => u !== username));
    }

    const handleClear = () => {
        persist([]);
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
            <div className="w-full max-w-2xl">
                <NavBar />
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Icon size={20} className="text-slate-500" />
                            {title} {`(${usernames.length})`}
                        </h1>
                        <InfoTooltip text={infoText} />
                        {saving && <Spinner size={16} />}
                    </div>
                    <Button
                        onClick={handleClear}
                        disabled={!usernames.length || saving}
                        className="bg-gray-500 hover:bg-gray-600 text-white"
                    >
                        <Trash2 />
                    </Button>
                </div>

                <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                    />
                </div>

                <div className="flex gap-1.5 mb-4 max-w-xs">
                    <input
                        type="text"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder={addPlaceholder}
                        className="flex-1 px-2.5 py-1.5 text-sm border border-dashed border-gray-300 bg-gray-50 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 placeholder-gray-400"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAdd}
                        disabled={!newUsername.trim() || saving}
                        className="text-gray-500"
                    >
                        <Plus size={16} />
                    </Button>
                </div>

                <div className="bg-white rounded-lg shadow-sm border divide-y max-h-[28rem] overflow-y-auto">
                    {loading && (
                        <div className="flex justify-center p-8">
                            <Spinner size={24} />
                        </div>
                    )}
                    {!loading && !usernames.length && (
                        <div className="p-4 text-center text-gray-500">{emptyText}</div>
                    )}
                    {!loading && !!usernames.length && !filteredUsernames.length && (
                        <div className="p-4 text-center text-gray-500">No matches for &quot;{search}&quot;.</div>
                    )}
                    {!loading && filteredUsernames.map(username => (
                        <div key={username} className="flex items-center justify-between px-4 py-2">
                            <a
                                href={`https://www.instagram.com/${encodeURIComponent(username)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-blue-600 hover:underline"
                            >
                                <Instagram size={14} className="text-gray-400" />
                                {username}
                            </a>
                            <button
                                onClick={() => handleRemove(username)}
                                disabled={saving}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                aria-label={`Remove ${username}`}
                            >
                                <CircleX size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <p className="text-sm text-gray-500 mt-4 text-center">
                    {footerText}
                </p>
            </div>
        </div>
    );
}
