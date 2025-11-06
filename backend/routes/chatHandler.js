/**
 * Chat Handler Route
 * 
 * This file handles:
 * - Receiving questions from frontend
 * - Retrieving relevant PDF chunks based on question
 * - Generating AI responses using OpenAI
 * - Returning answers with source citations
 */

// Import ChatOpenAI - Langchain wrapper for OpenAI's chat models
// This allows us to use GPT models (like GPT-3.5-turbo) for generating responses
import { ChatOpenAI } from '@langchain/openai';

// Import createStuffDocumentsChain - creates a chain that puts retrieved documents
// into the prompt context for the LLM to use
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

// Import createRetrievalChain - creates a chain that:
// 1. Takes a question
// 2. Retrieves relevant documents from vector store
// 3. Passes documents to LLM for answer generation
import { createRetrievalChain } from 'langchain/chains/retrieval';

// Import ChatPromptTemplate - creates templates for LLM prompts
// Templates allow us to structure how we ask the LLM questions
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

// Import getVectorStore - function to retrieve vector stores by file ID
import { getVectorStore } from './pdfProcessor.js';

/**
 * chatHandler Function
 * 
 * This function is called when frontend sends a question via POST /api/chat
 * 
 * How it works (RAG - Retrieval-Augmented Generation):
 * 1. Receive question from user
 * 2. Retrieve relevant chunks from PDF using vector similarity search
 * 3. Pass question + relevant chunks to LLM
 * 4. LLM generates answer based on PDF content
 * 5. Return answer to frontend
 * 
 * @param req - Express request object (contains question, fileId, model, and temperature)
 * @param res - Express response object (send answer back to frontend)
 */
export async function chatHandler(req, res) {
  try {
    // Extract question, fileId, model, and temperature from request body
    // req.body contains JSON data sent from frontend
    const { question, fileId, model, temperature } = req.body;

    // Validate that question was provided
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Validate that fileId was provided
    // We need fileId to know which PDF's vector store to search
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Extract and validate model
    // Use provided model or default to 'gpt-3.5-turbo'
    // Frontend sends model selection from LeftSidebar
    const selectedModel = model || 'gpt-3.5-turbo';

    // Extract and validate temperature
    // Temperature should be between 0 and 1
    // Frontend sends temperature from LeftSidebar slider
    let selectedTemperature = 0.7; // Default value
    if (temperature !== undefined && temperature !== null) {
      const tempNum = parseFloat(temperature);
      // Validate temperature is a number and within valid range
      if (!isNaN(tempNum) && tempNum >= 0 && tempNum <= 1) {
        selectedTemperature = tempNum;
      }
    }

    /**
     * Step 1: Get the vector store for this PDF
     * 
     * The vector store contains:
     * - All text chunks from the PDF
     * - Embeddings (vectors) for each chunk
     * - Methods to search for similar chunks
     */
    const fileData = getVectorStore(fileId);

    // Check if vector store exists (PDF was successfully processed)
    if (!fileData) {
      return res.status(404).json({ error: 'PDF not found. Please upload a PDF first.' });
    }

    /**
     * Step 2: Initialize the Language Model (LLM)
     * 
     * ChatOpenAI wraps OpenAI's GPT models
     * Model and temperature are now extracted from request body
     * This allows users to select their preferred model and temperature from the frontend
     * 
     * Temperature controls randomness:
     * - 0.0 = very deterministic (same input = same output)
     * - 1.0 = very creative (varied responses)
     * - 0.7 = balanced (default)
     */
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY, // From .env file
      modelName: selectedModel, // Use model from frontend (or default)
      temperature: selectedTemperature, // Use temperature from frontend (or default)
    });

    /**
     * Step 3: Create Retriever
     * 
     * Retriever searches the vector store for chunks similar to the question
     * It uses similarity search (cosine similarity) to find relevant chunks
     * 
     * k: 4 means retrieve top 4 most similar chunks
     * More chunks = more context, but also more tokens/cost
     */
    const retriever = fileData.vectorStore.asRetriever({
      k: 4, // Number of chunks to retrieve
    });

    /**
     * Step 4: Create Prompt Template
     * 
     * This defines how we structure the prompt sent to the LLM
     * 
     * The template includes:
     * - System message: Instructions for the LLM
     * - Context: Placeholder for retrieved PDF chunks
     * - Chat history: Placeholder for conversation history (empty for now)
     * - Human input: The user's question
     */
    const prompt = ChatPromptTemplate.fromMessages([
      // System message - tells LLM how to behave
      ['system', 'Answer the user\'s questions based on the following context:\n\n{context}'],
      // Chat history - for conversation context (empty for now)
      new MessagesPlaceholder('chat_history'),
      // Human message - the user's question
      ['human', '{input}'],
    ]);

    /**
     * Step 5: Create Document Chain
     * 
     * This chain takes retrieved documents and puts them into the prompt
     * It combines all retrieved chunks into the {context} placeholder
     */
    const documentChain = await createStuffDocumentsChain({
      llm,        // The language model to use
      prompt,     // The prompt template
    });

    /**
     * Step 6: Create Retrieval Chain
     * 
     * This is the main chain that:
     * 1. Takes the user's question
     * 2. Uses retriever to find relevant chunks
     * 3. Passes question + chunks to document chain
     * 4. Document chain sends everything to LLM
     * 5. Returns the answer
     */
    const retrievalChain = await createRetrievalChain({
      retriever,           // How to find relevant chunks
      combineDocsChain: documentChain, // How to combine chunks and ask LLM
    });

    /**
     * Step 7: Query the Chain
     * 
     * This is where the magic happens:
     * - RetrievalChain takes the question
     * - Searches vector store for similar chunks
     * - Combines chunks with question
     * - Sends to OpenAI GPT model
     * - Gets back an answer
     */
    const response = await retrievalChain.invoke({
      input: question,        // User's question
      chat_history: [],      // Empty for now (could add conversation history later)
    });

    /**
     * Step 8: Send Response to Frontend
     * 
     * response contains:
     * - answer: The AI's response text
     * - context: The retrieved chunks used for the answer
     */
    res.json({
      success: true,
      answer: response.answer, // The AI's answer
      // Map through source documents to send previews to frontend
      sources: response.context?.map((doc) => ({
        pageContent: doc.pageContent.substring(0, 200) + '...', // First 200 chars
        metadata: doc.metadata || {}, // Any metadata (like page numbers, etc.)
      })) || [], // Empty array if no sources
    });

  } catch (error) {
    // If anything goes wrong, log the error and send error response
    console.error('Error in chat handler:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request', 
      message: error.message 
    });
  }
}
