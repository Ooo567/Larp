import { addProfileBadge, removeProfileBadge, type ProfileBadge, BadgePosition } from "@api/Badges";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage, unregisterCommand } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { ModalCloseButton, ModalContent, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, React, RestAPI, Text, UserStore } from "@webpack/common";

const Larp_AUTHOR = { name: "vibcode", id: 1497451226806353980n };
const Larp_AUTHOR_2 = { name: "baviolie", id: 1381714138476318821n };
const Larp_AUTHOR_3 = { name: "ragebotted", id: 893913378093944873n };

interface StoredBadge {
    id: string;
    description: string;
    image: string;
    tierGroup?: string;
    tierRank?: number;
    sizeAdjust?: number;
    settingsLink?: string;
}

const BADGE_ICONS = "https://cdn.discordapp.com/badge-icons";

const BADGE_CATALOG: StoredBadge[] = [
    { id: "discord-staff", description: "Discord Staff", image: `${BADGE_ICONS}/5e74e9b61934fc1f67c65515d1f7e60d.png` },

    { id: "discord-nitro", description: "Discord Nitro", image: `${BADGE_ICONS}/2ba85e8026a8614b640c2837bcdfe21b.png` },

    { id: "nitro-bronze", description: "Discord Nitro Bronze (1 Month)", image: `${BADGE_ICONS}/4f33c4a9c64ce221936bd256c356f91f.png`, tierGroup: "nitro-sub", tierRank: 1 },
    { id: "nitro-silver", description: "Discord Nitro Silver (3 Months)", image: `${BADGE_ICONS}/4514fab914bdbfb4ad2fa23df76121a6.png`, tierGroup: "nitro-sub", tierRank: 2 },
    { id: "nitro-gold", description: "Discord Nitro Gold (6 Months)", image: `${BADGE_ICONS}/2895086c18d5531d499862e41d1155a6.png`, tierGroup: "nitro-sub", tierRank: 3 },
    { id: "nitro-platinum", description: "Discord Nitro Platinum (12 Months)", image: `${BADGE_ICONS}/0334688279c8359120922938dcb1d6f8.png`, tierGroup: "nitro-sub", tierRank: 4 },
    { id: "nitro-diamond", description: "Discord Nitro Diamond (24 Months)", image: `${BADGE_ICONS}/0d61871f72bb9a33a7ae568c1fb4f20a.png`, tierGroup: "nitro-sub", tierRank: 5 },
    { id: "nitro-emerald", description: "Discord Nitro Emerald (36 Months)", image: `${BADGE_ICONS}/11e2d339068b55d3a506cff34d3780f3.png`, tierGroup: "nitro-sub", tierRank: 6 },
    { id: "nitro-ruby", description: "Discord Nitro Ruby (60 Months)", image: `${BADGE_ICONS}/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png`, tierGroup: "nitro-sub", tierRank: 7 },
    { id: "nitro-opal", description: "Discord Nitro Opal (72+ Months)", image: `${BADGE_ICONS}/5b154df19c53dce2af92c9b61e6be5e2.png`, tierGroup: "nitro-sub", tierRank: 8 },

    { id: "moderator-programs-alumni", description: "Moderator Programs Alumni", image: `${BADGE_ICONS}/fee1624003e2fee35cb398e125dc479b.png` },
    { id: "hypesquad-events", description: "HypeSquad Events", image: `${BADGE_ICONS}/bf01d1073931f921909045f3a39fd264.png` },

    { id: "hypesquad-bravery", description: "HypeSquad Bravery", image: `${BADGE_ICONS}/8a88d63823d8a71cd5e390baa45efa02.png` },
    { id: "hypesquad-brilliance", description: "HypeSquad Brilliance", image: `${BADGE_ICONS}/011940fd013da3f7fb926e4a1cd2e618.png` },
    { id: "hypesquad-balance", description: "HypeSquad Balance", image: `${BADGE_ICONS}/3aa41de486fa12454c3761e8e223442e.png` },

    { id: "bug-hunter-tier-1", description: "Discord Bug Hunter (Tier 1)", image: `${BADGE_ICONS}/2717692c7dca7289b35297368a940dd0.png`, tierGroup: "bug-hunter", tierRank: 1 },
    { id: "bug-hunter-tier-2", description: "Discord Bug Hunter (Tier 2)", image: `${BADGE_ICONS}/848f79194d4be5ff5f81505cbd0ce1e6.png`, tierGroup: "bug-hunter", tierRank: 2 },

    { id: "early-supporter", description: "Early Supporter", image: `${BADGE_ICONS}/7060786766c9c840eb3019e725d2b358.png`, settingsLink: "https://discord.com/settings/premium" },
    { id: "partnered-server-owner", description: "Partnered Server Owner", image: `${BADGE_ICONS}/3f9748e53446a137a052f3454e2de41e.png` },
    { id: "early-verified-bot-developer", description: "Early Verified Bot Developer", image: `${BADGE_ICONS}/6df5892e0f35b051f8b61eace34f4967.png` },
    { id: "active-developer", description: "Active Developer", image: `${BADGE_ICONS}/6bdc42827a38498929a4920da12695d9.png` },

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

    { id: "completed-a-quest", description: "Completed a Quest", image: `${BADGE_ICONS}/7d9ae358c8c5e118768335dbe68b4fb8.png`, settingsLink: "https://discord.com/discovery/quests" },
    { id: "last-meadow-online", description: "Level 100 Reached", image: `${BADGE_ICONS}/ca105ad9cfc8580c765101d17bbb2323.png` },
    { id: "orbs-apprentice", description: "Collected the Orb Profile Badge", image: `${BADGE_ICONS}/83d8a1eb09a8d64e59233eec5d4d5c2d.png` },
    { id: "discord-lootbox-clown", description: "A clown, for a limited time", image: "https://discord.com/assets/971cfe4aa5c0582000ea.svg" },

    { id: "gifting-patron", description: "Gifting Patron", image: `${BADGE_ICONS}/ac305d1b9481f312ce4419e7f8296558.png`, tierGroup: "gifting", tierRank: 1 },
    { id: "gifting-champion", description: "Gifting Champion", image: `${BADGE_ICONS}/8b7792c4f65953d3ff564f23429cb79e.png`, tierGroup: "gifting", tierRank: 2 },
    { id: "gifting-luminary", description: "Gifting Luminary", image: `${BADGE_ICONS}/3119f5504b2cd09576a323908c7c3517.png`, tierGroup: "gifting", tierRank: 3 },
    { id: "gifting-icon", description: "Gifting Icon", image: `${BADGE_ICONS}/64f2413c9b9803661322aaad25826b62.png`, tierGroup: "gifting", tierRank: 4 },
    { id: "gifting-hero", description: "Gifting Hero", image: `${BADGE_ICONS}/77d65b1f210014a11eb1582ee06ab684.png`, tierGroup: "gifting", tierRank: 5 },
    { id: "gifting-legend", description: "Gifting Legend", image: `${BADGE_ICONS}/7fe346cfc5da1340087d8759a9e7a395.png`, tierGroup: "gifting", tierRank: 6 },
];

const CATALOG_INDEX = new Map(BADGE_CATALOG.map((b, i) => [b.id, i]));

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

const REAL_BADGE_IDS: Record<string, { ids?: string[]; prefixes?: string[] }> = {
    "discord-staff": { ids: ["staff"] },
    "discord-nitro": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-bronze": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-silver": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-gold": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-platinum": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-diamond": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-emerald": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-ruby": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "nitro-opal": { ids: ["premium"], prefixes: ["premium_tenure_"] },
    "moderator-programs-alumni": { ids: ["certified_moderator"] },
    "hypesquad-events": { ids: ["hypesquad"] },
    "hypesquad-bravery": { ids: ["hypesquad_house_1"] },
    "hypesquad-brilliance": { ids: ["hypesquad_house_2"] },
    "hypesquad-balance": { ids: ["hypesquad_house_3"] },
    "bug-hunter-tier-1": { ids: ["bug_hunter_level_1"] },
    "bug-hunter-tier-2": { ids: ["bug_hunter_level_2"] },
    "early-supporter": { ids: ["early_supporter"] },
    "partnered-server-owner": { ids: ["partner"] },
    "early-verified-bot-developer": { ids: ["verified_developer"] },
    "active-developer": { ids: ["active_developer"] },
    "booster-badge": { prefixes: ["guild_booster_lvl"] },
    "boost-1m": { prefixes: ["guild_booster_lvl"] },
    "boost-2m": { prefixes: ["guild_booster_lvl"] },
    "boost-3m": { prefixes: ["guild_booster_lvl"] },
    "boost-6m": { prefixes: ["guild_booster_lvl"] },
    "boost-9m": { prefixes: ["guild_booster_lvl"] },
    "boost-12m": { prefixes: ["guild_booster_lvl"] },
    "boost-15m": { prefixes: ["guild_booster_lvl"] },
    "boost-18m": { prefixes: ["guild_booster_lvl"] },
    "boost-24m": { prefixes: ["guild_booster_lvl"] },
    "legacy-username": { ids: ["legacy_username"] },
    "completed-a-quest": { ids: ["quest_completed"] },
    "last-meadow-online": { ids: ["april_fools_2026"] },
    "orbs-apprentice": { ids: ["orbs_apprentice"] },
    "discord-lootbox-clown": { prefixes: ["lootbox", "clown"] },
    "gifting-patron": { ids: ["gifting"] },
    "gifting-champion": { ids: ["gifting"] },
    "gifting-luminary": { ids: ["gifting"] },
    "gifting-icon": { ids: ["gifting"] },
    "gifting-hero": { ids: ["gifting"] },
    "gifting-legend": { ids: ["gifting"] },
};

let ownedFlagsCache: { bits: number; premiumType: number; fetchedAt: number } | null = null;

async function fetchOwnedFlags(): Promise<{ bits: number; premiumType: number }> {
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
        const raw: string[] = JSON.parse(settings.store.hiddenOfficialBadgesJson || "[]");
        return [...new Set(raw.map(id => /^boost-\d+m$/.test(id) ? "booster-badge" : id))];
    } catch {
        return [];
    }
}

function saveHiddenOfficialBadges(badgeIds: string[]) {
    settings.store.hiddenOfficialBadgesJson = JSON.stringify(badgeIds);
}

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

const NITRO_TENURE_MONTHS: Record<string, number> = {
    "nitro-bronze": 1, "nitro-silver": 3, "nitro-gold": 6, "nitro-platinum": 12,
    "nitro-diamond": 24, "nitro-emerald": 36, "nitro-ruby": 60, "nitro-opal": 72
};
const BOOST_TENURE_MONTHS: Record<string, number> = {
    "boost-1m": 1, "boost-2m": 2, "boost-3m": 3, "boost-6m": 6, "boost-9m": 9,
    "boost-12m": 12, "boost-15m": 15, "boost-18m": 18, "boost-24m": 24
};

function tierDisplayName(description: string): string {
    const nitroMatch = description.match(/^Discord Nitro (\w+)/);
    if (nitroMatch) return nitroMatch[1];
    return description;
}

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

function formatEarnedDateLong(monthsAgo: number): string {
    const custom = settings.store.fakeBadgeEarnedDate?.trim();
    if (custom) return custom;
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

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

const TIER_MONTH_LABELS: Record<string, string> = {
    "nitro-bronze": "1 Month", "nitro-silver": "3 Months", "nitro-gold": "6 Months",
    "nitro-platinum": "1 Year", "nitro-diamond": "2 Years", "nitro-emerald": "3 Years",
    "nitro-ruby": "5 Years", "nitro-opal": "6+ Years",
    "boost-1m": "1 Month", "boost-2m": "2 Months", "boost-3m": "3 Months",
    "boost-6m": "6 Months", "boost-9m": "9 Months", "boost-12m": "1 Year",
    "boost-15m": "15 Months", "boost-18m": "18 Months", "boost-24m": "2 Years"
};

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
        link: b.settingsLink
            ?? (b.tierGroup === "nitro-sub" ? "https://discord.com/settings/premium"
                : b.tierGroup === "server-boost" ? "https://discord.com/settings/guild-boosting"
                : undefined),
        props: {
            style: {
                width: BADGE_BOX_PX,
                height: BADGE_BOX_PX,
                objectFit: "contain",
                transform: `scale(${b.sizeAdjust ?? 1})`,
                imageRendering: "auto",
                WebkitBackfaceVisibility: "hidden",
                filter: "saturate(1.03) contrast(1.02)",
                WebkitUserDrag: "none",
                userSelect: "none",
                pointerEvents: "none"
            },
            draggable: false,
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

function refreshRegisteredBadges() {
    for (const id of [...registeredBadges.keys()]) unregisterBadge(id);

    const effective = computeEffectiveBadges(loadBadges());
    const registrationOrder = settings.store.flipBadgeOrder ? effective : [...effective].reverse();
    registrationOrder.forEach(registerBadge);

    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
}

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

function hideOfficialBadge(badgeId: string) {
    const hidden = loadHiddenOfficialBadges();
    if (!hidden.includes(badgeId)) {
        hidden.push(badgeId);
        saveHiddenOfficialBadges(hidden);
        patchOrUnpatchSelfOverrides();
        updateHiddenBadgeWatchState();
        FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
    }
}

function showOfficialBadge(badgeId: string) {
    const hidden = loadHiddenOfficialBadges().filter(id => id !== badgeId);
    saveHiddenOfficialBadges(hidden);
    patchOrUnpatchSelfOverrides();
    updateHiddenBadgeWatchState();
    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
}

let originalGetUser: typeof UserStore.getUser | null = null;
let originalGetCurrentUser: typeof UserStore.getCurrentUser | null = null;

const NITRO_TIER_IDS = new Set(
    BADGE_CATALOG.filter(b => b.tierGroup === "nitro-sub" || b.id === "discord-nitro").map(b => b.id)
);

let selfOverrideVersion = 0;
const cloneCache = new WeakMap<object, { v: number; clone: any }>();

function makeSelfProxy<T extends object>(user: T): T {
    const cached = cloneCache.get(user);
    if (cached && cached.v === selfOverrideVersion) return cached.clone;

    const clone: any = Object.create(Object.getPrototypeOf(user));

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

    cloneCache.set(user, { v: selfOverrideVersion, clone });
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

const ENABLE_SELF_OVERRIDE = true;

function patchOrUnpatchSelfOverrides() {
    selfOverrideVersion++;
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

let originalRestGet: typeof RestAPI.get | null = null;

function stripHiddenBadgesFromProfilePayload(body: any) {
    if (!body) return;
    const hidden = loadHiddenOfficialBadges();
    if (!hidden.length) return;

    if (hidden.includes("all-badges")) {
        for (const container of [body, body.user_profile]) {
            if (Array.isArray(container?.badges)) container.badges = [];
        }
        return;
    }

    const hiddenRealIds = new Set<string>();
    const hiddenPrefixes: string[] = [];
    for (const h of hidden) {
        const mapped = REAL_BADGE_IDS[h];
        if (mapped) {
            mapped.ids?.forEach(id => hiddenRealIds.add(id));
            mapped.prefixes?.forEach(p => hiddenPrefixes.push(p));
        } else {
            hiddenRealIds.add(h.toLowerCase());
        }
    }

    for (const container of [body, body.user_profile]) {
        if (Array.isArray(container?.badges)) {
            container.badges = container.badges.filter((entry: any) => {
                const id = String(entry?.id ?? "").toLowerCase();
                if (hiddenRealIds.has(id)) return false;
                if (hiddenPrefixes.some(p => id.startsWith(p))) return false;
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

const NITRO_FAMILY_IMAGES = BADGE_CATALOG.filter(b => b.tierGroup === "nitro-sub" || b.id === "discord-nitro").map(b => b.image);
const BOOST_FAMILY_IMAGES = BADGE_CATALOG.filter(b => b.tierGroup === "server-boost").map(b => b.image);
const GIFTING_FAMILY_IMAGES = BADGE_CATALOG.filter(b => b.tierGroup === "gifting").map(b => b.image);

const NITRO_LABEL_PATTERN = /^(discord nitro|subscriber since\b)/i;
const HIDDEN_LABEL_PATTERNS: Record<string, RegExp> = {
    "discord-staff": /^discord staff$/i,
    "discord-nitro": NITRO_LABEL_PATTERN,
    "moderator-programs-alumni": /^moderator programs alumni$/i,
    "hypesquad-events": /^hypesquad events$/i,
    "hypesquad-bravery": /^hypesquad bravery$/i,
    "hypesquad-brilliance": /^hypesquad brilliance$/i,
    "hypesquad-balance": /^hypesquad balance$/i,
    "bug-hunter-tier-1": /bug hunter/i,
    "bug-hunter-tier-2": /bug hunter/i,
    "early-supporter": /^early supporter$/i,
    "partnered-server-owner": /^partnered server owner$/i,
    "early-verified-bot-developer": /^early verified bot developer$/i,
    "active-developer": /^active developer$/i,
    "booster-badge": /^server boosting since\b/i,
    "legacy-username": /^originally known as\b/i,
    "completed-a-quest": /^completed a quest$/i,
    "last-meadow-online": /^level .+ reached$/i,
    "orbs-apprentice": /orb profile badge/i,
    "discord-lootbox-clown": /clown/i,
};

function hiddenBadgeMatchers(): { urls: Set<string>; patterns: RegExp[] } {
    const urls = new Set<string>();
    const patterns: RegExp[] = [];
    for (const h of loadHiddenOfficialBadges()) {
        if (h === "booster-badge") {
            BOOST_FAMILY_IMAGES.forEach(u => urls.add(u));
        } else {
            const entry = BADGE_CATALOG.find(b => b.id === h);
            if (!entry) {
                if (/^[0-9a-f]{16,}$/i.test(h)) urls.add(`${BADGE_ICONS}/${h}.png`);
                continue;
            }
            if (NITRO_TIER_IDS.has(entry.id)) NITRO_FAMILY_IMAGES.forEach(u => urls.add(u));
            else if (entry.tierGroup === "server-boost") BOOST_FAMILY_IMAGES.forEach(u => urls.add(u));
            else if (entry.tierGroup === "gifting") GIFTING_FAMILY_IMAGES.forEach(u => urls.add(u));
            else urls.add(entry.image);
        }

        if (h === "gifting" || BADGE_CATALOG.find(b => b.id === h)?.tierGroup === "gifting") {
            patterns.push(/^gifting /i);
        } else if (NITRO_TIER_IDS.has(h)) {
            patterns.push(NITRO_LABEL_PATTERN);
        } else if (HIDDEN_LABEL_PATTERNS[h]) {
            patterns.push(HIDDEN_LABEL_PATTERNS[h]);
        }
    }
    return { urls, patterns };
}

function isOwnProfileContext(el: HTMLElement): boolean {
    const myId = getRealSelf()?.id;
    if (!myId) return false;
    let cur: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 25 && cur; i++) {
        const avatars = cur.querySelectorAll?.('img[src*="/avatars/"]');
        if (avatars?.length) {
            return [...avatars].some(a => {
                const src = (a as HTMLImageElement).src;
                return src.includes(`/avatars/${myId}/`) || src.includes(`/users/${myId}/avatars/`);
            });
        }
        cur = cur.parentElement;
    }
    return false;
}

function tryRemoveHiddenBadgeElements() {
    const hidden = loadHiddenOfficialBadges();
    if (!hidden.length) return;
    const nukeAll = hidden.includes("all-badges");
    const { urls, patterns } = hiddenBadgeMatchers();
    if (!nukeAll && !urls.size && !patterns.length) return;

    document.querySelectorAll('[role="group"][aria-label="User Badges"]').forEach(group => {
        if (!isOwnProfileContext(group as HTMLElement)) return;

        if (nukeAll) {
            group.querySelectorAll("img, svg").forEach(node => {
                const el = node as HTMLElement;
                if (el instanceof HTMLImageElement && el.style.pointerEvents === "none") return;
                const holder = (el.closest("a") ?? (el.parentElement !== group ? el.parentElement : null) ?? el) as HTMLElement;
                if (holder === group) return;
                if (holder.querySelector('img[style*="pointer-events: none"]')) return;
                holder.remove();
            });
            return;
        }

        group.querySelectorAll('img[src^="https://cdn.discordapp.com/badge-icons/"], img[src^="https://discord.com/assets/"]').forEach(node => {
            const img = node as HTMLImageElement;
            if (img.style.pointerEvents === "none") return;
            const holder = (img.closest("a") ?? img) as HTMLElement;
            const label = holder.getAttribute("aria-label") ?? "";
            if (urls.has(img.src) || patterns.some(p => p.test(label))) holder.remove();
        });
    });
}

let hiddenBadgeObserver: MutationObserver | null = null;

function startHiddenBadgeWatch() {
    if (hiddenBadgeObserver) return;
    hiddenBadgeObserver = new MutationObserver(() => {
        try {
            tryRemoveHiddenBadgeElements();
        } catch (e) {
            console.error("[Larp] Hidden badge DOM removal failed", e);
        }
    });
    hiddenBadgeObserver.observe(document.body, { childList: true, subtree: true });
    tryRemoveHiddenBadgeElements();
}

function stopHiddenBadgeWatch() {
    hiddenBadgeObserver?.disconnect();
    hiddenBadgeObserver = null;
}

function updateHiddenBadgeWatchState() {
    if (loadHiddenOfficialBadges().length > 0) startHiddenBadgeWatch();
    else stopHiddenBadgeWatch();
}

function removeAllBadgesNow(): number {
    const count = loadBadges().length;
    const officialIds = ["all-badges", ...new Set(BADGE_CATALOG.map(b =>
        b.tierGroup === "server-boost" ? "booster-badge"
            : b.tierGroup === "nitro-sub" ? "discord-nitro"
                : b.tierGroup === "gifting" ? "gifting-legend"
                    : b.id))];
    saveBadges([]);
    saveHiddenOfficialBadges([...new Set([...loadHiddenOfficialBadges(), ...officialIds])]);
    refreshRegisteredBadges();
    updateHiddenBadgeWatchState();
    try {
        tryRemoveHiddenBadgeElements();
    } catch (e) {
        console.error("[Larp] Immediate badge sweep failed", e);
    }
    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
    return count;
}

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

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) if (n.textContent?.trim()) textNodes.push(n as Text);

    if (textNodes.length >= 1) textNodes[0].textContent = settings.store.fakeAccountName || "Fake Account";
    if (textNodes.length >= 2) textNodes[1].textContent = settings.store.fakeAccountTag || "0000";

    const trailingIndicator = [...clone.children].reverse()
        .find(child => child.querySelector("svg") && !child.querySelector("img"));
    trailingIndicator?.remove();

    clone.style.cursor = "default";
    clone.addEventListener("click", e => {
        e.stopPropagation();
        e.preventDefault();
    }, true);

    return clone;
}

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
        if (!warnedNoInjectionPoint) {
            warnedNoInjectionPoint = true;
            console.warn("[Larp] Found the account switcher popout but couldn't locate the account row / list to inject into.", { manageAccountsLabel, manageAccountsRow, sourceRow, list });
        }
        return;
    }

    list.insertBefore(buildDecoyRow(sourceRow), sourceRow.nextElementSibling);
}

function getRealSelf(): any {
    return originalGetCurrentUser ? originalGetCurrentUser() : UserStore.getCurrentUser?.();
}

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
            if (parent.closest('[data-larp-decoy="true"]')) continue;
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
    runAccountSwitcherPass();
}

function stopAccountSwitcherWatch() {
    accountSwitcherObserver?.disconnect();
    accountSwitcherObserver = null;
}

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

const overriddenTextNodes = new Map<Text, { find: string; original: string }>();

function revertTextOverrides(find?: string): number {
    let reverted = 0;
    for (const [node, info] of [...overriddenTextNodes]) {
        if (find !== undefined && info.find !== find) continue;
        overriddenTextNodes.delete(node);
        if (!node.isConnected) continue;
        node.textContent = info.original;
        reverted++;
    }
    return reverted;
}

function tryApplyTextOverrides() {
    for (const node of [...overriddenTextNodes.keys()]) {
        if (!node.isConnected) overriddenTextNodes.delete(node);
    }

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
            const original = textNode.textContent!;
            textNode.textContent = original.replace(trimmed, match.replace);
            overriddenTextNodes.set(textNode, { find: match.find, original });
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
    try {
        tryApplyTextOverrides();
    } catch (e) {
        console.error("[Larp] Initial text override pass failed", e);
    }
}

function stopTextOverrideWatch() {
    textOverrideObserver?.disconnect();
    textOverrideObserver = null;
}

function updateTextOverrideWatchState() {
    if (loadTextOverrides().length > 0) startTextOverrideWatch();
    else stopTextOverrideWatch();
}

function undoTextOverrides(rawInput: string): string {
    const query = rawInput.replace(/^[`*_~"']+|[`*_~"']+$/g, "").trim();
    const list = loadTextOverrides();

    if (query.toLowerCase() === "all") {
        if (!list.length) return "No text overrides to remove.";
        saveTextOverrides([]);
        updateTextOverrideWatchState();
        const reverted = revertTextOverrides();
        return `Removed all ${list.length} text override${list.length === 1 ? "" : "s"} and reverted ${reverted} visible spot${reverted === 1 ? "" : "s"} back to normal.`;
    }

    let match: TextOverride | undefined;
    const asIndex = Number(query);
    if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= list.length) {
        match = list[asIndex - 1];
    } else {
        const q = query.toLowerCase();
        match = list.find(o => o.find === rawInput || o.replace === rawInput)
            ?? list.find(o => o.find === query || o.replace === query)
            ?? list.find(o => o.find.toLowerCase() === q || o.replace.toLowerCase() === q);
    }

    if (!match) {
        return `No override matching "${rawInput}". Use \`/larp texts\` to see them - you can pass the list number, the "find" text, or "all".`;
    }

    saveTextOverrides(list.filter(o => o.find !== match!.find));
    updateTextOverrideWatchState();
    const reverted = revertTextOverrides(match.find);
    return `Removed the override "${match.find}" → "${match.replace}" and reverted ${reverted} visible spot${reverted === 1 ? "" : "s"} back to normal.`;
}

function buildConfigObject() {
    return {
        version: 2,
        plugin: "Larp",
        badges: loadBadges().map(b => b.id),
        hiddenOfficialBadges: loadHiddenOfficialBadges(),
        settings: {
            enableUsernameOverride: !!settings.store.enableUsernameOverride,
            customUsername: settings.store.customUsername ?? "",
            flipBadgeOrder: !!settings.store.flipBadgeOrder,
            fakeBadgeEarnedDate: settings.store.fakeBadgeEarnedDate ?? "",
            enableFakeAccount: !!settings.store.enableFakeAccount,
            fakeAccountName: settings.store.fakeAccountName ?? "",
            fakeAccountTag: settings.store.fakeAccountTag ?? "",
            fakeAccountAvatarUrl: settings.store.fakeAccountAvatarUrl ?? "",
            textOverrides: loadTextOverrides()
        }
    };
}

function exportBadgeConfig(): string {
    return JSON.stringify(buildConfigObject(), null, 2);
}

const IMPORTABLE_BOOLEAN_SETTINGS = ["enableUsernameOverride", "flipBadgeOrder", "enableFakeAccount"] as const;
const IMPORTABLE_STRING_SETTINGS = ["customUsername", "fakeBadgeEarnedDate", "fakeAccountName", "fakeAccountTag", "fakeAccountAvatarUrl"] as const;

function importBadgeConfig(raw: string): { ok: boolean; message: string } {
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ok: false, message: "Import failed: not valid JSON. Nothing was changed." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, message: "Import failed: expected a JSON object. Nothing was changed." };
    }
    if (!Array.isArray(parsed.badges)) {
        return { ok: false, message: 'Import failed: missing a "badges" array. Nothing was changed.' };
    }

    const resolved: StoredBadge[] = [];
    const skipped: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed.badges) {
        const id = typeof item === "string" ? item
            : (item && typeof item === "object" && typeof item.id === "string" ? item.id : null);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const entry = BADGE_CATALOG.find(b => b.id === id);
        if (entry) resolved.push(entry);
        else skipped.push(id);
    }

    const importedHidden = Array.isArray(parsed.hiddenOfficialBadges)
        ? [...new Set(parsed.hiddenOfficialBadges.filter((h: any) => typeof h === "string" && h.length > 0 && h.length <= 100))] as string[]
        : null;

    removeAllBadgesNow();

    saveBadges(resolved);
    if (importedHidden?.length) saveHiddenOfficialBadges([...new Set([...loadHiddenOfficialBadges(), ...importedHidden])]);
    const hidden = loadHiddenOfficialBadges();

    let settingsApplied = 0;
    if (parsed.settings && typeof parsed.settings === "object" && !Array.isArray(parsed.settings)) {
        const s = parsed.settings;
        for (const key of IMPORTABLE_BOOLEAN_SETTINGS) {
            if (typeof s[key] === "boolean") {
                (settings.store as any)[key] = s[key];
                settingsApplied++;
            }
        }
        for (const key of IMPORTABLE_STRING_SETTINGS) {
            if (typeof s[key] === "string" && s[key].length <= 500) {
                (settings.store as any)[key] = s[key];
                settingsApplied++;
            }
        }
        if (Array.isArray(s.textOverrides)) {
            const overrides = s.textOverrides
                .filter((o: any) => o && typeof o === "object" && typeof o.find === "string" && o.find.length > 0 && typeof o.replace === "string")
                .map((o: any) => ({ find: o.find, replace: o.replace }));
            saveTextOverrides(overrides);
            settingsApplied++;
        }
    }

    refreshRegisteredBadges();
    updateHiddenBadgeWatchState();
    patchOrUnpatchSelfOverrides();
    updateAccountSwitcherWatchState();
    updateTextOverrideWatchState();
    runAccountSwitcherPass();
    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });

    const skippedNote = skipped.length ? ` Skipped ${skipped.length} unknown id(s): ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? ", ..." : ""}.` : "";
    const settingsNote = settingsApplied ? ` Applied ${settingsApplied} setting(s).` : "";
    return { ok: true, message: `Cleared old badges, then imported ${resolved.length} badge(s) and ${hidden.length} hidden official badge(s).${settingsNote}${skippedNote}` };
}

/* ------------------------------------------------------------------ *
 *  Global sync (self-hosted, zero commands)
 *
 *  Your Larp config is stored on YOUR OWN server (a VPS you control),
 *  keyed by your Discord user id and protected by a shared secret.
 *  Every device running the plugin pulls on startup and pushes a few
 *  seconds after any change - no commands, no setup rituals, just fill
 *  in the server URL + secret once in the plugin settings.
 *
 *  Because the backend is your own box, no third party ever sees your
 *  traffic or IP. The network call is made from Electron's main process
 *  via native.ts, so Discord's CSP does not block it.
 * ------------------------------------------------------------------ */

type SyncNative = {
    syncPull(baseUrl: string, userId: string, secret: string): Promise<{ status: number; data: string; }>;
    syncPush(baseUrl: string, userId: string, secret: string, payload: string): Promise<{ status: number; data: string; }>;
};

function getSyncNative(): SyncNative | undefined {
    return (globalThis as any).VencordNative?.pluginHelpers?.Larp as SyncNative | undefined;
}

function syncServerUrl(): string {
    return (settings.store.syncServerUrl ?? "").trim().replace(/\/+$/, "");
}

function syncSecret(): string {
    return (settings.store.syncSecret ?? "").trim();
}

function syncConfigured(): boolean {
    return !!syncServerUrl() && !!syncSecret();
}

function myUserId(): string | undefined {
    return (getRealSelf() ?? UserStore.getCurrentUser?.())?.id;
}

function noteSyncError(msg: string) {
    settings.store.syncLastError = msg;
    console.warn("[Larp] sync:", msg);
}

async function syncPush(): Promise<{ ok: boolean; message: string }> {
    if (!syncConfigured()) return { ok: false, message: "Sync isn't set up. Add your server URL and secret in Settings → Plugins → Larp." };
    const native = getSyncNative();
    if (!native) return { ok: false, message: "Sync needs the desktop app (native support). It won't run in the browser build." };
    const userId = myUserId();
    if (!userId) return { ok: false, message: "Couldn't resolve your user id yet - try again in a moment." };

    const payload = JSON.stringify({ updatedAt: Date.now(), config: buildConfigObject() });
    try {
        const res = await native.syncPush(syncServerUrl(), userId, syncSecret(), payload);
        if (res.status < 200 || res.status >= 300) {
            const m = `Push failed (HTTP ${res.status}). ${res.data?.slice(0, 200) ?? ""}`.trim();
            noteSyncError(m);
            return { ok: false, message: m };
        }
        settings.store.syncLastPush = Date.now();
        settings.store.syncLastError = "";
        return { ok: true, message: "Pushed your config to your server." };
    } catch (e) {
        const m = `Push failed: ${e instanceof Error ? e.message : String(e)}`;
        noteSyncError(m);
        return { ok: false, message: m };
    }
}

let lastAppliedUpdatedAt = 0;

async function syncPull(): Promise<{ ok: boolean; message: string }> {
    if (!syncConfigured()) return { ok: false, message: "Sync isn't set up. Add your server URL and secret in Settings → Plugins → Larp." };
    const native = getSyncNative();
    if (!native) return { ok: false, message: "Sync needs the desktop app (native support). It won't run in the browser build." };
    const userId = myUserId();
    if (!userId) return { ok: false, message: "Couldn't resolve your user id yet - try again in a moment." };

    try {
        const res = await native.syncPull(syncServerUrl(), userId, syncSecret());
        if (res.status === 404) return { ok: true, message: "Nothing stored on the server yet - it'll be created on your next change." };
        if (res.status < 200 || res.status >= 300) {
            const m = `Pull failed (HTTP ${res.status}). ${res.data?.slice(0, 200) ?? ""}`.trim();
            noteSyncError(m);
            return { ok: false, message: m };
        }

        let parsed: any;
        try {
            parsed = JSON.parse(res.data);
        } catch {
            const m = "Pull failed: server returned invalid JSON.";
            noteSyncError(m);
            return { ok: false, message: m };
        }

        const remote = parsed?.config ?? parsed;
        const updatedAt: number = Number(parsed?.updatedAt ?? 0);
        if (updatedAt && updatedAt <= lastAppliedUpdatedAt) {
            return { ok: true, message: "Already up to date." };
        }

        const result = importBadgeConfig(JSON.stringify(remote));
        if (result.ok) {
            lastAppliedUpdatedAt = updatedAt || Date.now();
            settings.store.syncLastPull = Date.now();
            settings.store.syncLastError = "";
        }
        return { ok: result.ok, message: result.ok ? `Pulled config from your server. ${result.message}` : result.message };
    } catch (e) {
        const m = `Pull failed: ${e instanceof Error ? e.message : String(e)}`;
        noteSyncError(m);
        return { ok: false, message: m };
    }
}

let autoPushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoPush() {
    if (!settings.store.autoSync || !syncConfigured()) return;
    if (autoPushTimer) clearTimeout(autoPushTimer);
    autoPushTimer = setTimeout(() => {
        autoPushTimer = null;
        syncPush();
    }, 4000);
}

async function autoSyncOnStart() {
    if (!settings.store.autoSync || !syncConfigured()) return;
    // Give Discord a moment to populate the current user before pulling.
    setTimeout(() => { syncPull(); }, 3000);
}

function ImportExportSection() {
    const [text, setText] = React.useState("");
    const [status, setStatus] = React.useState("");

    const boxStyle: React.CSSProperties = {
        width: "100%", minHeight: 120, resize: "vertical", boxSizing: "border-box",
        background: "var(--input-background, rgba(0,0,0,0.3))",
        color: "var(--text-normal, #dbdee1)",
        border: "1px solid var(--background-modifier-accent, rgba(255,255,255,0.1))",
        borderRadius: 4, padding: 8, fontFamily: "var(--font-code, monospace)", fontSize: 12
    };
    const buttonStyle: React.CSSProperties = {
        background: "var(--brand-500, #5865f2)", color: "#fff", border: "none",
        borderRadius: 4, padding: "8px 14px", cursor: "pointer", marginRight: 8
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text variant="heading-md/semibold">Badge Configuration Export / Import</Text>
            <Text variant="text-sm/normal" style={{ opacity: 0.7 }}>
                Export writes your full Larp configuration (added badges in order, hidden official badges, username override, fake badge earned date, fake account settings, and text overrides) into the box as JSON. Import validates the JSON, removes all your current badges first, then applies the imported badges and settings - only your own profile is affected, and the UI updates immediately.
            </Text>
            <textarea
                style={boxStyle}
                value={text}
                placeholder='{"version": 1, "badges": ["discord-staff", ...], "hiddenOfficialBadges": [...]}'
                onChange={e => setText((e.target as HTMLTextAreaElement).value)}
            />
            <div>
                <button style={buttonStyle} onClick={() => { setText(exportBadgeConfig()); setStatus("Exported current configuration to the box. Copy it somewhere safe."); }}>
                    Export
                </button>
                <button style={buttonStyle} onClick={() => { const r = importBadgeConfig(text); setStatus(r.message); }}>
                    Import
                </button>
            </div>
            {status && <Text variant="text-sm/normal" style={{ opacity: 0.85 }}>{status}</Text>}
        </div>
    );
}

function SyncSection() {
    const [status, setStatus] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    const buttonStyle: React.CSSProperties = {
        background: "var(--brand-500, #5865f2)", color: "#fff", border: "none",
        borderRadius: 4, padding: "8px 14px", cursor: busy ? "default" : "pointer", marginRight: 8, opacity: busy ? 0.6 : 1
    };

    const run = async (fn: () => Promise<{ ok: boolean; message: string; }>) => {
        setBusy(true);
        setStatus("Working...");
        const r = await fn();
        setStatus(r.message);
        setBusy(false);
    };

    const fmt = (t: number) => t ? new Date(t).toLocaleString() : "never";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text variant="heading-md/semibold">Global Sync (self-hosted)</Text>
            <Text variant="text-sm/normal" style={{ opacity: 0.7 }}>
                Fill in the URL of your own server and a secret below, and Larp syncs your whole config across every device automatically - it pulls on startup and pushes a few seconds after any change. Your config is keyed by your Discord user id and never touches any third party, only your server. See GLOBAL-SYNC.md next to this plugin for the ready-made server and setup steps. Leave the fields blank to disable sync entirely.
            </Text>
            <div>
                <button style={buttonStyle} disabled={busy} onClick={() => run(syncPush)}>Push now</button>
                <button style={buttonStyle} disabled={busy} onClick={() => run(syncPull)}>Pull now</button>
            </div>
            <Text variant="text-xs/normal" style={{ opacity: 0.6 }}>
                Last push: {fmt(settings.store.syncLastPush as number)} · Last pull: {fmt(settings.store.syncLastPull as number)}
                {settings.store.syncLastError ? ` · Last error: ${settings.store.syncLastError}` : ""}
            </Text>
            {status && <Text variant="text-sm/normal" style={{ opacity: 0.85 }}>{status}</Text>}
        </div>
    );
}

const settings = definePluginSettings({
    importExport: {
        type: OptionType.COMPONENT,
        description: "Export or import your badge configuration",
        component: ImportExportSection
    },
    sync: {
        type: OptionType.COMPONENT,
        description: "Global sync status and manual controls",
        component: SyncSection
    },
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
    },
    syncServerUrl: {
        type: OptionType.STRING,
        description: "Global sync: base URL of YOUR server, e.g. https://sync.example.com (leave blank to disable sync)",
        default: "",
        onChange: () => { autoSyncOnStart(); }
    },
    syncSecret: {
        type: OptionType.STRING,
        description: "Global sync: the shared secret token your server expects (must match SYNC_SECRET on the server)",
        default: "",
        onChange: () => { autoSyncOnStart(); }
    },
    autoSync: {
        type: OptionType.BOOLEAN,
        description: "Global sync: pull on startup and auto-push a few seconds after any change (needs the server URL + secret above)",
        default: true,
        onChange: () => { autoSyncOnStart(); }
    },
    syncLastError: {
        type: OptionType.STRING,
        description: "internal storage: last sync error message",
        default: "",
        hidden: true
    },
    syncLastPush: {
        type: OptionType.NUMBER,
        description: "internal storage: timestamp of last sync push",
        default: 0,
        hidden: true
    },
    syncLastPull: {
        type: OptionType.NUMBER,
        description: "internal storage: timestamp of last sync pull",
        default: 0,
        hidden: true
    }
});

export default definePlugin({
    name: "Larp",
    description: "Locally override username, add/remove real-looking badges, hide official badges you own, drop a decoy entry into your account switcher, and sync your config across devices - visible only to you. Everything lives under one command: /larp (start with /larp help)",
    authors: [Larp_AUTHOR, Larp_AUTHOR_2, Larp_AUTHOR_3],
    settings,

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
                    name: "remove", description: "Remove an added badge (or \"all\"); also hides any real badge you own", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Number, id, or description from /larp list - or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                { name: "list", description: "List the badges you've added", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                {
                    name: "hide", description: "Hide an official Discord badge on your profile", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Badge id (see /larp official), or a raw id from /larp real", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                {
                    name: "unhide", description: "Show a previously hidden official badge again (or \"all\")", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "badge", description: "Badge id (see /larp official), or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                { name: "official", description: "List the official badges on your account (hide/unhide targets)", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
                { name: "export", description: "Export your badge configuration as JSON (import it in Settings → Plugins → Larp)", type: ApplicationCommandOptionType.SUB_COMMAND, options: [] },
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
                    name: "untext", description: "Remove text override(s) and revert the on-screen text back to normal", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "find", description: "Number or \"find\" text from /larp texts, or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
                },
                {
                    name: "textundo", description: "Undo a text override and revert what's on screen back to normal (or \"all\")", type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [{ name: "text", description: "Number or exact \"find\" text from /larp texts, or \"all\"", type: ApplicationCommandOptionType.STRING, required: true }]
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
                            "`/larp remove <id|all>` — take added badge(s) off; also hides any real badge you own",
                            "`/larp list` — what you've added",
                            "`/larp hide <id>` / `/larp unhide <id>` — hide/show official badges",
                            "`/larp official` — which official badges your account actually has",
                            "`/larp export` — dump your badge config as JSON (import lives in Settings → Plugins → Larp)",
                            "`/larp milestones` — Nitro/Boost milestone ladder",
                            "`/larp real [user-id]` — exact badge art URLs from a live profile",
                            "`/larp text <find> <replace>` / `/larp texts` — add / list UI text overrides",
                            "`/larp untext <number|find|all>` (or `/larp textundo`) — remove override(s) and revert the on-screen text back to normal",
                            "",
                            "Global sync across your devices runs automatically once you set your server URL + secret in Settings → Plugins → Larp (self-hosted, no third-party server).",
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
                            const cleared = removeAllBadgesNow();
                            say(`Cleared ${cleared} added badge${cleared === 1 ? "" : "s"} and hid every official badge (boost, quest, Last Meadow, orbs, gifting, etc.). Use \`/larp unhide all\` to show your real badges again.`);
                            break;
                        }

                        const q = query.toLowerCase();
                        const qId = q.replace(/\s+/g, "-");
                        let match: StoredBadge | undefined;
                        const asIndex = Number(query);
                        if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= badges.length) {
                            match = badges[asIndex - 1];
                        } else {
                            match = badges.find(b => b.id.toLowerCase() === q || b.id.toLowerCase() === qId || b.description.toLowerCase() === q);
                        }

                        if (match) {
                            saveBadges(badges.filter(b => b.id !== match!.id));
                            refreshRegisteredBadges();
                            say(`Removed "${match.description}".`);
                            break;
                        }

                        const officialMatch = BADGE_CATALOG.find(
                            b => b.id.toLowerCase() === q || b.id.toLowerCase() === qId || b.description.toLowerCase() === q
                        );
                        const isBoostQuery = officialMatch?.tierGroup === "server-boost"
                            || /^boost(er)?(-badge)?$/.test(qId)
                            || /^boost-\d+m$/.test(qId)
                            || qId === "server-boosting"
                            || q.startsWith("server boosting");
                        const hideId = isBoostQuery ? "booster-badge" : (officialMatch?.id ?? query);
                        const hideLabel = isBoostQuery ? "Server Boosting" : (officialMatch?.description ?? query);

                        const hidden = loadHiddenOfficialBadges();
                        if (hidden.includes(hideId)) {
                            say(`"${hideLabel}" is already hidden.`);
                            break;
                        }

                        hideOfficialBadge(hideId);
                        const rawNote = officialMatch || isBoostQuery ? "" : " (treated as a raw Discord badge id - use `/larp real` to see the exact ids on your profile)";
                        const nitroNote = NITRO_TIER_IDS.has(hideId)
                            ? " Heads up: Discord doesn't let a client hide just the tenure decoration, so this also hides your plain Discord Nitro badge - they're not separable."
                            : "";
                        say(`Hid the official "${hideLabel}" badge${rawNote}.${nitroNote} Use \`/larp unhide\` to bring it back.`);
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
                        const rawId = opt("badge");
                        const normId = rawId.toLowerCase().replace(/\s+/g, "-");
                        const id = (/^boost(er)?(-badge)?$/.test(normId) || /^boost-\d+m$/.test(normId) || normId === "server-boosting")
                            ? "booster-badge" : rawId;
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
                        if (id.toLowerCase() === "all") {
                            const count = loadHiddenOfficialBadges().length;
                            saveHiddenOfficialBadges([]);
                            updateHiddenBadgeWatchState();
                            FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCEED" });
                            say(`Unhid ${count} badge${count === 1 ? "" : "s"} - your real badges will show again.`);
                            break;
                        }
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
                        const officialTargets: { id: string; description: string }[] = [];
                        for (const b of BADGE_CATALOG) {
                            if (b.tierGroup === "server-boost") {
                                if (!officialTargets.some(t => t.id === "booster-badge")) {
                                    officialTargets.push({ id: "booster-badge", description: "Server Boosting (all tenures, 1 Month - 2 Years)" });
                                }
                                continue;
                            }
                            officialTargets.push(b);
                        }
                        const ownership = await Promise.all(officialTargets.map(async b => [b, await ownsOfficialBadge(b.id)] as const));
                        const owned = ownership.filter(([, o]) => o === true).map(([b]) => b);
                        const unverifiable = ownership.filter(([, o]) => o === null).map(([b]) => b);

                        const ownedText = owned.length
                            ? owned.map(b => `${hidden.includes(b.id) ? "👻" : "✅"} \`${b.id}\`  —  ${b.description}`).join("\n")
                            : "None detected on your account.";

                        const unverifiableText = unverifiable.length
                            ? `\n\nCan't verify ownership for these (Discord doesn't expose tenure length, quests, or orbs to a client-side plugin), so they're not auto-filtered - use \`/larp hide\` or \`/larp remove\` directly if you own one and want it hidden:\n${unverifiable.map(b => `❔ \`${b.id}\`  —  ${b.description}`).join("\n")}`
                            : "";

                        say(`Official badges you currently have (👻 = hidden, ✅ = showing):\n${ownedText}${unverifiableText}`);
                        break;
                    }

                    case "export": {
                        say(`Your badge configuration - paste this into Settings → Plugins → Larp → Import to restore it:\n\`\`\`json\n${exportBadgeConfig()}\n\`\`\``);
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
                        revertTextOverrides(find);
                        const list = loadTextOverrides().filter(o => o.find !== find);
                        list.push({ find, replace });
                        saveTextOverrides(list);
                        updateTextOverrideWatchState();
                        try {
                            tryApplyTextOverrides();
                        } catch (e) {
                            console.error("[Larp] Text override apply failed", e);
                        }
                        say(`Now replacing "${find}" with "${replace}" anywhere it appears exactly - applied live. Remove it with \`/larp untext\` or \`/larp textundo\`.`);
                        break;
                    }

                    case "untext": {
                        say(undoTextOverrides(opt("find")));
                        break;
                    }

                    case "textundo": {
                        say(undoTextOverrides(opt("text")));
                        break;
                    }

                    case "texts": {
                        const list = loadTextOverrides();
                        const text = list.length
                            ? `${list.map((o, i) => `${i + 1}. "${o.find}" → "${o.replace}"`).join("\n")}\n\nRevert one with \`/larp textundo <number>\` (or the "find" text), or all of them with \`/larp textundo all\`.`
                            : "No text overrides yet. Use `/larp text`.";
                        say(text);
                        break;
                    }

                    default:
                        say("Unknown subcommand - try `/larp help`.");
                }

                if (["add", "remove", "hide", "unhide", "text", "untext", "textundo"].includes(sub?.name ?? "")) {
                    scheduleAutoPush();
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
        updateHiddenBadgeWatchState();
        document.addEventListener("dragstart", blockBadgeDrag, true);
        autoSyncOnStart();
    },

    stop() {
        for (const cmd of (this as any).commands ?? []) {
            for (const opt of cmd.options ?? []) {
                unregisterCommand(`${cmd.name} ${opt.name}`);
            }
        }

        if (autoPushTimer) { clearTimeout(autoPushTimer); autoPushTimer = null; }
        document.removeEventListener("dragstart", blockBadgeDrag, true);
        unpatchSelfOverrides();
        unpatchRestApi();
        stopAccountSwitcherWatch();
        stopTextOverrideWatch();
        revertTextOverrides();
        stopHiddenBadgeWatch();
        document.querySelectorAll('[data-larp-decoy="true"]').forEach(el => el.remove());
        for (const id of [...registeredBadges.keys()]) unregisterBadge(id);
    },
});
