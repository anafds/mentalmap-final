import express from "express";
import bodyParser from "body-parser";
import { writeFile, unlink, readFile } from "fs/promises";
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
            res.status(400).json({ error: "Conteúdo markdown é obrigatório." });
            return;
        }

        const tempFilePath = join(__dirname, "temp.md");
        const outputPath = join(__dirname, "mapa-mental.html");

        // Cria um arquivo temporário com o conteúdo do markdown
        await writeFile(tempFilePath, markdownContent);

        // Executa o comando para gerar o HTML do mapa mental
        exec(`npx markmap-cli ${tempFilePath} -o ${outputPath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                res.status(500).json({ error: "Erro ao gerar o mapa mental" });
                return;
            }

            try {
                // Lê o conteúdo do HTML gerado
                let htmlContent = await readFile(outputPath, "utf8");

                // Remove a toolbar do Markmap (se existir)
                htmlContent = htmlContent.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/markmap-toolbar@[\d.]+\/dist\/index\.js"><\/script>/, "");
                htmlContent = htmlContent.replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/markmap-toolbar@[\d.]+\/dist\/style\.css">/, "");

                // Adiciona o CSS customizado no <head>
                const customCSS = `
                <style>
                    /* Configuração do tamanho de página como Tabloid */
                    @page {
                        size: 279mm 432mm; /* Dimensões em milímetros (11 x 17 polegadas) */
                        margin: 10mm; /* Margem ajustável */
                    }
                    #mindmap {
                        display: block;
                        width: 100%; /* Ajusta para ocupar toda a largura */
                        height: auto; /* Mantém a proporção */
                    }
                </style>`;
                htmlContent = htmlContent.replace("</head>", `${customCSS}</head>`);

                // Retorna o HTML ajustado como resposta
                res.setHeader("Content-Type", "text/html");
                res.send(htmlContent);

                // Remove os arquivos temporários
                await unlink(tempFilePath);
                await unlink(outputPath);
                console.log("Arquivos temporários removidos.");
            } catch (error) {
                console.error("Erro ao processar o HTML gerado:", error);
                res.status(500).json({ error: "Erro ao processar o HTML gerado" });
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
