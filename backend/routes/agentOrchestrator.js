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
import { book_search, book_search_schema } from './ragTool.js';

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

Your primary goal is to help users understand and explore the uploaded technical book.

You MUST use the \`book_search\` tool for any question that requires specific, citation-based information from the book.

If a question is general knowledge or can be answered without the book, answer directly.

If the user asks for a summary, style analysis, or target audience, answer based on your initial analysis of the book (which you should have stored or can generate).

Always be concise, professional, and reference the book's content when possible.`;

    // Convert chat history to LangChain message format
    const historyMessages = chat_history.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // Bind tools to the LLM
    const llmWithTools = llm.bindTools([book_search_schema]);

    /**
     * Step 1: Initial Call
     * Send user question with available tools
     */
    const initialMessages = [
      new SystemMessage(systemPrompt),
      ...historyMessages,
      new HumanMessage(question)
    ];

    let messages = initialMessages;
    let toolResults = [];
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops
    let finalAnswer = '';

    /**
     * Step 2-4: Agent Loop
     * Continue until we get a final answer (no more tool calls)
     */
    while (iterations < maxIterations) {
      iterations++;

      // Invoke LLM with current messages
      const response = await llmWithTools.invoke(messages);

      // Check if response contains tool calls
      const toolCalls = response.tool_calls || [];

      if (toolCalls.length === 0) {
        // No tool calls - this is the final answer
        finalAnswer = response.content;
        break;
      }

      // Step 3: Execute Tools
      const toolCallResults = [];
      
      for (const toolCall of toolCalls) {
        if (toolCall.name === 'book_search') {
          const query = toolCall.args?.query || question;
          console.log(`[Agent] Executing book_search with query: "${query}"`);
          
          const toolResult = await book_search(query, fileId, selectedModel, selectedTemperature);
          
          toolCallResults.push(
            new ToolMessage({
              content: toolResult,
              tool_call_id: toolCall.id,
            })
          );

          toolResults.push({
            tool: toolCall.name,
            toolInput: { query },
            observation: toolResult.substring(0, 500) + (toolResult.length > 500 ? '...' : '')
          });
        }
      }

      // Step 4: Second Call (Tool Result Injection)
      // Add the LLM response (with tool calls) and tool results to messages
      messages = [
        ...messages,
        response, // The LLM's response with tool calls
        ...toolCallResults
      ];
    }

    if (iterations >= maxIterations) {
      console.warn('[Agent] Reached max iterations, returning current response');
      finalAnswer = finalAnswer || 'I apologize, but I reached the maximum number of reasoning steps.';
    }

    /**
     * Step 5: Return Final Answer
     */

    res.json({
      success: true,
      answer: finalAnswer,
      steps: toolResults, // Include tool usage steps for transparency
      iterations: iterations
    });

  } catch (error) {
    console.error('Error in agent orchestrator:', error);
    res.status(500).json({
      error: 'Failed to process agent request',
      message: error.message
    });
  }
}

