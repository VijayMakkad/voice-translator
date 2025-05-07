import React, { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

interface AudioRecorderProps {
  onRecordingStatusChange: (isRecording: boolean) => void;
  onRecordingComplete: (translatedText: string) => void;
  serverUrl?: string;
  targetLanguage?: string;
}

export const useAudioRecorder = ({ 
  onRecordingStatusChange, 
  onRecordingComplete, 
  serverUrl = 'http://localhost:3000',
  targetLanguage = 'spanish'
}: AudioRecorderProps) => {
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const startRecording = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't fully support audio recording in the same way
        onRecordingStatusChange(true);
        setTimeout(() => {
          onRecordingStatusChange(false);
          onRecordingComplete("Web recording simulation complete. Audio recording is limited in web browsers.");
        }, 3000);
        return;
      }

      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        const permissionResult = await requestPermission();
        if (permissionResult.status !== 'granted') {
          Alert.alert("Permission Required", "This app needs microphone permission to record audio.");
          return;
        }
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
      Alert.alert("Recording Error", "Failed to start recording. Please try again.");
      onRecordingStatusChange(false);
    }
  }, [permissionResponse, requestPermission, onRecordingStatusChange]);

  const stopRecording = useCallback(async () => {
    console.log('Stopping recording..');
    if (!recording) {
      onRecordingStatusChange(false);
      return;
    }
    
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    onRecordingStatusChange(false);
    if (uri) {
      await sendAudioToServer(uri, targetLanguage, serverUrl, onRecordingComplete);
    }
  }, [recording, onRecordingStatusChange, onRecordingComplete, targetLanguage, serverUrl]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return { toggleRecording, isRecording: !!recording };
};

export const sendAudioToServer = async (
  uri: string, 
  targetLanguage: string = 'spanish',
  serverUrl: string = 'http://localhost:3000',
  onComplete: (translatedText: string) => void
) => {
  try {
    // Check if we're on web platform
    if (Platform.OS === 'web') {
      console.log('Audio upload not supported on web');
      onComplete("Web audio upload is not supported. This is a limitation of the web platform.");
      return;
    }
    
    // Add timeout to the request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 10000);
    });

    // Create form data with language parameter
    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: 'recording.mp3',
      type: 'audio/mpeg',
    });
    formData.append('targetLanguage', targetLanguage);
    
    const uploadPromise = FileSystem.uploadAsync(`${serverUrl}/upload`, uri, {
      fieldName: 'audio',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      parameters: { targetLanguage },
    });
    
    // Race between the upload and the timeout
    const response = await Promise.race([uploadPromise, timeoutPromise]) as FileSystem.FileSystemUploadResult;

    console.log('Server response status:', response.status);

    if (response.status === 200) {
      try {
        const result = JSON.parse(response.body);
        onComplete(result.translatedText || 'Translation completed successfully.');
      } catch (parseError) {
        console.error('Error parsing server response:', parseError);
        onComplete('Received response but could not parse translation data.');
      }
    } else {
      console.error('Error from server:', response.body);
      onComplete(`Error ${response.status}: Failed to translate audio. Please try again.`);
    }
  } catch (error) {
    console.error('Error sending audio to server:', error);
    
    // Show different messages based on the error
    if (error instanceof Error && error.message === 'Request timed out') {
      onComplete('Error: Connection to server timed out. Please try again later.');
    } else if (error instanceof Error && error.message.includes('uploadAsync is not available')) {
      onComplete('This feature is not available in the web version.');
    } else {
      onComplete('Error: Failed to send audio to server. Please check your connection.');
    }
  }
};