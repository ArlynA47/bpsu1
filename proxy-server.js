const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Proxy endpoint
app.post('/analyze', async (req, res) => {
  try {
    const response = await axios.post(
      'https://ai-tools.rev21labs.com/api/v1/ai/sentiment-analysis',
      { content: req.body.content },
      {
        headers: {
          'x-api-key': 'YzA1OGZjZjctY2UzOC00MDliLThhZDItMzA2NTgyNTE2Mjkz',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      details: error.message
    });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Test with: curl -X POST http://localhost:${PORT}/analyze -H "Content-Type: application/json" -d '{"content":"test"}'`);
});