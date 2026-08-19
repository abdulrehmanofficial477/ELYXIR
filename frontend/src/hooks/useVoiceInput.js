import { useState, useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/api';

/**
 * Robust Voice Input hook using MediaRecorder + Groq Whisper AI.
 * Captures microphone audio directly and transcribes with high accuracy (Urdu, English, Roman Urdu).
 */
export default function useVoiceInput({ onTranscript, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Stop recording and transcribe
  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }
  }, []);

  // Start recording audio from microphone
  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (onError) {
        onError('Your browser does not support audio recording. Please use Google Chrome or Edge.');
      }
      return;
    }

    try {
      // Clear previous timer
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      // Request microphone stream directly without restrictive filters
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mime type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // Stop all microphone tracks to release hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 200) {
          return; // Empty recording
        }

        // Transcribe via Groq Whisper API
        setIsTranscribing(true);
        try {
          const rawText = await transcribeAudio(audioBlob);
          const cleanText = (rawText || '').trim();

          // Whisper outputs 'you', 'you.', 'thank you', 'bye' when the recording is completely silent
          const isSilenceHallucination = [
            'you', 'you.', 'you!', 'thank you', 'thank you.', 'thanks for watching', 'bye', 'subtitles by'
          ].includes(cleanText.toLowerCase());

          if (cleanText && !isSilenceHallucination) {
            if (onTranscript) {
              onTranscript(cleanText);
            }
          } else {
            if (onError) onError('Microphone se koi awaz capture nahi hui (Silent). Apne laptop ki mic volume check karein.');
          }
        } catch (transcribeErr) {
          console.error('Whisper transcription error:', transcribeErr);
          if (onError) onError(transcribeErr.message || 'Failed to transcribe voice.');
        } finally {
          setIsTranscribing(false);
        }
      };


      mediaRecorder.start(250); // Slice every 250ms
      setIsListening(true);

      // Start recording seconds timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto stop at 60 seconds
            stopListening();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setIsListening(false);
      if (timerRef.current) clearInterval(timerRef.current);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (onError) onError('Microphone permission was denied. Please allow microphone access in Chrome settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        if (onError) onError('No microphone found on your laptop. Please plug in a microphone or headset.');
      } else {
        if (onError) onError(`Microphone error: ${err.message || err.name}`);
      }
    }
  }, [onTranscript, onError, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    recordingSeconds,
    isSupported: true,
    startListening,
    stopListening,
    toggleListening,
  };
}
