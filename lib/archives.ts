import os from "os";
import path from "path";
import { readdir } from "fs/promises";

// Instagram export filenames look like: instagram-cristiano-2024-01-15-AbC123xy.zip
export const ARCHIVE_REGEX = /^instagram-([a-zA-Z0-9_.]+)-(\d{4}-\d{2}-\d{2})-([A-Za-z0-9]+)\.zip$/i

// Extracted archives live in a directory with the same name minus the .zip extension.
export const ARCHIVE_DIR_REGEX = /^instagram-([a-zA-Z0-9_.]+)-(\d{4}-\d{2}-\d{2})-([A-Za-z0-9]+)$/i

export type ArchiveInfo = {
    name: string
    username: string
    date: string
    code: string
    size: number
    extracted: boolean
    hasData: boolean
}

export function getDownloadsDir(): string {
    return path.join(os.homedir(), "Downloads")
}

export function getArchivesRoot(): string {
    return path.join(process.cwd(), "downloaded_data")
}

export function getExtractDir(archiveName: string): string {
    const base = archiveName.replace(/\.zip$/i, "")
    return path.join(getArchivesRoot(), base)
}

export function parseArchiveName(name: string): { username: string; date: string; code: string } | null {
    const match = ARCHIVE_REGEX.exec(name)
    if (!match) return null
    const [, username, date, code] = match
    return { username, date, code }
}

export async function findLatestExtractedArchive(): Promise<string | null> {
    let dirs: string[]
    try {
        dirs = await readdir(getArchivesRoot())
    } catch {
        return null
    }
    const matches = dirs.filter(d => ARCHIVE_DIR_REGEX.test(d))
    if (!matches.length) return null
    matches.sort((a, b) => {
        const dateA = ARCHIVE_DIR_REGEX.exec(a)![2]
        const dateB = ARCHIVE_DIR_REGEX.exec(b)![2]
        return dateB.localeCompare(dateA)
    })
    return matches[0]
}
