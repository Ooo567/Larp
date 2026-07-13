# Larp - Equicord/Vencord Userplugin

**Client-side only:** Changes what **you** see, not what others see.

## Features
- Locally override your own `@username` (display name untouched)
- Add/remove real Discord badges from a curated catalog (visible only to you)
- Hide official Discord badges you actually own
- Drop a decoy entry into your account switcher popout
- Global sync across your own devices (self-hosted server)

## Made by
- **@vibcode** (Discord: 1497451226806353980)
- **@ragebotted** (Discord: 893913378093944873)
- **@baviolie** (Discord: 1381714138476318821)

---

## Installation (Equicord)

### Option 1: As Userplugin (Recommended)

1. Build Equicord yourself (follow their guide)
2. Place `index.tsx` and `native.ts` into your `src/userplugins/CustomBadges` folder
3. Restart Equicord / rebuild
4. Enable the **Larp** plugin in Settings → Plugins
5. Use `/larp help` in any channel for commands

### Option 2: Via Plugin Manager (if supported)
- Some forks allow loading `.tsx` userplugins directly.

## Usage

All features are under the `/larp` command:

- `/larp help` — Full command list
- `/larp catalog` — Browse available badges
- `/larp add <id|all>` — Add badge(s)
- `/larp remove <id|all>` — Remove badge(s)
- `/larp list` — Your current badges
- `/larp hide <id>` / `/larp unhide <id>` — Hide official badges
- `/larp official` — See your real owned badges
- `/larp milestones` — Nitro/Boost badge ladder
- `/larp real [user-id]` — Debug real badge URLs
- `/larp text <find> <replace>` - Replace any exact UI text including join date
- `/larp untext <find>` - Remove replacement
- `/larp texts` - List active replacements

**Username override, fake account decoy, etc.** are configured in **Settings → Plugins → Larp**

## Global Sync

Want your config synced across devices, or access to the shared sync server used by this group? DM **@vibcoded** (Discord user ID: 1497451226806353980) for the server URL and secret. Do not ask for these in public channels or issues.

## Releases

Download the latest version from the [Releases page](https://github.com/Ooo567/larp-plugin/releases).

## Contributing
Feel free to open issues or PRs!

## Disclaimer
This is a client-side modification. Use at your own risk. Only affects what **you** see.

---

made by Ooo & kt & bav
