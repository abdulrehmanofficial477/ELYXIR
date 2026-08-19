const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';
const PRIMARY_API_URL = RAW_API_URL.replace(/\/+$/, '');
const FALLBACK_API_URL = 'http://127.0.0.1:8000';

/**
 * Sends recorded audio blob to backend Whisper transcription endpoint.
 * @param {Blob} audioBlob
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  let response;
  try {
    response = await fetch(`${PRIMARY_API_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    if (PRIMARY_API_URL !== FALLBACK_API_URL) {
      response = await fetch(`${FALLBACK_API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Transcription failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}



// Max dimension for images sent to vision API (keeps payload small & fast)
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_QUALITY = 0.82;

/**
 * Compress and resize an image File using the browser canvas.
 * Returns a Blob smaller than the original if the image exceeds MAX_IMAGE_DIMENSION.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
async function compressImageFile(file) {
  return new Promise((resolve) => {
    // Only process actual images
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only downscale — never upscale
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        resolve(file);
        return;
      }

      // Keep aspect ratio
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        IMAGE_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback: use original
    };

    img.src = url;
  });
}

/**
 * Streams chat response from FastAPI backend using multipart/form-data.
 * @param {string} message - Current user message
 * @param {Array} history - Previous messages [{role, content}]
 * @param {Array<File>} files - Attached File objects
 * @param {boolean} webSearch - Whether to perform live web search
 * @param {Function} onChunk - Callback for receiving text chunks
 * @param {Function} onError - Callback for handling errors
 * @param {Function} onDone - Callback when streaming is complete
 * @param {AbortSignal} signal - Optional abort signal
 */
export async function streamChatResponse({
  message,
  history,
  files = [],
  webSearch = false,
  onChunk,
  onError,
  onDone,
  signal,
}) {
  try {
    const formattedHistory = (history || []).map((msg) => ({
      role: msg.role === 'bot' ? 'assistant' : msg.role,
      content: typeof msg.content === 'string' ? msg.content : '',
    }));

    const formData = new FormData();
    formData.append('message', message || '');
    formData.append('history', JSON.stringify(formattedHistory));
    formData.append('web_search', webSearch ? 'true' : 'false');


    if (files && files.length > 0) {
      // Process files: compress images before upload
      for (const fileObj of files) {
        const rawFile = fileObj.file || fileObj;
        if (!(rawFile instanceof File || rawFile instanceof Blob)) continue;

        const isImage = rawFile.type && rawFile.type.startsWith('image/');

        if (isImage) {
          try {
            const compressed = await compressImageFile(rawFile);
            // Use original filename for compressed blob
            const name = rawFile.name || 'image.jpg';
            const finalFile = compressed instanceof File
              ? compressed
              : new File([compressed], name, { type: 'image/jpeg' });
            formData.append('files', finalFile);
          } catch (compressErr) {
            console.warn('Image compression failed, using original:', compressErr);
            formData.append('files', rawFile);
          }
        } else {
          formData.append('files', rawFile);
        }
      }
    }

    let response;
    try {
      response = await fetch(`${PRIMARY_API_URL}/api/chat`, {
        method: 'POST',
        body: formData,
        signal,
      });
    } catch (primaryErr) {
      // If failed to connect to primary URL (e.g. 8001), try fallback port 8000
      if (primaryErr.name !== 'AbortError' && PRIMARY_API_URL !== FALLBACK_API_URL) {
        try {
          response = await fetch(`${FALLBACK_API_URL}/api/chat`, {
            method: 'POST',
            body: formData,
            signal,
          });
        } catch (fallbackErr) {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

    if (!response.ok) {
      let errorDetail = `Server responded with status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorDetail = errJson.detail;
        }
      } catch (e) {
        try {
          const rawText = await response.text();
          if (rawText) errorDetail = rawText;
        } catch (e2) {}
      }
      throw new Error(errorDetail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        onChunk(chunk);
      }
    }

    if (onDone) {
      onDone();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Chat stream error:', error);
    if (onError) {
      onError(error.message || 'Unable to connect to the ASK ME backend server.');
    }
  }
}

