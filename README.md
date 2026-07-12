# Larp - Equicord/Vencord Userplugin

**Client-side only:** Changes what **you** see, not what others see.

## Features
- Locally override your own `@username`
- Add/remove real-looking Discord badges (curated catalog)
- Hide official Discord badges you actually own
- Add a decoy account in your account switcher
- Change badge earned dates and other UI text

## Made by
- **@vibcode** (Discord: 1497451226806353980)
- **@ragebotted** (Discord: 893913378093944873)

---

## Installation (Equicord)

### Recommended: As Userplugin

1. Build Equicord from source
2. Put `index.tsx` in your `src/userplugins` folder (create folder `larp` if you want)
3. Rebuild Equicord
4. Go to **Settings → Plugins** and enable **Larp**
5. Type `/larp help` in any chat for commands

---

## All /larp Commands

- `/larp help` → Full list
- `/larp catalog` → Browse badges
- `/larp add <id|all>` → Add badge(s)
- `/larp remove <id|all>` → Remove badge(s)
- `/larp list` → Show your added badges
- `/larp hide <id>` / `/larp unhide <id>` → Hide real badges
- `/larp official` → See your actual owned badges
- `/larp milestones` → Nitro/Boost ladder
- `/larp real [user-id]` → Get real badge URLs

### Text Replacement (Change dates, Member Since, etc.)
- `/larp text <find> <replace>` → Replace any exact UI text including join date
- `/larp untext <find>` → Remove replacement
- `/larp texts` → List active replacements

Username override + fake account + fake earned date settings are in **Settings → Plugins → Larp**

---

## Releases
Download latest `index.tsx` from the [Releases page](https://github.com/Ooo567/Larp/releases).

## Disclaimer
Client-side only. Visible only to you. Use at your own risk.

---

Made with ❤️ by Ooo & kt