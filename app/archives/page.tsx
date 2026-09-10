"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, CheckCircle2, CircleX, FolderOpen, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import NavBar from "@/components/nav-bar";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type ArchiveInfo = {
    name: string
    username: string
    date: string
    code: string
    size: number
    extracted: boolean
    hasData: boolean
}

function getTodayLocal(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB']
    let value = bytes / 1024
    let unitIndex = 0
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex++
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`
}

async function fetchArchives(): Promise<{ downloadsDir: string; archives: ArchiveInfo[] }> {
    try {
        const res = await fetch('/api/archives')
        if (!res.ok) return { downloadsDir: '', archives: [] }
        return await res.json()
    } catch {
        return { downloadsDir: '', archives: [] }
    }
}

export default function ArchivesPage() {
    const router = useRouter();
    const [downloadsDir, setDownloadsDir] = useState('');
    const [archives, setArchives] = useState<ArchiveInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [extracting, setExtracting] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ArchiveInfo | null>(null);
    const today = getTodayLocal();

    const load = async () => {
        setLoading(true);
        const { downloadsDir, archives } = await fetchArchives();
        setDownloadsDir(downloadsDir);
        setArchives(archives);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const handleExtract = async (name: string) => {
        setExtracting(name);
        try {
            const res = await fetch('/api/archives/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                toast(body?.error ?? 'Failed to extract archive', { icon: <CircleX /> })
                return
            }
            toast(`Extracted ${name}`, { icon: <CheckCircle2 /> })
            await load()
        } catch {
            toast('Failed to extract archive', { icon: <CircleX /> })
        } finally {
            setExtracting(null);
        }
    }

    const handleLoad = (archive: ArchiveInfo) => {
        router.push(`/comparator?archive=${encodeURIComponent(archive.name.replace(/\.zip$/i, ''))}`)
    }

    const handleDelete = async () => {
        if (!pendingDelete) return
        const { name } = pendingDelete
        setDeleting(name);
        try {
            const res = await fetch('/api/archives', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                toast(body?.error ?? 'Failed to delete archive', { icon: <CircleX /> })
                return
            }
            toast(`Deleted ${name}`, { icon: <CheckCircle2 /> })
            setArchives(prev => prev.filter(a => a.name !== name))
        } catch {
            toast('Failed to delete archive', { icon: <CircleX /> })
        } finally {
            setDeleting(null);
            setPendingDelete(null);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 p-8">
            <div className="w-full max-w-2xl">
                <NavBar />
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Archives {`(${archives.length})`}</h1>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
                        {loading ? <Spinner size={14} /> : <RefreshCw size={14} />}
                        Rescan
                    </Button>
                </div>
                <p className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
                    <FolderOpen size={14} />
                    Scanning {downloadsDir || '~/Downloads'} for files matching{' '}
                    <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">instagram-username-YYYY-MM-DD-code.zip</code>
                </p>

                <div className="bg-white rounded-lg shadow-sm border divide-y">
                    {loading && (
                        <div className="flex justify-center p-8">
                            <Spinner size={24} />
                        </div>
                    )}
                    {!loading && !archives.length && (
                        <div className="p-6 text-center text-gray-500">
                            No matching archives found in your Downloads folder.
                        </div>
                    )}
                    {!loading && archives.map(archive => {
                        const isToday = archive.date === today
                        return (
                        <div key={archive.name} className={`flex items-center gap-3 px-4 py-3 ${isToday ? 'bg-amber-50' : ''}`}>
                            <Archive size={18} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{archive.name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {isToday && (
                                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                                            <Sparkles size={11} />
                                            Today
                                        </span>
                                    )}
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{archive.username}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{archive.date}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatBytes(archive.size)}</span>
                                </div>
                            </div>
                            {archive.extracted ? (
                                <Button variant="outline" size="sm" disabled className="gap-1.5 text-emerald-600 border-emerald-200 shrink-0">
                                    <CheckCircle2 size={14} />
                                    Extracted
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => handleExtract(archive.name)}
                                    disabled={extracting === archive.name}
                                    className="gap-1.5 shrink-0"
                                >
                                    {extracting === archive.name ? <Spinner size={14} className="text-white" /> : null}
                                    Extract
                                </Button>
                            )}
                            {archive.extracted && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLoad(archive)}
                                    disabled={!archive.hasData}
                                    title={archive.hasData ? undefined : 'No followers/following data found in this archive'}
                                    className="gap-1.5 shrink-0"
                                >
                                    <Upload size={14} />
                                    Load
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-500 shrink-0"
                                onClick={() => setPendingDelete(archive)}
                                disabled={deleting === archive.name}
                                aria-label={`Delete ${archive.name}`}
                            >
                                {deleting === archive.name ? <Spinner size={16} /> : <Trash2 size={16} />}
                            </Button>
                        </div>
                        )
                    })}
                </div>

                <p className="text-sm text-gray-500 mt-4 text-center">
                    Extracted archives are unpacked into <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">downloaded_data/</code> in the project, one folder per archive.
                </p>
            </div>

            <Dialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this archive?</DialogTitle>
                        <DialogDescription>
                            This permanently removes <span className="font-medium text-slate-700">{pendingDelete?.name}</span> from
                            your Downloads folder and deletes its extracted data under{' '}
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">downloaded_data/</code>. This can&apos;t be undone.
                            Your whitelist is never touched by this action.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!!deleting}
                            className="gap-2"
                        >
                            {deleting ? <Spinner size={14} className="text-white" /> : <Trash2 size={14} />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
