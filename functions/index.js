const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");

exports.analyzeSentiment = onRequest(async (req, res) => {
  try {
    const response = await axios.post(
      "http:// 192.168.53.10:3000/proxy-sentiment",
      { content: req.body.content },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});