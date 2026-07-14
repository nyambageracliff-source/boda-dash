import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.realbodarider.app',
  appName: 'Real Boda Rider KE',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
