import { useCallback, useEffect, useState } from "react";
import type { LoadStatus, UserProfile } from "@/app/types";

export type AuthenticatedRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

export function useProfile(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
  authenticatedRequest: AuthenticatedRequest,
) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [formState, setFormState] = useState({ name: "" });

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null);
      setFormState({ name: "" });
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await authenticatedRequest("/api/v1/users/me");
      if (!response.ok) {
        throw new Error(`Profile request failed with status ${response.status}`);
      }
      const nextProfile = (await response.json()) as UserProfile;
      setProfile(nextProfile);
      setFormState({ name: nextProfile.name ?? "" });
    } catch (error) {
      setProfile(null);
      setProfileError(
        error instanceof Error ? error.message : "Unable to load profile",
      );
    } finally {
      setProfileLoading(false);
    }
  }, [authenticatedRequest, isSignedIn]);

  const saveProfile = useCallback(async () => {
    setSaveState("saving");
    setProfileError(null);

    try {
      const response = await authenticatedRequest("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({
          name: formState.name.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const nextProfile = (await response.json()) as UserProfile;
      setProfile(nextProfile);
      setFormState({ name: nextProfile.name ?? "" });
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setProfileError(error instanceof Error ? error.message : "Unable to save");
    }
  }, [authenticatedRequest, formState.name]);

  useEffect(() => {
    if (isLoaded) {
      loadProfile();
    }
  }, [isLoaded, loadProfile]);

  const status: LoadStatus = profileLoading
    ? "loading"
    : profileError
      ? "error"
      : profile
        ? "ready"
        : "idle";

  return {
    profile,
    profileError,
    profileLoading,
    saveState,
    formState,
    setFormState,
    loadProfile,
    saveProfile,
    status,
  };
}
