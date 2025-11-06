/**
 * Agent Handler Route
 * 
 * This file handles:
 * - Receiving questions from frontend
 * - Creating an AI agent with tools
 * - Agent reasoning and tool usage
 * - Returning answers with reasoning steps
 */

// Import ChatOpenAI - Langchain wrapper for OpenAI's chat models
import { ChatOpenAI } from '@langchain/openai';

// Import agent-related modules from LangChain
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

// Import tool creation utilities
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Import getVectorStore - function to retrieve vector stores by file ID
import { getVectorStore } from './pdfProcessor.js';

/**
 * PDF Retrieval Tool
 * 
 * This tool allows the agent to search the PDF for relevant information
 */
function createPDFRetrievalTool(fileData) {
  return new DynamicStructuredTool({
    name: 'search_pdf',
    description: `Search the uploaded PDF document for information related to a query. 
    Use this tool when you need to find specific information, facts, or details from the PDF.
    The tool will return the most relevant chunks of text from the document.`,
    schema: z.object({
      query: z.string().describe('The search query to find relevant information in the PDF'),
    }),
    func: async ({ query }) => {
      try {
        const retriever = fileData.vectorStore.asRetriever({ k: 4 });
        const docs = await retriever.invoke(query);
        
        // Combine retrieved chunks into a readable format
        const results = docs.map((doc, idx) => {
          return `[Chunk ${idx + 1}]\n${doc.pageContent}`;
        }).join('\n\n---\n\n');
        
        return results || 'No relevant information found in the PDF.';
      } catch (error) {
        return `Error searching PDF: ${error.message}`;
      }
    },
  });
}

/**
 * Calculator Tool
 * 
 * Allows the agent to perform mathematical calculations
 */
function createCalculatorTool() {
  return new DynamicStructuredTool({
    name: 'calculator',
    description: `Perform mathematical calculations. Use this tool when you need to:
    - Add, subtract, multiply, or divide numbers
    - Calculate percentages, averages, or other mathematical operations
    - Solve numerical problems`,
    schema: z.object({
      expression: z.string().describe('The mathematical expression to evaluate (e.g., "2 + 2", "100 * 0.15", "sqrt(16)")'),
    }),
    func: async ({ expression }) => {
      try {
        // Sanitize expression to only allow safe math operations
        const sanitized = expression.replace(/[^0-9+\-*/().\s,]/g, '');
        
        // Use Function constructor in a safe way (only for math)
        const result = Function(`"use strict"; return (${sanitized})`)();
        
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return result.toString();
        }
        return 'Invalid calculation result';
      } catch (error) {
        return `Calculation error: ${error.message}`;
      }
    },
  });
}

/**
 * Agent Handler Function
 * 
 * Creates an AI agent that can reason and use tools to answer questions
 * 
 * @param req - Express request object (contains question, fileId, model, and temperature)
 * @param res - Express response object (send answer back to frontend)
 */
export async function agentHandler(req, res) {
  try {
    // Extract question, fileId, model, and temperature from request body
    const { question, fileId, model, temperature } = req.body;

    // Validate that question was provided
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Validate that fileId was provided
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Extract and validate model
    const selectedModel = model || 'gpt-3.5-turbo';

    // Extract and validate temperature
    let selectedTemperature = 0.7;
    if (temperature !== undefined && temperature !== null) {
      const tempNum = parseFloat(temperature);
      if (!isNaN(tempNum) && tempNum >= 0 && tempNum <= 1) {
        selectedTemperature = tempNum;
      }
    }

    /**
     * Step 1: Get the vector store for this PDF
     */
    const fileData = getVectorStore(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'PDF not found. Please upload a PDF first.' });
    }

    /**
     * Step 2: Initialize the Language Model (LLM)
     */
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: selectedModel,
      temperature: selectedTemperature,
    });

    /**
     * Step 3: Create Tools for the Agent
     */
    const tools = [
      createPDFRetrievalTool(fileData),
      createCalculatorTool(),
    ];

    /**
     * Step 4: Create Agent Prompt
     */
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a helpful AI assistant with access to tools.
      
You have access to the following tools:
- search_pdf: Search the uploaded PDF document for information
- calculator: Perform mathematical calculations

When answering questions:
1. Use search_pdf to find relevant information from the PDF when the question relates to the document
2. Use calculator for any mathematical operations
3. Combine information from multiple tools if needed
4. Provide clear, accurate answers based on the information you retrieve

Always cite your sources when using information from the PDF.`],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    /**
     * Step 5: Create Agent
     */
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    /**
     * Step 6: Create Agent Executor
     */
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true, // Log agent reasoning steps
      maxIterations: 5, // Limit agent iterations to prevent infinite loops
    });

    /**
     * Step 7: Execute Agent
     */
    const response = await agentExecutor.invoke({
      input: question,
      chat_history: [],
    });

    /**
     * Step 8: Send Response to Frontend
     */
    res.json({
      success: true,
      answer: response.output,
      // Include intermediate steps for debugging/transparency
      steps: response.intermediateSteps?.map(step => {
        const obsStr = typeof step.observation === 'string' 
          ? step.observation 
          : String(step.observation);
        return {
          tool: step.action.tool,
          toolInput: step.action.toolInput,
          observation: obsStr.substring(0, 500) + (obsStr.length > 500 ? '...' : ''),
        };
      }) || [],
    });

  } catch (error) {
    console.error('Error in agent handler:', error);
    res.status(500).json({ 
      error: 'Failed to process agent request', 
      message: error.message 
    });
  }
}

