import { NextRequest, NextResponse } from "next/server"
import { access } from "fs/promises"
import path from "path"
import AdmZip from "adm-zip"
import { ARCHIVE_REGEX, getDownloadsDir, getExtractDir } from "@/lib/archives"

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null)
    const name = body?.name

    if (typeof name !== "string" || path.basename(name) !== name || !ARCHIVE_REGEX.test(name)) {
        return NextResponse.json({ error: "Invalid archive name" }, { status: 400 })
    }

    const zipPath = path.join(getDownloadsDir(), name)
    try {
        await access(zipPath)
    } catch {
        return NextResponse.json({ error: "Archive not found in Downloads" }, { status: 404 })
    }

    const targetDir = getExtractDir(name)
    try {
        const zip = new AdmZip(zipPath)
        zip.extractAllTo(targetDir, true)
    } catch (err) {
        console.error("Failed to extract archive", err)
        return NextResponse.json({ error: "Failed to extract archive" }, { status: 500 })
    }

    return NextResponse.json({ extractedTo: targetDir })
}
