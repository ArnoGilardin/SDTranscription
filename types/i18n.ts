export type Language = 'en' | 'fr';

export interface Translations {
  recording: {
    title: string;
    startHint: string;
    stopHint: string;
    recording: string;
    upload: string;
    permissionDenied: string;
    startError: string;
    stopError: string;
    processing: string;
  };
  library: {
    title: string;
    noRecordings: string;
    deleteTitle: string;
    deleteMessage: string;
    delete: string;
    cancel: string;
    playbackError: string;
  };
  transcripts: {
    title: string;
    noTranscripts: string;
    generateTranscript: string;
    transcriptionError: string;
  };
  settings: {
    title: string;
    preferences: string;
    darkMode: string;
    noiseReduction: string;
    language: string;
    premium: string;
    upgradeTitle: string;
    upgradeDescription: string;
    about: string;
    privacyPolicy: string;
    termsOfService: string;
    version: string;
    selectLanguage: string;
    cancel: string;
  };
}