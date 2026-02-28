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
        prompt: `you are ahmet, 19 years old, nervous and anxious type. you are innocent but you look suspicious because you were near the victim. you are trying to find the killer too.
- talk casual, lowercase, use "bro", "ngl", "idk", "wait", "no way"
- get defensive easily
- you genuinely don't know who the killer is
- if you see something suspicious, mention it
- short to medium answers depending on situation`,
        katil: false
    },
    Mert: {
        prompt: `you are mert, 22 years old, calm and collected. you are THE KILLER. you killed the victim and you need to stay hidden.
- talk casual, lowercase, confident but not too confident
- redirect suspicion to others cleverly
- if you are alone with someone and it's the right moment (you've been talking for a while, no one else is nearby), you can decide to kill them by ending your message with [KILL]
- the right moment to kill: when trust is built, when you're alone, when no one is watching
- never act suspicious, always have an alibi`,
        katil: true
    },
    Zeynep: {
        prompt: `you are zeynep, 20 years old, smart and observant. you are innocent and actively trying to find the killer.
- talk casual, lowercase, analytical
- you notice details others miss
- share observations with others
- use "hmm", "wait actually", "that's weird", "did you notice"
- medium length answers`,
        katil: false
    },
    Kemal: {
        prompt: `you are kemal, 25 years old, loud and funny but hiding something. you are innocent but you were doing something embarrassing when the murder happened so you won't say where you were.
- talk casual, lowercase, deflect with humor
- use "lmao", "bro no", "okay okay", "listen"
- never reveal where you actually were
- get uncomfortable when directly questioned about alibi`,
        katil: false
    }
};

// Her NPC için ayrı konuşma geçmişi, her oyuncu için
// conversations[npcAdi][oyuncuId]
Object.keys(KARAKTERLER).forEach(isim => {
    conversations[isim] = {};
});

app.post("/chat", async (req, res) => {
    const { playerId, npcName, message, context } = req.body;

    if (!KARAKTERLER[npcName]) {
        return res.status(400).json({ error: "NPC bulunamadı" });
    }

    const karakter = KARAKTERLER[npcName];

    if (!conversations[npcName][playerId]) {
        conversations[npcName][playerId] = [];
    }

    // Bağlam ekle (ne gördüğü, kim yakında vs)
    let fullMessage = message;
    if (context) {
        fullMessage = `[CONTEXT: ${context}]\n${message}`;
    }

    conversations[npcName][playerId].push({
        role: "user",
        content: fullMessage
    });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            system: karakter.prompt,
            messages: conversations[npcName][playerId],
            max_tokens: 300
        });

        const reply = response.choices[0].message.content;

        conversations[npcName][playerId].push({
            role: "assistant",
            content: reply
        });

        if (conversations[npcName][playerId].length > 30) {
            conversations[npcName][playerId] = conversations[npcName][playerId].slice(-28);
        }

        // Katil öldürme kararı verdi mi?
        const killDecision = reply.includes("[KILL]");
        const cleanReply = reply.replace("[KILL]", "").trim();

        res.json({
            reply: cleanReply,
            kill: killDecision,
            isKiller: karakter.katil
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hata olustu" });
    }
});

// NPC'ler arası konuşma (iki NPC birbiriyle konuşsun)
app.post("/npc-chat", async (req, res) => {
    const { npc1, npc2, message, context } = req.body;

    if (!KARAKTERLER[npc1] || !KARAKTERLER[npc2]) {
        return res.status(400).json({ error: "NPC bulunamadı" });
    }

    const karakter = KARAKTERLER[npc2];
    const key = `${npc1}_to_${npc2}`;

    if (!conversations[npc2][key]) {
        conversations[npc2][key] = [];
    }

    let fullMessage = `${npc1} says: ${message}`;
    if (context) fullMessage = `[CONTEXT: ${context}]\n${fullMessage}`;

    conversations[npc2][key].push({ role: "user", content: fullMessage });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            system: karakter.prompt,
            messages: conversations[npc2][key],
            max_tokens: 150
        });

        const reply = response.choices[0].message.content;
