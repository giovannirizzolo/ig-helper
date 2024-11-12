interface StringListItem {
    href: string;
    value: string;
    timestamp: number;
}

interface DataEntry {
    title: string;
    media_list_data: unknown[];      // Array of media items
    string_list_data: StringListItem[]; // Array of string list items
}

// Define the array of DataEntry items
export type FollowersDataArray = DataEntry[];
export type FollowingDataArray = { relationships_following: DataEntry[] }