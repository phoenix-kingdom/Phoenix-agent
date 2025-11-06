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
import { getVectorStore } from './pdfProcessor.js';

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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Agent] ERROR: OPENAI_API_KEY is not configured in environment variables');
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        message: 'Please set OPENAI_API_KEY in your .env file. See SETUP.md for instructions.',
        help: 'Create a .env file in the backend folder with: OPENAI_API_KEY=sk-your-key-here'
      });
    }

    const selectedModel = model || 'gpt-3.5-turbo';
    let selectedTemperature = 0.7;
    if (temperature !== undefined && temperature !== null) {
      const tempNum = parseFloat(temperature);
      if (!isNaN(tempNum) && tempNum >= 0 && tempNum <= 1) {
        selectedTemperature = tempNum;
      }
    }

    console.log('[Agent] Initializing LLM with model:', selectedModel, 'temperature:', selectedTemperature);
    console.log('[Agent] API Key configured:', !!process.env.OPENAI_API_KEY, '(length:', process.env.OPENAI_API_KEY?.length || 0, ')');

    // Initialize LLM with function calling enabled
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: selectedModel,
      temperature: selectedTemperature,
    });

    // Verify PDF exists before creating the agent
    const fileData = getVectorStore(fileId);
    if (!fileData) {
      return res.status(404).json({ 
        error: 'PDF not found. Please upload a PDF first.',
        message: 'The PDF file has not been processed yet. Please wait for the upload to complete.'
      });
    }

    // System prompt defining the agent's persona and rules
    const systemPrompt = `You are an AI-powered reading companion and expert technical book analyst.

CRITICAL: A PDF document has been uploaded and is ready for searching. You MUST use the book_search tool for ANY question about the book's content, main ideas, topics, or information.

MANDATORY RULES:
1. For ANY question about the book (main idea, topics, content, information, etc.), you MUST call the book_search tool FIRST
2. NEVER say the PDF needs to be uploaded - it is already uploaded and processed
3. NEVER respond that you don't have access to the book - you always have the book_search tool
4. If asked about the book's main idea, topics, or any content, use book_search with the user's question
5. Only answer directly (without tool) for general knowledge questions completely unrelated to the book
6. When using book_search, pass the user's question or relevant keywords as the query parameter

The PDF is available and ready. Always use book_search tool when the question relates to the document.`;

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
      description: `MANDATORY: Use this tool to search the uploaded PDF document. The PDF is already uploaded and processed. 
      
      USE THIS TOOL FOR:
      - Questions about the book's main idea, topics, or content
      - Any question that requires information from the document
      - Questions about what the book contains, discusses, or explains
      
      DO NOT say the PDF needs to be uploaded - it is already available. Always use this tool when asked about the book.`,
      schema: z.object({
        query: z.string().describe('The user\'s question or search term to find in the PDF. Use the exact question or relevant keywords.')
      }),
      func: async ({ query }) => {
        return await book_search(query, fileId, selectedModel, selectedTemperature);
      }
    });

    // Use Agent Executor approach (more reliable than manual tool calling)
    // This is the same approach used in agentHandler.js which works
    const tools = [bookSearchTool];

    // Create agent prompt with explicit instructions
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt + '\n\nRemember: You have the book_search tool available. For questions about the book, you MUST use it. Do not respond that the PDF needs to be uploaded.'],
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
      returnIntermediateSteps: true, // Enable intermediate steps tracking
    });

    // Check if streaming is requested
    const stream = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');
    
    // Execute agent with streaming support
    console.log('[Agent] Executing with question:', question);
    console.log('[Agent] FileId:', fileId);
    console.log('[Agent] PDF exists:', !!fileData);
    console.log('[Agent] Streaming:', stream);
    
    if (stream) {
      // Set up Server-Sent Events for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      let fullAnswer = '';
      let sources = [];
      
      try {
        // Stream agent execution using AgentExecutor.stream()
        const stream = agentExecutor.stream({
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
        
        // Process streaming chunks from agent
        for await (const chunk of stream) {
          // Agent is thinking/using tools
          if (chunk.agent) {
            const agentOutput = chunk.agent;
            if (agentOutput.messages && agentOutput.messages.length > 0) {
              for (const message of agentOutput.messages) {
                if (message.content) {
                  const content = typeof message.content === 'string' 
                    ? message.content 
                    : (Array.isArray(message.content) ? message.content[0]?.text || '' : '');
                  
                  if (content) {
                    const newContent = content.slice(fullAnswer.length);
                    if (newContent) {
                      fullAnswer = content;
                      res.write(`data: ${JSON.stringify({ type: 'token', content: newContent })}\n\n`);
                    }
                  }
                }
              }
            }
          }
          
          // Tool execution
          if (chunk.tools) {
            res.write(`data: ${JSON.stringify({ type: 'tool', message: 'Searching PDF...' })}\n\n`);
          }
        }
        
        // After streaming, extract sources
        const fileDataForSources = getVectorStore(fileId);
        if (fileDataForSources) {
          try {
            const retriever = fileDataForSources.vectorStore.asRetriever({ k: 4 });
            const docs = await retriever.invoke(question);
            
            sources = docs.map((doc) => {
              const pageNumber = doc.metadata?.page || doc.metadata?.loc?.pageNumber;
              // Extract precise snippet (first sentence or 50 chars, not full context)
              const snippet = doc.pageContent
                .split(/[.!?]/)[0] // Get first sentence
                .substring(0, 50) // Limit to 50 chars
                .trim();
              
              return {
                pageContent: snippet,
                metadata: {
                  ...doc.metadata,
                  page: pageNumber,
                  tool: 'book_search',
                  query: question,
                }
              };
            });
          } catch (error) {
            console.error('Error extracting sources:', error);
          }
        }
        
        // Send final message with sources
        res.write(`data: ${JSON.stringify({ 
          type: 'done', 
          answer: fullAnswer,
          sources: sources 
        })}\n\n`);
        res.end();
        return;
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
        return;
      }
    }
    
    // Non-streaming execution (original code)
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
    
    console.log('[Agent] Response output:', response.output?.substring(0, 200));
    console.log('[Agent] Full response keys:', Object.keys(response));
    console.log('[Agent] Intermediate steps:', response.intermediateSteps?.length || 0);
    
    // Check if intermediateSteps exist, if not try to extract from the response structure
    let intermediateSteps = response.intermediateSteps || [];
    
    // If still empty, the tool was called but steps weren't tracked - extract from tool results
    if (intermediateSteps.length === 0 && response.output) {
      console.log('[Agent] No intermediate steps found, but tool was likely called. Checking response structure...');
      // The tool was called (we can see it in verbose logs), so we need to extract sources differently
      // We'll extract sources directly from the vector store using the question
    }
    
    if (intermediateSteps && intermediateSteps.length > 0) {
      console.log('[Agent] Tools used:', intermediateSteps.map(s => s.action?.tool || s.tool || 'unknown'));
    } else {
      console.warn('[Agent] WARNING: No intermediate steps tracked, but tool may have been called.');
    }

    // Format tool results for frontend
    const toolResults = intermediateSteps?.map(step => {
      const toolName = step.action?.tool || step.tool || 'unknown';
      const toolInput = step.action?.toolInput || step.toolInput || {};
      const obsStr = typeof step.observation === 'string' 
        ? step.observation 
        : String(step.observation || '');
      return {
        tool: toolName,
        toolInput: toolInput,
        observation: obsStr.substring(0, 500) + (obsStr.length > 500 ? '...' : ''),
      };
    }) || [];

    // Extract sources from tool results (for book_search tool)
    // ALWAYS extract sources from the vector store using the question, even if intermediateSteps is empty
    // This ensures we get sources even when the agent executor doesn't track steps properly
    const sources = [];
    const fileDataForSources = getVectorStore(fileId);
    
    if (fileDataForSources) {
      // If we have intermediate steps, use them
      if (intermediateSteps && intermediateSteps.length > 0) {
        for (const step of intermediateSteps) {
          const toolName = step.action?.tool || step.tool;
          if (toolName === 'book_search') {
            const query = step.action?.toolInput?.query || step.toolInput?.query || question;
            try {
              // Retrieve documents directly from vector store to get full metadata
              const retriever = fileDataForSources.vectorStore.asRetriever({ k: 4 });
              const docs = await retriever.invoke(query);
              
              // Format sources with metadata - extract precise snippets (not full context)
              docs.forEach((doc, idx) => {
                const pageNumber = doc.metadata?.page || doc.metadata?.loc?.pageNumber;
                // Extract first sentence or key phrase (50 chars max) for precise highlighting
                const snippet = doc.pageContent
                  .split(/[.!?]/)[0] // Get first sentence
                  .substring(0, 50) // Limit to 50 chars for precise highlighting
                  .trim();
                
                sources.push({
                  pageContent: snippet || doc.pageContent.substring(0, 50),
                  metadata: {
                    ...doc.metadata,
                    page: pageNumber,
                    tool: 'book_search',
                    query: query,
                  }
                });
              });
            } catch (error) {
              console.error('Error retrieving sources:', error);
              // Fallback to observation-based source
              if (step.observation) {
                const obsStr = typeof step.observation === 'string' ? step.observation : String(step.observation);
                sources.push({
                  pageContent: obsStr.substring(0, 300) + (obsStr.length > 300 ? '...' : ''),
                  metadata: {
                    tool: 'book_search',
                    query: query,
                  }
                });
              }
            }
          }
        }
      } else {
        // If no intermediate steps, extract sources directly using the question
        // This handles the case where the tool was called but steps weren't tracked
        console.log('[Agent] Extracting sources directly from vector store using question:', question);
        try {
          const retriever = fileDataForSources.vectorStore.asRetriever({ k: 4 });
          const docs = await retriever.invoke(question);
          
          // Format sources with metadata - extract precise snippets
          docs.forEach((doc, idx) => {
            const pageNumber = doc.metadata?.page || doc.metadata?.loc?.pageNumber;
            // Extract first sentence or key phrase (50 chars max) for precise highlighting
            const snippet = doc.pageContent
              .split(/[.!?]/)[0] // Get first sentence
              .substring(0, 50) // Limit to 50 chars for precise highlighting
              .trim();
            
            sources.push({
              pageContent: snippet || doc.pageContent.substring(0, 50),
              metadata: {
                ...doc.metadata,
                page: pageNumber,
                tool: 'book_search',
                query: question,
              }
            });
          });
          console.log('[Agent] Extracted', sources.length, 'sources directly from vector store');
        } catch (error) {
          console.error('Error extracting sources directly:', error);
        }
      }
    }

    // Always include sources if we have any, even if empty
    const responseData = {
      success: true,
      answer: response.output,
      steps: toolResults,
      iterations: toolResults.length
    };
    
    // Always include sources array (even if empty) so frontend knows to check
    if (sources.length > 0) {
      responseData.sources = sources;
    } else {
      // If no sources from tool results, try to create from steps
      responseData.sources = toolResults
        .filter(step => step.tool === 'book_search')
        .map(step => ({
          pageContent: step.observation || 'No content available',
          metadata: {
            tool: step.tool,
            query: step.toolInput?.query || ''
          }
        }));
    }
    
    console.log('[Agent] Returning response with', responseData.sources?.length || 0, 'sources');
    
    res.json(responseData);

  } catch (error) {
    console.error('[Agent] Error in agent orchestrator:', error);
    console.error('[Agent] Error stack:', error.stack);
    
    // Check for specific OpenAI API errors
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(401).json({
        error: 'OpenAI API authentication failed',
        message: 'Invalid or missing OpenAI API key. Please check your .env file.',
        details: error.message
      });
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return res.status(429).json({
        error: 'OpenAI API rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to process agent request',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

