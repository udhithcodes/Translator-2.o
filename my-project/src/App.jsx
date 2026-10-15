import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Supported Languages with BCP-47 Speech Recognition & Synthesis Codes
const LANGUAGES = [
  { code: 'auto', speechCode: 'en-US', name: '✨ Auto-Detect Language', flag: '🌐' },
  { code: 'en', speechCode: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es', speechCode: 'es-ES', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', speechCode: 'fr-FR', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', speechCode: 'de-DE', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'it', speechCode: 'it-IT', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'hi', speechCode: 'hi-IN', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'ta', speechCode: 'ta-IN', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'te', speechCode: 'te-IN', name: 'Telugu (తెలుగు)', flag: '🇮🇳' },
  { code: 'ja', speechCode: 'ja-JP', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'zh', speechCode: 'zh-CN', name: 'Chinese (中文)', flag: '🇨🇳' },
  { code: 'ru', speechCode: 'ru-RU', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'ar', speechCode: 'ar-SA', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'ko', speechCode: 'ko-KR', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'pt', speechCode: 'pt-BR', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'tr', speechCode: 'tr-TR', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'nl', speechCode: 'nl-NL', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
];

const QUICK_PHRASES = [
  "Hello, how are you today?",
  "Where is the nearest train station?",
  "How much does this cost?",
  "Could you please help me?",
  "I would like to order food, please.",
  "Nice to meet you!"
];

export default function App() {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ta'); // Default to Tamil
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [soundFx, setSoundFx] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState('SYSTEM READY');
  const [micVolume, setMicVolume] = useState(0); // Real mic amplitude 0-100%
  const [toastMessage, setToastMessage] = useState('');
  const [micDiagnostic, setMicDiagnostic] = useState('');
  const [history, setHistory] = useState([
    {
      id: 1,
      sourceLang: 'en',
      targetLang: 'ta',
      sourceText: 'Welcome to VOXIS voice translator',
      targetText: 'VOXIS குரல் மொழிபெயர்ப்பாளருக்கு வரவேற்கிறோம்',
      timestamp: 'Just now'
    }
  ]);

  // Audio equalizer bars state
  const [barHeights, setBarHeights] = useState([15, 25, 45, 60, 30, 20, 50, 70, 40, 15, 30, 55, 65, 35, 20]);
  
  // References
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');

  // Futuristic Web Audio Synthesizer SFX
  const playCyberSound = (type = 'beep') => {
    if (!soundFx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'listen') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // AudioContext policy
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Equalizer animation loop for voice playback
  useEffect(() => {
    let interval;
    if (isSpeaking) {
      interval = setInterval(() => {
        setBarHeights(prev =>
          prev.map(() => Math.floor(Math.random() * 75) + 20)
        );
      }, 80);
    } else if (!isListening) {
      setBarHeights([15, 20, 25, 30, 25, 20, 15, 25, 30, 20, 15, 25, 20, 15, 20]);
    }
    return () => clearInterval(interval);
  }, [isSpeaking, isListening]);

  // Stop hardware microphone audio capture & visualizer
  const stopHardwareAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setMicVolume(0);
  };

  // Start real hardware audio analyzer using Web Audio API
  const startHardwareAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolume(normalized);

        // Map live microphone decibels directly to the yellow equalizer bars!
        const barsCount = 15;
        const newBars = [];
        for (let i = 0; i < barsCount; i++) {
          const freqIndex = Math.floor((i / barsCount) * bufferLength);
          const val = dataArray[freqIndex] || 0;
          const heightPercent = Math.max(12, Math.min(95, Math.round((val / 255) * 95)));
          newBars.push(heightPercent);
        }
        setBarHeights(newBars);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn("Hardware audio visualization warning:", err);
    }
  };

  // Start Voice Recognition
  const startListening = async () => {
    playCyberSound('listen');
    setMicDiagnostic('');
    accumulatedTranscriptRef.current = '';
    setInputText('');
    setOutputText('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser. Please use Google Chrome, Edge, or Safari.");
      return;
    }

    // Always create a fresh instance of SpeechRecognition on start!
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Get current source language speech code
    const currentSource = LANGUAGES.find(l => l.code === sourceLang);
    recognition.lang = (sourceLang === 'auto' ? (navigator.language || 'en-US') : currentSource?.speechCode) || 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage('⚡ MICROPHONE ACTIVE // LISTENING');
    };

    recognition.onaudiostart = () => {
      setStatusMessage('⚡ AUDIO INPUT STREAM CAPTURING');
    };

    recognition.onspeechstart = () => {
      setStatusMessage('🎙️ SPEECH DETECTED // TRANSCRIBING...');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = (finalTranscript + ' ' + interimTranscript).trim();
      if (activeText) {
        accumulatedTranscriptRef.current = activeText;
        setInputText(activeText);
        setStatusMessage('⚡ LIVE TRANSCRIPT STREAMING');

        // Reset auto-translate silence timer (2.2 seconds of silence auto-translates)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening(true);
        }, 2200);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error event:', event.error);
      if (event.error === 'no-speech') {
        setMicDiagnostic('No voice was detected. Try speaking closer to your microphone or check Mac input volume.');
        setStatusMessage('WARNING: NO VOICE DETECTED');
      } else if (event.error === 'not-allowed') {
        setMicDiagnostic('Microphone permission blocked. Please check Chrome address bar or macOS System Settings > Privacy > Microphone.');
        setStatusMessage('ERROR: MIC PERMISSION DENIED');
        stopListening(false);
      } else if (event.error === 'network') {
        setMicDiagnostic('Speech recognition service network timeout. Please check your internet connection.');
        setStatusMessage('ERROR: SPEECH NETWORK TIMEOUT');
      } else {
        setStatusMessage(`MIC ERROR: ${event.error.toUpperCase()}`);
      }
    };

    recognition.onend = () => {
      // Clean up state
      setIsListening(false);
      stopHardwareAudio();
    };

    recognitionRef.current = recognition;

    try {
      await startHardwareAudio();
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setStatusMessage("MIC START FAILED // CLICK AGAIN");
    }
  };

  // Stop Voice Recognition
  const stopListening = (shouldTranslate = true) => {
    playCyberSound('beep');
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setIsListening(false);
    stopHardwareAudio();

    const textToProcess = accumulatedTranscriptRef.current || inputText;
    if (shouldTranslate && textToProcess.trim().length > 0) {
      setStatusMessage('PROCESSING TRANSLATION...');
      handleTranslate(textToProcess);
    } else {
      setStatusMessage('SYSTEM READY');
    }
  };

  // Master Toggle Button
  const toggleListening = () => {
    if (isListening) {
      stopListening(true);
    } else {
      startListening();
    }
  };

  // Dual-Engine Translation with Vite Proxy & Auto-Language Detection
  const handleTranslate = async (textToTranslate = inputText) => {
    const query = textToTranslate.trim();
    if (!query) return;

    setIsTranslating(true);
    setStatusMessage('TRANSLATING NEURAL STREAM...');

    try {
      let translated = '';
      let detectedCode = '';

      // Determine source language for API ('auto' detects any language automatically)
      const effectiveSource = sourceLang === 'auto' ? 'auto' : sourceLang;

      // Engine 1: Vite Local Proxy to Google Translate GTX (Bypasses CORS cleanly)
      try {
        const proxyUrl = `/api/translate?client=gtx&sl=${effectiveSource}&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) {
            translated = data[0].map(item => item[0]).filter(Boolean).join('');
            detectedCode = data[2] || '';
          }
        }
      } catch (e1) {
        console.warn('Vite proxy translate error, trying fallback:', e1);
      }

      // If translation came back identical to query and we didn't specify auto, retry with auto-detection!
      if ((!translated || (translated.toLowerCase() === query.toLowerCase() && targetLang !== sourceLang)) && effectiveSource !== 'auto') {
        try {
          const autoUrl = `/api/translate?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`;
          const res = await fetch(autoUrl);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
              translated = data[0].map(item => item[0]).filter(Boolean).join('');
              detectedCode = data[2] || '';
            }
          }
        } catch (eAuto) {
          console.warn('Auto translate retry failed:', eAuto);
        }
      }

      // Engine 2: CORS Proxy Fallback
      if (!translated || (translated.toLowerCase() === query.toLowerCase() && targetLang !== sourceLang)) {
        try {
          const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`)}`;
          const corsRes = await fetch(corsProxyUrl);
          if (corsRes.ok) {
            const data = await corsRes.json();
            if (data && data[0]) {
              translated = data[0].map(item => item[0]).filter(Boolean).join('');
              detectedCode = data[2] || '';
            }
          }
        } catch (e2) {
          console.warn('Engine 2 CORS proxy failed:', e2);
        }
      }

      // Engine 3: MyMemory API Fallback
      if (!translated) {
        try {
          const fromLang = detectedCode || (sourceLang === 'auto' ? 'en' : sourceLang);
          const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${fromLang}|${targetLang}`;
          const fallbackRes = await fetch(fallbackUrl);
          const fallbackData = await fallbackRes.json();
          if (fallbackData?.responseData?.translatedText) {
            translated = fallbackData.responseData.translatedText;
          }
        } catch (e3) {
          console.warn('Engine 3 MyMemory failed:', e3);
        }
      }

      if (translated) {
        setOutputText(translated);
        setStatusMessage('TRANSLATION COMPLETE');
        playCyberSound('success');

        // Detected language label
        const detectedObj = LANGUAGES.find(l => l.code === detectedCode);
        const sourceLabel = detectedObj ? `${detectedObj.flag} ${detectedObj.name}` : (sourceLang === 'auto' ? 'Auto-Detected' : sourceLang.toUpperCase());

        // Save to History
        setHistory(prev => [
          {
            id: Date.now(),
            sourceLang: detectedCode || sourceLang,
            targetLang,
            sourceText: query,
            targetText: translated,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev.slice(0, 9)
        ]);

        // Auto Voice Output
        if (autoSpeak) {
          speakOutput(translated, targetLang);
        }
      } else {
        setOutputText('Could not translate text. Please try again.');
        setStatusMessage('TRANSLATION FAILED');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setStatusMessage('OFFLINE / NETWORK ERROR');
    } finally {
      setIsTranslating(false);
    }
  };

  // Voice Output (Speech Synthesis)
  const speakOutput = (text = outputText, langCode = targetLang) => {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    playCyberSound('beep');

    const targetLangObj = LANGUAGES.find(l => l.code === langCode);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLangObj?.speechCode || 'en-US';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => 
      v.lang.toLowerCase() === (targetLangObj?.speechCode || '').toLowerCase() ||
      v.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusMessage('AUDIO OUT: SPEAKING TRANSLATION');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusMessage('SYSTEM READY');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatusMessage('SPEECH SYNTH COMPLETE');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatusMessage('AUDIO OUT STOPPED');
    }
  };

  const handleSwap = () => {
    playCyberSound('beep');
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);

    const tempInput = inputText;
    setInputText(outputText);
    setOutputText(tempInput);
  };

  const handleCopy = (text) => {
    playCyberSound('beep');
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'var(--neon-yellow)',
          color: '#000',
          padding: '12px 24px',
          borderRadius: '8px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          boxShadow: '0 0 25px rgba(255, 230, 0, 0.85)',
          zIndex: 99999
        }}>
          ⚡ {toastMessage}
        </div>
      )}

      {/* Futuristic Cyber Header */}
      <header className="cyber-header">
        <div className="brand-badge">
          <div className="brand-logo-hex">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">VOXIS <span>// 2.0</span></div>
            <div className="brand-subtitle">CYBERNETIC VOICE-TO-VOICE TRANSLATOR</div>
          </div>
        </div>

        <div className="header-status-group">
          <div className="status-chip">
            <span className={`status-dot ${isListening || isSpeaking || isTranslating ? 'active' : ''}`} />
            <span>{statusMessage}</span>
          </div>
        </div>
      </header>

      {/* Diagnostic Warning Banner if needed */}
      {micDiagnostic && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fca5a5',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>⚠️ {micDiagnostic}</div>
          <button
            onClick={() => setMicDiagnostic('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Language Selector Bar */}
      <section className="lang-selector-strip cyber-card">
        <div className="lang-box">
          <div className="lang-label">
            <span>● SOURCE VOICE INPUT</span>
          </div>
          <div className="lang-select-wrapper">
            <select
              className="cyber-select"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} style={{ background: '#121216', color: '#fff' }}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>

        <button
          className="swap-btn"
          onClick={handleSwap}
          title="Swap Source & Target Languages"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 5h18"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 19H3"/>
          </svg>
        </button>

        <div className="lang-box">
          <div className="lang-label">
            <span>● TARGET VOICE OUTPUT</span>
          </div>
          <div className="lang-select-wrapper">
            <select
              className="cyber-select"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {LANGUAGES.filter(l => l.code !== 'auto').map((l) => (
                <option key={l.code} value={l.code} style={{ background: '#121216', color: '#fff' }}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </section>

      {/* Central Interactive Voice Hub */}
      <section className="voice-visualizer-container">
        <div className="mic-orb-wrapper">
          {isListening && <div className="sonar-ring" />}
          {isListening && <div className="sonar-ring-2" />}
          
          <button
            className={`mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
            onClick={toggleListening}
            title={isListening ? "Click to stop and translate voice" : "Click to speak voice input"}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
            <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 800, letterSpacing: '0.08em' }}>
              {isListening ? 'STOP' : 'SPEAK'}
            </span>
          </button>
        </div>

        {/* Real Hardware Mic Amplitude Meter (Volume) */}
        {isListening && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: micVolume > 5 ? 'var(--neon-yellow)' : 'var(--text-muted)'
          }}>
            <span>MIC INPUT LEVEL:</span>
            <div style={{
              width: '120px',
              height: '6px',
              background: '#222',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${micVolume}%`,
                height: '100%',
                background: micVolume > 5 ? 'var(--neon-yellow)' : '#555',
                boxShadow: micVolume > 5 ? '0 0 8px var(--neon-yellow)' : 'none',
                transition: 'width 0.08s ease'
              }} />
            </div>
            <span>{micVolume > 5 ? `${micVolume}% (VOICE DETECTED)` : `${micVolume}% (SILENCE)`}</span>
          </div>
        )}

        {/* Dancing Neon Audio Equalizer Bars */}
        <div className="waveform-container">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="eq-bar"
              style={{
                height: `${h}%`,
                background: isSpeaking ? '#38bdf8' : 'var(--neon-yellow)',
                boxShadow: isSpeaking ? '0 0 8px rgba(56, 189, 248, 0.7)' : '0 0 8px rgba(255, 230, 0, 0.6)'
              }}
            />
          ))}
        </div>

        <div className="voice-status-text">
          {isListening ? (
            <span style={{ color: 'var(--neon-yellow)' }}>
              ⚡ {micVolume > 5 ? "SPEAKING DETECTED! SAY YOUR SENTENCE..." : "LISTENING... SPEAK INTO YOUR MIC"}
            </span>
          ) : isSpeaking ? (
            <span style={{ color: '#38bdf8' }}>🔊 SPEAKING TRANSLATION IN TARGET LANGUAGE</span>
          ) : isTranslating ? (
            <span>SYNTHESIZING NEURAL TRANSLATION...</span>
          ) : (
            <span>CLICK "SPEAK" & TALK INTO YOUR MICROPHONE</span>
          )}
        </div>
      </section>

      {/* Dual Panel Translation Workstation */}
      <section className="translation-grid">
        {/* Input Panel */}
        <div className="cyber-card io-panel">
          <div className="panel-header">
            <div className="panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>INPUT // VOICE & TEXT</span>
            </div>
            <div className="panel-actions">
              {inputText && (
                <button
                  className="cyber-btn-ghost"
                  onClick={() => { setInputText(''); accumulatedTranscriptRef.current = ''; playCyberSound('beep'); }}
                  title="Clear input"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          <textarea
            className="cyber-textarea"
            placeholder="Click the glowing SPEAK button above and say your phrase, or type here..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              accumulatedTranscriptRef.current = e.target.value;
            }}
          />

          <div className="panel-footer">
            <span className="char-counter">{inputText.length} CHARS</span>
            <button
              className="cyber-btn-primary"
              disabled={isTranslating || !inputText.trim()}
              onClick={() => handleTranslate()}
            >
              {isTranslating ? (
                <>
                  <div className="audio-wave-anim">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </div>
                  TRANSLATING
                </>
              ) : (
                <>
                  TRANSLATE
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14"/>
                    <path d="M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="cyber-card io-panel">
          <div className="panel-header">
            <div className="panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <span>OUTPUT // TRANSLATED VOICE</span>
            </div>
            <div className="panel-actions">
              {outputText && (
                <button
                  className="cyber-btn-ghost"
                  onClick={() => handleCopy(outputText)}
                  title="Copy translated text"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  COPY
                </button>
              )}
            </div>
          </div>

          <div className={`output-display ${!outputText ? 'empty' : ''}`}>
            {outputText || "Translated text and voice readout will appear here automatically..."}
          </div>

          <div className="panel-footer">
            <span className="char-counter">{outputText.length} CHARS</span>
            {outputText && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {isSpeaking ? (
                  <button className="audio-speak-btn active" onClick={stopSpeaking}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    STOP AUDIO
                  </button>
                ) : (
                  <button className="audio-speak-btn" onClick={() => speakOutput(outputText, targetLang)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    SPEAK AGAIN
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cyber Controls & Settings */}
      <section className="settings-strip cyber-card">
        <div className="setting-item">
          <label className="cyber-switch">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => { setAutoSpeak(e.target.checked); playCyberSound('beep'); }}
            />
            <span className="cyber-slider" />
          </label>
          <span>Auto-Speak Output Voice</span>
        </div>

        <div className="setting-item">
          <label className="cyber-switch">
            <input
              type="checkbox"
              checked={soundFx}
              onChange={(e) => setSoundFx(e.target.checked)}
            />
            <span className="cyber-slider" />
          </label>
          <span>Futuristic Audio SFX</span>
        </div>

        <div className="setting-item">
          <span style={{ fontSize: '12px', color: 'var(--neon-yellow)' }}>VOICE SPEED:</span>
          {[0.8, 1.0, 1.2].map(rate => (
            <button
              key={rate}
              onClick={() => { setSpeechRate(rate); playCyberSound('beep'); }}
              style={{
                background: speechRate === rate ? 'var(--neon-yellow)' : 'transparent',
                color: speechRate === rate ? '#000' : 'var(--text-secondary)',
                border: '1px solid rgba(255, 230, 0, 0.4)',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              {rate}x
            </button>
          ))}
        </div>
      </section>

      {/* Quick Interactive Test Phrases */}
      <section className="quick-phrases-card cyber-card">
        <div className="quick-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          QUICK VOICE TEST PHRASES (1-CLICK TEST)
        </div>
        <div className="phrase-tags">
          {QUICK_PHRASES.map((phrase, idx) => (
            <button
              key={idx}
              className="phrase-tag"
              onClick={() => {
                setInputText(phrase);
                accumulatedTranscriptRef.current = phrase;
                playCyberSound('beep');
                handleTranslate(phrase);
              }}
            >
              <span>⚡</span> {phrase}
            </button>
          ))}
        </div>
      </section>

      {/* Translation History Drawer */}
      {history.length > 0 && (
        <section className="history-section cyber-card">
          <div className="history-header">
            <div className="panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>TRANSLATION LOGS & AUDIO ARCHIVE</span>
            </div>
            <button
              className="cyber-btn-ghost"
              onClick={() => { setHistory([]); playCyberSound('beep'); }}
              style={{ fontSize: '11px' }}
            >
              CLEAR LOGS
            </button>
          </div>

          <div>
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-texts">
                  <div className="history-badge">
                    {item.sourceLang.toUpperCase()} ➔ {item.targetLang.toUpperCase()} • {item.timestamp}
                  </div>
                  <div className="history-source">{item.sourceText}</div>
                  <div className="history-target">{item.targetText}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="cyber-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => speakOutput(item.targetText, item.targetLang)}
                    title="Play voice output"
                  >
                    🔊 PLAY
                  </button>
                  <button
                    className="cyber-btn-ghost"
                    style={{ padding: '6px 10px' }}
                    onClick={() => handleCopy(item.targetText)}
                    title="Copy text"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '32px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        VOXIS NEURAL AUDIO TRANSLATOR // POWERED BY WEB SPEECH API & GOOGLE NEURAL ENGINE
      </footer>
    </div>
  );
}
