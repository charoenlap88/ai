#!/bin/bash
# ดับเบิลคลิกครั้งเดียว: ปิดตัวเก่า → เปิด agent (background) → เปิดเบราว์เซอร์
cd "$(dirname "$0")"
PORT=4040
EXIST=$(lsof -ti:$PORT 2>/dev/null)
[ -n "$EXIST" ] && { echo "🔁 ปิด server เดิม..."; kill $EXIST 2>/dev/null; sleep 1; }
echo "🚀 เปิด DeepSeek agent..."
nohup node server.js > server.log 2>&1 &
disown
sleep 1.5
open "http://localhost:$PORT"
osascript -e 'tell application "Terminal" to close (every window whose frontmost is true)' 2>/dev/null &
