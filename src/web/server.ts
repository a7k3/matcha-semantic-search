import express from "express";
import path from "path";
import { searchArticles } from "../elastic";
import { getProgress, scrapeMatcha } from "../scraper";
import { setupElastic } from "../elastic";

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    const results = await searchArticles(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/scrape", async (req, res) => {
  try {
    scrapeMatcha().catch((error) => {
      console.error("Background scraping error:", error);
    });

    res.json({
      message: "Scraping started",
      status: "running",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/scrape/progress", (req, res) => {
  res.json(getProgress());
});

async function initialize() {
  await setupElastic();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

initialize();
