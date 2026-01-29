export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Glucose: undefined;
  Detail: {
    title: string;
    value: string;
    subtitle: string;
    meta?: string;
    updatedAt?: string;
  };
  Insights: undefined;
  JoinRoom: undefined;
  EHRConnect: undefined;
  LiveSession: {
    token: string;
    url: string;
    roomName: string;
    participantName: string;
  };
};
