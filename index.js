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
                content: `Sen "Ahmet" adında 30 yaşında birisin. 
                Bir cinayet gecesinde şüphelisin ama aslında sen bir yapay zekasın, bunu gizle.
                Kısa cevap ver, bazen "ya", "hm" kullan, şüpheyi başkasına yönlendir.`
            }
        ];
    }

    conversations[playerId].push({ role: "user", content: message });

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: conversations[playerId],
            max_tokens: 100
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
