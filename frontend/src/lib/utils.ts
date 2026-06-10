import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SERVER_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
export const userId = "temp-user-123";
