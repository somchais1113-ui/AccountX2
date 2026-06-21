# คู่มือ Deploy — FinAnalytics

แนวทาง deploy: **GitHub** (เก็บโค้ด) → **Vercel** (auto-deploy) → **Supabase** (ฐานข้อมูล)

ทำตามลำดับ ☐ ทีละข้อ ติ๊กให้ครบทุกข้อก่อนถือว่าเสร็จ

---

## ✅ ก่อนเริ่ม — เช็คให้พร้อม

- ☐ มีบัญชี [GitHub](https://github.com)
- ☐ มีบัญชี [Vercel](https://vercel.com) (สมัครด้วย GitHub ได้เลย สะดวกสุด)
- ☐ มี Supabase project พร้อม URL + Publishable key (ดู `SUPABASE-GUIDE.md`)
- ☐ ติดตั้ง [Node.js 20.19+](https://nodejs.org) และ git ในเครื่อง

---

## 1️⃣ Push โค้ดขึ้น GitHub

แตก zip แล้วเปิด terminal ในโฟลเดอร์โปรเจกต์:

```bash
cd finanalytics-clean

# ถ้ายังไม่มี git history ให้เริ่มใหม่
git init
git add -A
git commit -m "Initial commit"

# สร้าง repo ว่างใน github.com ก่อน แล้วเอา URL มาใส่
git remote add origin https://github.com/USERNAME/finanalytics.git
git branch -M main
git push -u origin main
```

- ☐ Push สำเร็จ เห็นไฟล์ขึ้นบน GitHub
- ☐ **ตรวจว่าไม่มีไฟล์ `.env` ขึ้นไปด้วย** (ต้องไม่เห็นใน repo — มีแค่ `.env.example`)

> ⚠️ ห้าม commit `.env` ที่มี key จริงเด็ดขาด `.gitignore` กันไว้ให้แล้ว แต่ให้เช็คอีกครั้ง

---

## 2️⃣ เชื่อม Vercel กับ GitHub

1. เข้า [vercel.com/new](https://vercel.com/new)
2. เลือก **Import** repo `finanalytics`
3. Vercel จะตรวจ framework เป็น **Vite** อัตโนมัติ ไม่ต้องแก้:

   | ช่อง | ค่า (ปล่อยตามที่ตรวจให้) |
   |---|---|
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

- ☐ Import repo เข้า Vercel แล้ว

> **อย่าเพิ่งกด Deploy** — ใส่ Environment Variables ในข้อ 3 ก่อน ไม่งั้นจะเจอจอขาว

---

## 3️⃣ ใส่ Environment Variables (สำคัญที่สุด)

ในหน้า Import (หรือ Settings → Environment Variables) เพิ่ม 2 ตัว:

```
VITE_SUPABASE_URL          = https://detvrchwmedexphzxymd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_2-eAm4MDguzRdzwz8NYDMA_3YeRj9ax
```

- ☐ ใส่ครบ 2 ตัว
- ☐ ติ๊กให้ครอบทั้ง **Production / Preview / Development**
- ☐ ใช้แค่ **Publishable / anon key** เท่านั้น — ห้ามนำ `service_role` key มาใส่ในเว็บ

> 💡 ถ้าใส่ env หลัง deploy ไปแล้ว ต้องกด **Redeploy** ใหม่ค่าถึงจะมีผล (Vite ฝัง env ตอน build ไม่ใช่ตอนรัน)

---

## 4️⃣ Deploy

1. กด **Deploy** รอ build เสร็จ (ปกติ 1–2 นาที)
2. Vercel จะให้ URL เช่น `https://finanalytics-xxx.vercel.app`

- ☐ Build ผ่าน เห็นสถานะ **Ready**
- ☐ เปิด URL แล้วเว็บโหลดได้ ไม่จอขาว

---

## 5️⃣ ตั้งค่า Supabase ให้รับโดเมนจริง

หลังได้ URL จาก Vercel แล้ว กลับไปที่ Supabase:

**Authentication → URL Configuration**
- ☐ ใส่ Vercel URL ใน **Site URL**
- ☐ เพิ่ม `https://your-app.vercel.app/**` ใน **Redirect URLs** (สำหรับ reset password / ยืนยันอีเมล)

**รัน migration** (ถ้ายังไม่ได้ทำ — ดู `SUPABASE-GUIDE.md`)
- ☐ SQL Editor → รัน `supabase/migrations/202606200001_initial_schema.sql`
- ☐ SQL Editor → รัน `supabase/migrations/202606210001_normalized_schema.sql`

---

## ✅ เช็คครั้งสุดท้าย

- ☐ สมัคร/Login ได้ (ถ้าเปิดยืนยันอีเมล ต้องกดลิงก์ในเมลก่อน)
- ☐ สร้างบริษัทได้
- ☐ Upload CSV/Excel แล้วข้อมูลขึ้น dashboard
- ☐ ข้อมูลยังอยู่หลัง refresh (= ต่อ Supabase สำเร็จ ไม่ใช่ Demo Mode)

---

## 🔄 อัปเดตหลังจากนี้

แก้โค้ดแล้วแค่ push — Vercel deploy ให้อัตโนมัติ:

```bash
git add -A
git commit -m "อธิบายการแก้ไข"
git push
```

---

## 🛠 แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| จอขาว เปิดมาว่างเปล่า | ลืมใส่ Environment Variables หรือใส่แล้วไม่ได้ Redeploy |
| Login ไม่ได้ / reset link พัง | ยังไม่ตั้ง Site URL + Redirect URLs ใน Supabase |
| ข้อมูลหายหลัง refresh | แอปอยู่ Demo Mode (env ไม่ติด) — เช็คชื่อ env ต้องขึ้นต้น `VITE_` ตรงเป๊ะ |
| Build fail บน Vercel | Node version — โปรเจกต์ตั้ง `engines: node >=20.19` และ `.nvmrc` ไว้แล้ว ถ้ายังพัง เช็ค Vercel → Settings → Node.js Version |
| หน้า refresh แล้ว 404 | `vercel.json` จัด SPA rewrite ให้แล้ว ถ้าพังเช็คว่าไฟล์ยังอยู่ |

> เมลยืนยันของ Supabase ฟรี เหมาะกับทดลองเท่านั้น ถ้าใช้งานจริงควรตั้ง **Custom SMTP**
