import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Configuração de CORS para permitir apenas origens específicas
app.use(
    cors({
        origin: ["http://127.0.0.1:5500", "https://mentalmap-api.onrender.com"], // Adicione aqui os domínios permitidos
    })
);

// Middleware para parsing de JSON
app.use(bodyParser.json());

// Middleware de autenticação para a rota /generate
app.use("/generate", (req, res, next) => {
    const clientKey = req.headers["mindmap-api-key"];
    if (!clientKey || clientKey !== API_KEY) {
        return res.status(403).json({ error: "Acesso negado. Chave de API inválida." });
    }
    next();
});

// Rota para geração de mapa mental
app.post("/generate", async (req, res) => {
    try {
        const markdownContent = req.body.markdown;

        if (!markdownContent) {
            return res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
        }

        const tempFilePath = join(__dirname, "temp.md");
        const outputPath = join(__dirname, "mapa-mental.html");

        await writeFile(tempFilePath, markdownContent);

        exec(`npx markmap-cli ${tempFilePath} -o ${outputPath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                return res.status(500).json({ error: "Erro ao gerar o mapa mental" });
            }

            // Envia a URL pública do HTML gerado
            res.json({ url: `${req.protocol}://${req.get("host")}/mapa-mental.html` });

            // Remove o arquivo Markdown temporário
            await unlink(tempFilePath);
        });
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Rota para servir o HTML gerado (rota pública)
app.get("/mapa-mental.html", (req, res) => {
    const outputPath = join(__dirname, "mapa-mental.html");
    res.sendFile(outputPath, (error) => {
        if (error) {
            console.error("Erro ao enviar o arquivo:", error);
            res.status(500).json({ error: "Erro ao acessar o mapa mental" });
        }
    });
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
