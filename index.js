const express = require("express");
const bodyParser = require("body-parser");
const Groq = require("groq-sdk");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const port = 5000;

// Initialize Groq with API key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(bodyParser.json());

// Global variables to store the history of questions and conversation
// let questionHistory = []; // To track unique questions
// let conversationHistory = []; // To store the full conversation

app.post("/api/question", async (req, res) => {
  try {
    const { section,history } = req.body; // Get 'section' from the request body

    // Validate 'section'
    if (!section) {
      return res.status(400).json({ error: "Section is required" });
    }

    let newQuestion = null;
    let attempts = 0;

    // Format previous conversation history
    // let formattedHistory = ""
    // formattedHistory = formattedHistory + conversationHistory
      

    // Construct messages for Groq API
    const msgs = [
      {
        role: "system",
        content: `You are an expert IELTS speaking examiner who will ask only questions and evaluate accordingly. 
                  Initially greet and ask the candidate's name to ask further questions.
                  Start of by greeting the candidate and asking their name. 
                  Later on, generate exactly one question of IELTS speaking test as a professional examiner for section: ${section}. 
                  Ensure the questions are dynamic, coherent, and unique. 
                  Return only the question without any extra text.
                  Previous conversation history:\n${history}`,
      },
      // {
      //   // role: "assistant",
      //   // content: ``,
      // },
    ];

    // Attempt to generate a unique question
    do {
      const completion = await groq.chat.completions.create({
        messages: msgs,
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_completion_tokens: 512,
        top_p: 0.92,
        stream: false, // Stream disabled for simplicity
      });

      // Debugging: log the full response
      // console.log("Groq API response:", JSON.stringify(completion.choices));
      console.log(`HISTORY:::::${history}`)

      if (!completion.choices || !completion.choices[0]?.message?.content) {
        console.warn("Groq API returned an invalid or empty response.");
        newQuestion = null;
      } else {
        newQuestion = completion.choices[0].message.content.trim();
      }

      console.log(`Attempt ${attempts + 1}: Generated question: "${newQuestion}"`);
      attempts += 1;
    } while (
      (!newQuestion || history.includes(newQuestion)) &&
      attempts < 10
    );

    // Fallback if a unique question can't be generated
    if (!newQuestion || attempts >= 10) {
      console.warn("Unable to generate a unique question. Sending fallback response.");
      return res.status(200).json({
        question: "Describe a memorable trip you’ve taken. Why was it special?",
        // conversationHistory,
      });
    }

    // Add the new question to both histories
    // questionHistory.push(newQuestion);
    // conversationHistory.push(newQuestion);

    // Limit history size to avoid excessive memory usage
    // if (questionHistory.length > 50) questionHistory.shift();
    // if (conversationHistory.length > 50) conversationHistory.shift();

    // Send the generated question and conversation history
    res.status(200).json({ question: newQuestion, history });
  } catch (error) {
    console.error("Error generating question:", error.message);
    res.status(500).json({ error: "Failed to fetch a unique question" });
  }
});

app.post("/api/report", async (req,res)=>
{
  const { final } = req.body;
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are an expert IELTS speaking examiner who will grade this speaking section
        of the candidate. assess the performance against 4 criteria. Fluency and coherence, lexical resource, 
        grammatical range and accuracy, and pronunciation. this is the final conversation that you have to grade: ${final}
        give a very detailed analysis of  each and every point of where the candidate made mistakes and where exactly can they improve to reach higher bands.
        Also, tell the candidate what band he received.`,
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_completion_tokens: 512,
    top_p: 0.82,
    stream: false, // Stream disabled for simplicity
  });
  res.status(200).json({ report : completion.choices[0].message.content.trim() });
  formattedHistory = ``;
  // conversationHistory = [];
  // questionHistory = [];
}
);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
