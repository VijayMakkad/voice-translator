import React, { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface AudioRecorderProps {
  onRecordingStatusChange: (isRecording: boolean) => void;
  onRecordingComplete: (translatedText: string) => void;
  currentLanguage?: string;
  serverUrl?: string;
}

export const useAudioRecorder = ({ 
  onRecordingStatusChange, 
  onRecordingComplete,
  currentLanguage = '',
  serverUrl = 'http://172.20.10.4:3000'
}: AudioRecorderProps) => {
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const startRecording = useCallback(async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          console.error('Permission to record was denied');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      onRecordingStatusChange(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [permissionResponse, requestPermission, onRecordingStatusChange]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    
    setRecording(undefined);
    onRecordingStatusChange(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (uri) {
        await sendAudioToServer(uri, currentLanguage, serverUrl, onRecordingComplete);
      } else {
        onRecordingComplete("Error: No recording was captured");
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      onRecordingComplete("Error: Failed to process recording");
    } finally {
      setIsProcessing(false);
    }
  }, [recording, onRecordingStatusChange, onRecordingComplete, currentLanguage, serverUrl]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return { toggleRecording, isRecording: !!recording, isProcessing };
};

export const sendAudioToServer = async (
  uri: string, 
  targetLanguage: string = 'fr',
  serverUrl: string  = 'http://172.20.10.4:3000',
  onComplete: (translatedText: string) => void
) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.error('File does not exist at URI:', uri);
      onComplete('Error: Audio file not found');
      return;
    }

    const fileUri = fileInfo.uri;
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      name: 'recording.m4a',
      type: 'audio/m4a'
    } as any);
    formData.append('targetLanguage', targetLanguage);

    const response = await fetch(`${serverUrl}/upload`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = await response.json();
    if (response.ok && result.translatedText) {
      onComplete(result.translatedText);
    } else {
      onComplete(result.error || 'No translation returned from server');
    }
  } catch (error) {
    console.error('Error sending audio to server:', error);
    onComplete('Error: Failed to communicate with the translation server');
  }
};
