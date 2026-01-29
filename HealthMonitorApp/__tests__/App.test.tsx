/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-auth0', () => {
  return function Auth0() {
    return {
      webAuth: {
        authorize: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
        clearSession: jest.fn().mockResolvedValue(true),
      },
      auth: {
        userInfo: jest.fn().mockResolvedValue({}),
      },
    };
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
