import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { ARCHIVE_DIR_REGEX, findLatestExtractedArchive } from "@/lib/archives"
import { computeFollowStats } from "@/lib/stats"

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
        return NextResponse.json({ error: "No extracted archives found" }, { status: 404 })
    }

    const stats = await computeFollowStats(archive)
    if (!stats) {
        return NextResponse.json({ error: `No followers_and_following data found in ${archive}` }, { status: 404 })
    }

    return NextResponse.json(stats)
}
