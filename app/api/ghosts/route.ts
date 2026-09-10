import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readUsernameList, writeUsernameList } from '@/lib/username-list'

const GHOSTS_PATH = path.join(process.cwd(), 'ghosts.txt')

export async function GET() {
    return NextResponse.json(await readUsernameList(GHOSTS_PATH))
}

export async function PUT(request: NextRequest) {
    const body = await request.json().catch(() => null)
    if (!Array.isArray(body) || !body.every(u => typeof u === 'string')) {
        return NextResponse.json({ error: 'Expected a JSON array of usernames' }, { status: 400 })
    }

    return NextResponse.json(await writeUsernameList(GHOSTS_PATH, body))
}
