import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuidv4 } from "uuid"; // Adiciona suporte para UUID

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

    const uniqueId = uuidv4(); // Gera um UUID único
    const tempFilePath = join(__dirname, `${uniqueId}.md`);
    const outputFilePath = join(__dirname, `public/${uniqueId}.html`); // Salva os arquivos no diretório 'public'

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
                // Retorna a URL do arquivo gerado
                const fileUrl = `${req.protocol}://${req.get("host")}/public/${uniqueId}.html`;
                res.status(200).send(fileUrl);

                // Remove o arquivo temporário de Markdown
                await unlink(tempFilePath);
                console.log("Arquivo temporário removido.");
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

// Configuração para servir arquivos estáticos no diretório 'public'
app.use("/public", express.static(join(__dirname, "public")));

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});