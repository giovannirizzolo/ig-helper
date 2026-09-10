"use client"
import { Ghost } from "lucide-react";
import UsernameListPage from "@/components/username-list-page";

export default function GhostsPage() {
    return (
        <UsernameListPage
            apiPath="/api/ghosts"
            title="Ghost Accounts"
            icon={Ghost}
            infoText="Accounts here are ghosts or long-disabled/deleted profiles that will never follow you back — they're always excluded from the comparator's not-following-back list."
            searchPlaceholder="Search ghost accounts..."
            addPlaceholder="Add username..."
            emptyText="No ghost accounts yet."
            footerText="Ghost accounts are always filtered out of the comparator's not-following-back results, and this list persists across sessions."
            saveErrorText="Failed to save ghost accounts"
        />
    );
}
