import { Actor } from '../types';

export interface SessionContext {
  actor: Actor;
  shareToken?: string;
  projectId?: string;
}

const SESSION_GUEST_NAME_KEY = 'wp_architect_guest_name';
const SESSION_SHARE_TOKEN_KEY = 'wp_architect_share_token';

export const sessionUtils = {
  setGuestName(name: string): void {
    localStorage.setItem(SESSION_GUEST_NAME_KEY, name);
  },

  getGuestName(): string | null {
    return localStorage.getItem(SESSION_GUEST_NAME_KEY);
  },

  setShareToken(token: string): void {
    localStorage.setItem(SESSION_SHARE_TOKEN_KEY, token);
  },

  getShareToken(): string | null {
    return localStorage.getItem(SESSION_SHARE_TOKEN_KEY);
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_GUEST_NAME_KEY);
    localStorage.removeItem(SESSION_SHARE_TOKEN_KEY);
  },

  createActorFromUser(userId: string, userName: string): Actor {
    return {
      user_id: userId,
      name: userName,
      is_guest: false,
    };
  },

  createActorFromGuest(guestName: string): Actor {
    return {
      name: guestName,
      is_guest: true,
    };
  },
};
