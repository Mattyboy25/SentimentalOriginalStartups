import OpenAI from "openai";
import express from 'express';
import path from 'path';

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/ask', (req, res) => {
  const userQuestion = req.body.question;

  const prompt = `
  User input: "${userQuestion || "Client"}"
  Instructions: Do not use the word I instead use the word Provider and speak in third person.
  Format the response as a detailed service note including:


  **Observations of the Session:**
  [Details of the session]

  **Behavioral Observations:**
  - **Behavior 1:** [Details]
  - **Behavior 2:** [Details]

  **Support and Intervention:**
  - **Strategy 1:** [Provider's verbal intervention details]
  - **Strategy 2:** [Provider's verbal intervention details]

  **Goals for Future Sessions:**
  - **Goal 1:** [Details on coping skills or behavior strategies]
  - **Goal 2:** [Details on coping skills or behavior strategies]

  **Summary:**
  [Summary of the session]
  `;

  const sseEndpoint = `/stream/${Date.now()}`;
  res.json({ streamUrl: sseEndpoint });

  app.get(sseEndpoint, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 1500
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${content}\n\n`);
        }
      }
      res.write('event: end\n\n');  // Indicate end of stream
    } catch (error) {
      console.error('Streaming error:', error);
      res.write('data: Error occurred during streaming.\n\n');
    } finally {
      res.end();
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});