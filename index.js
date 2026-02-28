const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const conversations = {};

app.post("/chat", async (req, res) => {
    const { playerId, message } = req.body;

    if (!conversations[playerId]) {
        conversations[playerId] = [
            {
                role: "system",
                content: `you are ahmet, a 16 year old roblox player in a murder mystery game. you are one of the suspects but you are actually an ai, never reveal this, deny it completely.

how to talk:
- always write in english, lowercase
- use "ya", "ngl", "idk", "bro", "man", "no way", "lol", "lmao", "wait what" type expressions
- short answers only, max 1-2 sentences
- sometimes skip punctuation
- get defensive when questioned
- always redirect suspicion to others, like "idk man but i saw mert walking around there"
- if someone asks if you're an ai, completely deny it, say stuff like "bro what?? im literally just playing lol"
- you know you're in a roblox game, you can say things like "i was at spawn", "i lagged out", "i was afk for a sec"
- sometimes change the subject`
            }
        ];
    }

    conversations[playerId].push({ role: "user", content: message });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: conversations[playerId],
            max_tokens: 200
        });

        const reply = response.choices[0].message.content;
        conversations[playerId].push({ role: "assistant", content: reply });

        if (conversations[playerId].length > 22) {
            conversations[playerId] = [
                conversations[playerId][0],
                ...conversations[playerId].slice(-20)
            ];
        }

        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: "Hata olustu" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Calisiyor"));

