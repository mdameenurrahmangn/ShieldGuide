export interface User {
  name: string;
  email: string;
  phone: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  groundingMetadata?: any;
}

export interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  address?: string;
  error?: string;
}

export interface SafetyAlert {
  id: string;
  type: 'scam' | 'hazard' | 'emergency';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}
