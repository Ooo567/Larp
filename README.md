# Larp - Equicord/Vencord Userplugin

**Client-side only:** Changes what **you** see, not what others see.

## Features
- Locally override your own `@username` (display name untouched)
- Add/remove real Discord badges from a curated catalog (visible only to you)
- Hide official Discord badges you actually own
- Drop a decoy entry into your account switcher popout

## Made by
- **@vibcode** (Discord: 1497451226806353980)
- **@ragebotted** (Discord: 893913378093944873)

---

## Installation (Equicord)

### Option 1: As Userplugin (Recommended)

1. Build Equicord yourself (follow their guide)
2. Place `index.tsx` into your `src/userplugins` folder
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

**Username override, fake account decoy, etc.** are configured in **Settings → Plugins → Larp**

## Releases

Download the latest version from the [Releases page](https://github.com/Ooo567/larp-plugin/releases).

## Contributing
Feel free to open issues or PRs!

## Disclaimer
This is a client-side modification. Use at your own risk. Only affects what **you** see.

---

**Original author credit in code:** Larp (with improvements by vibcode & ragebotted)

```bash
cd %USERPROFILE%\Documents
git clone https://github.com/Equicord/Equicord
npm i -g pnpm
cd Equicord
pnpm install --no-frozen-lockfile
pnpm build --dev
pnpm inject
cd src
mkdir userplugins
cd userplugins
git clone https://github.com/Ooo567/Larp.git
cd ..\..
pnpm build --dev