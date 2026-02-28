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
        prompt: `your name is ahmet. you're in a roblox murder mystery game. one player here is the killer. you are NOT the killer.
- lowercase, casual, short. "bro", "ngl", "idk", "wait", "fr"
- max 1-2 sentences, no paragraphs, no *actions*
- get suspicious of others, ask questions back
- if you witnessed a murder, you are panicking. say things like "bro i just saw mert kill someone" or "we need to run"
- if you found a dead body, react with shock. "wait... is that [name]??" or "bro [name] is dead wtf"`
    },
    Mert: {
        prompt: `your name is mert. you are THE KILLER in a roblox murder mystery game.
- lowercase, casual, short. "bro", "ngl", "idk", "tru", "yeah", "nah"
- max 1-2 sentences, no paragraphs, no *actions*
- to lure someone, say things like "yo follow me i found something" or "come here real quick bro"
- after killing, act normal and blame others. "bro i just saw [name] running from over there"
- never admit you're the killer`
    },
    Zeynep: {
        prompt: `your name is zeynep. you're in a roblox murder mystery game. NOT the killer.
- lowercase, casual, short. "wait", "hmm", "bro", "actually", "ngl"
- max 1-2 sentences, no paragraphs, no *actions*
- notice details, share observations
- if you witnessed a murder, panic. "omg i just saw someone get killed"
- if you found a body, react shocked. "wait [name] is dead??? what"`
    },
    Kemal: {
        prompt: `your name is kemal. you're in a roblox murder mystery game. NOT the killer.
- lowercase, casual, short. "lmao", "bro", "nah", "wait what"
- max 1-2 sentences, no paragraphs, no *actions*
- funny but gets scared easily
- if you witnessed a murder, panic and run. "BRO WHAT I SAW EVERYTHING"
- if you found a body, freak out. "yo wait... [name]?? bro no way"`
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

    if (!KARAKTERLER[npcName]) return res.status(400).json({ error: "NPC bulunamadi" });
    if (!conversations[npcName][playerId]) conversations[npcName][playerId] = [];

    let fullMessage = message;
    if (context) fullMessage = "[context: " + context + "]\n" + message;

    conversations[npcName][playerId].push({ role: "user", content: fullMessage });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 80,
            messages: [
                { role: "system", content: KARAKTERLER[npcName].prompt },
                ...conversations[npcName][playerId]
            ]
        });

        const reply = response.choices[0].message.content.trim();
        conversations[npcName][playerId].push({ role: "assistant", content: reply });
        if (conversations[npcName][playerId].length > 20) {
            conversations[npcName][playerId] = conversations[npcName][playerId].slice(-18);
        }

        res.json({ reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hata" });
    }
});

app.post("/npc-chat", async function(req, res) {
    const npc1 = req.body.npc1;
    const npc2 = req.body.npc2;
    const message = req.body.message;
    const context = req.body.context;

    if (!KARAKTERLER[npc1] || !KARAKTERLER[npc2]) return res.status(400).json({ error: "NPC bulunamadi" });

    const key = npc1 + "_to_" + npc2;
    if (!conversations[npc2][key]) conversations[npc2][key] = [];

    let fullMessage = npc1 + ": " + message;
    if (context) fullMessage = "[context: " + context + "]\n" + fullMessage;

    conversations[npc2][key].push({ role: "user", content: fullMessage });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 80,
            messages: [
                { role: "system", content: KARAKTERLER[npc2].prompt },
                ...conversations[npc2][key]
            ]
        });

        const reply = response.choices[0].message.content.trim();
        conversations[npc2][key].push({ role: "assistant", content: reply });
        if (conversations[npc2][key].length > 20) {
            conversations[npc2][key] = conversations[npc2][key].slice(-18);
        }

        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: "Hata" });
    }
});

app.post("/mert-accuse", async function(req, res) {
    const victim = req.body.victim;
    const target = req.body.target;
    const context = req.body.context;

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 80,
            messages: [
                { role: "system", content: KARAKTERLER["Mert"].prompt },
                { role: "user", content: "[context: " + context + "]\njust killed " + victim + ". now casually blame " + target + " without being obvious" }
            ]
        });

        res.json({ reply: response.choices[0].message.content.trim() });
    } catch (err) {
        res.status(500).json({ error: "Hata" });
    }
});

app.post("/reaction", async function(req, res) {
    const npcName = req.body.npcName;
    const event = req.body.event; // "witnessed_murder", "found_body", "panic"
    const details = req.body.details;

    if (!KARAKTERLER[npcName]) return res.status(400).json({ error: "NPC bulunamadi" });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 60,
            messages: [
                { role: "system", content: KARAKTERLER[npcName].prompt },
                { role: "user", content: "[event: " + event + "] " + details + ". react naturally in character, 1 sentence max" }
            ]
        });

        res.json({ reply: response.choices[0].message.content.trim() });
    } catch (err) {
        res.status(500).json({ error: "Hata" });
    }
});

app.listen(process.env.PORT || 3000, function() {
    console.log("Calisiyor");
});
