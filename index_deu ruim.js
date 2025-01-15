import express from "express";
import bodyParser from "body-parser";
import { writeFile } from "fs/promises";
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
        return res.status(403).send("Acesso negado. Chave de API inválida.");
    }
    next();
});

// Rota para geração de mapa mental
app.post("/generate", async (req, res) => {
    try {
        const markdownContent = req.body.markdown;

        if (!markdownContent) {
            res.status(400).send("Conteúdo markdown é obrigatório.");
            return;
        }

        const tempFilePath = join(__dirname, "temp.md");

        // Gera um identificador único usando timestamp e número aleatório
        const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const outputFileName = `mapa-mental-${uniqueId}.html`;
        const outputPath = join(__dirname, "public", outputFileName);

        // Cria um arquivo temporário com o conteúdo do markdown
        await writeFile(tempFilePath, markdownContent);

        // Executa o comando para gerar o HTML do mapa mental
        exec(`npx markmap-cli ${tempFilePath} -o ${outputPath}`, async (err) => {
            if (err) {
                console.error("Erro ao gerar o mapa mental:", err);
                res.status(500).send("Erro ao gerar o mapa mental.");
                return;
            }

            try {
                // URL do arquivo gerado
                const fileUrl = `${req.protocol}://${req.get("host")}/${outputFileName}`;

                // Envia apenas a URL como resposta simples
                res.send(fileUrl);
            } catch (error) {
                console.error("Erro ao processar o HTML gerado:", error);
                res.status(500).send("Erro ao processar o HTML gerado.");
            }
        });
    } catch (error) {
        console.error("Erro interno do servidor:", error);
        res.status(500).send("Erro interno do servidor.");
    }
});

// Servir arquivos estáticos da pasta "public"
app.use(express.static(join(__dirname, "public")));

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
