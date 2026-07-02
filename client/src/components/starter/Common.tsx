import { SignInButton } from "@clerk/clerk-react";
import { LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LoadStatus } from "@/app/types";

export function StatusBadge({ status }: { status: LoadStatus }) {
  const labels = {
    ready: "Ready",
    loading: "Loading",
    error: "Error",
    idle: "Idle",
  };

  const classes = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    loading: "border-blue-200 bg-blue-50 text-blue-700",
    error: "border-red-200 bg-red-50 text-red-700",
    idle: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 ${classes[status]}`}>
      {labels[status]}
    </Badge>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`skeleton-line ${className}`} aria-hidden="true" />;
}

export function SignedOutAction({ label = "Sign in to use this" }: { label?: string }) {
  return (
    <SignInButton mode="modal">
      <Button className="w-fit gap-2">
        <LogIn className="h-4 w-4" />
        {label}
      </Button>
    </SignInButton>
  );
}
