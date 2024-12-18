const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

// Rota raiz para teste
app.get("/", (req, res) => {
    res.send("Servidor está rodando! Use a rota POST /generate-map para enviar o Markdown.");
});

// Rota principal para gerar o mapa mental
app.post("/generate-map", async (req, res) => {
    const { markdown } = req.body;

    if (!markdown) {
        return res.status(400).json({ error: "Markdown content is required" });
    }

    const htmlContent = `
    
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Markmap</title>
        <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.14.7/dist/browser/index.min.js"></script>
    </head>
    <body>
        <svg id="markmap" style="width: 100%; height: 100vh;"></svg>
        <script>
            const { Markmap } = window.markmap;
            const markdown = \`${markdown}\`;
            const svg = document.querySelector("#markmap");
            Markmap.create(svg, null, markdown);
        </script>
    </body>
    </html>
    `;

    try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
            headless: true
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        const screenshot = await page.screenshot({ type: "png" });
        await browser.close();

        res.set("Content-Type", "image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Erro ao gerar mapa mental:", error);
        res.status(500).json({ error: "Erro interno no servidor ao gerar o mapa." });
    }


    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        const screenshot = await page.screenshot({ type: "png" });
        await browser.close();

        res.set("Content-Type", "image/png");
        res.send(screenshot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
