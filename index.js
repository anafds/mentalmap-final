import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv"; // Importa dotenv para variáveis de ambiente

dotenv.config(); // Carrega as variáveis do arquivo .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000; // Usa a porta da variável de ambiente ou 3000 como fallback
const API_KEY = process.env.API_KEY; // Carrega a API Key do .env

app.use(bodyParser.json());

// Middleware para autenticação com API Key
app.use("/generate", (req, res, next) => {
    const clientKey = req.headers["x-api-key"];
    if (!clientKey || clientKey !== API_KEY) {
        return res.status(403).json({ error: "Acesso negado. Chave de API inválida." });
    }
    next();
});

app.post("/generate", async (req, res) => {
    try {
        const markdownContent = req.body.markdown;

        if (!markdownContent) {
            res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
            return;
        }

        const tempFilePath = join(__dirname, "temp.md");
        const outputPath = join(__dirname, "mapa-mental.html");

        await writeFile(tempFilePath, markdownContent);

        exec(
            `npx markmap-cli ${tempFilePath} -o ${outputPath}`,
            async (err) => {
                if (err) {
                    console.error("Erro ao gerar o mapa mental:", err);
                    res.status(500).json({
                        error: "Erro ao gerar o mapa mental",
                    });
                    return;
                }

                res.sendFile(outputPath, async (error) => {
                    if (error) {
                        console.error("Erro ao enviar o arquivo:", error);
                        res.status(500).json({
                            error: "Erro ao enviar o arquivo HTML",
                        });
                    }

                    // Limpa os arquivos temporários após o envio
                    try {
                        await unlink(tempFilePath);
                        await unlink(outputPath);
                        console.log("Arquivos temporários removidos com sucesso.");
                    } catch (unlinkErr) {
                        console.error("Erro ao remover arquivos temporários:", unlinkErr);
                    }
                });
            },
        );
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
