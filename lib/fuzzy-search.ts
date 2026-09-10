function levenshtein(a: string, b: string): number {
    const rows = a.length + 1
    const cols = b.length + 1
    const dp: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)])
    for (let j = 0; j < cols; j++) dp[0][j] = j

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // deletion
                dp[i][j - 1] + 1,      // insertion
                dp[i - 1][j - 1] + cost // substitution
            )
        }
    }
    return dp[rows - 1][cols - 1]
}

function isSubsequence(text: string, query: string): boolean {
    let ti = 0
    let qi = 0
    while (ti < text.length && qi < query.length) {
        if (text[ti] === query[qi]) qi++
        ti++
    }
    return qi === query.length
}

/**
 * Scores how well `query` matches `text`. Lower is better; -1 means no match.
 * Tolerates typos (substitutions/transpositions) via a sliding-window edit
 * distance, in addition to plain substring and skipped-letter subsequence matches.
 */
export function fuzzyScore(text: string, query: string): number {
    const t = text.toLowerCase().trim()
    const q = query.toLowerCase().trim()
    if (!q) return 0

    const idx = t.indexOf(q)
    if (idx !== -1) return idx // exact substring — best, earlier position ranks higher

    let bestDist = Infinity
    const qLen = q.length
    for (let len = Math.max(1, qLen - 1); len <= qLen + 1; len++) {
        for (let start = 0; start + len <= t.length; start++) {
            const dist = levenshtein(t.substring(start, start + len), q)
            if (dist < bestDist) bestDist = dist
        }
    }
    const threshold = Math.max(1, Math.ceil(qLen * 0.34))
    if (bestDist <= threshold) return 1000 + bestDist

    if (isSubsequence(t, q)) return 2000

    return -1
}

export function fuzzyFilter<T>(items: T[], query: string, getText: (item: T) => string): T[] {
    if (!query.trim()) return items
    return items
        .map(item => ({ item, score: fuzzyScore(getText(item), query) }))
        .filter(({ score }) => score !== -1)
        .sort((a, b) => a.score - b.score)
        .map(({ item }) => item)
}

/**
 * Adapter for cmdk's `filter` prop, which expects higher-is-better and 0 to exclude.
 * Backed by the same typo-tolerant fuzzyScore used everywhere else in the app.
 */
export function cmdkFuzzyFilter(value: string, search: string): number {
    const score = fuzzyScore(value, search)
    return score === -1 ? 0 : 100000 - score
}
