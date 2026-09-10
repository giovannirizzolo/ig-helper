import { readFile, writeFile } from "fs/promises"

export async function readUsernameList(filePath: string): Promise<string[]> {
    try {
        const raw = await readFile(filePath, "utf-8")
        return raw.split("\n").map(l => l.trim()).filter(Boolean)
    } catch {
        return []
    }
}

export async function writeUsernameList(filePath: string, usernames: string[]): Promise<string[]> {
    const unique = Array.from(new Set(usernames.map(u => u.trim()).filter(Boolean)))
    await writeFile(filePath, unique.join("\n") + (unique.length ? "\n" : ""), "utf-8")
    return unique
}
