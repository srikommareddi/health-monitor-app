import { Platform } from 'react-native';

const IOS_LOCAL_API = 'http://127.0.0.1:8000';
const ANDROID_LOCAL_API = 'http://10.0.2.2:8000';

export const API_BASE_URL =
  Platform.select({
    ios: IOS_LOCAL_API,
    android: ANDROID_LOCAL_API,
  }) ?? IOS_LOCAL_API;
