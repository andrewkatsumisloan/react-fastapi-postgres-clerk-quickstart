import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import type { ApiSnapshot, BackendInfo, HealthResponse, LoadStatus } from "@/app/types";

export function useApiSnapshot() {
  const [snapshot, setSnapshot] = useState<ApiSnapshot>({
    health: null,
    info: null,
    error: null,
    loading: true,
  });

  const reload = useCallback(async () => {
    setSnapshot((current) => ({ ...current, loading: true, error: null }));

    try {
      const [healthResponse, infoResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/health`),
        fetch(`${API_BASE_URL}/api/info`),
      ]);

      if (!healthResponse.ok || !infoResponse.ok) {
        throw new Error("API returned an unsuccessful status");
      }

      const [health, info] = await Promise.all([
        healthResponse.json() as Promise<HealthResponse>,
        infoResponse.json() as Promise<BackendInfo>,
      ]);

      setSnapshot({ health, info, error: null, loading: false });
    } catch (error) {
      setSnapshot({
        health: null,
        info: null,
        error: error instanceof Error ? error.message : "Unable to reach API",
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const status: LoadStatus = snapshot.loading
    ? "loading"
    : snapshot.error
      ? "error"
      : "ready";

  return { snapshot, reload, status };
}
