import { create } from 'zustand';

export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface Word {
  text: string;
  startTime: number;
  speakerId?: string;
}

export interface Recording {
  id: string;
  title: string;
  uri: string;
  duration: number;
  date: string;
  transcript?: string;
  summary?: string;
  words?: Word[];
  speakers: Speaker[];
  currentSpeakerId?: string;
}

interface RecordingsState {
  recordings: Recording[];
  addRecording: (recording: Recording) => void;
  deleteRecording: (id: string) => void;
  updateTranscript: (id: string, transcript: string, words?: Word[]) => void;
  updateSummary: (id: string, summary: string) => void;
  addSpeaker: (recordingId: string, speaker: Speaker) => void;
  updateCurrentSpeaker: (recordingId: string, speakerId: string) => void;
}

const DEFAULT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export const useRecordingsStore = create<RecordingsState>((set) => ({
  recordings: [],
  addRecording: (recording) =>
    set((state) => ({
      recordings: [{
        ...recording,
        speakers: [
          {
            id: '1',
            name: 'Speaker 1',
            color: DEFAULT_COLORS[0]
          }
        ],
        currentSpeakerId: '1'
      }, ...state.recordings],
    })),
  deleteRecording: (id) =>
    set((state) => ({
      recordings: state.recordings.filter((r) => r.id !== id),
    })),
  updateTranscript: (id, transcript, words) =>
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, transcript, words } : r
      ),
    })),
  updateSummary: (id, summary) =>
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === id ? { ...r, summary } : r
      ),
    })),
  addSpeaker: (recordingId, speaker) =>
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === recordingId
          ? {
              ...r,
              speakers: [...r.speakers, speaker],
            }
          : r
      ),
    })),
  updateCurrentSpeaker: (recordingId, speakerId) =>
    set((state) => ({
      recordings: state.recordings.map((r) =>
        r.id === recordingId ? { ...r, currentSpeakerId: speakerId } : r
      ),
    })),
}));