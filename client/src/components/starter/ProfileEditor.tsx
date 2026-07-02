import type { Dispatch, SetStateAction } from "react";
import { RefreshCw, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserProfile } from "@/app/types";
import { SignedOutAction } from "./Common";

export function ProfileEditor({
  isSignedIn,
  profile,
  profileError,
  profileLoading,
  saveState,
  formState,
  setFormState,
  loadProfile,
  saveProfile,
}: {
  isSignedIn: boolean | undefined;
  profile: UserProfile | null;
  profileError: string | null;
  profileLoading: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  formState: { name: string };
  setFormState: Dispatch<SetStateAction<{ name: string }>>;
  loadProfile: () => void;
  saveProfile: () => void;
}) {
  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-primary" />
          Profile
        </CardTitle>
        <CardDescription>/api/v1/users/me</CardDescription>
      </CardHeader>
      <CardContent>
        {isSignedIn ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-muted-foreground">
              Email
              <input
                className="form-input"
                type="email"
                value={profile?.email ?? ""}
                disabled
                readOnly
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Display name
              <input
                className="form-input"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button
                className="gap-2"
                onClick={saveProfile}
                disabled={profileLoading || saveState === "saving"}
              >
                <Save className="h-4 w-4" />
                {saveState === "saving" ? "Saving" : "Save"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={loadProfile}
                disabled={profileLoading}
              >
                <RefreshCw className="h-4 w-4" />
                Reload
              </Button>
              {saveState === "saved" && (
                <span className="text-sm text-emerald-700">Saved</span>
              )}
              {profileError && (
                <span className="text-sm text-red-700">{profileError}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-muted-foreground">
                Email
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  disabled
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-muted-foreground">
                Display name
                <input className="form-input" placeholder="Your name" disabled />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                This is the signed-out preview of the editable profile form.
              </p>
              <SignedOutAction />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
