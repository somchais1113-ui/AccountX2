# FinAnalytics

แพลตฟอร์มวิเคราะห์การเงินหลายบริษัท รองรับ Supabase Auth/RLS, สิทธิ์รายบริษัท, Audit Log, CSV import, FX consolidation, backup และ PowerPoint export

## เริ่มใช้งาน

ต้องใช้ Node.js 20.19 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## โหมดการทำงาน

- ไม่มี `.env`: Demo Mode เก็บข้อมูลใน `localStorage`
- มี Supabase URL/Publishable key: Login Mode ใช้ PostgreSQL และ RLS

ดูขั้นตอนเชื่อมฐานข้อมูลใน `SUPABASE-GUIDE.md`

## Environment

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

ห้ามใช้ Supabase `service_role` key ใน frontend

## คำสั่ง

| คำสั่ง | การทำงาน |
|---|---|
| `npm run dev` | เปิด development server |
| `npm run test` | รัน automated tests |
| `npm run build` | สร้าง production build |
| `npm run check` | รัน tests และ build |
| `npm run preview` | เปิด production preview |

## ฟีเจอร์

- Momentum: MOM, QOQ, YOY, MTD, YTD, LTM และ CAGR
- Email/password Login, Signup, Reset password
- Row Level Security และบทบาท Owner/Admin/Editor/Viewer
- รายชื่อบริษัทและข้อมูลการเงินจาก Supabase
- CSV validation และตรวจเดือนซ้ำก่อน upsert
- Audit Log จาก database trigger
- แปลง USD/EUR เป็น THB ก่อน Consolidation
- JSON backup/restore และ CSV export
- Editable PPTX export
- Dark/Light, ไทย/อังกฤษ และ responsive layout

## โครงสร้างสำคัญ

```text
src/App.jsx                         UI และ routing ภายในแอป
src/lib/supabase.js                Auth และ database API
src/lib/finance.js                 สูตรการเงินและ FX
src/lib/csv.js                     CSV parser/validation
src/lib/backup.js                  Backup และ CSV export
src/lib/exportPptx.js              PowerPoint generation
supabase/migrations/*.sql          Schema, RLS และ Audit triggers
src/lib/*.test.js                  Automated tests
```

## หมายเหตุ

PPTX generator ถูกโหลดเมื่อกด Export เท่านั้นเพื่อลดขนาดหน้าเว็บเริ่มต้น  
การ Restore บน Supabase จะนำเข้าเฉพาะบริษัทที่ผู้ใช้มีสิทธิ์และ ID ตรงกับไฟล์สำรอง
