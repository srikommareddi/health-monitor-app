/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-url-polyfill/auto';
import 'web-streams-polyfill/polyfill';
import { EventTarget } from 'event-target-shim';
import { registerGlobals } from '@livekit/react-native-webrtc';
import App from './App';
import { name as appName } from './app.json';

if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
      this.cancelable = Boolean(options.cancelable);
      this.defaultPrevented = false;
    }

    preventDefault() {
      if (this.cancelable) {
        this.defaultPrevented = true;
      }
    }
  };
}

if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = EventTarget;
}

registerGlobals();

if (typeof RTCRtpSender !== 'undefined' && typeof RTCRtpSender.getCapabilities === 'function') {
  const originalGetCapabilities = RTCRtpSender.getCapabilities.bind(RTCRtpSender);

  RTCRtpSender.getCapabilities = (kind) => {
    const capabilities = originalGetCapabilities(kind);
    if (!capabilities?.codecs) {
      return capabilities;
    }

    const codecs = capabilities.codecs.filter(
      (codec) => typeof codec?.mimeType === 'string' && codec.mimeType.length > 0,
    );

    if (codecs.length === capabilities.codecs.length) {
      return capabilities;
    }

    return {
      ...capabilities,
      codecs,
    };
  };
}

AppRegistry.registerComponent(appName, () => App);
