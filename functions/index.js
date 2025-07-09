const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const functions = require("firebase-functions");

// Set the maximum instances to 10 to avoid cold starts
setGlobalOptions({ maxInstances: 10 });

exports.analyzeSentiment = onRequest(
  {
    secrets: ["SENTIMENT_KEY"]
  },
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Get the API key from environment variable only (v2 compatible)
      const apiKey = process.env.SENTIMENT_KEY;
      
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.post(
        "https://ai-tools.rev21labs.com/api/v1/ai/sentiment-analysis",
        req.body,
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      );
      res.status(200).json(response.data);
    } catch (error) {
      logger.error("Proxy error:", error);
      res.status(500).json({
        error: "Analysis failed",
        details: error.response?.data || error.message
      });
    }
  }
);