import { SearchTotalHits } from "@elastic/elasticsearch/lib/api/types";
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "http://localhost:9200",
});

export async function searchArticles(query: string) {
  const response = await client.search({
    index: "matcha_articles",

    knn: {
      field: "title_embedding.predicted_value",
      k: 20,
      num_candidates: 100,
      boost: 1,
      query_vector_builder: {
        text_embedding: {
          model_id: "cl-tohoku__bert-base-japanese-v3",
          model_text: query,
        },
      },
    },
    query: {
      boosting: {
        positive: {
          multi_match: {
            query: query,
            fields: ["title"],
            fuzziness: 1,
          },
        },
        negative: {
          multi_match: {
            query: "",
            fields: ["title"],
          },
        },
        negative_boost: 0.25,
      },
    },
  });

  return response.hits.hits;
}

export interface Article {
  url: string;
  title: string;
  content: string;
}

export async function setupElastic() {
  try {
    await client.ingest.putPipeline({
      id: "japanese-text-embeddings",
      body: {
        description: "Text embedding pipeline for Japanese content",
        processors: [
          {
            inference: {
              model_id: "cl-tohoku__bert-base-japanese-v3",
              target_field: "title_embedding",
              field_map: {
                title: "text_field",
              },
            },
          },
          {
            inference: {
              model_id: "cl-tohoku__bert-base-japanese-v3",
              target_field: "content_embedding",
              field_map: {
                content: "text_field",
              },
            },
          },
        ],
      },
    });

    await client.indices.create({
      index: "matcha_articles",
      body: {
        settings: {
          analysis: {
            char_filter: {
              normalize: {
                type: "icu_normalizer",
                name: "nfkc",
                mode: "compose",
              },
            },
            tokenizer: {
              ja_kuromoji_tokenizer: {
                mode: "search",
                type: "kuromoji_tokenizer",
                discard_compound_token: true,
              },
            },
            analyzer: {
              ja_kuromoji_analyzer: {
                type: "custom",
                char_filter: ["normalize"],
                tokenizer: "ja_kuromoji_tokenizer",
                filter: [
                  "kuromoji_baseform",
                  "kuromoji_part_of_speech",
                  "cjk_width",
                  "ja_stop",
                  "kuromoji_stemmer",
                  "lowercase",
                ],
              },
            },
          },
          default_pipeline: "japanese-text-embeddings",
        },
        mappings: {
          properties: {
            url: { type: "keyword" },
            title: {
              type: "text",
              analyzer: "ja_kuromoji_analyzer",
            },
            content: {
              type: "text",
              analyzer: "ja_kuromoji_analyzer",
            },
            "title_embedding.predicted_value": {
              type: "dense_vector",
              dims: 768,
              index: true,
              similarity: "cosine",
            },
            "content_embedding.predicted_value": {
              type: "dense_vector",
              dims: 768,
              index: true,
              similarity: "cosine",
            },
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("resource_already_exists_exception")
    ) {
      console.log("Index already exists");
    } else {
      throw error;
    }
  }
}

export async function indexArticle(article: Article) {
  try {
    const exists = await client.search({
      index: "matcha_articles",
      body: {
        query: {
          term: {
            url: article.url,
          },
        },
      },
    });

    const totalHits = exists.hits.total as SearchTotalHits;

    if (totalHits.value > 0) {
      console.log(`Article already exists: ${article.url}`);
      return false;
    }

    await client.index({
      index: "matcha_articles",
      pipeline: "japanese-text-embeddings",
      body: article,
      refresh: true,
    });

    console.log(`Indexed article: ${article.url}`);
    return true;
  } catch (error) {
    console.error(`Error indexing article ${article.url}:`, error);
    throw error;
  }
}
