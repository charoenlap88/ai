# DeepSeek Agent Companion (Electron)

แอปเดสก์ท็อปให้ผู้ใช้รันในเครื่องตัวเอง — **เข้าถึงไฟล์ในเครื่อง** ได้ แต่ **AI คิดผ่าน server กลาง** (server ถือ key + นับ quota ต่อ user)

## รัน (dev)
```bash
cd ds-agent-companion
npm install      # โหลด Electron (~ครั้งแรกนานหน่อย)
npm start
```

## วิธีใช้
1. ใส่ **Server URL** (เช่น `http://localhost:4040` หรือ URL VPS) + email/password → เข้าสู่ระบบ
2. กด **เลือกโฟลเดอร์** ที่จะให้ AI ทำงาน (ในเครื่องคุณ)
3. พิมพ์สั่งงาน — loop + อ่าน/แก้ไฟล์/รันคำสั่ง ทำงาน**ในเครื่องคุณ**, ทุกครั้งที่คิดจะยิงไปขอ AI ที่ server (นับ token จาก quota ของคุณ)

## แพ็กเป็นไฟล์ติดตั้ง (.dmg/.exe) — ภายหลัง
เพิ่ม electron-builder แล้ว `npm run dist` (ยังไม่ตั้งค่าในเฟสนี้)

## ความปลอดภัย
- ไฟล์ไม่เคยออกจากเครื่อง (server เห็นแค่ prompt/completion)
- แก้ไฟล์ = ต้องติ๊ก · รันคำสั่ง = ต้องติ๊ก (default ปิด) · จำกัดในโฟลเดอร์ที่เลือก · backup ก่อนเขียน
- token เก็บในแอป เพิกถอนได้จากฝั่ง server
