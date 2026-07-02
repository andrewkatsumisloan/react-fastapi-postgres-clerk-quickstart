import {
  Activity,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_BASE_URL } from "@/config";
import type {
  ApiSnapshot,
  ClerkUserSummary,
  LoadStatus,
  PaymentAccessStatus,
  PaymentConfig,
  UserProfile,
} from "@/app/types";
import { SignedOutAction, SkeletonLine, StatusBadge } from "./Common";

export function ApiCard({
  snapshot,
  status,
}: {
  snapshot: ApiSnapshot;
  status: LoadStatus;
}) {
  return (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary" />
            API
          </CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription className="truncate">{API_BASE_URL}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {snapshot.info ? (
          <>
            <div className="meta-row">
              <span className="meta-label">Service</span>
              <span className="meta-value">{snapshot.info.name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Version</span>
              <span className="meta-value">{snapshot.info.version}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {snapshot.error ?? "Waiting for API response"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AuthCard({
  isSignedIn,
  user,
}: {
  isSignedIn: boolean | undefined;
  user: ClerkUserSummary | null | undefined;
}) {
  const signedInName = user?.fullName ?? user?.username ?? "Signed-in user";

  return (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Auth
          </CardTitle>
          <StatusBadge status={isSignedIn ? "ready" : "idle"} />
        </div>
        <CardDescription>Clerk session</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSignedIn && user ? (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.imageUrl} alt={user.username ?? ""} />
              <AvatarFallback>
                {(user.firstName ?? user.username ?? "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{signedInName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        ) : (
          <div className="preview-user">
            <div className="skeleton-avatar" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="w-36" />
              <SkeletonLine className="w-48" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DatabaseCard({
  profile,
  profileError,
  isSignedIn,
  status,
}: {
  profile: UserProfile | null;
  profileError: string | null;
  isSignedIn: boolean | undefined;
  status: LoadStatus;
}) {
  return (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            Database
          </CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription>Current user row</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {profile ? (
          <>
            <div className="meta-row">
              <span className="meta-label">User ID</span>
              <span className="meta-value">{profile.id}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Created</span>
              <span className="meta-value">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </>
        ) : isSignedIn ? (
          <p className="text-sm text-muted-foreground">
            {profileError ?? "No profile loaded"}
          </p>
        ) : (
          <>
            <div className="meta-row">
              <span className="meta-label">User ID</span>
              <SkeletonLine className="w-14" />
            </div>
            <div className="meta-row">
              <span className="meta-label">Created</span>
              <SkeletonLine className="w-24" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentCard({
  isSignedIn,
  paymentConfig,
  paymentAccess,
  paymentError,
  checkoutState,
  status,
  startCheckout,
}: {
  isSignedIn: boolean | undefined;
  paymentConfig: PaymentConfig | null;
  paymentAccess: PaymentAccessStatus | null;
  paymentError: string | null;
  checkoutState: "idle" | "starting" | "error";
  status: LoadStatus;
  startCheckout: () => void;
}) {
  const hasPaidAccess = Boolean(paymentAccess?.is_paid);

  return (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            Payments
          </CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription>Stripe Checkout</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="payment-access-flag"
          data-paid={hasPaidAccess}
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{hasPaidAccess ? "Paid user" : "Not paid"}</span>
        </div>

        <div className="space-y-2">
          <div className="meta-row">
            <span className="meta-label">Access flag</span>
            <span className="meta-value">
              {isSignedIn
                ? hasPaidAccess
                  ? "Paid"
                  : "Not paid"
                : "Sign in required"}
            </span>
          </div>
          {paymentAccess?.paid_at && (
            <div className="meta-row">
              <span className="meta-label">Paid at</span>
              <span className="meta-value">
                {new Date(paymentAccess.paid_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-label">Mode</span>
            <span className="meta-value">{paymentConfig?.mode ?? "Unknown"}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Default price</span>
            <span className="meta-value">
              {paymentConfig?.default_price_configured ? "Configured" : "Missing"}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Webhook</span>
            <span className="meta-value">
              {paymentConfig?.webhook_configured ? "Configured" : "Missing"}
            </span>
          </div>
        </div>

        {isSignedIn ? (
          <Button
            className="w-full gap-2"
            onClick={startCheckout}
            disabled={!paymentConfig?.enabled || checkoutState === "starting"}
          >
            <ExternalLink className="h-4 w-4" />
            {checkoutState === "starting" ? "Opening Checkout" : "Open Checkout"}
          </Button>
        ) : (
          <SignedOutAction label="Sign in to pay" />
        )}

        {!paymentConfig?.enabled && (
          <p className="text-sm text-muted-foreground">
            Add Stripe server settings to enable Checkout.
          </p>
        )}
        {paymentError && <p className="text-sm text-red-700">{paymentError}</p>}
      </CardContent>
    </Card>
  );
}

export function StackCard({ snapshot }: { snapshot: ApiSnapshot }) {
  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="text-base">Stack</CardTitle>
        <CardDescription>Runtime</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="stack-chip">
            TypeScript
          </Badge>
          <Badge variant="outline" className="stack-chip">
            Clerk
          </Badge>
          <Badge variant="outline" className="stack-chip">
            Alembic
          </Badge>
          <Badge variant="outline" className="stack-chip">
            Docker
          </Badge>
        </div>
        {snapshot.info ? (
          <div className="space-y-2">
            <div className="meta-row">
              <span className="meta-label">Framework</span>
              <span className="meta-value">{snapshot.info.stack.framework}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Database</span>
              <span className="meta-value">{snapshot.info.stack.database}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Deployment</span>
              <span className="meta-value">{snapshot.info.stack.deployment}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-4/5" />
            <SkeletonLine className="w-3/5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
