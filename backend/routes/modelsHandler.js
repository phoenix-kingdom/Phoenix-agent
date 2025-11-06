/**
 * Models Handler Route
 * 
 * This file handles:
 * - Fetching available OpenAI models from the API
 * - Returning a list of models that can be used for chat
 */

/**
 * modelsHandler Function
 * 
 * This function fetches available models from OpenAI API
 * 
 * @param req - Express request object
 * @param res - Express response object (send models list back to frontend)
 */
export async function modelsHandler(req, res) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Return default models if API key is not configured
      return res.json({
        success: true,
        models: [
          { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { id: 'gpt-4', label: 'GPT-4' },
          { id: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview' },
          { id: 'gpt-4o', label: 'GPT-4o' },
        ],
        warning: 'OpenAI API key not configured, using default models'
      });
    }

    // Fetch models from OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Format ALL available models (not just GPT models)
    // Filter out deprecated models but include all active models
    const allModels = data.data
      .filter(model => {
        // Exclude deprecated models
        // Keep all active models regardless of type
        return !model.id.includes('deprecated') && 
               !model.id.includes('beta') && 
               model.owned_by === 'openai';
      })
      .map(model => ({
        id: model.id,
        // Create a readable label
        label: model.id
          .replace(/gpt-/gi, 'GPT-')
          .replace(/turbo/gi, 'Turbo')
          .replace(/preview/gi, 'Preview')
          .replace(/o1-/gi, 'O1-')
          .replace(/o3-/gi, 'O3-')
          .replace(/whisper-/gi, 'Whisper-')
          .replace(/dall-e/gi, 'DALL-E')
          .replace(/embedding-/gi, 'Embedding-')
          .replace(/text-embedding-/gi, 'Text-Embedding-')
          .replace(/text-/gi, 'Text-')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .replace(/\bGpt\b/g, 'GPT')
          .replace(/\bO1\b/g, 'O1')
          .replace(/\bO3\b/g, 'O3')
      }))
      // Sort by model ID (newer models first, then alphabetically)
      .sort((a, b) => {
        // Prioritize newer models
        if (a.id.includes('o3')) return -1;
        if (b.id.includes('o3')) return 1;
        if (a.id.includes('o1')) return -1;
        if (b.id.includes('o1')) return 1;
        if (a.id.includes('gpt-4o')) return -1;
        if (b.id.includes('gpt-4o')) return 1;
        if (a.id.includes('gpt-4')) return -1;
        if (b.id.includes('gpt-4')) return 1;
        if (a.id.includes('gpt-3.5')) return -1;
        if (b.id.includes('gpt-3.5')) return 1;
        return a.id.localeCompare(b.id);
      });

    // If no models found, return some defaults
    if (allModels.length === 0) {
      return res.json({
        success: true,
        models: [
          { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { id: 'gpt-4', label: 'GPT-4' },
          { id: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview' },
          { id: 'gpt-4o', label: 'GPT-4o' },
        ]
      });
    }

    res.json({
      success: true,
      models: allModels,
      count: allModels.length
    });

  } catch (error) {
    // If anything goes wrong, log the error and return default models
    console.error('Error fetching models:', error);
    
    // Return default models as fallback
    res.json({
      success: true,
      models: [
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { id: 'gpt-4', label: 'GPT-4' },
        { id: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview' },
        { id: 'gpt-4o', label: 'GPT-4o' },
      ],
      warning: 'Could not fetch models from API, using defaults'
    });
  }
}

