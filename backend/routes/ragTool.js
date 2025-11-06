/**
 * RAG Tool Function
 * 
 * This file contains the book_search tool that wraps the RAG logic
 * into a function that can be called by the agent orchestrator
 */

import { ChatOpenAI } from '@langchain/openai';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getVectorStore } from './pdfProcessor.js';

/**
 * book_search Tool Function
 * 
 * Encapsulates the RAG logic into a callable function
 * 
 * @param query - The user's question or search term
 * @param fileId - The file ID of the uploaded PDF
 * @param model - The OpenAI model to use (optional)
 * @param temperature - Temperature setting (optional)
 * @returns Formatted string with retrieved text chunks and citations
 */
export async function book_search(query, fileId, model = 'gpt-3.5-turbo', temperature = 0.7) {
  try {
    // Step 1: Get the vector store for this PDF
    const fileData = getVectorStore(fileId);
    if (!fileData) {
      return 'Error: PDF not found. Please upload a PDF first.';
    }

    // Step 2: Initialize the Language Model
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: model,
      temperature: temperature,
    });

    // Step 3: Create Retriever
    const retriever = fileData.vectorStore.asRetriever({
      k: 4, // Number of chunks to retrieve
    });

    // Step 4: Create Prompt Template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'Answer the user\'s questions based on the following context:\n\n{context}'],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    // Step 5: Create Document Chain
    const documentChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    // Step 6: Create Retrieval Chain
    const retrievalChain = await createRetrievalChain({
      retriever,
      combineDocsChain: documentChain,
    });

    // Step 7: Invoke the RAG chain
    const response = await retrievalChain.invoke({
      input: query,
      chat_history: [],
    });

    // Step 8: Format the result for the LLM
    // Include retrieved chunks with their content and any available metadata (like page numbers)
    const formattedResult = formatRAGResult(response);

    return formattedResult;

  } catch (error) {
    console.error('Error in book_search tool:', error);
    return `Error searching book: ${error.message}`;
  }
}

/**
 * Format RAG Result
 * 
 * Formats the retrieval chain result into a readable string for the LLM
 * 
 * @param result - The result from retrievalChain.invoke()
 * @returns Formatted string with chunks and citations
 */
function formatRAGResult(result) {
  const answer = result.answer || '';
  const context = result.context || [];
  
  // Build formatted result with citations
  let formatted = `Answer: ${answer}\n\n`;
  
  if (context.length > 0) {
    formatted += 'Source Citations:\n';
    formatted += '---\n';
    
    context.forEach((doc, idx) => {
      const pageInfo = doc.metadata?.page ? ` (Page ${doc.metadata.page})` : '';
      const chunkPreview = doc.pageContent.substring(0, 300);
      formatted += `[Source ${idx + 1}${pageInfo}]\n${chunkPreview}${chunkPreview.length < doc.pageContent.length ? '...' : ''}\n\n`;
    });
  }
  
  return formatted;
}

/**
 * OpenAI Function Schema for book_search
 * 
 * This schema describes the tool to OpenAI's API
 */
export const book_search_schema = {
  type: 'function',
  function: {
    name: 'book_search',
    description: 'Searches the content of the uploaded technical book to find relevant, citation-based answers. Use this tool for any question that requires information directly from the book.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The specific question or search term to look up in the book\'s content.'
        }
      },
      required: ['query']
    }
  }
};

