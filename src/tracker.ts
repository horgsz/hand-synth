import { FaceLandmarker, FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
export type Hand = NormalizedLandmark[];
const V = '0.10.14', M = 'https://storage.googleapis.com/mediapipe-models';

export async function createTracker(video: HTMLVideoElement) {
  const fs = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/wasm`);
  const [hl, fl] = await Promise.all([
    HandLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: `${M}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
    }),
    FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: `${M}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: 'GPU' },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
    }),
  ]);
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
  await video.play();
  let last = -1, hands: Hand[] = [], jaw = 0;
  // Hands have x mirrored so x=0 is the user's left. jaw is 0..1 mouth openness.
  return (): { hands: Hand[]; jaw: number } => {
    if (video.currentTime !== last) {
      last = video.currentTime;
      const t = performance.now();
      hands = hl.detectForVideo(video, t).landmarks.map(h => h.map(p => ({ ...p, x: 1 - p.x })));
      const bs = fl.detectForVideo(video, t).faceBlendshapes[0]?.categories;
      jaw = bs?.find(c => c.categoryName === 'jawOpen')?.score ?? 0;
    }
    return { hands, jaw };
  };
}
