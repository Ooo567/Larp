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

All /larp Commands

/larp help → Full list
/larp catalog → Browse badges
/larp add <id|all> → Add badge(s)
/larp remove <id|all> → Remove badge(s)
/larp list → Show your added badges
/larp hide <id> / /larp unhide <id> → Hide real badges
/larp official → See your actual owned badges
/larp milestones → Nitro/Boost ladder
/larp real [user-id] → Get real badge URLs

Text Replacement (Change dates, Member Since, etc.)

/larp text <find> <replace> → Replace any exact UI text including join date
/larp untext <find> → Remove replacement
/larp texts → List active replacements

Username override + fake account + fake earned date settings are in Settings → Plugins → Larp

Releases
Download latest index.tsx from the Releases page.
Disclaimer
Client-side only. Visible only to you. Use at your own risk.

Made with ❤️ by Ooo & kt

---
## Installation (Equicord)
### Recommended: As Userplugin

**Requirements:**
- [Node.js](https://nodejs.org)
- [Git](https://git-scm.com/download/win)

**After installing both, restart your PC.**

Then open Command Prompt and run:

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
