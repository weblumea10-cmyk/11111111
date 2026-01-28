
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface WebsiteState {
  html: string;
  css: string;
  js: string;
}

export enum AppScreen {
  HOME = 'HOME',
  GENERATOR = 'GENERATOR'
}

export interface CreditState {
  balance: number;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  history: Message[];
  timestamp: number;
}
