"use client"
import { ShieldCheck } from "lucide-react";
import UsernameListPage from "@/components/username-list-page";

export default function WhitelistPage() {
    return (
        <UsernameListPage
            apiPath="/api/whitelist"
            title="Whitelist"
            icon={ShieldCheck}
            infoText="Accounts here don't follow you back, but you don't want to unfollow them anyway — they're always excluded from the comparator's unfollow list."
            searchPlaceholder="Search whitelisted users..."
            addPlaceholder="Add username..."
            emptyText="No whitelisted accounts yet."
            footerText="Whitelisted accounts are always protected from being flagged in the comparator, and this list persists across sessions."
            saveErrorText="Failed to save whitelist"
        />
    );
}
