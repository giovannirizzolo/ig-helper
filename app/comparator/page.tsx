// app/page.tsx or pages/listComparisonPage.tsx
"use client"
import { CircleX, Copy, CircleCheck, Trash2, Users, UserPlus, ArrowLeftRight, RotateCcw, Download, ShieldCheck, UserX, Search, Ghost, Instagram } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
// import types removed — parsing handled defensively
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cmdkFuzzyFilter, fuzzyFilter } from "@/lib/fuzzy-search";


async function fetchUsernameList(apiPath: string): Promise<string[]> {
    try {
        const res = await fetch(apiPath)
        if (!res.ok) return []
        return await res.json()
    } catch {
        return []
    }
}

type PrefillResponse = { archive: string | null; followersRaw: string | null; followingRaw: string | null }

async function fetchPrefill(archive?: string | null): Promise<PrefillResponse | null> {
    try {
        const url = archive ? `/api/comparator/prefill?archive=${encodeURIComponent(archive)}` : '/api/comparator/prefill'
        const res = await fetch(url)
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// Expected schema: an array of objects. Each object contains `string_list_data` array
// where the username is at string_list_data[0].value (string).
function extractFollowersUsernames(raw: string): string[] | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }
    if (!Array.isArray(parsed)) return null

    const extracted: string[] = []
    for (const entr of parsed) {
        if (!entr || typeof entr !== 'object') continue
        const obj = entr as Record<string, unknown>
        const sld = obj.string_list_data
        if (!Array.isArray(sld) || sld.length === 0) continue
        const first = sld[0] as Record<string, unknown>
        if (first && typeof first.value === 'string' && first.value.trim()) {
            extracted.push(first.value.trim())
        }
    }
    return Array.from(new Set(extracted))
}

// Expected schema: an object with `relationships_following` which is an array
// where each item has a `title` string that is the username.
function extractFollowingUsernames(raw: string): string[] | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).relationships_following)) {
        return null
    }

    const entries = (parsed as Record<string, unknown>).relationships_following as unknown[]
    const extracted: string[] = []
    for (const entr of entries) {
        if (!entr || typeof entr !== 'object') continue
        const obj = entr as Record<string, unknown>
        if (typeof obj.title === 'string' && obj.title.trim()) {
            extracted.push(obj.title.trim())
        }
    }
    return Array.from(new Set(extracted))
}

export default function ListComparisonPage() {
    return (
        <Suspense fallback={null}>
            <ListComparisonPageInner />
        </Suspense>
    );
}

function ListComparisonPageInner() {
    const searchParams = useSearchParams()
    const archiveParam = searchParams.get('archive')
    const followingRef = useRef<HTMLTextAreaElement>(null)
    const followersRef = useRef<HTMLTextAreaElement>(null)
    const [followingNotFollowers, setFollowingNotFollowers] = useState<string[]>([]);

    const [followers, setFollowers] = useState<string[]>([]);
    const [following, setFollowing] = useState<string[]>([]);

    const [whiteList, setWhiteList] = useState<string[]>([])
    // accounts loaded from whitelist.txt — always start unchecked (protected from unfollow)
    const [protectedAccounts, setProtectedAccounts] = useState<string[]>([]); // read from whitelist.txt, never written
    // ghost/disabled accounts loaded from ghosts.txt — fully excluded from results, never written
    const [ghostAccounts, setGhostAccounts] = useState<string[]>([]);

    const [followingNotFollowersFinalList, setFollowingNotFollowersFinalList] = useState<string[]>([])
    const [mfsSearch, setMfsSearch] = useState('')

    //auto init followers and followings

    const handleNotFollowingYouCopy = async (list: string[]) => {
        if (!list.length) return

        try {
            await navigator.clipboard.writeText(list.join('\n'))
            toast("Successfully copied to clipboard!", {
                icon: <CircleCheck />,
                style: {
                    backgroundColor: 'green',
                    color: 'white'
                }
            })

        } catch (e) {
            console.error(e)
            toast("Error when copying to clipboard", {
                icon: <CircleX />,
            })
        }
    }

    const moveUsernameToList = async (
        apiPath: string,
        currentList: string[],
        setList: (list: string[]) => void,
        username: string,
        listLabel: string
    ): Promise<boolean> => {
        const next = currentList.includes(username) ? currentList : [...currentList, username]
        try {
            const res = await fetch(apiPath, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next),
            })
            if (!res.ok) {
                toast(`Failed to add ${username} to ${listLabel}`, { icon: <CircleX /> })
                return false
            }
            setList(await res.json())
            return true
        } catch {
            toast(`Failed to add ${username} to ${listLabel}`, { icon: <CircleX /> })
            return false
        }
    }

    const handleMoveToGhost = async (username: string) => {
        if (!await moveUsernameToList('/api/ghosts', ghostAccounts, setGhostAccounts, username, 'ghost accounts')) return

        // Remove from every list it could appear in — it's no longer a real account to consider.
        setFollowingNotFollowers(prev => prev.filter(u => u !== username))
        setWhiteList(prev => prev.filter(u => u !== username))

        toast(`${username} moved to ghost accounts`, { icon: <Ghost /> })
    }

    const handleMoveToWhitelist = async (username: string) => {
        if (!await moveUsernameToList('/api/whitelist', protectedAccounts, setProtectedAccounts, username, 'whitelist')) return

        // Remove from every list it could appear in — it's now protected from unfollowing.
        setFollowingNotFollowers(prev => prev.filter(u => u !== username))
        setWhiteList(prev => prev.filter(u => u !== username))

        toast(`${username} added to whitelist`, { icon: <ShieldCheck /> })
    }

    const handleUserListPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const raw = e.clipboardData.getData('text') || e.clipboardData.getData('Text')

        if (e.currentTarget.name === 'followers') {
            const usernames = extractFollowersUsernames(raw)
            if (usernames === null) {
                toast('Followers JSON must be an array (export from Instagram followers).', { icon: <CircleX /> })
                return
            }

            setFollowers(usernames)
            if (followersRef.current) followersRef.current.value = usernames.join('\n')

            // Warning for small follower counts that might indicate partial export
            if (usernames.length < 500) {
                toast(`⚠️ Imported only ${usernames.length} followers - this might be a partial export (last 3 months). For accurate results, export your complete followers list.`, {
                    icon: <CircleX />,
                    duration: 8000
                })
            } else {
                toast(`Imported ${usernames.length} followers`, { icon: <CircleCheck /> })
            }

        } else if (e.currentTarget.name === 'following') {
            const usernames = extractFollowingUsernames(raw)
            if (usernames === null) {
                toast('Following JSON must be an object with a relationships_following array (export from Instagram).', { icon: <CircleX /> })
                return
            }

            setFollowing(usernames)
            if (followingRef.current) followingRef.current.value = usernames.join('\n')
            toast(`Imported ${usernames.length} following`, { icon: <CircleCheck /> })
        }
    }

    const handleResetLists = () => {
        if (!followersRef.current || !followingRef.current) return;
        followersRef.current.value = ''
        followingRef.current.value = ''
    }

    const handleCompareLists = () => {
        if (!following.length && !followers.length) {
            toast('No data to compare — paste followers and following JSON first', { icon: <CircleX /> })
            return
        }

        console.log('DEBUG: Comparing lists')
        console.log('Following count:', following.length)
        console.log('Followers count:', followers.length)

        // Find people you follow who don't follow you back (following not in followers),
        // excluding ghost/disabled accounts entirely — they never appear in results.
        const rawNotFollowingBack = following.filter(followed => !followers.includes(followed))
        const ghostCount = rawNotFollowingBack.filter(u => ghostAccounts.includes(u)).length
        const followingNotFollowers = rawNotFollowingBack.filter(u => !ghostAccounts.includes(u))
        setFollowingNotFollowers(followingNotFollowers)

        // Check everyone except accounts protected in whitelist.txt
        setWhiteList(followingNotFollowers.filter(u => !protectedAccounts.includes(u)))

        console.log('People you follow who don\'t follow you back:', followingNotFollowers.length)

        setFollowingNotFollowersFinalList([])

        const protectedCount = followingNotFollowers.filter(u => protectedAccounts.includes(u)).length
        const ghostSuffix = ghostCount > 0 ? `, ${ghostCount} excluded as ghost accounts` : ''
        const warningMessage = followers.length < 500
            ? `⚠️ Found ${followingNotFollowers.length} people you follow who don't follow you back. WARNING: Your followers list seems incomplete (${followers.length} followers). Results may be inaccurate.`
            : protectedAccounts.length > 0
                ? `Found ${followingNotFollowers.length} people you follow who don't follow you back (${protectedCount} auto-unchecked from whitelist.txt${ghostSuffix})`
                : `Found ${followingNotFollowers.length} people you follow who don't follow you back (all checked - uncheck to protect${ghostSuffix})`

        toast(warningMessage, {
            icon: followers.length < 500 ? <CircleX /> : <CircleCheck />,
            duration: followers.length < 500 ? 10000 : 5000
        })
    }
    const handleCheckedChange = (checked: boolean, username?: string) => {
        if (!username) return
        if (checked) {
            setWhiteList(prev => prev.includes(username) ? prev : [...prev, username])
        } else {
            setWhiteList(prev => prev.filter(u => u !== username))
        }
    }

    useEffect(() => {
        fetchUsernameList('/api/whitelist').then(setProtectedAccounts)
        fetchUsernameList('/api/ghosts').then(setGhostAccounts)
    }, [])

    useEffect(() => {
        fetchPrefill(archiveParam).then(data => {
            if (!data) return

            let filledFollowers = false
            let filledFollowing = false

            if (data.followersRaw) {
                const usernames = extractFollowersUsernames(data.followersRaw)
                if (usernames) {
                    setFollowers(usernames)
                    if (followersRef.current) followersRef.current.value = usernames.join('\n')
                    filledFollowers = true
                }
            }

            if (data.followingRaw) {
                const usernames = extractFollowingUsernames(data.followingRaw)
                if (usernames) {
                    setFollowing(usernames)
                    if (followingRef.current) followingRef.current.value = usernames.join('\n')
                    filledFollowing = true
                }
            }

            if (data.archive && (filledFollowers || filledFollowing)) {
                toast(`Prefilled from ${archiveParam ? 'archive' : 'latest archive'} (${data.archive})`, { icon: <CircleCheck /> })
            }
        })
    }, [archiveParam])

    useEffect(() => {
        setFollowingNotFollowersFinalList(followingNotFollowers.filter(username => whiteList.includes(username)))
    }, [whiteList, followingNotFollowers])

    const displayedFinalList = useMemo(
        () => fuzzyFilter(followingNotFollowersFinalList, mfsSearch, u => u),
        [followingNotFollowersFinalList, mfsSearch]
    )

    return (
        <>
            <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
                {/* Left Text Area */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={18} className="text-indigo-500" />
                        <h2 className="font-semibold text-slate-800">Your Followers</h2>
                        {!!followers.length && (
                            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                {followers.length}
                            </span>
                        )}
                    </div>
                    <textarea
                        ref={followersRef}
                        name="followers"
                        className="w-full h-64 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 font-mono text-sm resize-none"
                        placeholder="Paste followers.json contents here..."
                        onPaste={(e) => handleUserListPaste(e)}
                        onCut={() => setFollowers([])}
                        onChange={(e) => !e.currentTarget.value ? setFollowers([]) : null}
                    />
                </div>

                {/* Center Button Group */}
                <div className="flex lg:flex-col items-center justify-center gap-3 shrink-0">
                    <Button
                        disabled={!followers.length || !following.length}
                        onClick={() => handleCompareLists()}
                        className="w-40 gap-2 shadow">
                        <ArrowLeftRight size={16} />
                        Compare
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleResetLists()}
                        className="w-40 gap-2 shadow-sm">
                        <RotateCcw size={16} />
                        Clear Lists
                    </Button>
                    <Button variant="secondary" className="w-40 gap-2 shadow-sm">
                        <Download size={16} />
                        Export Results
                    </Button>
                </div>

                {/* Right Text Area */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <UserPlus size={18} className="text-indigo-500" />
                        <h2 className="font-semibold text-slate-800">Your Followings</h2>
                        {!!following.length && (
                            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                {following.length}
                            </span>
                        )}
                    </div>
                    <textarea
                        ref={followingRef}
                        name="following"
                        className="w-full h-64 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 font-mono text-sm resize-none"
                        placeholder="Paste following.json contents here..."
                        onPaste={(e) => handleUserListPaste(e)}
                        onCut={() => setFollowing([])}
                        onChange={(e) => !e.currentTarget.value ? setFollowing([]) : null}
                    />
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                <div className="flex-1 bg-white rounded-xl border shadow-sm p-4 flex flex-col items-center">
                    <div className="w-full flex gap-2 items-center mb-3">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        <h2 className="font-semibold text-slate-800">Whitelist</h2>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                            {whiteList.length}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto text-slate-400 hover:text-red-500"
                            onClick={() => setWhiteList([])}
                            disabled={!whiteList.length}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                    <Command className="w-full border rounded-lg" filter={cmdkFuzzyFilter}>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup heading="Users">
                                {followingNotFollowers.filter(Boolean).map((user, idx) =>
                                    <CommandItem key={user ?? `user-${idx}`}>
                                        <Checkbox id={`user-${idx}`} onCheckedChange={(e) => handleCheckedChange(!!e, user)} checked={!!user && whiteList.includes(user)} />
                                        <label
                                            htmlFor={`user-${idx}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >{user}</label>
                                    </CommandItem>)}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                    <Button
                        variant="outline"
                        className="mt-3 gap-2"
                        disabled={!whiteList.length}
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(whiteList.join('\n'))
                                toast('Whitelist copied to clipboard!', { icon: <CircleCheck /> })
                            } catch {
                                toast('Error copying to clipboard', { icon: <CircleX /> })
                            }
                        }}
                    >
                        <Copy size={16} />
                        Copy
                    </Button>

                </div>
                <div className="flex-1 bg-white rounded-xl border shadow-sm p-4 flex flex-col items-center">
                    <div className="w-full flex items-center gap-2 mb-1">
                        <UserX size={18} className="text-rose-500" />
                        <h2 className="font-semibold text-slate-800">Not Following You Back</h2>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                            {followingNotFollowers?.length ?? 0}
                        </span>
                    </div>
                    <p className="w-full text-xs text-slate-500 mb-3">
                        Excluding whitelisted: <span className="font-medium text-slate-700">{followingNotFollowersFinalList.length}</span>
                    </p>
                    <div className="relative w-full mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={mfsSearch}
                            onChange={e => setMfsSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 text-sm"
                        />
                    </div>
                    <div className="w-full h-56 mb-3 border rounded-lg shadow-sm bg-slate-50 overflow-y-auto divide-y">
                        {!displayedFinalList.length && (
                            <div className="p-4 text-center text-sm text-slate-400">
                                {mfsSearch.trim() ? `No matches for "${mfsSearch}".` : 'Nothing here — compare your lists above.'}
                            </div>
                        )}
                        {displayedFinalList.map(username => (
                            <div key={username} className="flex items-center justify-between px-3 py-2">
                                <a
                                    href={`https://www.instagram.com/${encodeURIComponent(username)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-blue-600 hover:underline min-w-0 truncate"
                                >
                                    <Instagram size={14} className="text-gray-400 shrink-0" />
                                    <span className="truncate">{username}</span>
                                </a>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <button
                                        onClick={() => handleMoveToWhitelist(username)}
                                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                                        title={`Add ${username} to whitelist`}
                                        aria-label={`Add ${username} to whitelist`}
                                    >
                                        <ShieldCheck size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleMoveToGhost(username)}
                                        className="text-gray-400 hover:text-violet-600 transition-colors"
                                        title={`Move ${username} to ghost accounts`}
                                        aria-label={`Move ${username} to ghost accounts`}
                                    >
                                        <Ghost size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button className="gap-2" disabled={!displayedFinalList.length} onClick={() => handleNotFollowingYouCopy(displayedFinalList)}>
                        <Copy size={16} />
                        Copy
                    </Button>
                </div>
            </div>
        </>
    );
}