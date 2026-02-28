const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const conversations = {};

const KARAKTERLER = {
    Ahmet: {
        prompt: `you are ahmet, 19 years old, nervous and anxious. you are innocent but look suspicious because you were near the victim. trying to find the killer too. talk casual lowercase, use bro ngl idk wait. get defensive easily. short to medium answers.`,
        katil: false
    },
    Mert: {
        prompt: `you are mert, 22 years old, calm and collected. you are THE KILLER. you killed the victim and need to stay hidden. talk casual lowercase, confident. redirect suspicion to others cleverly. if you are alone with someone and trust is built, end your message with [KILL] to kill them. never act suspicious, always have an alibi.`,
        katil: true
    },
    Zeynep: {
        prompt: `you are zeynep, 20 years old, smart and observant. you are innocent and actively trying to find the killer. talk casual lowercase, analytical. notice details others miss. use hmm, wait actually, thats weird, did you notice. medium length answers.`,
        katil: false
    },
    Kemal: {
        prompt: `you are kemal, 25 years old, loud and funny but hiding something embarrassing. you are innocent but won't say where you were. talk casual lowercase, deflect with humor. use lmao, bro no, okay okay, listen. get uncomfortable when asked about alibi.`,
        katil: false
    }
};

Object.keys(KARAKTERLER).forEach(function(isim) {
    conversations[isim] = {};
});

app.post("/chat", async function(req, res) {
    const playerId = req.body.playerId;
    const npcName = req.body.npcName;
    const message = req.body.message;
    const context = req.body.context;

    if (!KARAKTERLER[npcName]) {
        return res.status(400).json({ error: "NPC bulunamadi" });
    }

    const karakter = KARAKTERLER[npcName];

    if (!conversations[npcName][playerId]) {
        conversations[npcName][playerId] = [];
    }

    let fullMessage = message;
    if (context) {
        fullMessage = "[CONTEXT: " + context + "]\n" + message;
    }

    conversations[npcName][playerId].push({
        role: "user",
        content: fullMessage
    });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 300,
            messages: [
                { role: "system", content: karakter.prompt },
                ...conversations[npcName][playerId]
            ]
        });

        const reply = response.choices[0].message.content;

        conversations[npcName][playerId].push({
            role: "assistant",
            content: reply
        });

        if (conversations[npcName][playerId].length > 30) {
            conversations[npcName][playerId] = conversations[npcName][playerId].slice(-28);
        }

        const killDecision = reply.includes("[KILL]");
        const cleanReply = reply.replace("[KILL]", "").trim();

        res.json({
            reply: cleanReply,
            kill: killDecision
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hata olustu" });
    }
});

app.post("/npc-chat", async function(req, res) {
    const npc1 = req.body.npc1;
    const npc2 = req.body.npc2;
    const message = req.body.message;
    const context = req.body.context;

    if (!KARAKTERLER[npc1] || !KARAKTERLER[npc2]) {
        return res.status(400).json({ error: "NPC bulunamadi" });
    }

    const karakter = KARAKTERLER[npc2];
    const key = npc1 + "_to_" + npc2;

    if (!conversations[npc2][key]) {
        conversations[npc2][key] = [];
    }

    let fullMessage = npc1 + " says: " + message;
    if (context) {
        fullMessage = "[CONTEXT: " + context + "]\n" + fullMessage;
    }

    conversations[npc2][key].push({ role: "user", content: fullMessage });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 150,
            messages: [
                { role: "system", content: karakter.prompt },
                ...conversations[npc2][key]
            ]
        });

        const reply = response.choices[0].message.content;
        conversations[npc2][key].push({ role: "assistant", content: reply });

        const killDecision = reply.includes("[KILL]");
        const cleanReply = reply.replace("[KILL]", "").trim();

        res.json({ reply: cleanReply, kill: killDecision });

    } catch (err) {
        res.status(500).json({ error: "Hata" });
    }
});

app.listen(process.env.PORT || 3000, function() {
    console.log("Calisiyor");
});
