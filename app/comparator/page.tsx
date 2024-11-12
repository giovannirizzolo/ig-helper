// app/page.tsx or pages/listComparisonPage.tsx
"use client"
import { CircleX, Copy, CircleCheck } from "lucide-react";
import { useRef, useState } from "react";
import Layout from "./layout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FollowersDataArray, FollowingDataArray } from "./types";


export default function ListComparisonPage() {
    const [peopleNotFollowingYou, setPeopleNotFollowingYou] = useState<string>('')
    const peopleNotFollowingYouRef = useRef<HTMLTextAreaElement>(null)
    const followingRef = useRef<HTMLTextAreaElement>(null)
    const followersRef = useRef<HTMLTextAreaElement>(null)

    const [followers, setFollowers] = useState<string[]>([]);
    const [following, setFollowing] = useState<string[]>([]);


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
        const data = e.clipboardData.getData('Text')
        let jsonUsers: FollowingDataArray | FollowersDataArray
        let usernames: string[] = []

        if (e.currentTarget.name === 'followers') {
            jsonUsers = JSON.parse(data) as FollowersDataArray
            usernames = jsonUsers.map(follower => `${follower.string_list_data[0].value}`)
            setFollowers(usernames)

        } else if (e.currentTarget.name === 'following') {
            jsonUsers = JSON.parse(data) as FollowingDataArray
            usernames = jsonUsers.relationships_following.map(followed => `${followed.string_list_data[0].value}`)
            setFollowing(usernames)
        }
    }

    const handleResetLists = () => {
        if (!followersRef.current || !followingRef.current) return;
        followersRef.current.value = ''
        followingRef.current.value = ''
    }

    const handleCompareLists = () => {
        const followingNotFollowers = following.map(followed => !followers.includes(followed) ? followed : '').filter(Boolean)
        setPeopleNotFollowingYou(followingNotFollowers.join('\n'))
    }

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
                        disabled={!followers || !following}
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
            <div className="my-4 flex flex-col items-center">
                <h2>MFS who dont follow you back</h2>
                <textarea
                    ref={peopleNotFollowingYouRef}
                    value={peopleNotFollowingYou}
                    className="w-full lg:w-1/3 h-72 p-4 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                    disabled
                />
                <Button onClick={() => handleNotFollowingYouCopy()}>
                    <Copy />
                </Button>
            </div>
        </Layout>
    );
}