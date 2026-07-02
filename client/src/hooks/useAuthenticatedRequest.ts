import { useCallback } from "react";
import { API_BASE_URL } from "@/config";
import type { ClerkSessionClient } from "@/app/types";

export function useAuthenticatedRequest(clerk: ClerkSessionClient) {
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await clerk.session?.getToken();
      if (!token) {
        throw new Error("No Clerk session token is available");
      }

      return fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });
    },
    [clerk.session],
  );
}
