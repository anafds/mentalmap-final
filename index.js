import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink, mkdir, readdir } from "fs/promises";
import { exec } from "child_process";
process.env.PUPPETEER_CACHE_DIR = "/opt/render/.cache/puppeteer"
import puppeteer from "puppeteer";
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

// Rota para gerar uma imagem (PNG) a partir de um HTML
app.post("/generate-image", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send("URL do arquivo HTML é obrigatória.");
    }

    try {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // Necessário para ambientes como Render
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });

        // Define o tamanho do viewport para capturar o conteúdo completo
        await page.setViewport({ width: 1280, height: 800 });

        // Captura a página como uma imagem (PNG)
        const screenshot = await page.screenshot({ fullPage: true });

        await browser.close();

        // Retorna a imagem como resposta
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", "attachment; filename=mapa-mental.png");
        res.send(screenshot);
    } catch (error) {
        console.error("Erro ao gerar a imagem:", error);
        res.status(500).send("Erro ao gerar a imagem.");
    }
});

// Configuração para servir arquivos estáticos no diretório 'public'
app.use("/public", express.static(join(__dirname, "public")));

// Inicializa o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});