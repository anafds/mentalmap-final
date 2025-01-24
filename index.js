import express from "express";
import bodyParser from "body-parser";
import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Rota para gerar mapa mental como HTML
app.post("/generate", async (req, res) => {
    const { markdown } = req.body;

    if (!markdown) {
        return res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
    }

    const uniqueId = uuidv4(); // Gera um UUID único
    const tempFilePath = join(__dirname, `${uniqueId}.md`);
    const publicDir = join(__dirname, "public");
    const outputFilePath = join(publicDir, `${uniqueId}.html`);

    try {
        // Garante que o diretório público existe
        await mkdir(publicDir, { recursive: true });

        // Cria o arquivo Markdown temporário
        await writeFile(tempFilePath, markdown);

        // Gera o HTML com o markmap-cli
        exec(`npx markmap-cli ${tempFilePath} -o ${outputFilePath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                return res.status(500).json({ error: "Erro ao gerar o mapa mental" });
            }

            try {
                // Adiciona o rodapé com o logo
                const footer = `
                <footer style="position: fixed; bottom: 0; width: 100%; text-align: center; padding: 10px 0; background-color: #f9f9f9;">
                    <img src="https://drive.google.com/uc?id=10zs-Yr9FPRGNvLcOj9MpHoX92W0wa0zx" alt="Logo" style="height: 50px; object-fit: contain;">
                </footer>
                `;

                // Lê o HTML gerado
                const htmlContent = await fs.readFile(outputFilePath, "utf-8");

                // Adiciona o rodapé antes da tag </body>
                const updatedHtml = htmlContent.replace("</body>", `${footer}</body>`);

                // Salva o HTML atualizado
                await writeFile(outputFilePath, updatedHtml, "utf-8");

                // Retorna a URL do arquivo gerado
                const fileUrl = `${req.protocol}://${req.get("host")}/public/${uniqueId}.html`;
                res.status(200).send(fileUrl);

                // Remove o arquivo temporário de Markdown
                await unlink(tempFilePath);
                console.log("Arquivo temporário removido.");
            } catch (fileError) {
                console.error("Erro ao adicionar o rodapé no HTML:", fileError);
                res.status(500).json({ error: "Erro ao processar o HTML gerado." });
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