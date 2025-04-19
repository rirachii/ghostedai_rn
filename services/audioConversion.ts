/**
 * Audio conversion utility for converting audio files to formats
 * that are compatible with AI processing services.
 */

import { supabase } from '@/config/supabase';

// Get the audio converter URL from environment variables or use the hardcoded value
const AUDIO_CONVERTER_URL = process.env.EXPO_PUBLIC_AUDIO_CONVERTER_URL || 
  'https://audio-converter-service-901877301098.northamerica-northeast2.run.app/convert';

/**
 * Converts an audio file from M4A to MP3 format using a cloud service
 * 
 * @param filePath The Supabase storage path to the M4A file
 * @returns Promise resolving to the path of the converted MP3 file
 */
export const convertAudioToMp3 = async (filePath: string): Promise<string> => {
  try {
    if (!AUDIO_CONVERTER_URL) {
      console.warn('Audio converter URL is not configured, using original file');
      return filePath;
    }

    // Get the current session for authentication
    console.log('Getting Supabase session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No active session found');
      throw new Error('No active session');
    }
    
    console.log('Session info:', {
      hasAccessToken: !!session.access_token,
      tokenPreview: session.access_token.substring(0, 20) + '...',
      userId: session.user?.id,
    });
    
    // For debugging
    console.log('Converting file:', filePath);
    console.log('Service URL:', AUDIO_CONVERTER_URL);
    
    // Log request details
    const requestBody = {
      filePath: filePath,
      userId: session.user?.id
    };
    console.log('Request body:', requestBody);
    
    console.log('Making request to conversion service...');
    const response = await fetch(AUDIO_CONVERTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Supabase-Auth': session.access_token
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      }
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error('Error response:', errorData);
      } catch (e) {
        console.error('Could not parse error response:', e);
        // Try to get response text if JSON parsing fails
        try {
          const textResponse = await response.text();
          console.error('Raw error response:', textResponse);
        } catch (textError) {
          console.error('Could not get response text:', textError);
        }
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Conversion response:', data);
    
    if (!data?.path) {
      console.error('Invalid response format:', data);
      throw new Error('No converted file path received from converter');
    }
    
    return data.path;
  } catch (error) {
    console.error('Error converting audio:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    // Fallback to original file path in case of error
    console.warn('Using original file path as fallback due to conversion error');
    return filePath;
  }
};

/**
 * Processes the audio file with AI to get transcription, summary, and tasks
 * 
 * Calls the Supabase Edge Function to process the audio file using AI
 * 
 * @param mp3Path The path to the MP3 file to process
 * @returns Promise resolving to the processing results
 */
export const processAudioWithAI = async (mp3Path: string): Promise<any> => {
  try {
    // Get the current session for authentication
    console.log('Getting Supabase session for AI processing...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No active session found for AI processing');
      throw new Error('No active session');
    }
    
    // Log request details
    console.log('Processing audio file:', mp3Path);
    
    // Call the Supabase Edge Function for AI processing
    console.log('Making request to AI processing service...');
    const processResponse = await fetch('https://ragulxwhrwzzeifoqilx.supabase.co/functions/v1/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ filePath: mp3Path })
    });
    
    console.log('AI Processing response status:', processResponse.status);
    
    if (!processResponse.ok) {
      let errorMessage = `HTTP error! status: ${processResponse.status}`;
      try {
        const errorData = await processResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error('Error response from AI processing:', errorData);
      } catch (e) {
        console.error('Could not parse AI processing error response:', e);
        // Try to get response text if JSON parsing fails
        try {
          const textResponse = await processResponse.text();
          console.error('Raw AI processing error response:', textResponse);
        } catch (textError) {
          console.error('Could not get AI processing response text:', textError);
        }
      }
      throw new Error(errorMessage);
    }
    
    // Parse the response data
    const data = await processResponse.json();
    console.log('AI Processing complete, received data structure:', Object.keys(data));
    
    // Validate the response data
    if (!data || !data.summary) {
      console.error('Invalid AI processing response format - missing required fields:', data);
      throw new Error('Invalid response from AI processing service');
    }
    
    // Ensure transcription exists (may be empty string but should exist)
    if (data.transcription === undefined) {
      console.warn('Transcription missing in response, adding empty string');
      data.transcription = '';
    }
    
    // Make sure we have valid tasks
    if (!data.tasks || !Array.isArray(data.tasks)) {
      console.warn('No tasks or invalid tasks in AI response, creating empty array');
      data.tasks = [];
    }
    
    // Process tasks to ensure they have all required fields and handle subtasks properly
    data.tasks = data.tasks.map((task: any, index: number) => {
      // Log each task for debugging
      console.log(`Processing task ${index}:`, JSON.stringify(task));
      
      // Process subtasks - the API response has [Array] placeholder for subtasks
      let processedSubtasks: string[] = [];
      
      // If subtasks exist and are accessible, process them
      if (task.subtasks) {
        try {
          if (Array.isArray(task.subtasks)) {
            // Keep subtasks if they're already a valid array
            processedSubtasks = task.subtasks;
          } else {
            // Convert to string array if not an array (fallback)
            console.log('Subtasks not in array format:', task.subtasks);
            processedSubtasks = [];
          }
        } catch (err) {
          console.warn('Error processing subtasks:', err);
          processedSubtasks = [];
        }
      }
      
      // Return processed task with all required fields
      return {
        ...task,
        id: task.id || `task-${index + 1}-${Date.now()}`,
        text: task.text || `Task ${index + 1}`,
        deadline: task.deadline || "No deadline",
        subtasks: processedSubtasks,
        isPriority: index === 0 // Make first task priority by default
      };
    });
    
    // Ensure the response has an ID and timestamp
    return {
      id: data.id || `process-${Date.now()}`,
      timestamp: data.timestamp || new Date().toISOString(),
      summary: data.summary,
      transcription: data.transcription,
      tasks: data.tasks,
      priority_focus: data.priority_focus || '',
      rawResponse: data.rawResponse || JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error processing audio with AI:', error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
};
