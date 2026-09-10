import { readFile, readdir } from "fs/promises"
import path from "path"
import { getArchivesRoot } from "@/lib/archives"

type Entry = { username: string; timestamp: number | null }

async function readJson(filePath: string): Promise<unknown | null> {
    try {
        const raw = await readFile(filePath, "utf-8")
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function parseLabelValuesFile(data: unknown): Entry[] {
    if (!Array.isArray(data)) return []
    const entries: Entry[] = []
    for (const item of data) {
        if (!item || typeof item !== "object") continue
        const obj = item as Record<string, unknown>
        const labelValues = obj.label_values
        if (!Array.isArray(labelValues)) continue
        const usernameField = labelValues.find(
            (lv): lv is { label: string; value: string } =>
                !!lv && typeof lv === "object" && (lv as Record<string, unknown>).label === "Username"
        )
        const username = usernameField && typeof usernameField.value === "string" ? usernameField.value.trim() : ""
        if (!username) continue
        const timestamp = typeof obj.timestamp === "number" ? obj.timestamp : null
        entries.push({ username, timestamp })
    }
    return entries
}

function parseFollowersFile(data: unknown): Entry[] {
    if (!Array.isArray(data)) return []
    const entries: Entry[] = []
    for (const item of data) {
        if (!item || typeof item !== "object") continue
        const obj = item as Record<string, unknown>
        const sld = obj.string_list_data
        if (!Array.isArray(sld) || !sld.length) continue
        const first = sld[0] as Record<string, unknown>
        if (typeof first.value !== "string" || !first.value.trim()) continue
        const timestamp = typeof first.timestamp === "number" ? first.timestamp : null
        entries.push({ username: first.value.trim(), timestamp })
    }
    return entries
}

function parseFollowingFile(data: unknown): Entry[] {
    if (!data || typeof data !== "object") return []
    const relationships = (data as Record<string, unknown>).relationships_following
    if (!Array.isArray(relationships)) return []
    const entries: Entry[] = []
    for (const item of relationships) {
        if (!item || typeof item !== "object") continue
        const obj = item as Record<string, unknown>
        if (typeof obj.title !== "string" || !obj.title.trim()) continue
        const sld = obj.string_list_data
        const first = Array.isArray(sld) && sld.length ? (sld[0] as Record<string, unknown>) : null
        const timestamp = first && typeof first.timestamp === "number" ? first.timestamp : null
        entries.push({ username: obj.title.trim(), timestamp })
    }
    return entries
}

export type CategoryStat = {
    key: string
    label: string
    count: number
    oldest: number | null
    newest: number | null
}

export type FollowStats = {
    archive: string
    generatedAt: number
    categories: CategoryStat[]
    followersCount: number
    followingCount: number
    mutualCount: number
    notFollowingBackCount: number // people you follow who don't follow you back
    fansNotFollowedBackCount: number // people who follow you that you don't follow back
}

function summarize(key: string, label: string, entries: Entry[]): CategoryStat {
    const timestamps = entries.map(e => e.timestamp).filter((t): t is number => typeof t === "number")
    return {
        key,
        label,
        count: entries.length,
        oldest: timestamps.length ? Math.min(...timestamps) : null,
        newest: timestamps.length ? Math.max(...timestamps) : null,
    }
}

export function getFollowersAndFollowingDir(archive: string): string {
    return path.join(getArchivesRoot(), archive, "connections", "followers_and_following")
}

// Whether this extracted archive actually has usable followers/following entries,
// as opposed to an empty or malformed export.
export async function archiveHasFollowData(archive: string): Promise<boolean> {
    const dir = getFollowersAndFollowingDir(archive)

    let files: string[]
    try {
        files = await readdir(dir)
    } catch {
        return false
    }

    const followerFiles = files.filter(f => /^followers_\d+\.json$/i.test(f))
    for (const file of followerFiles) {
        const data = await readJson(path.join(dir, file))
        if (parseFollowersFile(data).length > 0) return true
    }

    const followingData = await readJson(path.join(dir, "following.json"))
    if (parseFollowingFile(followingData).length > 0) return true

    return false
}

export async function computeFollowStats(archive: string): Promise<FollowStats | null> {
    const dir = getFollowersAndFollowingDir(archive)

    let files: string[]
    try {
        files = await readdir(dir)
    } catch {
        return null
    }

    const followerFiles = files.filter(f => /^followers_\d+\.json$/i.test(f))
    const followerEntries: Entry[] = []
    for (const file of followerFiles) {
        const data = await readJson(path.join(dir, file))
        followerEntries.push(...parseFollowersFile(data))
    }

    const followingData = await readJson(path.join(dir, "following.json"))
    const followingEntries = parseFollowingFile(followingData)

    const labelValueFiles: { key: string; label: string; file: string }[] = [
        { key: "blocked", label: "Blocked profiles", file: "blocked_profiles.json" },
        { key: "closeFriends", label: "Close friends", file: "close_friends.json" },
        { key: "pendingRequests", label: "Pending follow requests (sent)", file: "pending_follow_requests.json" },
        { key: "recentRequests", label: "Recent follow requests (sent)", file: "recent_follow_requests.json" },
        { key: "requestsReceived", label: "Follow requests received", file: "follow_requests_you've_received.json" },
        { key: "recentlyUnfollowed", label: "Recently unfollowed", file: "recently_unfollowed_profiles.json" },
        { key: "removedSuggestions", label: "Removed suggestions", file: "removed_suggestions.json" },
        { key: "restricted", label: "Restricted profiles", file: "restricted_profiles.json" },
        { key: "hiddenStoryFrom", label: "Hidden story from", file: "hide_story_from.json" },
        { key: "favorited", label: "Favorited profiles", file: "profiles_you've_favorited.json" },
    ]

    const categories: CategoryStat[] = [
        summarize("followers", "Followers", followerEntries),
        summarize("following", "Following", followingEntries),
    ]

    for (const { key, label, file } of labelValueFiles) {
        const data = await readJson(path.join(dir, file))
        categories.push(summarize(key, label, parseLabelValuesFile(data)))
    }

    const followerSet = new Set(followerEntries.map(e => e.username.toLowerCase()))
    const followingSet = new Set(followingEntries.map(e => e.username.toLowerCase()))

    let mutualCount = 0
    let notFollowingBackCount = 0
    for (const u of followingSet) {
        if (followerSet.has(u)) mutualCount++
        else notFollowingBackCount++
    }
    let fansNotFollowedBackCount = 0
    for (const u of followerSet) {
        if (!followingSet.has(u)) fansNotFollowedBackCount++
    }

    return {
        archive,
        generatedAt: Date.now(),
        categories,
        followersCount: followerEntries.length,
        followingCount: followingEntries.length,
        mutualCount,
        notFollowingBackCount,
        fansNotFollowedBackCount,
    }
}
