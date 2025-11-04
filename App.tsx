import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Emotion } from './types';
import { SPOTIFY_TRACKS } from './constants';
import { detectEmotionFromImage } from './services/geminiService';
import SpotifyPlayer from './components/SpotifyPlayer';
import { CameraIcon, MusicNoteIcon, SparklesIcon, LoadingSpinner, ErrorIcon } from './components/Icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [detectedEmotion, setDetectedEmotion] = useState<Emotion | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false);
  const consecutiveFailsRef = useRef(0);

  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);
  
  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzingRef.current || !videoRef.current || !canvasRef.current || !videoRef.current.srcObject) {
      return;
    }

    const video = videoRef.current;
    
    // FIX: Wait for video to have dimensions before capturing a frame
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    isAnalyzingRef.current = true;
    
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if(!context) {
        isAnalyzingRef.current = false;
        return;
    };

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    const emotion = await detectEmotionFromImage(base64Image);
    
    if (emotion) {
      consecutiveFailsRef.current = 0;
      setDetectedEmotion(prevEmotion => {
        if (emotion !== prevEmotion) {
          return emotion;
        }
        return prevEmotion;
      });
    } else {
      consecutiveFailsRef.current++;
    }

    if (consecutiveFailsRef.current > 4) {
      setError("Could not detect a clear emotion. Please make sure your face is well-lit and visible.");
      setAppState('error');
      stopAnalysis();
    }

    isAnalyzingRef.current = false;
  }, [stopAnalysis]);


  useEffect(() => {
    if (appState === 'live' && videoStream) {
      intervalRef.current = window.setInterval(analyzeFrame, 2500);
    } else {
      stopAnalysis();
    }
    return stopAnalysis;
  }, [appState, videoStream, analyzeFrame, stopAnalysis]);


  const handleStartCamera = useCallback(async () => {
    setAppState('requesting_camera');
    setError(null);
    setDetectedEmotion(null);
    consecutiveFailsRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setVideoStream(stream);
      setAppState('live');
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access is required. Please enable it in your browser settings and try again.");
      setAppState('camera_denied');
    }
  }, []);

  const handleReset = useCallback(() => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setDetectedEmotion(null);
    setError(null);
    setAppState('idle');
  }, [videoStream]);

  const renderContent = () => {
    switch (appState) {
      case 'idle':
        return (
          <div className="text-center flex flex-col items-center">
            <MusicNoteIcon className="w-24 h-24 text-green-400 mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Mood Music Player</h1>
            <p className="text-lg text-gray-300 mb-8 max-w-md">Let AI find the perfect song for your current mood, live!</p>
            <button onClick={handleStartCamera} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 flex items-center gap-2">
              <CameraIcon className="w-6 h-6" /> Start Live Detection
            </button>
          </div>
        );

      case 'requesting_camera':
        return <div className="text-center"><LoadingSpinner className="w-12 h-12 text-white" /><p className="mt-4">Accessing camera...</p></div>;

      case 'camera_denied':
        return (
            <div className="text-center flex flex-col items-center max-w-lg">
                <ErrorIcon className="w-16 h-16 text-red-400 mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Camera Access Denied</h2>
                <p className="text-gray-300 mb-6">{error}</p>
                <button onClick={handleStartCamera} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-colors">
                    Try Again
                </button>
            </div>
        );
      
      case 'error':
        return (
            <div className="text-center flex flex-col items-center max-w-lg">
                <ErrorIcon className="w-16 h-16 text-yellow-400 mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
                <p className="text-gray-300 mb-6">{error}</p>
                <button onClick={handleStartCamera} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-colors">
                    Try Analyzing Again
                </button>
            </div>
        );

      case 'live':
        return (
          <div className="w-full max-w-4xl flex flex-col items-center animate-fade-in">
            <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
              <div className="absolute top-3 right-3 bg-black bg-opacity-50 rounded-full flex items-center gap-2 px-3 py-1 text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                LIVE
              </div>
            </div>

            <div className="text-center h-24 flex flex-col justify-center">
              {detectedEmotion ? (
                <>
                  <h2 className="text-3xl font-bold">Current Mood: <span className="text-green-400">{detectedEmotion}</span></h2>
                  <p className="text-gray-300 mt-1">Now playing a song to match your vibe.</p>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <LoadingSpinner className="w-6 h-6" />
                  <h2 className="text-2xl font-semibold text-gray-300">Detecting your mood...</h2>
                </div>
              )}
            </div>

            <div className="w-full md:w-2/3 lg:w-1/2 mt-4 min-h-[152px]">
              {detectedEmotion && <SpotifyPlayer trackId={SPOTIFY_TRACKS[detectedEmotion]} />}
            </div>

            <button onClick={handleReset} className="mt-8 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full transition-colors">
              Stop and Go Home
            </button>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-5xl mx-auto bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10 flex items-center justify-center min-h-[80vh]">
        {renderContent()}
      </div>
       <footer className="text-center text-gray-500 text-sm p-4">
        Powered by Gemini and Spotify
      </footer>
    </main>
  );
};

export default App;