import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { MongoClient } from "mongodb";

import { z } from "zod";

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "school";

const queryDatabaseTool = new DynamicStructuredTool({
  name: "query_database",
  description: "Query the MongoDB database to fetch relevant information",
  schema: z.object({
    collection: z.string().describe("The MongoDB collection to query"),
    query: z.string().describe("The query string in JSON format"),
    limit: z
      .number()
      .optional()
      .describe("Optional: Number of results to return (default: 10)"),
  }),
  func: async ({ collection, query, limit = 10 }) => {
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();

      const db = client.db(DB_NAME);
      const coll = db.collection(collection);

      // Parse the query string to JSON
      let queryObject;
      try {
        queryObject = JSON.parse(query);
      } catch (error) {
        await client.close();
        return `Error parsing query: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }

      // Execute the query
      const results = await coll.find(queryObject).limit(limit).toArray();
      await client.close();

      if (results.length === 0) {
        return "No records found matching your query.";
      }

      return JSON.stringify(results, null, 2);
    } catch (error) {
      return `Database query error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  },
});

const searchTavily = new TavilySearchResults({
  maxResults: 3,
});

export const TOOLS = [searchTavily, queryDatabaseTool];
