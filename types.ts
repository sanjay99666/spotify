export type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Surprised' | 'Neutral' | 'Calm';

export const VALID_EMOTIONS: Emotion[] = ['Happy', 'Sad', 'Angry', 'Surprised', 'Neutral', 'Calm'];

export type AppState =
  | 'idle'
  | 'requesting_camera'
  | 'camera_denied'
  | 'live'
  | 'error';
