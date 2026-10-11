import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
export type Hand = NormalizedLandmark[];
const V = '0.10.14';

export async function createTracker(video: HTMLVideoElement) {
  const fs = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/wasm`);
  const hl = await HandLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
  });
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
  await video.play();
  let last = -1, hands: Hand[] = [];
  // Returns hands with x mirrored so x=0 is the user's left.
  return (): Hand[] => {
    if (video.currentTime !== last) {
      last = video.currentTime;
      hands = hl.detectForVideo(video, performance.now()).landmarks.map(h => h.map(p => ({ ...p, x: 1 - p.x })));
    }
    return hands;
  };
}
