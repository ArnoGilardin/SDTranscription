import OpenAI from 'openai';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

// Create OpenAI client with provided API key
const createOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};

// Helper function to check if a URL is reachable
async function checkApiHealth(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
    
    // Try a simple GET request to check if the service is reachable
    const response = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.status !== 405; // 405 means method not allowed, but service is reachable
  } catch (error) {
    console.log('API health check failed:', error);
    return false;
  }
}

export async function transcribeAudioRemote(
  audioData: string | Blob, 
  apiKey: string, 
  model: 'small' | 'medium' = 'small'
): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API manquante pour la transcription distante.');
  }

  const apiUrl = 'https://gilardinservice.shop/api/whisper';
  
  // Check API health first
  const isApiHealthy = await checkApiHealth(apiUrl);
  if (!isApiHealthy) {
    throw new Error('Le service de transcription est temporairement indisponible. Veuillez réessayer plus tard ou utiliser le mode local.');
  }

  try {
    let formData = new FormData();
    
    if (Platform.OS === 'web') {
      try {
        let audioBlob: Blob;
        
        // If audioData is already a Blob, use it directly
        if (audioData instanceof Blob) {
          audioBlob = audioData;
        } else if (typeof audioData === 'string' && audioData.startsWith('data:')) {
          // Convert Base64 to Blob
          const response = await fetch(audioData);
          audioBlob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(audioData as string);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.statusText}`);
          }
          audioBlob = await response.blob();
        }
        
        if (audioBlob.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }
        
        if (audioBlob.size === 0) {
          throw new Error('Le fichier audio est vide. Veuillez réenregistrer votre audio.');
        }
        
        formData.append('file', audioBlob, 'audio.webm');
      } catch (error) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio. Veuillez réenregistrer votre audio.');
      }
    } else {
      try {
        const uri = audioData as string;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Le fichier audio est introuvable');
        }

        if (fileInfo.size === 0) {
          throw new Error('Le fichier audio est vide');
        }

        if (fileInfo.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }

        formData.append('file', {
          uri: uri,
          type: 'audio/m4a',
          name: 'audio.m4a'
        } as any);

      } catch (error: any) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio sur mobile.');
      }
    }

    formData.append('model', model);

    const maxRetries = 2; // Reduced retries for faster failure
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting transcription (attempt ${attempt}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort({ reason: 'timeout' }), 30000); // Reduced timeout to 30 seconds

        const response = await fetch(apiUrl, {
          method: 'POST',
          mode: 'cors', // Explicitly set CORS mode
          headers: {
            'X-API-KEY': apiKey,
            // Don't set Content-Type for FormData, let the browser set it
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          // Handle specific HTTP status codes
          if (response.status === 0 || response.status >= 500) {
            throw new Error('SERVICE_UNAVAILABLE');
          } else if (response.status === 404) {
            throw new Error('SERVICE_NOT_FOUND');
          } else if (response.status === 401 || response.status === 403) {
            throw new Error('AUTHENTICATION_ERROR');
          } else if (response.status === 405) {
            throw new Error('METHOD_NOT_ALLOWED');
          }
          
          throw new Error(
            `API request failed with status ${response.status}: ${errorData.error?.message || errorText}`
          );
        }

        const transcriptionResponse = await response.json();
        
        if (!transcriptionResponse || !transcriptionResponse.transcription) {
          throw new Error('Aucune transcription reçue de l\'API.');
        }

        return transcriptionResponse.transcription;

      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        // Check for specific error types that shouldn't be retried
        if (error.message === 'AUTHENTICATION_ERROR' || 
            error.message === 'SERVICE_NOT_FOUND' ||
            error.message === 'METHOD_NOT_ALLOWED' ||
            error.message.includes('413') || 
            error.message.includes('Payload Too Large')) {
          break; // Don't retry these errors
        }

        // Check for network errors that might be retryable
        const isNetworkError = error.name === 'AbortError' ||
                              error.name === 'TypeError' ||
                              error.message === 'SERVICE_UNAVAILABLE' ||
                              error.message.includes('Failed to fetch') ||
                              error.message.includes('Network') ||
                              error.message.includes('ECONNREFUSED') ||
                              error.message.includes('timeout');

        if (!isNetworkError || attempt === maxRetries) {
          break;
        }

        // Shorter delay for faster user feedback
        const delay = Math.min(1000 * attempt, 3000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      // Provide more specific error messages
      if (lastError.message === 'AUTHENTICATION_ERROR') {
        throw new Error('Erreur d\'authentification API. Veuillez vérifier votre clé API dans les paramètres.');
      } else if (lastError.message === 'SERVICE_NOT_FOUND') {
        throw new Error('Service de transcription introuvable. Veuillez contacter le support.');
      } else if (lastError.message === 'METHOD_NOT_ALLOWED') {
        throw new Error('Configuration du service incorrecte. Veuillez contacter le support technique.');
      } else if (lastError.message === 'SERVICE_UNAVAILABLE') {
        throw new Error('Le service de transcription est temporairement indisponible. Veuillez réessayer plus tard.');
      } else if (lastError.name === 'AbortError' || lastError.message.includes('timeout')) {
        throw new Error('Délai d\'attente dépassé. Le service met trop de temps à répondre. Veuillez réessayer.');
      } else if (lastError.name === 'TypeError' || lastError.message.includes('Failed to fetch')) {
        throw new Error('Impossible de se connecter au service de transcription. Vérifiez votre connexion internet ou essayez le mode local.');
      } else if (lastError.message.includes('429') || lastError.message.includes('Too Many Requests')) {
        throw new Error('Limite de requêtes API atteinte. Veuillez réessayer plus tard.');
      } else if (lastError.message.includes('413') || lastError.message.includes('Payload Too Large')) {
        throw new Error('Le fichier audio est trop volumineux. Veuillez réduire sa taille.');
      }
      
      throw new Error(`Erreur lors de la transcription: ${lastError.message}`);
    }

    throw new Error('Échec de la transcription après plusieurs tentatives.');

  } catch (error: any) {
    console.error('Remote transcription error:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la transcription.');
  }
}

export async function transcribeAudio(audioData: string | Blob, speakers: any[], apiKey: string): Promise<{ transcript: string; words: any[] }> {
  if (!apiKey) {
    throw new Error('Clé API OpenAI invalide ou manquante. Veuillez vérifier votre configuration.');
  }

  const openai = createOpenAIClient(apiKey);

  try {
    let formData = new FormData();
    
    if (Platform.OS === 'web') {
      try {
        let audioBlob: Blob;
        
        // If audioData is already a Blob, use it directly
        if (audioData instanceof Blob) {
          audioBlob = audioData;
        } else if (typeof audioData === 'string' && audioData.startsWith('data:')) {
          // Convert Base64 to Blob
          const response = await fetch(audioData);
          audioBlob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(audioData as string);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.statusText}`);
          }
          audioBlob = await response.blob();
        }
        
        if (audioBlob.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }
        
        if (audioBlob.size === 0) {
          throw new Error('Le fichier audio est vide. Veuillez réenregistrer votre audio.');
        }
        
        formData.append('file', audioBlob, 'audio.webm');
      } catch (error) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio. Veuillez réenregistrer votre audio.');
      }
    } else {
      try {
        const uri = audioData as string;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Le fichier audio est introuvable');
        }

        if (fileInfo.size === 0) {
          throw new Error('Le fichier audio est vide');
        }

        if (fileInfo.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }

        formData.append('file', {
          uri: uri,
          type: 'audio/m4a',
          name: 'audio.m4a'
        } as any);

      } catch (error: any) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio sur mobile.');
      }
    }

    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.2');
    formData.append('language', 'fr');

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting OpenAI transcription (attempt ${attempt}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort({ reason: 'timeout' }), 60000); // 60 second timeout

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          throw new Error(
            `API request failed with status ${response.status}: ${errorData.error?.message || errorText}`
          );
        }

        const transcriptionResponse = await response.json();
        
        if (!transcriptionResponse || !transcriptionResponse.text) {
          throw new Error('Aucun texte reçu de l\'API Whisper.');
        }

        // Process the words with speaker identification
        const words = transcriptionResponse.words || [];
        let processedWords = [];
        let currentSpeakerId = speakers[0]?.id;
        let currentTime = 0;

        for (const word of words) {
          // Add speaker changes based on pauses or other indicators
          if (word.start - currentTime > 2) { // 2 second pause indicates potential speaker change
            currentSpeakerId = speakers[Math.floor(Math.random() * speakers.length)]?.id;
          }
          
          processedWords.push({
            text: word.text,
            startTime: word.start,
            endTime: word.end,
            speakerId: currentSpeakerId
          });
          
          currentTime = word.end;
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that improves transcriptions. Format the text with proper punctuation, paragraphs, and correct any obvious errors while maintaining the original meaning. The text is in French, so ensure proper French formatting and punctuation rules are followed.',
            },
            {
              role: 'user',
              content: transcriptionResponse.text,
            },
          ],
          temperature: 0.3,
        });

        const formattedText = completion.choices[0]?.message?.content;
        return {
          transcript: formattedText || transcriptionResponse.text,
          words: processedWords
        };

      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        // Check for specific error types
        if (error.name === 'AbortError') {
          lastError = new Error('Request timeout - OpenAI API took too long to respond');
        }

        const isRetryableError = error.message.includes('Network') || 
                               error.message.includes('ECONNREFUSED') ||
                               error.message.includes('timeout') ||
                               error.message.includes('Failed to fetch') ||
                               error.name === 'AbortError';

        if (!isRetryableError || attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(Math.pow(2, attempt) * 1000, 10000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      if (lastError.message.includes('401') || lastError.message.includes('Unauthorized')) {
        throw new Error('Erreur d\'authentification API. Veuillez vérifier votre clé API.');
      } else if (lastError.message.includes('429') || lastError.message.includes('Too Many Requests')) {
        throw new Error('Limite de requêtes API atteinte. Veuillez réessayer plus tard.');
      } else if (lastError.message.includes('insufficient_quota')) {
        throw new Error('Quota API insuffisant. Veuillez vérifier votre abonnement OpenAI.');
      } else if (lastError.message.includes('Network') || lastError.message.includes('Failed to fetch')) {
        throw new Error('Erreur de connexion réseau. Veuillez vérifier votre connexion internet et réessayer.');
      } else if (lastError.message.includes('413') || lastError.message.includes('Payload Too Large')) {
        throw new Error('Le fichier audio est trop volumineux. Veuillez réduire sa taille.');
      } else if (lastError.message.includes('timeout')) {
        throw new Error('Timeout - OpenAI API met trop de temps à répondre. Veuillez réessayer.');
      }
      
      throw new Error(`Erreur lors de la transcription: ${lastError.message}`);
    }

    throw new Error('Échec de la transcription après plusieurs tentatives.');

  } catch (error: any) {
    console.error('Transcription error:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la transcription.');
  }
}

export async function generateSummary(transcript: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API OpenAI invalide ou manquante.');
  }

  const openai = createOpenAIClient(apiKey);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant expert en résumé de texte. Génère un résumé concis et structuré du texte fourni en français. Le résumé doit être clair, précis et capturer les points essentiels du texte original. Limite le résumé à 3-5 lignes maximum.',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('Aucun résumé généré.');
    }

    return summary;

  } catch (error: any) {
    console.error('Summary generation error:', error);
    if (error.status === 401) {
      throw new Error('Erreur d\'authentification API.');
    } else if (error.status === 429) {
      throw new Error('Limite de requêtes API atteinte.');
    } else if (error.message.includes('insufficient_quota')) {
      throw new Error('Quota API insuffisant.');
    }
    throw new Error('Erreur lors de la génération du résumé.');
  }
}