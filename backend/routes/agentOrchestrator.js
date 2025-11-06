/**
 * Agent Orchestrator
 * 
 * This file implements an Agent Orchestrator that can decide whether to:
 * - Answer directly (for general questions)
 * - Use the book_search tool (for questions requiring PDF content)
 * 
 * The orchestrator manually handles tool calling with OpenAI's function calling API
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { z } from 'zod';
import { book_search } from './ragTool.js';

/**
 * Agent Orchestrator Handler
 * 
 * Implements the agent loop:
 * 1. Initial call with user question and available tools
 * 2. Check if response is direct answer or tool call
 * 3. Execute tool if needed
 * 4. Second call with tool result
 * 5. Return final answer
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function agentOrchestratorHandler(req, res) {
  try {
    const { question, fileId, model, temperature, chat_history = [] } = req.body;

    // Validate inputs
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const selectedModel = model || 'gpt-3.5-turbo';
    let selectedTemperature = 0.7;
    if (temperature !== undefined && temperature !== null) {
      const tempNum = parseFloat(temperature);
      if (!isNaN(tempNum) && tempNum >= 0 && tempNum <= 1) {
        selectedTemperature = tempNum;
      }
    }

    // Initialize LLM with function calling enabled
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: selectedModel,
      temperature: selectedTemperature,
    });

    // System prompt defining the agent's persona and rules
    const systemPrompt = `You are an AI-powered reading companion and expert technical book analyst.

IMPORTANT: You have access to a book_search tool that searches the uploaded PDF document. The user has already uploaded a PDF, and you MUST use the book_search tool to answer questions about the book's content.

Rules:
1. ALWAYS use the book_search tool when the user asks about content from the uploaded book/PDF
2. ALWAYS use the book_search tool when the user asks questions that require information from the document
3. If a question is general knowledge (not related to the book), you can answer directly
4. Never say you don't have access to the book - you always have the book_search tool available
5. When using book_search, use the user's exact question as the query parameter

Remember: The PDF has already been uploaded and processed. Use book_search to find answers from it.`;

    // Convert chat history to LangChain message format
    const historyMessages = chat_history.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // Create the book_search tool as a LangChain tool
    const bookSearchTool = new DynamicStructuredTool({
      name: 'book_search',
      description: 'Searches the content of the uploaded technical book to find relevant, citation-based answers. Use this tool for any question that requires information directly from the book. ALWAYS use this tool when the user asks about content from the uploaded PDF.',
      schema: z.object({
        query: z.string().describe('The specific question or search term to look up in the book\'s content.')
      }),
      func: async ({ query }) => {
        return await book_search(query, fileId, selectedModel, selectedTemperature);
      }
    });

    // Use Agent Executor approach (more reliable than manual tool calling)
    // This is the same approach used in agentHandler.js which works
    const tools = [bookSearchTool];

    // Create agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    // Create agent executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 5,
    });

    // Execute agent
    const response = await agentExecutor.invoke({
      input: question,
      chat_history: historyMessages.map(msg => {
        if (msg instanceof HumanMessage) {
          return { role: 'user', content: msg.content };
        } else if (msg instanceof AIMessage) {
          return { role: 'assistant', content: msg.content };
        }
        return msg;
      }),
    });

    // Format tool results for frontend
    const toolResults = response.intermediateSteps?.map(step => {
      const obsStr = typeof step.observation === 'string' 
        ? step.observation 
        : String(step.observation);
      return {
        tool: step.action.tool,
        toolInput: step.action.toolInput,
        observation: obsStr.substring(0, 500) + (obsStr.length > 500 ? '...' : ''),
      };
    }) || [];

    res.json({
      success: true,
      answer: response.output,
      steps: toolResults,
      iterations: toolResults.length
    });

  } catch (error) {
    console.error('Error in agent orchestrator:', error);
    res.status(500).json({
      error: 'Failed to process agent request',
      message: error.message
    });
  }
}

