import sanitizeHtml from "sanitize-html";
import striptags from "striptags";
import { decode } from "html-entities";
import removeMd from "remove-markdown";

export function cleanText(text: string): string {
  try {
    let cleaned = sanitizeHtml(text, {
      allowedTags: [],
      allowedAttributes: {},
    });

    cleaned = removeMd(cleaned);

    cleaned = striptags(cleaned);

    cleaned = decode(cleaned);

    cleaned = cleaned
      .replace(/\s+/g, " ")
      .replace(/Picture courtesy of.*$/gm, "")
      .replace(/Photo by.*$/gm, "")
      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
      .replace(/[\w\.-]+@[\w\.-]+/g, "")
      .replace(/¥[\d,]+/g, "")
      .replace(/Written by.*$/g, "")
      .replace(/Main image courtesy of.*$/g, "")
      .replace(/^\s*[\r\n]/gm, "")
      .trim();

    return cleaned;
  } catch (error) {
    console.error("Error cleaning text:", error);
    return text;
  }
}
