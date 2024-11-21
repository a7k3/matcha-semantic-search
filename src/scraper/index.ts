import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { indexArticle } from "../elastic";
import { cleanText } from "../utils/textCleaner";

interface Article {
  url: string;
  title: string;
  content: string;
}

interface ScrapingProgress {
  total: number;
  scraped: number;
  indexed: number;
  status: "idle" | "running" | "completed" | "error";
  lastError?: string;
}

let progress: ScrapingProgress = {
  total: 0,
  scraped: 0,
  indexed: 0,
  status: "idle",
};

export function getProgress(): ScrapingProgress {
  return { ...progress };
}

function isValidArticleUrl(url: string): boolean {
  const pattern = /^https:\/\/matcha-jp\.com\/jp\/\d+$/;
  return pattern.test(url);
}

export async function scrapeMatcha(): Promise<void> {
  progress = {
    total: 0,
    scraped: 0,
    indexed: 0,
    status: "running",
  };

  const browser = await puppeteer.launch();

  try {
    const page = await browser.newPage();
    await page.goto("https://matcha-jp.com/jp");

    const links = await page.evaluate(() => {
      const articleLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="/jp/"]')
      );
      return Array.from(articleLinks, (link) => link.href);
    });

    const uniqueLinks = Array.from(new Set(links));
    const validLinks = uniqueLinks.filter(isValidArticleUrl);

    progress.total = validLinks.length;
    console.log(`Found ${validLinks.length} valid article links`);

    for (const link of validLinks) {
      if (!link.includes("/jp/")) continue;

      try {
        await page.goto(link, { waitUntil: "networkidle0" });
        const content = await page.content();
        const $ = cheerio.load(content);

        const article: Article = {
          url: link,
          title: $(".title").text().trim(),
          content: cleanText($(".article_content").text().trim()),
        };

        if (article.title && article.content) {
          progress.scraped++;
          console.log(
            `Scraped article ${progress.scraped}/${validLinks.length}: ${link}`
          );

          const indexed = await indexArticle(article);
          if (indexed) {
            progress.indexed++;
            console.log(
              `Successfully indexed article ${progress.indexed}: ${link}`
            );
          }
        } else {
          console.log(`Skipped article (no content): ${link}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing article ${link}:`, error);
        continue;
      }
    }
    progress.status = "completed";
  } catch (error) {
    console.error("Scraping error:", error);
    throw error;
  } finally {
    await browser.close();
    console.log(
      `Scraping completed. Scraped: ${progress.scraped}, Indexed: ${progress.indexed}`
    );
  }
}
