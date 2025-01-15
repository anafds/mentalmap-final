import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/generate", async (req, res) => {
    const { markdown } = req.body;

    if (!markdown) {
        return res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
    }

    const tempFilePath = join(__dirname, "temp.md");
    const outputFilePath = join(__dirname, "mapa-mental.html");

    try {
        // Cria o arquivo Markdown temporário
        await writeFile(tempFilePath, markdown);

        // Gera o HTML com o markmap-cli
        exec(`npx markmap-cli ${tempFilePath} -o ${outputFilePath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                return res.status(500).json({ error: "Erro ao gerar o mapa mental" });
            }

            try {
                // Configura os cabeçalhos para o download do HTML
                res.setHeader("Content-Disposition", `attachment; filename="mapa-mental.html"`);
                res.setHeader("Content-Type", "text/html");

                // Envia o arquivo HTML como resposta
                res.sendFile(outputFilePath, async (err) => {
                    if (err) {
                        console.error("Erro ao enviar o arquivo HTML:", err);
                        res.status(500).json({ error: "Erro ao enviar o arquivo HTML." });
                    } else {
                        console.log("Arquivo HTML enviado com sucesso.");

                        // Remove os arquivos temporários
                        await unlink(tempFilePath);
                        await unlink(outputFilePath);
                        console.log("Arquivos temporários removidos.");
                    }
                });
            } catch (fileError) {
                console.error("Erro ao processar o arquivo gerado:", fileError);
                res.status(500).json({ error: "Erro ao processar o arquivo gerado" });
            }
        });
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});