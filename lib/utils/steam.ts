import { PersonaState, PersonaStateEnum } from "@/lib/types/steam";
import { ProfileResult, SteamApiError } from "@/lib/types/steam";

export function getPersonaState(state: number): PersonaState {
  const states: Record<number, PersonaState> = {
    [PersonaStateEnum.OFFLINE]: { 
      text: "Offline", 
      color: "text-gray-500", 
      bgColor: "bg-gray-400" 
    },
    [PersonaStateEnum.ONLINE]: { 
      text: "Online", 
      color: "text-green-500", 
      bgColor: "bg-green-500" 
    },
    [PersonaStateEnum.BUSY]: { 
      text: "Busy", 
      color: "text-red-500", 
      bgColor: "bg-red-500" 
    },
    [PersonaStateEnum.AWAY]: { 
      text: "Away", 
      color: "text-yellow-500", 
      bgColor: "bg-yellow-500" 
    },
    [PersonaStateEnum.SNOOZE]: { 
      text: "Snooze", 
      color: "text-purple-500", 
      bgColor: "bg-purple-500" 
    },
    [PersonaStateEnum.LOOKING_TO_TRADE]: { 
      text: "Looking to trade", 
      color: "text-blue-500", 
      bgColor: "bg-blue-500" 
    },
    [PersonaStateEnum.LOOKING_TO_PLAY]: { 
      text: "Looking to play", 
      color: "text-green-600", 
      bgColor: "bg-green-600" 
    },
  };
  
  return states[state] || { 
    text: "Unknown", 
    color: "text-gray-500", 
    bgColor: "bg-gray-400" 
  };
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function isProfileError(profile: ProfileResult): profile is SteamApiError {
  return profile != null && typeof profile === 'object' && "error" in profile;
}