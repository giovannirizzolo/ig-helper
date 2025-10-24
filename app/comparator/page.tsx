// app/page.tsx or pages/listComparisonPage.tsx
"use client"
import { CircleX, Copy, CircleCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Layout from "./layout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
// import types removed — parsing handled defensively
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";


export default function ListComparisonPage() {
    const peopleNotFollowingYouRef = useRef<HTMLTextAreaElement>(null)
    const followingRef = useRef<HTMLTextAreaElement>(null)
    const followersRef = useRef<HTMLTextAreaElement>(null)
    const [followingNotFollowers, setFollowingNotFollowers] = useState<string[]>([]);

    const [followers, setFollowers] = useState<string[]>([]);
    const [following, setFollowing] = useState<string[]>([]);

    const [whiteList, setWhiteList] = useState<string[]>([])

    const [followingNotFollowersFinalList, setFollowingNotFollowersFinalList] = useState<{ data: string, length: number } | null>(null)

    //auto init followers and followings

    const handleNotFollowingYouCopy = async () => {
        if (!peopleNotFollowingYouRef.current?.value) return
        peopleNotFollowingYouRef.current?.select();
        peopleNotFollowingYouRef.current?.setSelectionRange(0, 99999);

        try {
            await navigator.clipboard.writeText(peopleNotFollowingYouRef.current?.value)
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

    const handleUserListPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const raw = e.clipboardData.getData('text') || e.clipboardData.getData('Text')

        let parsed: unknown
        try {
            parsed = JSON.parse(raw)
        } catch (err) {
            console.error('Failed to parse pasted JSON', err)
            toast('Invalid JSON pasted — paste the exported followers/following JSON file contents', { icon: <CircleX /> })
            return
        }

        // Strict schema-based parsing only — do not use heuristics.
        if (e.currentTarget.name === 'followers') {
            // Expected schema: an array of objects. Each object contains `string_list_data` array
            // where the username is at string_list_data[0].value (string).
            if (!Array.isArray(parsed)) {
                toast('Followers JSON must be an array (export from Instagram followers).', { icon: <CircleX /> })
                return
            }

            const entries = parsed as unknown[]
            const extracted: string[] = []
            for (const entr of entries) {
                if (!entr || typeof entr !== 'object') continue
                const obj = entr as Record<string, unknown>
                const sld = obj.string_list_data
                if (!Array.isArray(sld) || sld.length === 0) continue
                const first = sld[0] as Record<string, unknown>
                if (first && typeof first.value === 'string' && first.value.trim()) {
                    extracted.push(first.value.trim())
                }
            }

            const usernames = Array.from(new Set(extracted))
            console.log('DEBUG: Followers JSON structure check:')
            console.log('- Total entries in array:', entries.length)
            console.log('- Extracted usernames count:', extracted.length)
            console.log('- Unique usernames count:', usernames.length)
            console.log('- First 5 usernames:', usernames.slice(0, 5))
            console.log('- Sample entry structure:', entries[0])
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
            // Expected schema: an object with `relationships_following` which is an array
            // where each item has a `title` string that is the username.
            if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).relationships_following)) {
                toast('Following JSON must be an object with a relationships_following array (export from Instagram).', { icon: <CircleX /> })
                return
            }

            const entries = (parsed as Record<string, unknown>).relationships_following as unknown[]
            const extracted: string[] = []
            for (const entr of entries) {
                if (!entr || typeof entr !== 'object') continue
                const obj = entr as Record<string, unknown>

                // For following.json, the username is in the 'title' field
                if (typeof obj.title === 'string' && obj.title.trim()) {
                    extracted.push(obj.title.trim())
                }
            }

            const usernames = Array.from(new Set(extracted))
            console.log('DEBUG: Following JSON structure check:')
            console.log('- Total entries in relationships_following:', entries.length)
            console.log('- Extracted usernames count:', extracted.length)
            console.log('- Unique usernames count:', usernames.length)
            console.log('- First 5 usernames:', usernames.slice(0, 5))
            console.log('- Sample entry structure:', entries[0])
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

        // Find people you follow who don't follow you back (following not in followers)
        const followingNotFollowers = following.filter(followed => !followers.includes(followed))
        setFollowingNotFollowers(followingNotFollowers)

        // Automatically populate whitelist with ALL people you follow who don't follow you back
        setWhiteList([...followingNotFollowers])

        console.log('People you follow who don\'t follow you back:', followingNotFollowers.length)

        // Initially, final list is empty because everyone is whitelisted
        setFollowingNotFollowersFinalList({ data: '', length: 0 })

        const warningMessage = followers.length < 500
            ? `⚠️ Found ${followingNotFollowers.length} people you follow who don't follow you back. WARNING: Your followers list seems incomplete (${followers.length} followers). Results may be inaccurate.`
            : `Found ${followingNotFollowers.length} people you follow who don't follow you back (all whitelisted - uncheck to unfollow)`

        toast(warningMessage, {
            icon: followers.length < 500 ? <CircleX /> : <CircleCheck />,
            duration: followers.length < 500 ? 10000 : 5000
        })
    }
    const handleCheckedChange = (checked: boolean, username?: string) => {
        // ignore falsy usernames (defensive)
        if (!username) return

        if (checked) {
            setWhiteList(prev => prev.includes(username) ? prev : [...prev, username])
        } else {
            setWhiteList(prev => prev.filter(user => username !== user))
        }
    }

    useEffect(() => {
        const finalList = followingNotFollowers.filter(username => whiteList.includes(username))
        setFollowingNotFollowersFinalList({ data: finalList.join('\n'), length: finalList.length })
    }, [whiteList, followingNotFollowers])

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-8 lg:space-y-0 lg:space-x-8">
                {/* Left Text Area */}
                <h2>Your Followers</h2>
                <textarea
                    ref={followersRef}
                    name="followers"
                    className="w-full lg:w-1/3 h-72 p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                    placeholder="Enter followers here..."
                    onPaste={(e) => handleUserListPaste(e)}
                    onCut={() => setFollowers([])}
                    onChange={(e) => !e.currentTarget.value ? setFollowers([]) : null}
                />

                {/* Center Button Group */}
                <div className="flex flex-col items-center space-y-4">
                    <Button
                        disabled={!followers.length || !following.length}
                        onClick={() => handleCompareLists()}
                        className="w-40 px-  py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition shadow">
                        Compare Lists
                    </Button>
                    <Button
                        onClick={() => handleResetLists()}
                        className="w-40 px-6 py-3 rounded-lg bg-gray-500 text-white font-medium hover:bg-gray-600 transition shadow">
                        Clear Lists

                    </Button>
                    <Button className="w-40 px-6 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition shadow">
                        Export Results
                    </Button>
                </div>

                {/* Right Text Area */}
                <textarea
                    ref={followingRef}
                    name="following"
                    className="w-full lg:w-1/3 h-72 p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                    placeholder="Enter followings here..."
                    onPaste={(e) => handleUserListPaste(e)}
                    onCut={() => setFollowing([])}
                    onChange={(e) => !e.currentTarget.value ? setFollowing([]) : null}
                />
                <h2>Your Followings</h2>



            </div>
            <div className="flex">
                <div className="my-4 flex flex-1 flex-col items-center">
                    <div className="flex gap-2 items-center mb-2">
                        <h2>Whitelist {`(${whiteList.length})`}</h2>
                        <Button onClick={() => setWhiteList([])} disabled={!whiteList.length}>
                            <Trash2 />
                        </Button>
                    </div>
                    <Command>
                        <CommandInput placeholder="Type a command or search..." />
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

                </div>
                <div className="my-4 flex flex-1 flex-col items-center">
                    <h2>MFS who dont follow you back: {followingNotFollowers?.length}</h2>
                    <h3>MFS who dont follow you back excluding whitelisted {followingNotFollowersFinalList?.length}</h3>
                    <textarea
                        ref={peopleNotFollowingYouRef}
                        value={followingNotFollowersFinalList?.data}
                        className="w-full lg:w-1/3 h-72 p-4 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                        disabled
                    />
                    <Button onClick={() => handleNotFollowingYouCopy()}>
                        <Copy />
                    </Button>
                </div>
            </div>
        </Layout>
    );
}