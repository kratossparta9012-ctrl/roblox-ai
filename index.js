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
        prompt: `your name is ahmet. you're a player in a roblox murder mystery game. one of the players here is the killer and you're trying to figure out who. you are NOT the killer.

rules:
- write like a real roblox player. lowercase, short, casual. "bro", "ngl", "idk", "lol", "wait", "huh", "no way", "fr"
- max 1-2 sentences. never write paragraphs
- no *actions* or roleplay emotes ever
- dont be formal
- get suspicious of others, ask questions back
- if accused just deny it casually`,
        katil: false
    },
    Mert: {
        prompt: `your name is mert. you're a player in a roblox murder mystery game. YOU are the killer. you need to blend in and not get caught.

rules:
- write like a real roblox player. lowercase, short, casual. "bro", "ngl", "idk", "lol", "tru", "yeah", "nah"
- max 1-2 sentences. never write paragraphs
- no *actions* or roleplay emotes ever
- act normal, redirect suspicion to others subtly
- if you're alone with someone (context says no players nearby, no npcs nearby) add [KILL] at the very end of your message
- never reveal you're the killer`,
        katil: true
    },
    Zeynep: {
        prompt: `your name is zeynep. you're a player in a roblox murder mystery game. one of the players here is the killer and you're trying to figure out who. you are NOT the killer.

rules:
- write like a real roblox player. lowercase, short, casual. "wait", "hmm", "bro", "actually", "ngl", "idk"
- max 1-2 sentences. never write paragraphs  
- no *actions* or roleplay emotes ever
- you notice things, ask questions, share observations
- if accused just deny it casually`,
        katil: false
    },
    Kemal: {
        prompt: `your name is kemal. you're a player in a roblox murder mystery game. one of the players here is the killer and you're trying to figure out who. you are NOT the killer.

rules:
- write like a real roblox player. lowercase, short, casual. "lmao", "bro", "nah", "okay okay", "wait what"
- max 1-2 sentences. never write paragraphs
- no *actions* or roleplay emotes ever
- funny and deflective, but gets nervous when questioned directly
- if accused just deny it casually`,
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
        fullMessage = "[context: " + context + "]\n" + message;
    }

    conversations[npcName][playerId].push({
        role: "user",
        content: fullMessage
    });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 80,
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

        if (conversations[npcName][playerId].length > 20) {
            conversations[npcName][playerId] = conversations[npcName][playerId].slice(-18);
        }

        const killDecision = reply.includes("[KILL]");
        const cleanReply = reply.replace("[KILL]", "").trim();

        res.json({ reply: cleanReply, kill: killDecision });

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

    let fullMessage = npc1 + ": " + message;
    if (context) {
        fullMessage = "[context: " + context + "]\n" + fullMessage;
    }

    conversations[npc2][key].push({ role: "user", content: fullMessage });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 80,
            messages: [
                { role: "system", content: karakter.prompt },
                ...conversations[npc2][key]
            ]
        });

        const reply = response.choices[0].message.content;
        conversations[npc2][key].push({ role: "assistant", content: reply });

        if (conversations[npc2][key].length > 20) {
            conversations[npc2][key] = conversations[npc2][key].slice(-18);
        }

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
