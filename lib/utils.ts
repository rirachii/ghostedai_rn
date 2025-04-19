import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats seconds into MM:SS format
 * @param seconds Number of seconds
 * @returns Formatted time string (MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Generates a unique filename with timestamp
 * @param prefix Optional prefix for the filename
 * @param extension File extension (with dot)
 * @returns Unique filename
 */
export const generateFilename = (prefix = 'recording', extension = '.m4a'): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  return `${prefix}_${timestamp}${extension}`;
};

/**
 * Truncates text to a specified length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Creates a color with opacity
 * @param hexColor Hex color (with or without #)
 * @param alpha Opacity value (0-1)
 * @returns RGBA color string
 */
export const hexToRgba = (hexColor: string, alpha = 1): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba value
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
