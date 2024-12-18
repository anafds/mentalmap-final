import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(bodyParser.json());

// Middleware de autenticação apenas para a rota /generate
app.use("/generate", (req, res, next) => {
    const clientKey = req.headers["mindmap-api-key"];
    if (!clientKey || clientKey !== API_KEY) {
        return res.status(403).json({ error: "Acesso negado. Chave de API inválida." });
    }
    next();
});

// Rota protegida: Gera o arquivo HTML
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

            // Retorna a URL onde o HTML pode ser acessado
            res.json({ url: `${req.protocol}://${req.get("host")}/mapa-mental.html` });

            // Remove o arquivo temporário Markdown
            await unlink(tempFilePath);
        });
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Rota pública: Servir o arquivo HTML gerado
app.get("/mapa-mental.html", (req, res) => {
    const outputPath = join(__dirname, "mapa-mental.html");
    res.sendFile(outputPath, (error) => {
        if (error) {
            console.error("Erro ao enviar o arquivo:", error);
            res.status(500).json({ error: "Erro ao acessar o mapa mental" });
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
