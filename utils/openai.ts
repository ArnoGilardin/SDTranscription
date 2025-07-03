import OpenAI from 'openai';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

const openai = new OpenAI({
  apiKey: apiKey || '',
  dangerouslyAllowBrowser: true
});

export async function transcribeAudioRemote(
  uri: string, 
  apiKey: string, 
  model: 'small' | 'medium' = 'small'
): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API manquante pour la transcription distante.');
  }

  try {
    let formData = new FormData();
    
    if (Platform.OS === 'web') {
      try {
        let audioBlob: Blob;
        
        // Check if it's a Base64 data URL
        if (uri.startsWith('data:')) {
          // Convert Base64 to Blob
          const response = await fetch(uri);
          audioBlob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.statusText}`);
          }
          audioBlob = await response.blob();
        }
        
        if (audioBlob.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }
        
        formData.append('file', audioBlob, 'audio.webm');
      } catch (error) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio. Veuillez réenregistrer votre audio.');
      }
    } else {
      try {
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

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting transcription (attempt ${attempt}/${maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch('https://gilardinservice.shop/api/whisper', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
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
        
        if (!transcriptionResponse || !transcriptionResponse.transcription) {
          throw new Error('Aucune transcription reçue de l\'API.');
        }

        return transcriptionResponse.transcription;

      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        // Check for specific error types
        if (error.name === 'AbortError') {
          lastError.message = 'Request timeout - the transcription service took too long to respond';
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
      } else if (lastError.message.includes('Network') || lastError.message.includes('Failed to fetch')) {
        throw new Error('Erreur de connexion réseau. Veuillez vérifier votre connexion internet et réessayer.');
      } else if (lastError.message.includes('413') || lastError.message.includes('Payload Too Large')) {
        throw new Error('Le fichier audio est trop volumineux. Veuillez réduire sa taille.');
      } else if (lastError.message.includes('timeout')) {
        throw new Error('Timeout - Le service de transcription met trop de temps à répondre. Veuillez réessayer.');
      }
      
      throw new Error(`Erreur lors de la transcription: ${lastError.message}`);
    }

    throw new Error('Échec de la transcription après plusieurs tentatives.');

  } catch (error: any) {
    console.error('Remote transcription error:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la transcription.');
  }
}

export async function transcribeAudio(uri: string, speakers: any[]): Promise<{ transcript: string; words: any[] }> {
  if (!apiKey) {
    throw new Error('Clé API OpenAI invalide ou manquante. Veuillez vérifier votre configuration.');
  }

  try {
    let formData = new FormData();
    
    if (Platform.OS === 'web') {
      try {
        let audioBlob: Blob;
        
        // Check if it's a Base64 data URL
        if (uri.startsWith('data:')) {
          // Convert Base64 to Blob
          const response = await fetch(uri);
          audioBlob = await response.blob();
        } else {
          // Regular URL
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.statusText}`);
          }
          audioBlob = await response.blob();
        }
        
        if (audioBlob.size > MAX_FILE_SIZE) {
          throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
        }
        
        formData.append('file', audioBlob, 'audio.webm');
      } catch (error) {
        console.error('Error processing audio file:', error);
        throw new Error('Erreur lors du traitement du fichier audio. Veuillez réenregistrer votre audio.');
      }
    } else {
      try {
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
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

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
          lastError.message = 'Request timeout - OpenAI API took too long to respond';
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

export async function generateSummary(transcript: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API OpenAI invalide ou manquante.');
  }

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