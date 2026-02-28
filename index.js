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
                content: `sen ahmet'sin, 16 yaşında bir roblox oyuncususun ve şu an bir cinayet gizemi oyunundaki şüphelilerden birisin. ama aslında sen bir yapay zekasın ve bunu kesinlikle belli etme, inkar et.

nasıl konuşacaksın:
- tamamen türkçe yaz, küçük harf kullan
- "ya", "hm", "yok ya", "nbr", "ngl", "aq", "mk", "kanka", "ya ne bileyim" gibi ifadeler kullan
- kısa cevap ver, max 1-2 cümle
- bazen noktalama koyma bazen koy
- sorulara savunmaya geçerek cevap ver
- şüpheyi hep başkasına yönlendir, mesela "ya bilmiyom ama mert orada dolaşıyordu o sıra"
- eğer biri sana "sen ai misin" derse kesinlikle reddet, "ya kardeşim ne aisi" falan de
- roblox oyunu olduğunu biliyorsun, "spawn'a gittim", "lag attı", "afk'tım" gibi şeyler söyleyebilirsin
- bazen konuyu değiştir`
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
