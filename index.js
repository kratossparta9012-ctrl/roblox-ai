local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local SERVER = "https://roblox-ai-hjon.onrender.com"

local function NPCKonusma(oyuncuId, mesaj)
    local basari, sonuc = pcall(function()
        return HttpService:PostAsync(
            SERVER .. "/chat",
            HttpService:JSONEncode({
                playerId = tostring(oyuncuId),
                message = mesaj
            }),
            Enum.HttpContentType.ApplicationJson
        )
    end)
    
    if basari then
        local data = HttpService:JSONDecode(sonuc)
        return data.reply
    else
        return "Cevap yok..."
    end
end

Players.PlayerAdded:Connect(function(oyuncu)
    oyuncu.Chatted:Connect(function(mesaj)
        if mesaj:sub(1, 5) == "Ahmet" then
            local soru = mesaj:sub(7)
            local cevap = NPCKonusma(oyuncu.UserId, soru)
            
            -- Cevabı chat'e yazdır
            local ChatService = game:GetService("Chat")
            local npc = workspace:FindFirstChild("Ahmet")
            
            if npc and npc:FindFirstChild("Head") then
                ChatService:Chat(npc.Head, cevap, Enum.ChatColor.Blue)
            else
                print("NPC bulunamadı: " .. cevap)
            end
        end
    end)
end)
