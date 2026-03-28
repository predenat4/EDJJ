import { Timestamp } from 'firebase/firestore';

export type MediaType = 'image' | 'video' | 'audio';

export interface Media {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  createdAt: Timestamp;
  description?: string;
  size?: number;
}
