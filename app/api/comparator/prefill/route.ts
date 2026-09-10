import { NextRequest, NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import path from "path"
import { ARCHIVE_DIR_REGEX, findLatestExtractedArchive, getArchivesRoot } from "@/lib/archives"

export async function GET(request: NextRequest) {
    const requested = request.nextUrl.searchParams.get("archive")

    let archive: string | null
    if (requested) {
        if (path.basename(requested) !== requested || !ARCHIVE_DIR_REGEX.test(requested)) {
            return NextResponse.json({ error: "Invalid archive name" }, { status: 400 })
        }
        archive = requested
    } else {
        archive = await findLatestExtractedArchive()
    }

    if (!archive) {
        return NextResponse.json({ archive: null, followersRaw: null, followingRaw: null })
    }

    const dir = path.join(getArchivesRoot(), archive, "connections", "followers_and_following")

    let followerFiles: string[] = []
    try {
        followerFiles = (await readdir(dir)).filter(f => /^followers_\d+\.json$/i.test(f)).sort()
    } catch {
        return NextResponse.json({ archive, followersRaw: null, followingRaw: null })
    }

    const mergedFollowers: unknown[] = []
    for (const file of followerFiles) {
        try {
            const raw = await readFile(path.join(dir, file), "utf-8")
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) mergedFollowers.push(...parsed)
        } catch {
            // skip unreadable/malformed file
        }
    }

    let followingRaw: string | null = null
    try {
        followingRaw = await readFile(path.join(dir, "following.json"), "utf-8")
    } catch {
        // no following.json in this archive
    }

    return NextResponse.json({
        archive,
        followersRaw: mergedFollowers.length ? JSON.stringify(mergedFollowers) : null,
        followingRaw,
    })
}
