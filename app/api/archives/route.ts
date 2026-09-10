import { NextRequest, NextResponse } from "next/server"
import { readdir, stat, access, rm } from "fs/promises"
import path from "path"
import { ARCHIVE_REGEX, getArchivesRoot, getDownloadsDir, getExtractDir, parseArchiveName, type ArchiveInfo } from "@/lib/archives"
import { archiveHasFollowData } from "@/lib/stats"

const WHITELIST_PATH = path.join(process.cwd(), "whitelist.txt")

export async function GET() {
    const downloadsDir = getDownloadsDir()

    let entries: string[]
    try {
        entries = await readdir(downloadsDir)
    } catch {
        return NextResponse.json({ downloadsDir, archives: [] as ArchiveInfo[] })
    }

    const matches = entries.filter(name => ARCHIVE_REGEX.test(name))

    const archives: ArchiveInfo[] = await Promise.all(
        matches.map(async name => {
            const parsed = parseArchiveName(name)!
            const { size } = await stat(path.join(downloadsDir, name))
            const extracted = await access(getExtractDir(name)).then(() => true).catch(() => false)
            const hasData = extracted ? await archiveHasFollowData(name.replace(/\.zip$/i, "")) : false
            return { name, ...parsed, size, extracted, hasData }
        })
    )

    archives.sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ downloadsDir, archives })
}

export async function DELETE(request: NextRequest) {
    const body = await request.json().catch(() => null)
    const name = body?.name

    if (typeof name !== "string" || path.basename(name) !== name || !ARCHIVE_REGEX.test(name)) {
        return NextResponse.json({ error: "Invalid archive name" }, { status: 400 })
    }

    const zipPath = path.join(getDownloadsDir(), name)
    const extractDir = getExtractDir(name)

    // Defense in depth: these deletions must only ever touch the resolved zip
    // path inside Downloads and the extracted folder inside downloaded_data —
    // never the whitelist file, regardless of what `name` contains.
    if (
        zipPath === WHITELIST_PATH ||
        extractDir === WHITELIST_PATH ||
        path.dirname(zipPath) !== getDownloadsDir() ||
        path.dirname(extractDir) !== getArchivesRoot()
    ) {
        return NextResponse.json({ error: "Refusing to delete outside the expected directories" }, { status: 400 })
    }

    let deletedZip = false
    let deletedExtracted = false

    try {
        await access(zipPath)
        await rm(zipPath)
        deletedZip = true
    } catch {
        // no zip file to delete
    }

    try {
        await access(extractDir)
        await rm(extractDir, { recursive: true })
        deletedExtracted = true
    } catch {
        // no extracted folder to delete
    }

    if (!deletedZip && !deletedExtracted) {
        return NextResponse.json({ error: "Archive not found" }, { status: 404 })
    }

    return NextResponse.json({ deletedZip, deletedExtracted })
}
