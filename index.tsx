/*
 * Larp - Equicord/Vencord userplugin
 * Client-side only: changes what YOU see, not what others see.
 *  1) Override your own @username locally (display name is untouched)
 *  2) Add/remove badges from a curated catalog of real Discord badges on your own profile, visible only to you
 *  3) Hide/show official Discord badges you actually own, enforced by masking your own account
 *     flags/premium type wherever the client reads them - not just a display toggle
 *  4) Drop a decoy entry into your own account switcher popout, visible only to you
 */

import { addProfileBadge, removeProfileBadge, type ProfileBadge, BadgePosition } from "@api/Badges";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage, unregisterCommand } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { ModalCloseButton, ModalContent, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, RestAPI, Text, UserStore } from "@webpack/common";

// Not a real Vencord contributor entry - just local credit so the plugin
// doesn't falsely attribute itself to someone who didn't write it. Swap the
// name/id for your own if you want it to show your actual Discord user ID
// in the plugin list tooltip; id can stay 0n, it's only used for that
// tooltip link and doesn't need to resolve to anything.
const Larp_AUTHOR = { name: "Larp", id: 0n };

// ---------------------------------------------------------------------------
// Badge catalog
// ---------------------------------------------------------------------------
// Every image below is the OFFICIAL badge-icons asset - the exact same
// cdn.discordapp.com/badge-icons/<hash>.png URLs that real profiles' badge
// objects reference, sourced from the known-badges list that
// docs.discord.food (the datamined API docs) links as authoritative
// (gist XYZenix/c45156b7c883b5301c9028e39d71b479). This replaced two earlier
// generations of art that both looked subtly wrong next to real badges:
// the mezotv repo's hand-traced recreations, and discord.com/assets bundle
// art (marketing/shop renders, not the profile badge icons - that's why
// e.g. the Orb still looked fake). Only the 2024 lootbox clown badge has no
// documented badge-icons hash, so it alone keeps a bundle asset. If any of
// these ever 404, run `/larp real` on a user who owns the badge to get the
// current exact URL.
//
// Listed in the order badges actually appear on real Discord profiles,
// rebuilt from real /larp real profile dumps (see the note above
// BADGE_CATALOG): Staff -> Nitro/tenure -> flag badges -> Boost tenure ->
// Legacy Username -> Quest -> event badges -> gifting badges last.
// This order also doubles as the priority list used when registering badges.

interface StoredBadge {
    id: string;
    description: string;
    image: string;
    // Badges that share a tierGroup are mutually exclusive - only the highest
    // tierRank you've added will actually be shown, the rest are auto-suppressed.
    tierGroup?: string;
    tierRank?: number;
    // Some assets in the mezotv/discord-badges repo bake in more internal
    // padding than others (the subscription-tier PNGs are the worst offenders),
    // so the same CSS scale ends up rendering them at visibly different sizes.
    // This is a per-badge correction factor multiplied on top of the shared,
    // fixed-size badge box to compensate. 1 = no correction. These are
    // best-effort estimates - nudge them if a particular tier still looks off.
    sizeAdjust?: number;
    // Confirmed real badges (checked via actual markup) render as a plain
    // <a href> to a Discord settings page, not a click handler. Set this on
    // any catalog entry once you've confirmed the real one links somewhere -
    // don't guess it in without checking, same reasoning as everywhere else
    // in this file.
    settingsLink?: string;
}

const BADGE_ICONS = "https://cdn.discordapp.com/badge-icons";

// Declared in REAL display priority, rebuilt from the /larp real dumps of six
// real profiles you attached, merged with your written list:
// Staff -> Nitro (+ tenure tiers) -> Moderator Programs Alumni -> HypeSquad
// Events -> HypeSquad houses -> Bug Hunter (both tiers share one slot) ->
// Early Supporter -> Partner -> Early Verified Bot Developer -> Active
// Developer -> Boost tiers -> Legacy Username -> Quest -> Last Meadow
// (april_fools_2026) -> Orb -> gifting badges dead last.
//
// ONE deliberate deviation from your written list: you placed the HypeSquad
// HOUSE badges after Verified Bot Dev, but your own dumps disagree - on
// three of the six profiles the house badge renders immediately after
// HypeSquad Events and BEFORE Bug Hunter (Purpzie: hypesquad -> house_3 ->
// bug_hunter_level_2 -> early_supporter; the Staff profile: hypesquad ->
// house_2). Live data wins over memory.
//
// A badge's index in this array IS its display priority.
const BADGE_CATALOG: StoredBadge[] = [
    { id: "discord-staff", description: "Discord Staff", image: `${BADGE_ICONS}/5e74e9b61934fc1f67c65515d1f7e60d.png` },

    // -- Nitro: base badge + tenure tiers, right after Staff per the dumps
    // (every profile's premium_tenure badge rendered first unless Staff was
    // present, in which case it came second) --
    { id: "discord-nitro", description: "Discord Nitro", image: `${BADGE_ICONS}/2ba85e8026a8614b640c2837bcdfe21b.png` },

    // Nitro subscription tenure tiers - mutually exclusive, highest wins.
    // These are the current premium_tenure_*_v2 badge-icons hashes.
    { id: "nitro-bronze", description: "Discord Nitro Bronze (1 Month)", image: `${BADGE_ICONS}/4f33c4a9c64ce221936bd256c356f91f.png`, tierGroup: "nitro-sub", tierRank: 1 },
    { id: "nitro-silver", description: "Discord Nitro Silver (3 Months)", image: `${BADGE_ICONS}/4514fab914bdbfb4ad2fa23df76121a6.png`, tierGroup: "nitro-sub", tierRank: 2 },
    { id: "nitro-gold", description: "Discord Nitro Gold (6 Months)", image: `${BADGE_ICONS}/2895086c18d5531d499862e41d1155a6.png`, tierGroup: "nitro-sub", tierRank: 3 },
    { id: "nitro-platinum", description: "Discord Nitro Platinum (12 Months)", image: `${BADGE_ICONS}/0334688279c8359120922938dcb1d6f8.png`, tierGroup: "nitro-sub", tierRank: 4 },
    { id: "nitro-diamond", description: "Discord Nitro Diamond (24 Months)", image: `${BADGE_ICONS}/0d61871f72bb9a33a7ae568c1fb4f20a.png`, tierGroup: "nitro-sub", tierRank: 5 },
    { id: "nitro-emerald", description: "Discord Nitro Emerald (36 Months)", image: `${BADGE_ICONS}/11e2d339068b55d3a506cff34d3780f3.png`, tierGroup: "nitro-sub", tierRank: 6 },
    { id: "nitro-ruby", description: "Discord Nitro Ruby (60 Months)", image: `${BADGE_ICONS}/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png`, tierGroup: "nitro-sub", tierRank: 7 },
    { id: "nitro-opal", description: "Discord Nitro Opal (72+ Months)", image: `${BADGE_ICONS}/5b154df19c53dce2af92c9b61e6be5e2.png`, tierGroup: "nitro-sub", tierRank: 8 },

    // -- Classic flag badges --
    { id: "moderator-programs-alumni", description: "Moderator Programs Alumni", image: `${BADGE_ICONS}/fee1624003e2fee35cb398e125dc479b.png` },
    { id: "hypesquad-events", description: "HypeSquad Events", image: `${BADGE_ICONS}/bf01d1073931f921909045f3a39fd264.png` },

    { id: "hypesquad-bravery", description: "HypeSquad Bravery", image: `${BADGE_ICONS}/8a88d63823d8a71cd5e390baa45efa02.png` },
    { id: "hypesquad-brilliance", description: "HypeSquad Brilliance", image: `${BADGE_ICONS}/011940fd013da3f7fb926e4a1cd2e618.png` },
    { id: "hypesquad-balance", description: "HypeSquad Balance", image: `${BADGE_ICONS}/3aa41de486fa12454c3761e8e223442e.png` },

    // "at the same place" - both share one slot via the tierGroup; only the
    // highest tier you add actually shows.
    { id: "bug-hunter-tier-1", description: "Discord Bug Hunter (Tier 1)", image: `${BADGE_ICONS}/2717692c7dca7289b35297368a940dd0.png`, tierGroup: "bug-hunter", tierRank: 1 },
    { id: "bug-hunter-tier-2", description: "Discord Bug Hunter (Tier 2)", image: `${BADGE_ICONS}/848f79194d4be5ff5f81505cbd0ce1e6.png`, tierGroup: "bug-hunter", tierRank: 2 },

    { id: "early-supporter", description: "Early Supporter", image: `${BADGE_ICONS}/7060786766c9c840eb3019e725d2b358.png`, settingsLink: "https://discord.com/settings/premium" },
    { id: "partnered-server-owner", description: "Partnered Server Owner", image: `${BADGE_ICONS}/3f9748e53446a137a052f3454e2de41e.png` },
    { id: "early-verified-bot-developer", description: "Early Verified Bot Developer", image: `${BADGE_ICONS}/6df5892e0f35b051f8b61eace34f4967.png` },
    // Not in your list or the dumps - parked next to Verified Bot Dev.
    { id: "active-developer", description: "Active Developer", image: `${BADGE_ICONS}/6bdc42827a38498929a4920da12695d9.png` },

    // Server boosting tenure tiers - mutually exclusive, highest wins.
    // guild_booster_lvl1-9 badge-icons hashes; the lvl4 hash confirms the old
    // "best guess" 6-month bracket was right.
    { id: "boost-1m", description: "Server Boosting (1 Month)", image: `${BADGE_ICONS}/51040c70d4f20a921ad6674ff86fc95c.png`, tierGroup: "server-boost", tierRank: 1 },
    { id: "boost-2m", description: "Server Boosting (2 Months)", image: `${BADGE_ICONS}/0e4080d1d333bc7ad29ef6528b6f2fb7.png`, tierGroup: "server-boost", tierRank: 2 },
    { id: "boost-3m", description: "Server Boosting (3 Months)", image: `${BADGE_ICONS}/72bed924410c304dbe3d00a6e593ff59.png`, tierGroup: "server-boost", tierRank: 3 },
    { id: "boost-6m", description: "Server Boosting (6 Months)", image: `${BADGE_ICONS}/df199d2050d3ed4ebf84d64ae83989f8.png`, tierGroup: "server-boost", tierRank: 4 },
    { id: "boost-9m", description: "Server Boosting (9 Months)", image: `${BADGE_ICONS}/996b3e870e8a22ce519b3a50e6bdd52f.png`, tierGroup: "server-boost", tierRank: 5 },
    { id: "boost-12m", description: "Server Boosting (1 Year)", image: `${BADGE_ICONS}/991c9f39ee33d7537d9f408c3e53141e.png`, tierGroup: "server-boost", tierRank: 6 },
    { id: "boost-15m", description: "Server Boosting (1 Year 3 Months)", image: `${BADGE_ICONS}/cb3ae83c15e970e8f3d410bc62cb8b99.png`, tierGroup: "server-boost", tierRank: 7 },
    { id: "boost-18m", description: "Server Boosting (1 Year 6 Months)", image: `${BADGE_ICONS}/7142225d31238f6387d9f09efaa02759.png`, tierGroup: "server-boost", tierRank: 8 },
    { id: "boost-24m", description: "Server Boosting (2 Years)", image: `${BADGE_ICONS}/ec92202290b48d0879b7413d2dde3bab.png`, tierGroup: "server-boost", tierRank: 9 },

    { id: "legacy-username", description: "Originally known as", image: `${BADGE_ICONS}/6de6d34650760ba5551a79732e98ed60.png` },

    // -- Event / collectible badges (tail end, per every dump) --
    { id: "completed-a-quest", description: "Completed a Quest", image: `${BADGE_ICONS}/7d9ae358c8c5e118768335dbe68b4fb8.png`, settingsLink: "https://discord.com/discovery/quests" },
    // "last-meadow-online" id kept for saved-settings compat; the real badge
    // is april_fools_2026 and its real tooltip is per-user ("Level 0/10/100
    // Reached" in your dumps).
    { id: "last-meadow-online", description: "Level 100 Reached", image: `${BADGE_ICONS}/ca105ad9cfc8580c765101d17bbb2323.png` },
    { id: "orbs-apprentice", description: "Collected the Orb Profile Badge", image: `${BADGE_ICONS}/83d8a1eb09a8d64e59233eec5d4d5c2d.png` },
    // 2024 lootbox clown - no dump shows it, and it's the one badge with no
    // documented badge-icons hash; parked before the gifting badges.
    { id: "discord-lootbox-clown", description: "A clown, for a limited time", image: "https://discord.com/assets/971cfe4aa5c0582000ea.svg" },

    // -- Gifting badges: always the LAST badge on every real profile. All
    // six tiers share the real id "gifting", so they're one tierGroup here -
    // only the highest tier you add shows. The Icon hash matches the
    // "Gifting Icon" entry in your dump. --
    { id: "gifting-patron", description: "Gifting Patron", image: `${BADGE_ICONS}/ac305d1b9481f312ce4419e7f8296558.png`, tierGroup: "gifting", tierRank: 1 },
    { id: "gifting-champion", description: "Gifting Champion", image: `${BADGE_ICONS}/8b7792c4f65953d3ff564f23429cb79e.png`, tierGroup: "gifting", tierRank: 2 },
    { id: "gifting-luminary", description: "Gifting Luminary", image: `${BADGE_ICONS}/3119f5504b2cd09576a323908c7c3517.png`, tierGroup: "gifting", tierRank: 3 },
    { id: "gifting-icon", description: "Gifting Icon", image: `${BADGE_ICONS}/64f2413c9b9803661322aaad25826b62.png`, tierGroup: "gifting", tierRank: 4 },
    { id: "gifting-hero", description: "Gifting Hero", image: `${BADGE_ICONS}/77d65b1f210014a11eb1582ee06ab684.png`, tierGroup: "gifting", tierRank: 5 },
    { id: "gifting-legend", description: "Gifting Legend", image: `${BADGE_ICONS}/7fe346cfc5da1340087d8759a9e7a395.png`, tierGroup: "gifting", tierRank: 6 },
];

// ONE source of truth for order: BADGE_CATALOG is declared in the real
// left-to-right profile order (Staff first, gifting last), and a badge's
// index in that array IS its display priority. The old reversed
// CATALOG_PRIORITY map is gone - it was compensating (in the wrong place)
// for how the Badges API inserts START badges, which made the whole ordering
// story impossible to reason about. That compensation now lives in
// refreshRegisteredBadges, the one spot that actually needs it.
const CATALOG_INDEX = new Map(BADGE_CATALOG.map((b, i) => [b.id, i]));

// Publicly documented Discord user flag bits (discord-api-types UserFlags).
// These let us check which catalog badges you *actually* own via your own
// account's public flags, rather than trusting an arbitrary badge-id string.
const DISCORD_USER_FLAGS: Record<string, number> = {
    "discord-staff": 1 << 0,
    "partnered-server-owner": 1 << 1,
    "hypesquad-events": 1 << 2,
    "bug-hunter-tier-1": 1 << 3,
    "hypesquad-bravery": 1 << 6,
    "hypesquad-brilliance": 1 << 7,
    "hypesquad-balance": 1 << 8,
    "early-supporter": 1 << 9,
    "bug-hunter-tier-2": 1 << 14,
    "early-verified-bot-developer": 1 << 17,
    "moderator-programs-alumni": 1 << 18,
    "active-developer": 1 << 22,
};

// null = ownership isn't determinable this way. Discord doesn't expose Nitro
// tenure length, Boost tenure length, quests, orbs, or lootbox/legacy-username
// badges through any field a client-side plugin can read - there is no
// reliable check for those, so they're always left unverifiable rather than
// guessed at.
let ownedFlagsCache: { bits: number; premiumType: number; fetchedAt: number } | null = null;

async function fetchOwnedFlags(): Promise<{ bits: number; premiumType: number }> {
    // Cache briefly - this gets called every time /larp official runs,
    // no need to hit the API on every invocation.
    if (ownedFlagsCache && Date.now() - ownedFlagsCache.fetchedAt < 60_000) {
        return ownedFlagsCache;
    }
    try {
        const res = await RestAPI.get({ url: "/users/@me" });
        const bits: number = res?.body?.public_flags ?? res?.body?.flags ?? 0;
        const premiumType: number = res?.body?.premium_type ?? 0;
        ownedFlagsCache = { bits, premiumType, fetchedAt: Date.now() };
        return ownedFlagsCache;
    } catch (e) {
        console.error("[Larp] Failed to fetch own account flags", e);
        // Fall back to whatever the local store has rather than failing outright.
        const me = UserStore.getCurrentUser?.() as any;
        return { bits: me?.publicFlags ?? me?.flags ?? 0, premiumType: me?.premiumType ?? 0 };
    }
}

async function ownsOfficialBadge(id: string): Promise<boolean | null> {
    if (id === "discord-nitro") {
        const { premiumType } = await fetchOwnedFlags();
        return premiumType > 0;
    }
    const flag = DISCORD_USER_FLAGS[id];
    if (flag === undefined) return null;
    const { bits } = await fetchOwnedFlags();
    return (bits & flag) !== 0;
}

function preloadCatalogImages() {
    for (const b of BADGE_CATALOG) {
        const img = new Image();
        img.src = b.image;
    }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadBadges(): StoredBadge[] {
    try {
        return JSON.parse(settings.store.customBadgesJson || "[]");
    } catch {
        return [];
    }
}

function saveBadges(badges: StoredBadge[]) {
    settings.store.customBadgesJson = JSON.stringify(badges);
}

function loadHiddenOfficialBadges(): string[] {
    try {
        return JSON.parse(settings.store.hiddenOfficialBadgesJson || "[]");
    } catch {
        return [];
    }
}

function saveHiddenOfficialBadges(badgeIds: string[]) {
    settings.store.hiddenOfficialBadgesJson = JSON.stringify(badgeIds);
}

// Keep only the highest tierRank within each tierGroup; badges with no
// tierGroup always pass through.
function computeEffectiveBadges(all: StoredBadge[]): StoredBadge[] {
    const bestInGroup = new Map<string, StoredBadge>();
    const untiered: StoredBadge[] = [];

    for (const b of all) {
        if (!b.tierGroup) {
            untiered.push(b);
            continue;
        }
        const current = bestInGroup.get(b.tierGroup);
        if (!current || (b.tierRank ?? 0) > (current.tierRank ?? 0)) {
            bestInGroup.set(b.tierGroup, b);
        }
    }

    return [...untiered, ...bestInGroup.values()]
        .sort((a, c) => (CATALOG_INDEX.get(a.id) ?? 999) - (CATALOG_INDEX.get(c.id) ?? 999));
}

// ---------------------------------------------------------------------------
// "Real" tooltip text for tenure badges
// ---------------------------------------------------------------------------
// Confirmed against a real /users/@me/profile response (see the comment on
// stripHiddenBadgesFromProfilePayload further down): Discord's actual Nitro
// tenure badge descriptions read like "Earned on 22/05/2026. 1 month:
// Bronze" - not the static catalog text ("Discord Nitro Bronze (1 Month)")
// this plugin was showing in the tooltip. This reconstructs that real
// format on the fly instead.
//
// Boosting's real tooltip format is NOT confirmed the same way - I don't
// have an actual sample of a boost-tenure badge description, only the
// nitro one. What's below for boosting is built to match that same shape
// as a best guess, not a verified match. If it reads wrong next to a real
// boost badge, that's why - tell me what the real one says and I'll fix it
// exactly instead of guessing again.

const NITRO_TENURE_MONTHS: Record<string, number> = {
    "nitro-bronze": 1, "nitro-silver": 3, "nitro-gold": 6, "nitro-platinum": 12,
    "nitro-diamond": 24, "nitro-emerald": 36, "nitro-ruby": 60, "nitro-opal": 72
};
const BOOST_TENURE_MONTHS: Record<string, number> = {
    "boost-1m": 1, "boost-2m": 2, "boost-3m": 3, "boost-6m": 6, "boost-9m": 9,
    "boost-12m": 12, "boost-15m": 15, "boost-18m": 18, "boost-24m": 24
};

// "Discord Nitro Opal (72+ Months)" -> "Opal"
function tierDisplayName(description: string): string {
    const nitroMatch = description.match(/^Discord Nitro (\w+)/);
    if (nitroMatch) return nitroMatch[1];
    return description;
}

// Confirmed via real markup: DD/MM/YY, two-digit year (aria-label
// "Subscriber since 25/02/19" on a real Nitro tenure badge).
function formatEarnedDateShort(monthsAgo: number): string {
    const custom = settings.store.fakeBadgeEarnedDate?.trim();
    if (custom) return custom;
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

// Confirmed via a DIFFERENT real markup sample: "D Mon YYYY", four-digit
// year, no leading zero on the day (aria-label "Server Boosting since
// 27 Nov 2025" on a real Boost tenure badge). Genuinely a different format
// from Nitro's, not a mistake to reconcile - Discord just formats these two
// badge families differently.
function formatEarnedDateLong(monthsAgo: number): string {
    const custom = settings.store.fakeBadgeEarnedDate?.trim();
    if (custom) return custom;
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

// Confirmed against real markup: the visible tooltip is just
// "Subscriber since <date>" / "Server Boosting since <date>" - plain
// <a aria-label="..."> wrapping the badge img, not the "Earned on X.
// N months: Tier" text this used to generate. That longer format is what
// shows up in the description field of a badge object from the REST API
// response (used elsewhere in this file for matching/filtering), which
// turned out to be a different thing from what's actually rendered on
// hover - worth remembering if something else here ever looks subtly off
// the same way.
function realDescriptionFor(b: StoredBadge): string {
    if (b.tierGroup === "nitro-sub") {
        const months = NITRO_TENURE_MONTHS[b.id] ?? 1;
        return `Subscriber since ${formatEarnedDateShort(months)}`;
    }
    if (b.tierGroup === "server-boost") {
        const months = BOOST_TENURE_MONTHS[b.id] ?? 1;
        return `Server Boosting since ${formatEarnedDateLong(months)}`;
    }
    return b.description;
}

// ---------------------------------------------------------------------------
// Badge evolution ladder modal
// ---------------------------------------------------------------------------
// You sent a screenshot of the real modal Discord shows for this (Settings
// > Nitro > "See All Badges") - "Celebrate Your Nitro Milestones in Style",
// a grid of all 8 tiers with month/year labels, and only the current tier
// boxed with a "Subscriber since <date>" caption underneath it. This
// rebuilds that layout directly instead of the generic ladder from before.
//
// It's still this plugin's own modal, not a redirect into Discord's actual
// page - see the onClick comment below for why, and what it tries first.
const TIER_MONTH_LABELS: Record<string, string> = {
    "nitro-bronze": "1 Month", "nitro-silver": "3 Months", "nitro-gold": "6 Months",
    "nitro-platinum": "1 Year", "nitro-diamond": "2 Years", "nitro-emerald": "3 Years",
    "nitro-ruby": "5 Years", "nitro-opal": "6+ Years",
    "boost-1m": "1 Month", "boost-2m": "2 Months", "boost-3m": "3 Months",
    "boost-6m": "6 Months", "boost-9m": "9 Months", "boost-12m": "1 Year",
    "boost-15m": "15 Months", "boost-18m": "18 Months", "boost-24m": "2 Years"
};

// Confirmed via your screenshot: the real modal's grid order is Bronze,
// Silver, Gold, Platinum, Diamond, Ruby, Emerald, Opal - note Ruby (5yr)
// displays BEFORE Emerald (3yr) despite being the longer tenure. That's a
// real Discord UI quirk, not a mistake to "correct" - so this is a separate
// display-order list from tierRank, which still needs to reflect actual
// chronological tenure so the "unlocked up to your tier" dimming logic
// stays correct regardless of how the grid is arranged visually.
const NITRO_DISPLAY_ORDER = [
    "nitro-bronze", "nitro-silver", "nitro-gold", "nitro-platinum",
    "nitro-diamond", "nitro-ruby", "nitro-emerald", "nitro-opal"
];

function openTierLadderModal(clicked: StoredBadge) {
    const group = clicked.tierGroup;
    if (!group) return;

    const displayOrder = group === "nitro-sub" ? NITRO_DISPLAY_ORDER : null;
    const tiers = BADGE_CATALOG
        .filter(x => x.tierGroup === group)
        .sort((a, c) => displayOrder
            ? displayOrder.indexOf(a.id) - displayOrder.indexOf(c.id)
            : (a.tierRank ?? 0) - (c.tierRank ?? 0));
    const currentRank = clicked.tierRank ?? 0;
    const months = group === "nitro-sub" ? (NITRO_TENURE_MONTHS[clicked.id] ?? 1) : (BOOST_TENURE_MONTHS[clicked.id] ?? 1);
    const earnedDate = group === "nitro-sub" ? formatEarnedDateShort(months) : formatEarnedDateLong(months);
    const subtitle = group === "nitro-sub"
        ? "Your badge will automatically evolve over time."
        : "Your boosting badge will automatically evolve over time.";

    openModal(modalProps => (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalCloseButton onClick={modalProps.onClose} style={{ position: "absolute", top: 16, right: 16, zIndex: 1 }} />
            <ModalContent>
                <div style={{ textAlign: "center", padding: "32px 24px 8px" }}>
                    <Text variant="heading-xl/bold" style={{ marginBottom: 8 }}>
                        Celebrate Your {group === "nitro-sub" ? "Nitro" : "Boosting"} Milestones in Style
                    </Text>
                    <Text variant="text-md/normal" style={{ opacity: 0.7 }}>{subtitle}</Text>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, padding: "24px", maxWidth: 760, margin: "0 auto" }}>
                    {tiers.map(t => {
                        const unlocked = (t.tierRank ?? 0) <= currentRank;
                        const isClicked = t.id === clicked.id;
                        return (
                            <div
                                key={t.id}
                                style={{
                                    display: "flex", flexDirection: "column", alignItems: "center",
                                    width: 108, padding: "16px 8px", borderRadius: 8,
                                    background: isClicked ? "var(--background-modifier-selected, rgba(255,255,255,0.06))" : "transparent",
                                    border: isClicked ? "1px solid var(--background-modifier-accent, rgba(255,255,255,0.15))" : "1px solid transparent",
                                    opacity: unlocked ? 1 : 0.35
                                }}
                            >
                                <img
                                    src={t.image}
                                    alt={t.description}
                                    style={{
                                        width: 56, height: 56, objectFit: "contain",
                                        transform: `scale(${t.sizeAdjust ?? 1})`,
                                        filter: unlocked ? "none" : "grayscale(1)"
                                    }}
                                />
                                <Text variant="text-md/bold" style={{ marginTop: 12, textAlign: "center" }}>
                                    {tierDisplayName(t.description)}
                                </Text>
                                <Text variant="text-xs/normal" style={{ opacity: 0.6, textAlign: "center" }}>
                                    {TIER_MONTH_LABELS[t.id] ?? ""}
                                </Text>
                                {isClicked && (
                                    <Text variant="text-xs/normal" style={{ opacity: 0.6, textAlign: "center", marginTop: 6 }}>
                                        Subscriber since<br />{earnedDate}
                                    </Text>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div style={{ textAlign: "center", paddingBottom: 32 }}>
                    <Text variant="text-sm/normal" style={{ opacity: 0.5 }}>{realDescriptionFor(clicked)}</Text>
                </div>
            </ModalContent>
        </ModalRoot>
    ));
}

// ---------------------------------------------------------------------------
// Badge registration (own profile only - addProfileBadge only ever renders
// into your own client, so nothing here is ever visible to anyone else)
// ---------------------------------------------------------------------------

// Fixed box every badge renders into, matching Discord's real badge icon
// size in the profile popout. object-fit: contain means differing amounts
// of transparent padding baked into individual source assets no longer
// change the box size - only sizeAdjust nudges the art within it.
const BADGE_BOX_PX = 20;

const registeredBadges = new Map<string, ProfileBadge>();

function registerBadge(b: StoredBadge) {
    const isTiered = b.tierGroup === "nitro-sub" || b.tierGroup === "server-boost";

    const badge: ProfileBadge = {
        id: `larp-${b.id}`,
        description: isTiered ? realDescriptionFor(b) : b.description,
        iconSrc: b.image,
        position: BadgePosition.START,
        shouldShow: userInfo => {
            const me = UserStore.getCurrentUser?.();
            return !!me && userInfo.userId === me.id
                && computeEffectiveBadges(loadBadges()).some(x => x.id === b.id);
        },
        // The markup you sent settles this: real tenure badges are just an
        // <a href="https://discord.com/settings/premium" ...> wrapping the
        // icon - a plain link, not a JS click handler at all. So this uses
        // ProfileBadge's link field instead of onClick/SettingsRouter,
        // which was a guess at an internal API this doesn't need anymore.
        // The "Celebrate Your Nitro Milestones" modal from your earlier
        // screenshot lives one click further inside that settings page
        // (behind "See All Badges"), which real badges don't jump to
        // directly either - so this matches the real behavior exactly
        // rather than trying to skip ahead to it.
        link: b.settingsLink
            ?? (b.tierGroup === "nitro-sub" ? "https://discord.com/settings/premium"
                : b.tierGroup === "server-boost" ? "https://discord.com/settings/guild-boosting"
                : undefined),
        props: {
            style: {
                width: BADGE_BOX_PX,
                height: BADGE_BOX_PX,
                objectFit: "contain",
                // No borderRadius here on purpose - real Discord badges are
                // rendered as-is, not clipped to a circle. Forcing 50% cropped
                // the corners off anything that isn't already circular art
                // (boost crests, the bug hunter shield, HypeSquad triangles,
                // the nitro gem), which is a dead giveaway next to a real one.
                transform: `scale(${b.sizeAdjust ?? 1})`,
                // The mezotv SVGs are hand-traced at a much lower vector
                // resolution than Discord's own badge sprites, so at 20px
                // they can look slightly softer/fuzzier side-by-side with a
                // real one. These three are a no-op on crisp source art but
                // measurably sharpen the softer SVGs without changing their
                // apparent size:
                imageRendering: "auto",
                WebkitBackfaceVisibility: "hidden",
                filter: "saturate(1.03) contrast(1.02)",
                // Prevent the drag-ghost / text-selection outline you get
                // from long-pressing an <img> - real badge icons in the
                // tray aren't draggable or selectable either.
                WebkitUserDrag: "none",
                userSelect: "none",
                pointerEvents: "none"
            },
            draggable: false,
            // Matches the real markup exactly: alt=" " (a single space, not
            // empty or descriptive) with aria-hidden="true" on the img -
            // real Discord puts the actual accessible label on the
            // surrounding <a>, not the image itself.
            alt: " ",
            "aria-hidden": "true"
        }
    };
    registeredBadges.set(b.id, badge);
    addProfileBadge(badge);
}

function unregisterBadge(id: string) {
    const badge = registeredBadges.get(id);
    if (badge) {
        removeProfileBadge(badge);
        registeredBadges.delete(id);
    }
}

// Rebuild the full registered-badge set. This is what actually keeps display
// order consistent and keeps tier-suppressed badges from showing up.
//
// Ordering contract, verified against Equicord's actual src/api/Badges.ts:
// _getBadges() iterates registered badges in registration order and calls
// badges.UNSHIFT(b) for every BadgePosition.START badge - so the rendered
// left-to-right order is the exact REVERSE of registration order. To render
// the catalog's real order (Staff first), register back-to-front. If a
// future Vencord/Equicord build flips this to push(), toggle the
// "flipBadgeOrder" setting instead of editing code.
function refreshRegisteredBadges() {
    for (const id of [...registeredBadges.keys()]) unregisterBadge(id);

    // Already sorted into real display order (Staff first, gifting last)
    // by CATALOG_INDEX.
    const effective = computeEffectiveBadges(loadBadges());
    const registrationOrder = settings.store.flipBadgeOrder ? effective : [...effective].reverse();
    registrationOrder.forEach(registerBadge);

    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
}

// ---------------------------------------------------------------------------
// Drag prevention
// ---------------------------------------------------------------------------
// draggable={false} + user-drag CSS on the <img> wasn't enough: the badge img
// sits inside an <a> (tenure badges link to settings pages), and anchors are
// natively draggable as LINKS - so grabbing the badge dragged the anchor,
// which the img-level attributes can't prevent. Real badges don't do this.
// A document-level capture listener kills any dragstart whose target is (or
// contains) one of this plugin's badge images, wherever it originates in
// the wrapper structure.

const CATALOG_IMAGE_URLS = new Set(BADGE_CATALOG.map(b => b.image));

function blockBadgeDrag(e: DragEvent) {
    const el = e.target as HTMLElement | null;
    if (!el) return;
    const img = el instanceof HTMLImageElement
        ? el
        : el.querySelector?.("img") as HTMLImageElement | null;
    if (img && CATALOG_IMAGE_URLS.has(img.src)) {
        e.preventDefault();
        e.stopPropagation();
    }
}

// ---------------------------------------------------------------------------
// Official (Discord-owned) badge hide/show
// ---------------------------------------------------------------------------
// Previously this only toggled a stored id list that nothing ever read at
// render time, so "hiding" an official badge didn't actually remove it -
// the real badge is derived by Discord's own UI straight from your
// account's publicFlags/premiumType, not from anything this plugin
// controlled. Fix: mask those specific bits on your own user object at the
// UserStore level (see patchSelfOverrides below), the same place the
// username override already hooks in, so a hidden official badge is
// actually absent everywhere the client reads your flags from.

function hideOfficialBadge(badgeId: string) {
    const hidden = loadHiddenOfficialBadges();
    if (!hidden.includes(badgeId)) {
        hidden.push(badgeId);
        saveHiddenOfficialBadges(hidden);
        patchOrUnpatchSelfOverrides();
        FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
    }
}

function showOfficialBadge(badgeId: string) {
    const hidden = loadHiddenOfficialBadges().filter(id => id !== badgeId);
    saveHiddenOfficialBadges(hidden);
    patchOrUnpatchSelfOverrides();
    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
}

// ---------------------------------------------------------------------------
// Self overrides: username override + official-badge masking
// ---------------------------------------------------------------------------
// Both features work the same way: proxy the user object your own client
// reads so specific fields report something other than the raw account
// data. This only ever intercepts UserStore lookups inside your own client -
// it can't and doesn't change what's stored on Discord's servers, so no one
// else's client is affected.

let originalGetUser: typeof UserStore.getUser | null = null;
let originalGetCurrentUser: typeof UserStore.getCurrentUser | null = null;

function computeMaskedFlags(rawFlags: number): number {
    let masked = rawFlags;
    for (const id of loadHiddenOfficialBadges()) {
        const bit = DISCORD_USER_FLAGS[id];
        if (bit !== undefined) masked &= ~bit;
    }
    return masked;
}

// Discord doesn't expose Nitro subscription tenure (bronze/silver/.../opal)
// as anything separate from the base "do you have Nitro" flag - the tenure
// decoration is computed server-side from your subscription start date,
// which isn't a field this plugin can read or override per-tier. So there
// is no way to hide *only* the tenure decoration while keeping the plain
// Nitro badge - the only reliable option is to mask premiumType entirely,
// which removes the whole Nitro presence (plain badge + any tenure
// decoration) together. Hiding any nitro-sub tier id has that effect.
const NITRO_TIER_IDS = new Set(
    BADGE_CATALOG.filter(b => b.tierGroup === "nitro-sub" || b.id === "discord-nitro").map(b => b.id)
);

function computeMaskedPremiumType(rawPremiumType: number): number {
    const hidden = loadHiddenOfficialBadges();
    const hidingNitro = hidden.some(id => NITRO_TIER_IDS.has(id));
    return hidingNitro ? 0 : rawPremiumType;
}

const cloneCache = new WeakMap<object, any>();

function makeSelfProxy<T extends object>(user: T): T {
    // Despite the name (kept to minimize the diff elsewhere), this no longer
    // wraps `user` in a Proxy at all. Discord defines most of its properties
    // as non-configurable/non-writable, and a Proxy's `get` trap is legally
    // required to return the exact same value for those - returning
    // anything else throws the instant *anything* reads it, which is what
    // crashed the client (confirmed via the isStaff error).
    //
    // Instead: build a plain object with the same prototype (so `instanceof`
    // checks still pass) and Object.assign every property from the real user
    // onto it. Object.assign reads each property once off the *original*
    // object (so any getter still runs with the correct `this` and any
    // private fields it touches still resolve fine) and writes it as a
    // completely ordinary, mutable property on the clone. Nothing about the
    // clone is frozen, so there's no invariant left to violate - this isn't
    // "safer", there is structurally no way for this specific crash to
    // happen again.
    //
    // Caveat worth knowing: a convenience method defined as an arrow-function
    // instance field (e.g. `isStaff = () => this.hasFlag(STAFF)`, which is
    // what threw before) keeps whatever `this` it closed over when it was
    // first created - copying the function reference doesn't change that, so
    // calling isStaff()/hasFlag() on this clone still reflects your REAL
    // flags, not the masked ones. Only *direct* property reads
    // (user.publicFlags, user.premiumType, user.username) see the override.
    // That covers the badge tray and most name rendering, which read the
    // property directly rather than going through a method.
    const existing = cloneCache.get(user);
    if (existing) return existing;

    const clone: any = Object.create(Object.getPrototypeOf(user));

    // Object.assign only copies *enumerable* own properties - isStaff (and
    // likely its siblings: isPartner, isVerifiedBot, etc.) turned out to be
    // defined non-enumerable, so assign silently skipped it entirely,
    // leaving clone.isStaff undefined ("not a function"). Copying every own
    // property via descriptors, enumerable or not, fixes that. Each
    // descriptor also gets forced configurable+writable, since a copied
    // non-writable descriptor would just make the overrides below silently
    // fail (or throw in strict mode) the same way the original frozen
    // property did - the difference is this is now a plain object with no
    // Proxy wrapped around it, so loosening the descriptor here is completely
    // ordinary and doesn't trip anything Discord's own code checks for.
    const descriptors = Object.getOwnPropertyDescriptors(user);
    for (const key of Reflect.ownKeys(descriptors)) {
        const d = descriptors[key];
        d.configurable = true;
        if ("value" in d) d.writable = true;
    }
    Object.defineProperties(clone, descriptors);

    if (settings.store.enableUsernameOverride && settings.store.customUsername) {
        clone.username = settings.store.customUsername;
    }
    // Deliberately NOT masking publicFlags/premiumType here anymore - this
    // was the actual cause of the image-upload bug. Discord reads
    // premiumType directly to decide upload size/permissions, so masking it
    // to 0 (whenever any nitro-tier badge was hidden) silently broke
    // uploads for a real Nitro account. Hiding an official badge from your
    // profile already works independently through stripHiddenBadgesFromProfilePayload
    // below (REST response filtering), which never touches premiumType -
    // this masking was redundant with that and is what actually broke.

    cloneCache.set(user, clone);
    return clone;
}

function patchSelfOverrides() {
    if (originalGetUser) return;
    originalGetUser = UserStore.getUser.bind(UserStore);
    originalGetCurrentUser = UserStore.getCurrentUser.bind(UserStore);

    UserStore.getUser = function (id: string) {
        const user = originalGetUser!(id);
        if (!user) return user;
        const me = UserStore.getCurrentUser?.();
        if (me && id === me.id) return makeSelfProxy(user);
        return user;
    };

    // Member list "you" entries, and clicking your own name via the bottom-left
    // panel, both resolve through getCurrentUser() rather than getUser(myId) -
    // patching only getUser left those two spots showing your unmasked data.
    UserStore.getCurrentUser = function () {
        const user = originalGetCurrentUser!();
        if (!user) return user;
        return makeSelfProxy(user);
    };
}

function unpatchSelfOverrides() {
    if (originalGetUser) {
        UserStore.getUser = originalGetUser;
        originalGetUser = null;
    }
    if (originalGetCurrentUser) {
        UserStore.getCurrentUser = originalGetCurrentUser;
        originalGetCurrentUser = null;
    }
}

// Safe to leave on: this now clones instead of proxying (see makeSelfProxy),
// so there's no frozen-property invariant left to violate.
const ENABLE_SELF_OVERRIDE = true;

function patchOrUnpatchSelfOverrides() {
    if (!ENABLE_SELF_OVERRIDE) {
        unpatchSelfOverrides();
        return;
    }
    const needed = settings.store.enableUsernameOverride && settings.store.customUsername;
    if (needed) {
        patchSelfOverrides();
    } else {
        unpatchSelfOverrides();
    }
}

// ---------------------------------------------------------------------------
// Profile payload interception
// ---------------------------------------------------------------------------
// IMPORTANT CAVEAT: the flag-masking above assumes the profile popout derives
// its badge list client-side from your User object's publicFlags/premiumType.
// That's the documented, well-established mechanism for flag-backed badges
// (Staff, Partner, HypeSquad, Bug Hunter, etc.), but it's plausible the
// popout instead renders a precomputed `badges` array that Discord's
// `/users/@me/profile` and `/users/<id>/profile` endpoints already return
// directly - in which case masking flags never touches what's actually
// rendered. This second patch intercepts that response directly and strips
// matching entries by description as a more direct backstop. I can't run
// a live Discord client to confirm which mechanism the popout actually
// uses, so treat this as best-effort: if a badge still doesn't disappear
// after this, the internal field names below are likely wrong for the
// current client build, and I'd need the actual response shape (Network
// tab -> /users/@me/profile -> Response, with anything sensitive redacted)
// to fix it precisely instead of guessing again.

let originalRestGet: typeof RestAPI.get | null = null;

function stripHiddenBadgesFromProfilePayload(body: any) {
    if (!body) return;
    const hidden = loadHiddenOfficialBadges();
    if (!hidden.length) return;

    // Confirmed against a real /users/@me/profile response: Discord's actual
    // badge objects look like { id: "premium_tenure_1_month_v2", description:
    // "Earned on 22/05/2026. 1 month: Bronze" }. The id is a stable slug; the
    // description is generated per-user (includes your real earn date), so it
    // can never match this plugin's static catalog description text - that
    // was the bug. Match on id going forward.
    //
    // Nitro tenure badges all share the "premium_tenure_" id prefix and,
    // per this same response, there is no separate "base Nitro" entry - the
    // single tenure badge *is* the whole Nitro badge. So hiding any nitro-sub
    // tier (or discord-nitro itself) strips any premium_tenure_* entry.
    //
    // Ids for the other official badges (Staff, Partner, HypeSquad, Bug
    // Hunter, etc.) aren't confirmed yet - I don't have a real sample of any
    // of those. Falling back to a loose description-substring match for them
    // in the meantime; it may not catch everything until confirmed for real.
    const hidingNitro = hidden.some(id => NITRO_TIER_IDS.has(id));
    const hiddenCatalogEntries = BADGE_CATALOG.filter(b => hidden.includes(b.id) && !NITRO_TIER_IDS.has(b.id));
    const hiddenDescriptionWords = hiddenCatalogEntries.map(b => b.description.toLowerCase());

    for (const container of [body, body.user_profile]) {
        if (Array.isArray(container?.badges)) {
            container.badges = container.badges.filter((entry: any) => {
                const id = String(entry?.id ?? "").toLowerCase();
                const description = String(entry?.description ?? "").toLowerCase();

                if (hidingNitro && id.startsWith("premium_tenure_")) return false;
                if (hiddenDescriptionWords.some(word => description.includes(word))) return false;
                return true;
            });
        }
    }
}

function patchRestApi() {
    if (originalRestGet) return;
    originalRestGet = RestAPI.get.bind(RestAPI);

    RestAPI.get = (async function (opts: any) {
        const res = await originalRestGet!(opts);
        try {
            const url: string = opts?.url ?? "";
            const me = UserStore.getCurrentUser?.();
            const isOwnProfile = !!me && (url === "/users/@me/profile" || url === `/users/${me.id}/profile`);
            if (isOwnProfile) stripHiddenBadgesFromProfilePayload(res?.body);
        } catch (e) {
            console.error("[Larp] Failed to filter profile badges from REST response", e);
        }
        return res;
    }) as typeof RestAPI.get;
}

function unpatchRestApi() {
    if (originalRestGet) {
        RestAPI.get = originalRestGet;
        originalRestGet = null;
    }
}

// ---------------------------------------------------------------------------
// Account switcher decoy
// ---------------------------------------------------------------------------
// The "Switch Accounts" popout is plain DOM, not something addProfileBadge-
// style APIs reach, and its class names are webpack-hashed and reshuffle on
// every Discord build - there's no stable selector to patch against. Instead
// this watches for the popout by *content* (an element whose text is exactly
// "Manage Accounts", a fixed English-client label) and clones the account
// row sitting directly above it, since that row already has the current
// build's real layout, spacing, and hover/avatar-decoration classes baked
// in - copying it is far more likely to look right than hand-building a row
// from scratch. Unavoidably a bit fragile: if a future Discord update
// renders that label differently (translated client, icon-only, restructured
// popout) the observer just finds nothing and does nothing, which is the
// safe failure mode rather than injecting into the wrong place.

let accountSwitcherObserver: MutationObserver | null = null;

function buildDecoyRow(sourceRow: HTMLElement): HTMLElement {
    const clone = sourceRow.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-larp-decoy", "true");
    clone.removeAttribute("aria-checked");

    const avatarUrl = settings.store.fakeAccountAvatarUrl;
    if (avatarUrl) {
        clone.querySelectorAll("img").forEach(img => {
            (img as HTMLImageElement).src = avatarUrl;
            (img as HTMLImageElement).removeAttribute("srcset");
        });
    }

    // The real row has exactly two short text nodes worth caring about (the
    // display name and the @username/tag underneath it) - walking text nodes
    // in order and swapping the first two avoids depending on which class
    // happens to mean "username" in the current build.
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) if (n.textContent?.trim()) textNodes.push(n as Text);

    if (textNodes.length >= 1) textNodes[0].textContent = settings.store.fakeAccountName || "Fake Account";
    if (textNodes.length >= 2) textNodes[1].textContent = settings.store.fakeAccountTag || "0000";

    // Strip whatever "this is the active account" indicator the source row
    // has (checkmark icon / highlighted state) so the decoy reads as a
    // separate, unselected entry rather than a second "current" account.
    // Not verified against a live client - I don't have a confirmed sample
    // of that icon's markup, so this uses a positional heuristic instead of
    // guessing at specific SVG path data: the checkmark is the trailing
    // element of the row and is the only child that has an <svg> but no
    // avatar <img> inside it. If a build's active-account indicator isn't
    // structured that way this just won't find anything to remove, and the
    // decoy will show a checkmark it shouldn't - safe failure, but worth
    // checking against what you actually see.
    const trailingIndicator = [...clone.children].reverse()
        .find(child => child.querySelector("svg") && !child.querySelector("img"));
    trailingIndicator?.remove();

    // Inert on purpose - this only needs to exist for the popout to look
    // right when you glance at or screenshot it. Making it actually
    // switchable would mean either faking a session for a nonexistent
    // account or silently doing nothing when clicked, both of which are
    // worse UX than a decoy that's honestly just a static row.
    clone.style.cursor = "default";
    clone.addEventListener("click", e => {
        e.stopPropagation();
        e.preventDefault();
    }, true);

    return clone;
}

// Walk up from a text node's element to the nearest ancestor that behaves
// like an actual clickable row (role="button"/"menuitem", a real <button>,
// or has a tabIndex) rather than the first ancestor with *any* class -
// virtually every Discord div has a class, so matching on `[class]` just
// grabs the label's immediate wrapper and stops there, which is what was
// silently breaking injection before: that wrapper usually has no useful
// previousElementSibling, so the function returned early every time.
function findInteractiveAncestor(el: HTMLElement, maxHops = 8): HTMLElement | null {
    let cur: HTMLElement | null = el;
    for (let i = 0; i < maxHops && cur; i++) {
        const role = cur.getAttribute("role");
        if (role === "button" || role === "menuitem" || cur.tagName === "BUTTON" || cur.hasAttribute("tabindex")) {
            return cur;
        }
        cur = cur.parentElement;
    }
    return null;
}

// Walk backward through siblings looking for the real account row rather
// than assuming it's the immediately preceding sibling - there's a visible
// divider between the account list and "Manage Accounts" in the real
// popout, so previousElementSibling alone was landing on that divider
// instead of the row with the avatar in it. Also has to skip the decoy row
// itself once it exists, since it has an <img> too - without the check,
// a second pass (e.g. from the name-sync function below) would find the
// decoy and think IT was your real account row.
function findAccountRowBefore(anchor: HTMLElement): HTMLElement | null {
    let sib = anchor.previousElementSibling as HTMLElement | null;
    while (sib) {
        if (sib.querySelector("img") && sib.getAttribute("data-larp-decoy") !== "true") return sib;
        sib = sib.previousElementSibling as HTMLElement | null;
    }
    return null;
}

let warnedNoInjectionPoint = false;

function tryInjectDecoy() {
    if (!settings.store.enableFakeAccount) return;
    if (document.querySelector('[data-larp-decoy="true"]')) return;

    const manageAccountsLabel = [...document.querySelectorAll("div, span")]
        .find(el => el.children.length === 0 && el.textContent?.trim() === "Manage Accounts") as HTMLElement | undefined;
    if (!manageAccountsLabel) return;

    const manageAccountsRow = findInteractiveAncestor(manageAccountsLabel);
    const sourceRow = manageAccountsRow ? findAccountRowBefore(manageAccountsRow) : null;
    const list = manageAccountsRow?.parentElement ?? null;

    if (!list || !sourceRow || !manageAccountsRow) {
        // The popout is open (we found the label) but the structure walk
        // failed - log once so this is easy to diagnose from the console
        // instead of just silently doing nothing forever.
        if (!warnedNoInjectionPoint) {
            warnedNoInjectionPoint = true;
            console.warn("[Larp] Found the account switcher popout but couldn't locate the account row / list to inject into.", { manageAccountsLabel, manageAccountsRow, sourceRow, list });
        }
        return;
    }

    list.insertBefore(buildDecoyRow(sourceRow), sourceRow.nextElementSibling);
}

// The account switcher UIs aren't rendered from UserStore at all (they list
// every account logged into this Discord install locally), so the
// getUser/getCurrentUser username override never touches them - your real
// name has to be swapped out at the DOM level.
//
// TWO bugs made this look completely broken before:
//
// 1. THE BIG ONE: the old code looked up your "real" username via
//    UserStore.getCurrentUser() - but that is exactly the function this
//    plugin PATCHES while the override is on, so it returned the FAKE name.
//    Row-matching then searched the list for a row containing the fake name,
//    found nothing, and silently bailed - leaving your real account showing.
//    Fix: always read your real identity through the saved ORIGINAL
//    getCurrentUser (getRealSelf below).
//
// 2. It only ran inside the "Manage Accounts" popout, anchored to that
//    English label. The "Switch Accounts" HOVER SUBMENU (the one in your
//    screenshot) has no such label, so the sync never even attempted to run
//    there. Fix: scan every floating layer/menu Discord renders popouts
//    into, not one specific popout.

function getRealSelf(): any {
    return originalGetCurrentUser ? originalGetCurrentUser() : UserStore.getCurrentUser?.();
}

// Swaps your real username (and display name, in switcher rows that show it)
// for the override text anywhere account-switcher UI renders it - both the
// Manage Accounts popout and the Switch Accounts hover submenu. Scoped to
// Discord's floating layer containers / menus so chat messages that merely
// mention your name are never touched. Only text nodes whose ENTIRE trimmed
// content equals your real name qualify, and only when they sit inside an
// interactive row that also contains an avatar <img> - i.e. something that
// actually looks like an account row.
//
// No "already did this" flag on purpose - Discord's React re-render resets
// these text nodes every time a popout closes and reopens, so re-checking
// actual text each pass and only touching mismatches is self-healing.
function trySyncOwnIdentityInSwitchers() {
    if (!settings.store.enableUsernameOverride || !settings.store.customUsername) return;

    const real = getRealSelf();
    const realUsername: string | undefined = real?.username;
    const realDisplayName: string | undefined = real?.globalName ?? real?.global_name;
    const fake = settings.store.customUsername;
    if (!realUsername || realUsername === fake) return;

    const surfaces = document.querySelectorAll('[class*="layerContainer"], [role="menu"]');
    for (const surface of surfaces) {
        const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
            const textNode = n as Text;
            const trimmed = textNode.textContent?.trim();
            if (!trimmed) continue;
            if (trimmed !== realUsername && trimmed !== realDisplayName) continue;

            const parent = textNode.parentElement;
            if (!parent) continue;
            // Never rewrite the decoy row's text.
            if (parent.closest('[data-larp-decoy="true"]')) continue;
            // Must look like an account row: clickable ancestor with an avatar.
            const row = findInteractiveAncestor(parent);
            if (!row || !row.querySelector("img")) continue;

            textNode.textContent = textNode.textContent!.replace(trimmed, fake);
        }
    }
}

function accountSwitcherFeaturesActive(): boolean {
    return !!settings.store.enableFakeAccount
        || !!(settings.store.enableUsernameOverride && settings.store.customUsername);
}

function updateAccountSwitcherWatchState() {
    if (accountSwitcherFeaturesActive()) startAccountSwitcherWatch();
    else stopAccountSwitcherWatch();
}

function runAccountSwitcherPass() {
    try {
        tryInjectDecoy();
    } catch (e) {
        console.error("[Larp] Account switcher decoy injection failed", e);
    }
    try {
        trySyncOwnIdentityInSwitchers();
    } catch (e) {
        console.error("[Larp] Account switcher name sync failed", e);
    }
}

function startAccountSwitcherWatch() {
    if (accountSwitcherObserver) return;
    accountSwitcherObserver = new MutationObserver(runAccountSwitcherPass);
    accountSwitcherObserver.observe(document.body, { childList: true, subtree: true });
    // Also run once immediately - if the switcher popout is already open at
    // the moment a setting gets toggled on (e.g. you flip "Enable Fake
    // Account" while it's showing), nothing would otherwise trigger a fresh
    // attempt until the next DOM mutation, which made it look broken when
    // it was really just waiting for you to close and reopen it.
    runAccountSwitcherPass();
}

function stopAccountSwitcherWatch() {
    accountSwitcherObserver?.disconnect();
    accountSwitcherObserver = null;
}

// ---------------------------------------------------------------------------
// Generic text overrides (any other page - Subscription Credit months, etc.)
// ---------------------------------------------------------------------------
// Rather than hand-building a bespoke watcher every time you find another
// screen with text you want to change (this started with the account
// switcher, then Member Since, now Subscription Credit) - this is a general
// version of the same trick: a list of exact-text -> replacement-text pairs
// you manage with commands, applied anywhere in the client. Exact match
// only (after trimming), not substring - substring matching risks rewriting
// unrelated text that happens to contain the same words elsewhere.

interface TextOverride { find: string; replace: string; }

function loadTextOverrides(): TextOverride[] {
    try {
        const parsed = JSON.parse(settings.store.textOverridesJson || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveTextOverrides(list: TextOverride[]) {
    settings.store.textOverridesJson = JSON.stringify(list);
}

const overriddenTextNodes = new WeakSet<Text>();

function tryApplyTextOverrides() {
    const overrides = loadTextOverrides();
    if (overrides.length === 0) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
        const textNode = n as Text;
        if (overriddenTextNodes.has(textNode)) continue;
        const trimmed = textNode.textContent?.trim();
        if (!trimmed) continue;

        const match = overrides.find(o => o.find === trimmed);
        if (match) {
            textNode.textContent = textNode.textContent!.replace(trimmed, match.replace);
            overriddenTextNodes.add(textNode);
        }
    }
}

let textOverrideObserver: MutationObserver | null = null;

function startTextOverrideWatch() {
    if (textOverrideObserver) return;
    textOverrideObserver = new MutationObserver(() => {
        try {
            tryApplyTextOverrides();
        } catch (e) {
            console.error("[Larp] Text override pass failed", e);
        }
    });
    textOverrideObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopTextOverrideWatch() {
    textOverrideObserver?.disconnect();
    textOverrideObserver = null;
}

function updateTextOverrideWatchState() {
    if (loadTextOverrides().length > 0) startTextOverrideWatch();
    else stopTextOverrideWatch();
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const settings = definePluginSettings({
    enableUsernameOverride: {
        type: OptionType.BOOLEAN,
        description: "Locally override your @username (does not touch your display name)",
        default: false,
        onChange: () => { patchOrUnpatchSelfOverrides(); updateAccountSwitcherWatchState(); }
    },
    customUsername: {
        type: OptionType.STRING,
        description: "The @username you want to see instead of your real one (client-side only)",
        default: "",
        onChange: () => { patchOrUnpatchSelfOverrides(); updateAccountSwitcherWatchState(); }
    },
    flipBadgeOrder: {
        type: OptionType.BOOLEAN,
        description: "Flip badge order - only turn on if a Vencord/Equicord update makes badges render backwards",
        default: false,
        onChange: () => { refreshRegisteredBadges(); }
    },
    customBadgesJson: {
        type: OptionType.STRING,
        description: "internal storage, do not edit directly",
        default: "[]",
        hidden: true
    },
    hiddenOfficialBadgesJson: {
        type: OptionType.STRING,
        description: "internal storage for hidden official badges",
        default: "[]",
        hidden: true
    },
    fakeBadgeEarnedDate: {
        type: OptionType.STRING,
        description: "Optional fixed 'earned on' date (DD/MM/YYYY) for tenure badge tooltips - leave blank to auto-calculate backward from today",
        default: "",
        onChange: () => { refreshRegisteredBadges(); }
    },
    enableFakeAccount: {
        type: OptionType.BOOLEAN,
        description: "Show a decoy entry in your own account switcher popout (client-side only)",
        default: false,
        onChange: () => { updateAccountSwitcherWatchState(); }
    },
    fakeAccountName: {
        type: OptionType.STRING,
        description: "Display name for the decoy account switcher entry",
        default: "Fake Account"
    },
    fakeAccountTag: {
        type: OptionType.STRING,
        description: "Username/tag shown under the decoy entry's name",
        default: "0000"
    },
    fakeAccountAvatarUrl: {
        type: OptionType.STRING,
        description: "Avatar image URL for the decoy entry (leave blank to reuse your real avatar)",
        default: ""
    },
    textOverridesJson: {
        type: OptionType.STRING,
        description: "internal storage for /larp text entries, do not edit directly",
        default: "[]",
        hidden: true
    }
});

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export default definePlugin({
    name: "Larp",
    description: "Locally override username, add/remove real-looking badges, hide official badges you own, and drop a decoy entry into your account switcher - visible only to you. Everything lives under one command: /larp (start with /larp help)",
    authors: [Larp_AUTHOR],
    settings,

    // ONE command to remember: /larp. Every feature is a subcommand with
    // Discord's own tab-completion, so nothing needs memorizing beyond
    // "/larp help". (Replaces the old pile of 14 separate top-level
    // commands - /browsecatalog, /addfromcatalog, /removebadge, etc.)
    commands: [
        {
            name: "larp",
            description: "Badges, hiding real badges, fake identity, text overrides - start with /larp help",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                { name: "help", description: "Cheat sheet of every /larp subcommand", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                { name: "catalog", description: "Browse every badge you can add", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                {
                    name: "add", description: "Add a badge to your profile (or \"all\" for everything)", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Badge id from /larp catalog, or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                {
                    name: "remove", description: "Remove an added badge (or \"all\"); also hides a real badge you own", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Number, id, or description from /larp list - or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                { name: "list", description: "List the badges you've added", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                {
                    name: "hide", description: "Hide an official Discord badge you actually own", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Badge id (see /larp official)", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                {
                    name: "unhide", description: "Show a previously hidden official badge again", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Badge id (see /larp official)", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                { name: "official", description: "List the official badges on your account (hide/unhide targets)", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                { name: "milestones", description: "Open the Nitro/Boost milestone ladder for your tenure badge", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                {
                    name: "real", description: "Print the exact badge art URLs Discord serves on a live profile", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "user-id", description: "User id to inspect (blank = yourself)", type: ApplicationCommandOptionType.STRING, required: false }]
                },
                {
                    name: "text", description: "Replace an exact piece of Discord UI text, client-side only", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        { name: "find", description: "Exact text to replace (whitespace-trimmed)", type: ApplicationCommandOptionType.STRING, required: true },
                        { name: "replace", description: "What to show instead", type: ApplicationCommandOptionType.STRING, required: true }
                    ]
                },
                {
                    name: "untext", description: "Remove a text override added with /larp text", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "find", description: "The exact \"find\" text you used when adding it", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                { name: "texts", description: "List your active text overrides", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] }
            ],
            execute: async (args, ctx) => {
                const sub = args[0];
                const opt = (name: string) => ((sub?.options?.find(o => o.name === name)?.value as string) ?? "").trim();
                const say = (content: string) => sendBotMessage(ctx.channel.id, { content });

                switch (sub?.name) {
                    case "help": {
                        say([
                            "**/larp — everything in one place**",
                            "`/larp catalog` — browse every badge you can add",
                            "`/larp add <id|all>` — put badge(s) on your profile",
                            "`/larp remove <id|all>` — take added badge(s) off; also hides a real badge you own",
                            "`/larp list` — what you've added",
                            "`/larp hide <id>` / `/larp unhide <id>` — hide/show official badges you own",
                            "`/larp official` — which official badges your account actually has",
                            "`/larp milestones` — Nitro/Boost milestone ladder",
                            "`/larp real [user-id]` — exact badge art URLs from a live profile",
                            "`/larp text <find> <replace>` / `/larp untext <find>` / `/larp texts` — UI text overrides",
                            "",
                            "Username override, the fake switcher account, and badge order flipping live in Settings → Plugins → Larp."
                        ].join("\n"));
                        break;
                    }

                    case "catalog": {
                        const have = new Set(loadBadges().map(b => b.id));
                        const text = BADGE_CATALOG
                            .map(b => `${have.has(b.id) ? "✅" : "▫️"} \`${b.id}\`  —  ${b.description}${b.tierGroup ? "  (tiered)" : ""}`)
                            .join("\n");
                        say(`Badge catalog (✅ = already added, "tiered" = only your highest tier in that group will show). Add with \`/larp add\`:\n${text}`);
                        break;
                    }

                    case "add": {
                        const q = opt("badge").toLowerCase();
                        if (q === "all") {
                            saveBadges([...BADGE_CATALOG]);
                            refreshRegisteredBadges();
                            say(`Added all ${BADGE_CATALOG.length} catalog badges. Tiered ones (Nitro/Boost) will only show their highest tier - check your profile popout, then \`/larp remove all\` when done.`);
                            break;
                        }
                        const found = BADGE_CATALOG.find(b => b.id === q);
                        if (!found) {
                            say(`No catalog badge with id "${q}". Use \`/larp catalog\` to see valid ids.`);
                            break;
                        }
                        const badges = loadBadges();
                        if (badges.some(b => b.id === found.id)) {
                            say(`You already have "${found.description}".`);
                            break;
                        }
                        // If this badge belongs to a tier group (nitro-sub, server-boost),
                        // drop any other stored badge from that same group instead of just
                        // letting computeEffectiveBadges suppress it - otherwise storage
                        // keeps accumulating every tier you've ever added.
                        const replaced = found.tierGroup ? badges.filter(b => b.tierGroup === found.tierGroup) : [];
                        const kept = found.tierGroup ? badges.filter(b => b.tierGroup !== found.tierGroup) : badges;
                        kept.push(found);
                        saveBadges(kept);
                        refreshRegisteredBadges();
                        const replacedNote = replaced.length ? ` (replaced "${replaced.map(b => b.description).join(", ")}")` : "";
                        say(`Added "${found.description}"${replacedNote}.`);
                        break;
                    }

                    case "remove": {
                        const raw = opt("badge");
                        const query = raw.replace(/^[`*_~"']+|[`*_~"']+$/g, "").trim();
                        const badges = loadBadges();

                        if (query.toLowerCase() === "all") {
                            saveBadges([]);
                            refreshRegisteredBadges();
                            say(`Cleared ${badges.length} badge${badges.length === 1 ? "" : "s"}.`);
                            break;
                        }

                        let match: StoredBadge | undefined;
                        const asIndex = Number(query);
                        if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= badges.length) {
                            match = badges[asIndex - 1];
                        } else {
                            match = badges.find(b => b.id.toLowerCase() === query.toLowerCase() || b.description.toLowerCase() === query.toLowerCase());
                        }

                        // Found among your added catalog badges - remove it.
                        if (match) {
                            saveBadges(badges.filter(b => b.id !== match!.id));
                            refreshRegisteredBadges();
                            say(`Removed "${match.description}".`);
                            break;
                        }

                        // Not a stored catalog badge - it might be a real official badge
                        // on your account instead (e.g. your actual Nitro or Staff badge).
                        // Fall back to hiding it, but only if you actually own it.
                        const officialMatch = BADGE_CATALOG.find(
                            b => b.id.toLowerCase() === query.toLowerCase() || b.description.toLowerCase() === query.toLowerCase()
                        );
                        if (!officialMatch) {
                            say(`No badge found matching "${raw}". Use \`/larp list\` or \`/larp official\` to see your badges.`);
                            break;
                        }

                        const owned = await ownsOfficialBadge(officialMatch.id);
                        if (owned === false) {
                            say(`"${officialMatch.description}" isn't one of your catalog badges, and you don't appear to own it as an official badge either.`);
                            break;
                        }

                        const hidden = loadHiddenOfficialBadges();
                        if (hidden.includes(officialMatch.id)) {
                            say(`"${officialMatch.description}" is already hidden.`);
                            break;
                        }

                        hideOfficialBadge(officialMatch.id);
                        const caveat = owned === null ? " (couldn't verify ownership automatically for this one - hidden anyway, but double check it's actually gone)" : "";
                        const nitroNote = NITRO_TIER_IDS.has(officialMatch.id)
                            ? " Heads up: Discord doesn't let a client hide just the tenure decoration, so this also hides your plain Discord Nitro badge - they're not separable."
                            : "";
                        say(`Hid your official "${officialMatch.description}" badge${caveat}.${nitroNote} Use \`/larp unhide\` to bring it back.`);
                        break;
                    }

                    case "list": {
                        const stored = loadBadges();
                        const effectiveIds = new Set(computeEffectiveBadges(stored).map(b => b.id));
                        const text = stored.length
                            ? stored.map((b, i) => `${i + 1}. ${b.description}  (id: \`${b.id}\`)${effectiveIds.has(b.id) ? "" : "  — suppressed by a higher tier"}`).join("\n")
                            : "No badges yet. Use `/larp add` (see `/larp catalog` for ids).";
                        say(text);
                        break;
                    }

                    case "hide": {
                        const id = opt("badge");
                        const hidden = loadHiddenOfficialBadges();
                        if (hidden.includes(id)) {
                            say(`Badge "${id}" is already hidden.`);
                            break;
                        }
                        hideOfficialBadge(id);
                        const nitroNote = NITRO_TIER_IDS.has(id)
                            ? " Note: Discord doesn't expose the tenure decoration separately from the base badge, so this also hides your plain Discord Nitro badge."
                            : "";
                        say(`Hidden badge "${id}".${nitroNote} Use \`/larp unhide\` to bring it back.`);
                        break;
                    }

                    case "unhide": {
                        const id = opt("badge");
                        const hidden = loadHiddenOfficialBadges();
                        if (!hidden.includes(id)) {
                            say(`Badge "${id}" wasn't hidden.`);
                            break;
                        }
                        showOfficialBadge(id);
                        say(`Showing badge "${id}" again.`);
                        break;
                    }

                    case "official": {
                        const hidden = loadHiddenOfficialBadges();
                        const ownership = await Promise.all(BADGE_CATALOG.map(async b => [b, await ownsOfficialBadge(b.id)] as const));
                        const owned = ownership.filter(([, o]) => o === true).map(([b]) => b);
                        const unverifiable = ownership.filter(([, o]) => o === null).map(([b]) => b);

                        const ownedText = owned.length
                            ? owned.map(b => `${hidden.includes(b.id) ? "👻" : "✅"} \`${b.id}\`  —  ${b.description}`).join("\n")
                            : "None detected on your account.";

                        const unverifiableText = unverifiable.length
                            ? `\n\nCan't verify ownership for these (Discord doesn't expose tenure length, quests, or orbs to a client-side plugin), so they're not auto-filtered - use \`/larp hide\` directly if you own one and want it hidden:\n${unverifiable.map(b => `❔ \`${b.id}\`  —  ${b.description}`).join("\n")}`
                            : "";

                        say(`Official badges you currently have (👻 = hidden, ✅ = showing):\n${ownedText}${unverifiableText}`);
                        break;
                    }

                    case "milestones": {
                        const tiered = computeEffectiveBadges(loadBadges())
                            .filter(b => b.tierGroup === "nitro-sub" || b.tierGroup === "server-boost");
                        if (tiered.length === 0) {
                            say("You don't have a Nitro or Boost tenure badge added right now - use `/larp add` first.");
                            break;
                        }
                        tiered.forEach(openTierLadderModal);
                        break;
                    }

                    case "real": {
                        const me = getRealSelf() ?? UserStore.getCurrentUser?.();
                        const id = opt("user-id") || me?.id;
                        if (!id) {
                            say("Couldn't resolve a user id.");
                            break;
                        }
                        try {
                            // Use the UNPATCHED RestAPI.get so your own hidden badges
                            // aren't silently stripped from the result - the whole point
                            // of this command is to see the raw truth Discord serves.
                            const get = originalRestGet ?? RestAPI.get.bind(RestAPI);
                            const res = await get({ url: `/users/${id}/profile`, query: { with_mutual_guilds: false } });
                            const badges: any[] = res?.body?.badges ?? [];
                            if (!badges.length) {
                                say("Discord returned no badges for that profile.");
                                break;
                            }
                            const lines = badges.map(b => `\`${b.id}\` — ${b.description}\n<https://cdn.discordapp.com/badge-icons/${b.icon}.png>`);
                            say(`Real badge art, exactly as Discord serves it (in real display order, left to right):\n${lines.join("\n")}`);
                        } catch (e) {
                            console.error("[Larp] /larp real failed", e);
                            say("Couldn't fetch that profile - Discord generally only lets you view profiles of users you share a server or friendship with.");
                        }
                        break;
                    }

                    case "text": {
                        const find = opt("find");
                        const replace = (sub?.options?.find(o => o.name === "replace")?.value as string) ?? "";
                        if (!find) {
                            say("Need a non-empty \"find\" value.");
                            break;
                        }
                        const list = loadTextOverrides().filter(o => o.find !== find);
                        list.push({ find, replace });
                        saveTextOverrides(list);
                        updateTextOverrideWatchState();
                        say(`Will replace "${find}" with "${replace}" anywhere it appears exactly. This only rewrites text already visible/rendered - reopen whatever page had it if it doesn't update immediately.`);
                        break;
                    }

                    case "untext": {
                        const find = opt("find");
                        const list = loadTextOverrides();
                        const next = list.filter(o => o.find !== find);
                        if (next.length === list.length) {
                            say(`No override found for "${find}".`);
                            break;
                        }
                        saveTextOverrides(next);
                        updateTextOverrideWatchState();
                        say(`Removed the override for "${find}".`);
                        break;
                    }

                    case "texts": {
                        const list = loadTextOverrides();
                        const text = list.length
                            ? list.map((o, i) => `${i + 1}. "${o.find}" → "${o.replace}"`).join("\n")
                            : "No text overrides yet. Use `/larp text`.";
                        say(text);
                        break;
                    }

                    default:
                        say("Unknown subcommand - try `/larp help`.");
                }
            }
        }
    ],

    start() {
        preloadCatalogImages();
        patchOrUnpatchSelfOverrides();
        patchRestApi();
        refreshRegisteredBadges();
        updateAccountSwitcherWatchState();
        updateTextOverrideWatchState();
        // Capture-phase so it beats Discord's own handlers and catches drags
        // starting on the badge's wrapper <a>, not just the img itself.
        document.addEventListener("dragstart", blockBadgeDrag, true);
    },

    stop() {
        // CRITICAL for clean disable: Vencord/Equicord expands a command with
        // SUB_COMMAND options into separate pseudo-commands registered as
        // "larp help", "larp add", etc. (see registerSubCommands in
        // @api/Commands) - but on plugin stop, PluginManager only calls
        // unregisterCommand("larp"), which matches nothing. Every subcommand
        // therefore stayed registered after disable, and the next enable
        // threw `Command 'larp help' already exists.` - the "Error while
        // starting plugin Larp" toast that could only be cleared by a full
        // client restart. Unregister the expanded names ourselves.
        for (const cmd of (this as any).commands ?? []) {
            for (const opt of cmd.options ?? []) {
                unregisterCommand(`${cmd.name} ${opt.name}`);
            }
        }

        document.removeEventListener("dragstart", blockBadgeDrag, true);
        unpatchSelfOverrides();
        unpatchRestApi();
        stopAccountSwitcherWatch();
        stopTextOverrideWatch();
        document.querySelectorAll('[data-larp-decoy="true"]').forEach(el => el.remove());
        for (const id of [...registeredBadges.keys()]) unregisterBadge(id);
    },

    // WeakMaps clean themselves up once the underlying user objects are
    // garbage-collected, so there's nothing to manually clear here - noted
    // for anyone reading this later and wondering.
});
