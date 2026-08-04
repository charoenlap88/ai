// TTS ใช้เสียงเนทีฟของ OS — mac: say · win: System.Speech (SAPI) · linux: spd-say/espeak
// ใช้แบบ standalone ได้: node tts.js --voice "Microsoft David Desktop" "Hello test"
const { spawn, execSync } = require('node:child_process');
let cur = null;

function stop() {
  if (cur) { try { cur.kill(); } catch {} cur = null; }
  try { if (process.platform === 'darwin') execSync('killall say 2>/dev/null'); } catch {}
}

function speak(text, voice) {
  stop(); text = String(text || ''); if (!text.trim()) return null;
  if (process.platform === 'darwin') {
    cur = spawn('say', voice ? ['-v', voice, text] : [text]);
  } else if (process.platform === 'win32') {
    const esc = s => String(s).replace(/'/g, "''");
    const ps = "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
      + (voice ? "try{$s.SelectVoice('" + esc(voice) + "')}catch{};" : "") + "$s.Speak('" + esc(text) + "');";
    cur = spawn('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true });
  } else {
    try { cur = spawn('spd-say', ['-w', text]); } catch { try { cur = spawn('espeak', [text]); } catch {} }
  }
  return cur;
}

function voices() {
  try {
    if (process.platform === 'darwin')
      return execSync('say -v "?"', { encoding: 'utf8' }).split('\n').map(l => l.split(/\s{2,}/)[0].trim()).filter(Boolean);
    if (process.platform === 'win32')
      return execSync('powershell -NoProfile -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | %{$_.VoiceInfo.Name}"', { encoding: 'utf8' }).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch {}
  return [];
}

module.exports = { speak, stop, voices };

// ---- standalone: node tts.js --voice "X" "text" ----
if (require.main === module) {
  const a = process.argv.slice(2); let voice = null, text = '';
  for (let i = 0; i < a.length; i++) { if (a[i] === '--voice') voice = a[++i]; else text = a[i]; }
  if (a[0] === '--voices') { console.log(voices().join('\n')); process.exit(0); }
  const p = speak(text, voice); if (p) p.on('exit', c => process.exit(c || 0)); else process.exit(0);
}
