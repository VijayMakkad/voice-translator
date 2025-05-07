import React, { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface AudioRecorderProps {
  onRecordingStatusChange: (isRecording: boolean) => void;
  onRecordingComplete: (translatedText: string) => void;
}

export const useAudioRecorder = ({ onRecordingStatusChange, onRecordingComplete }: AudioRecorderProps) => {
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const startRecording = useCallback(async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      onRecordingStatusChange(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [permissionResponse, requestPermission, onRecordingStatusChange]);

  const stopRecording = useCallback(async () => {
    console.log('Stopping recording..');
    if (!recording) return;
    
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    onRecordingStatusChange(false);
    if (uri) {
      await sendAudioToServer(uri, onRecordingComplete);
    }
  }, [recording, onRecordingStatusChange, onRecordingComplete]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return { toggleRecording, isRecording: !!recording };
};

export const sendAudioToServer = async (uri: string, onComplete: (translatedText: string) => void) => {
  try {
    const response = await FileSystem.uploadAsync('http://192.168.0.109:3000/upload', uri, {
      fieldName: 'audio',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    });

    console.log('Server response:', response);

    if (response.status === 200) {
      const result = JSON.parse(response.body);
      onComplete(result.translatedText);
    } else {
      console.error('Error from server:', response.body);
      onComplete('Error: Failed to translate audio');
    }
  } catch (error) {
    console.error('Error sending audio to server:', error);
    onComplete('Error: Failed to send audio to server');
  }
};

