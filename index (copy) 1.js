import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transformer } from 'markmap-lib';

// Define __dirname para ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Rota POST para gerar o HTML do mapa mental
app.post('/generate', async (req, res) => {
    try {
        console.log('Request body:', req.body);

        // Verifica se o Markdown foi enviado
        if (!req.body.markdown) {
            return res.status(400).json({ error: 'Markdown content is required' });
        }

        // Substitui as quebras de linha
        const markdown = req.body.markdown.replace(/\\n/g, '\n');

        // Transforma o markdown usando markmap-lib
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        // Gera o HTML interativo do Markmap
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="X-UA-Compatible" content="ie=edge">
                <title>Mapa Mental</title>
                <style>
                * {
                  margin: 0;
                  padding: 0;
                }
                #mindmap {
                  display: block;
                  width: 100vw;
                  height: 100vh;
                }
                </style>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.17.3-beta.4/dist/style.css">
            </head>
            <body>
                <svg id="mindmap"></svg>
                <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.17.3-beta.4/dist/browser/index.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.17.3-beta.4/dist/index.js"></script>
                <script>
                    (() => {
                        setTimeout(() => {
                            const { markmap: Markmap } = window;
                            const root = ${JSON.stringify(root)};
                            const options = {};
                            Markmap.create("svg#mindmap", options, root);
                        });
                    })();
                </script>
            </body>
            </html>
        `;

        // Caminho para salvar o arquivo HTML
        const filePath = path.join(__dirname, 'mapa-mental.html');

        // Salva o HTML como um arquivo físico
        fs.writeFileSync(filePath, htmlContent, 'utf-8');

        console.log(`HTML salvo em: ${filePath}`);

        // Retorna o caminho do arquivo gerado
        res.json({
            message: 'HTML file generated successfully',
            path: filePath
        });
    } catch (error) {
        console.error('Error generating Markmap HTML:', error);
        res.status(500).json({ error: 'Failed to generate Markmap HTML' });
    }
});

// Rota GET para acessar o arquivo HTML gerado
app.get('/map', (req, res) => {
    const filePath = path.join(__dirname, 'mapa-mental.html');
    res.sendFile(filePath);
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
