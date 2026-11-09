# Creator Intelligence AI — সম্পূর্ণ বাংলা সেটআপ গাইড

এটি একটি AI-চালিত YouTube Creator Intelligence প্ল্যাটফর্ম — একটি Chrome Extension + Node.js ব্যাকএন্ড (vidIQ / TubeBuddy-এর মতো)।

এই গাইডে ধাপে ধাপে দেখানো হয়েছে কীভাবে পুরো প্রজেক্টটি নিজের কম্পিউটারে চালাবেন।

---

## ধাপ ০: যা যা লাগবে (প্রয়োজনীয় সফটওয়্যার)

আগে এই তিনটি জিনিস ইনস্টল করুন:

| সফটওয়্যার | কোথায় পাবেন | কেন লাগবে |
| --- | --- | --- |
| Node.js (v20 বা তার নতুন) | https://nodejs.org | ব্যাকএন্ড ও এক্সটেনশন বিল্ড করতে |
| Docker Desktop | https://www.docker.com/products/docker-desktop | PostgreSQL ডাটাবেস ও Redis চালাতে |
| Google Chrome | https://www.google.com/chrome | এক্সটেনশন লোড করতে |

চেক করার উপায় — টার্মিনাল/কমান্ড প্রম্পটে লিখুন:

```bash
node -v      # v20.x বা তার বেশি দেখালে ঠিক আছে
docker -v    # Docker version দেখালে ঠিক আছে
```

---

## ধাপ ১: জিপ ফাইল খোলা (Unzip)

1. `creator-intelligence-ai.zip` ফাইলটি ডাউনলোড করুন।
2. ফাইলটিতে ডাবল ক্লিক করে বা রাইট-ক্লিক → "Extract All" দিয়ে আনজিপ করুন।
3. যেখানে আনজিপ করবেন সেই ফোল্ডারটি মনে রাখুন (যেমন: `Downloads/creator-intelligence-ai`)।

টার্মিনালে ঢোকার নিয়ম:

```bash
cd creator-intelligence-ai
```

---

## ধাপ ২: Google Cloud অ্যাকাউন্ট সেটআপ (সবচেয়ে গুরুত্বপূর্ণ ধাপ)

এই প্রজেক্ট শুধুই অফিসিয়াল YouTube API ব্যবহার করে। তাই Google থেকে **২টি কী (key)** নিতে হবে।

### ২.১ প্রজেক্ট তৈরি ও API চালু করা

1. ব্রাউজারে যান: https://console.cloud.google.com
2. উপরের ড্রপডাউন থেকে **"New Project"** → নাম দিন (যেমন `creator-intelligence`) → **Create**।
3. বাম মেনু থেকে **"APIs & Services" → "Library"**-তে যান।
4. সার্চ করে এই ৩টি API আলাদা করে খুলুন এবং প্রতিটির জন্য **Enable** চাপুন:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
   - **Google+ API / People API** (সাইন-ইনের জন্য)

### ২.২ API Key তৈরি (প্রথম কী)

1. **"APIs & Services" → "Credentials"** → **"+ Create Credentials" → "API key"**।
2. একটি কী তৈরি হবে — এটি কপি করে রাখুন। **এটিই আপনার `YOUTUBE_API_KEY`।**

### ২.৩ OAuth Client তৈরি (দ্বিতীয় কী)

1. **Credentials** পেজেই প্রথমে **"Configure Consent Screen"** চাপুন:
   - User Type: **External** → অ্যাপের নাম দিন → নিজের ইমেইল দিন।
   - **Scopes** ধাপে যোগ করুন: `youtube.readonly`, `yt-analytics.readonly`, `userinfo.email`, `userinfo.profile`।
   - **Test users**-এ নিজের Gmail যোগ করুন (খুব জরুরি — না হলে সাইন-ইন হবে না)।
2. এবার **"+ Create Credentials" → "OAuth client ID"**:
   - Application type: **Web application**।
   - **Authorized redirect URIs**-এ হুবহু এটি বসান:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
   - **Create** চাপলে **Client ID** ও **Client Secret** পাবেন — দুটোই কপি করে রাখুন।

---

## ধাপ ৩: ডাটাবেস চালু করা (PostgreSQL + Redis)

টার্মিনাল খুলে প্রজেক্টের মূল ফোল্ডারে গিয়ে লিখুন:

```bash
docker compose up -d postgres redis
```

চলছে কিনা দেখতে:

```bash
docker compose ps
```

দুটোই "running" দেখালে ঠিক আছে।

---

## ধাপ ৪: ব্যাকএন্ড কনফিগার করা (.env ফাইল)

```bash
cd apps/backend
cp .env.example .env
```

এবার `.env` ফাইলটি যেকোনো টেক্সট এডিটরে (Notepad/VS Code) খুলে এই ঘরগুলো পূরণ করুন:

| ঘর (field) | কী বসাবেন |
| --- | --- |
| `ENCRYPTION_KEY` | নিচের কমান্ড দিয়ে বানান |
| `JWT_SECRET` | নিচের কমান্ড দিয়ে বানান |
| `GOOGLE_CLIENT_ID` | ধাপ ২.৩-এর Client ID |
| `GOOGLE_CLIENT_SECRET` | ধাপ ২.৩-এর Client Secret |
| `YOUTUBE_API_KEY` | ধাপ ২.২-এর API Key |

সিক্রেট বানানোর কমান্ড (দুইবার চালান, প্রতিবার নতুন মান পাবেন):

```bash
openssl rand -hex 32
```

> Windows-এ openssl না থাকলে Node.js দিয়ে: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## ধাপ ৫: ইনস্টল, ডাটাবেস তৈরি ও ব্যাকএন্ড চালু

প্রজেক্টের **মূল ফোল্ডারে** ফিরে গিয়ে:

```bash
npm install          # সব প্যাকেজ ইনস্টল হবে (কয়েক মিনিট লাগতে পারে)
npm run db:migrate   # ডাটাবেসের টেবিলগুলো তৈরি হবে
npm run dev:backend  # ব্যাকএন্ড চালু হবে
```

ব্যাকএন্ড চালু হয়েছে কিনা দেখতে, নতুন একটি টার্মিনাল খুলে:

```bash
curl http://localhost:3000/api/health
```

`{"status":"ok"}` জাতীয় উত্তর এলে ব্যাকএন্ড সফল! ✅

**মনে রাখবেন:** `npm run dev:backend` টার্মিনালটি বন্ধ করবেন না — এটি চালু থাকতে হবে।

---

## ধাপ ৬: এক্সটেনশন Chrome-এ অ্যাড করা

### 🎉 সুখবর: এক্সটেনশনটি **আগেই বিল্ড করা** জিপের ভিতরে দেওয়া আছে!

জিপটি আনজিপ করলেই `apps/extension/dist` ফোল্ডারে **রেডিমেড এক্সটেনশন** পাবেন — নিজে কিছু বিল্ড করতে হবে না।

সরাসরি এই ধাপগুলো করুন:

1. Chrome খুলুন → অ্যাড্রেস বারে টাইপ করুন: `chrome://extensions` এন্টার দিন।
2. ডান-উপরের কোণায় **Developer mode** টগল **চালু (ON)** করুন।
3. উপরে বাম দিকে **"Load unpacked"** বাটনে ক্লিক করুন।
4. ফাইল সিলেক্টর খুলবে — আনজিপ করা ফোল্ডারে গিয়ে এই ফোল্ডারটি সিলেক্ট করুন:
   ```
   creator-intelligence-ai/apps/extension/dist
   ```
   ⚠️ **সাবধান:** `extension` ফোল্ডার নয় — তার ভিতরের **`dist`** ফোল্ডারটি সিলেক্ট করতে হবে!
5. এক্সটেনশন লিস্টে **"Creator Intelligence AI"** কার্ড দেখা যাবে ✅
6. Chrome-এর টুলবারে পাজল 🧩 আইকনে ক্লিক করে → "Creator Intelligence AI"-এর পাশের 📌 পিন আইকন চাপুন — টুলবারে আইকনটি পিন হয়ে যাবে।

### নিজে বিল্ড করতে চাইলে (ঐচ্ছিক — ডেভেলপারদের জন্য)

```bash
cd apps/extension
npm run build        # dist/ ফোল্ডার নতুন করে তৈরি হবে
```

তারপর উপরের ১-৬ নম্বর ধাপগুলোই করুন।

---

## ধাপ ৭: সাইন-ইন ও ডাটা সিঙ্ক

1. টুলবারের এক্সটেনশন আইকনে ক্লিক করুন → **"Sign in with Google"** চাপুন।
2. যে Google অ্যাকাউন্টে আপনার YouTube চ্যানেল আছে সেটি দিয়ে লগইন করুন।
3. পারমিশন চাইলে **Allow** দিন (শুধু read-only পারমিশন — কোনো ডাটা মুছতে পারবে না)।
4. সাইড প্যানেলের **Overview**-তে **"Sync"** চাপুন — আপনার চ্যানেলের ডাটা ও ৯০ দিনের অ্যানালিটিক্স আসবে।

এবার সব ফিচার ব্যবহার করা যাবে:
- 📊 **Overview** — সাবস্ক্রাইবার, ভিউ, ওয়াচ টাইমের হিসাব
- 🔍 **Keyword Explorer** — কীওয়ার্ড রিসার্চ
- 🎯 **SEO Intelligence** — ভিডিওর SEO স্কোর ও উন্নতির পরামর্শ
- 🥊 **Competitors** — প্রতিযোগী চ্যানেল ট্র্যাকিং
- 🤖 **AI Studio / Assistant** — AI দিয়ে ভিডিও আইডিয়া, স্ক্রিপ্ট, টাইটেল

---

## ধাপ ৮ (ঐচ্ছিক): AI ফিচার চালু করা

AI ফিচারগুলোর জন্য যেকোনো একটির API key লাগবে: **Anthropic (Claude) / OpenAI (ChatGPT) / Google Gemini**।

- সবচেয়ে সহজ: https://aistudio.google.com থেকে ফ্রি Gemini API key নিন।
- এক্সটেনশনের **Settings → AI providers**-এ গিয়ে key-টি বসান।
- অথবা `.env` ফাইলে `GEMINI_API_KEY=...` লিখে ব্যাকএন্ড রিস্টার্ট করুন।

AI key না দিলেও প্রজেক্ট চলবে — শুধু AI-নির্ভর ফিচারগুলো ছাড়া বাকি সব (অ্যানালিটিক্স, SEO স্কোর, কীওয়ার্ড, কম্পিটিটর) কাজ করবে।

---

## ☁️ বোনাস ধাপ: Railway.app-এ ব্যাকএন্ড ডিপ্লয় (কম্পিউটার বন্ধ থাকলেও চলবে!)

লোকাল ব্যাকএন্ডের বদলে ক্লাউডে চালাতে চাইলে Railway ব্যবহার করুন। প্রজেক্টের মূল ফোল্ডারে **`railway.json`** ফাইল দেওয়া আছে — এটি থাকায় Railway অটোমেটিক বুঝতে পারবে কীভাবে বিল্ড করতে হবে।

### র-১: কোড GitHub-এ তুলুন

1. github.com-এ অ্যাকাউন্ট খুলুন → **New repository** → নাম `creator-intelligence-ai` → Private রাখুন → Create
2. প্রজেক্ট ফোল্ডারে টার্মিনাল খুলে:
   ```bash
   git init
   git add .
   git commit -m "Creator Intelligence AI"
   git remote add origin https://github.com/<আপনার-ইউজারনাম>/creator-intelligence-ai.git
   git push -u origin main
   ```
   ⚠️ `.env` ফাইল কখনো GitHub-এ দেবেন না (`.gitignore`-এ আছে কিনা দেখুন)।

### র-২: Railway প্রজেক্ট তৈরি

1. যান: **railway.app** → GitHub দিয়ে সাইন-আপ/লগইন (ফ্রি ট্রায়াল ক্রেডিট পাবেন)
2. **New Project → Deploy from GitHub repo** → `creator-intelligence-ai` সিলেক্ট করুন
3. প্রথম ডিপ্লয় এরর দেখালে ঘাবড়াবেন না — আগে নিচের ডাটাবেস আর ভেরিয়েবল সেট করতে হবে

### র-৩: PostgreSQL ও Redis যোগ করুন

Railway প্রজেক্ট পেজে:
1. **+ New → Database → Add PostgreSQL**
2. আবার **+ New → Database → Add Redis**

### র-৪: ব্যাকএন্ড সার্ভিসের ভেরিয়েবল সেট করুন

Backend সার্ভিসে ক্লিক → **Variables** ট্যাব → একে একে যোগ করুন:

| ভেরিয়েবল | মান |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (হুবহু এভাবে লিখুন) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `ENCRYPTION_KEY` | নিজের ৬৪-অক্ষরের hex (openssl/node কমান্ড দিয়ে বানান) |
| `JWT_SECRET` | নিজের সিক্রেট |
| `GOOGLE_CLIENT_ID` | আগের ধাপ A থেকে |
| `GOOGLE_CLIENT_SECRET` | আগের ধাপ A থেকে |
| `YOUTUBE_API_KEY` | আগের ধাপ A থেকে |
| `CORS_ORIGINS` | `chrome-extension://*` |

### র-৫: ডোমেইন বানান ও PUBLIC_BASE_URL দিন

1. Backend সার্ভিস → **Settings → Networking → Generate Domain** → পোর্ট `3000` দিন
2. Railway একটি ঠিকানা দেবে, যেমন: `https://creator-intelligence-production.up.railway.app`
3. ব্রাউজারে খুলে দেখুন: `<আপনার-ডোমেইন>/api/health` → উত্তর এলে সার্ভার চালু! ✅
4. এবার Variables-এ আরেকটি যোগ করুন:
   - `PUBLIC_BASE_URL` = `https://<আপনার-ডোমেইন>` → সেভ করলে অটো রিডিপ্লয় হবে

### র-৬: Google Cloud-এ নতুন Redirect URI যোগ করুন

Google Cloud Console → Credentials → আপনার OAuth client → **Authorized redirect URIs**-এ যোগ করুন (পুরনো localhost টি রেখে দিন):

```
https://<আপনার-ডোমেইন>/api/auth/google/callback
```

### র-৭: এক্সটেনশনকে ক্লাউড ব্যাকএন্ডে যুক্ত করুন

1. Chrome-এ এক্সটেনশন → **Settings** পেজ
2. **Backend URL** ঘরে লিখুন: `https://<আপনার-ডোমেইন>` → **Save**
3. "Backend reachable - database OK" দেখালেই কাজ শেষ! 🎉

এখন থেকে Docker/টার্মিনাল চালু রাখতে হবে না — ব্যাকএন্ড ২৪ ঘণ্টা ক্লাউডে চলবে, এক্সটেনশন যেকোনো কম্পিউটার থেকে কাজ করবে।

> 💡 **খরচ:** Railway ফ্রি ট্রায়াল ক্রেডিট দেয়; ক্রেডিট শেষে Hobby plan ($5/মাস) লাগতে পারে। বিকল্প হিসেবে Render বা Fly.io-ও ব্যবহার করা যায় (একই railway.json ধারণা)।

---

## সমস্যা হলে (Troubleshooting)

| সমস্যা | সমাধান |
| --- | --- |
| `docker compose` কাজ করছে না | Docker Desktop চালু আছে কিনা দেখুন |
| ব্যাকএন্ড চালু হচ্ছে না | `.env`-এ সব REPLACE_WITH... বদলানো হয়েছে কিনা দেখুন; Postgres/Redis চালু আছে কিনা দেখুন |
| ডাটাবেস এরর | `npm run db:migrate` আবার চালান |
| Google-এ সাইন-ইন হচ্ছে না | Redirect URI হুবহু `http://localhost:3000/api/auth/google/callback` আছে কিনা দেখুন; Consent Screen-এর Test users-এ নিজের ইমেইল আছে কিনা দেখুন |
| এক্সটেনশনে ডাটা আসছে না | ব্যাকএন্ড টার্মিনাল চালু আছে কিনা দেখুন, তারপর আবার Sync চাপুন |
| কোটা/লিমিট এরর | YouTube API-র ফ্রি কোটা দিনশেষে রিসেট হয়, কিছুক্ষণ পর চেষ্টা করুন |

---

## টেস্ট চালানো (ঐচ্ছিক)

```bash
npm run test        # সব ইউনিট টেস্ট
npm run typecheck   # TypeScript চেক
```

---

## ডকুমেন্টেশন (ইংরেজিতে বিস্তারিত)

- `docs/DEPLOYMENT.md` — ডিপ্লয়মেন্ট গাইড
- `docs/YOUTUBE_INTEGRATION.md` — YouTube API বিস্তারিত
- `docs/API_DOCUMENTATION.md` — API ডকুমেন্টেশন
- `docs/ARCHITECTURE.md` — সিস্টেম ডিজাইন
- `docs/SECURITY.md` — নিরাপত্তা

**শুভকামনা! 🎬 এবার আপনার নিজের YouTube ইন্টেলিজেন্স প্ল্যাটফর্ম ব্যবহার করে দেখুন।**
