import { GoogleGenAI } from "@google/genai";
import { VALID_EMOTIONS, Emotion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const emotionPrompt = `Analyze the person's facial expression in this image and identify the dominant emotion. Respond with only one of the following words: ${VALID_EMOTIONS.join(', ')}. Do not add any other text or explanation. If no face is detected or the emotion is unclear, respond with "None".`;

export async function detectEmotionFromImage(base64Image: string): Promise<Emotion | null> {
  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    
    const textPart = {
      text: emotionPrompt,
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    const detectedEmotion = response.text.trim();
    
    if (VALID_EMOTIONS.includes(detectedEmotion as Emotion)) {
      return detectedEmotion as Emotion;
    }

    return null;
  } catch (error) {
    console.error("Error detecting emotion:", error);
    return null;
  }
}