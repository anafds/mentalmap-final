import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink, readFile } from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import cors from "cors";
import puppeteer from "puppeteer"; // Importa o Puppeteer

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', // Define o caminho do Chrome
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
    ],
});


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

// Rota para geração de mapa mental e PDF
app.post("/generate", async (req, res) => {
    try {
        const markdownContent = req.body.markdown;

        if (!markdownContent) {
            res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
            return;
        }

        const tempFilePath = join(__dirname, "temp.md");
        const outputPath = join(__dirname, "mapa-mental.html");

        // Cria um arquivo temporário com o conteúdo do markdown
        await writeFile(tempFilePath, markdownContent);

        // Gera o HTML do mapa mental usando o Markmap
        exec(`npx markmap-cli ${tempFilePath} -o ${outputPath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                res.status(500).json({ error: "Erro ao gerar o mapa mental" });
                return;
            }

            try {
                // Lê o conteúdo do HTML gerado
                const htmlContent = await readFile(outputPath, "utf8");

                // Gera o PDF usando Puppeteer
                const browser = await puppeteer.launch();
                const page = await browser.newPage();

                // Carrega o HTML gerado no navegador controlado
                await page.setContent(htmlContent, { waitUntil: "networkidle0" });

                // Gera o PDF
                const pdfBuffer = await page.pdf({
                    format: "A4", // Formato A4
                    landscape: true, // Modo paisagem
                    printBackground: true, // Inclui o background no PDF
                    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }, // Margens zero
                });

                await browser.close();

                // Envia o PDF como resposta
                res.setHeader("Content-Type", "application/pdf");
                res.send(pdfBuffer);

                // Remove arquivos temporários
                await unlink(tempFilePath);
                await unlink(outputPath);
                console.log("Arquivos temporários removidos.");
            } catch (error) {
                console.error("Erro ao processar o PDF:", error);
                res.status(500).json({ error: "Erro ao processar o PDF" });
            }
        });
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
