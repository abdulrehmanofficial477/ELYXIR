/**
 * Speech synthesis utility for Text-to-Speech (TTS).
 */

/**
 * Strips markdown and special symbols so the text sounds natural when spoken.
 */
export function cleanMarkdownForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.') // Replace code blocks
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links [text](url) -> text
    .replace(/[*_~#>]/g, '') // Remove markdown formatting chars
    .replace(/---/g, '') // Dividers
    .replace(/\n+/g, '. ') // Replace newlines with pause
    .trim();
}

/**
 * Speaks text using the browser's native SpeechSynthesis API.
 * @param {string} text - Raw message text
 * @param {Object} options
 * @param {Function} options.onStart - Callback when speech starts
 * @param {Function} options.onEnd - Callback when speech finishes
 * @param {Function} options.onError - Callback when error occurs
 * @returns {SpeechSynthesisUtterance}
 */
export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!('speechSynthesis' in window)) {
    if (onError) onError('Text-to-speech is not supported in this browser.');
    return null;
  }

  // Cancel any currently playing speech
  window.speechSynthesis.cancel();

  const cleanText = cleanMarkdownForSpeech(text);
  if (!cleanText) return null;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Choose natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => (v.lang.startsWith('en') || v.lang.startsWith('ur')) && v.name.includes('Natural')
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    if (onEnd) onEnd();
    if (onError && e.error !== 'canceled') onError(`Speech error: ${e.error}`);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
