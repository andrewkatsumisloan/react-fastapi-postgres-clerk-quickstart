import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClerkProvider,
  SignInButton,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import {
  Activity,
  CreditCard,
  Database,
  ExternalLink,
  Home,
  KeyRound,
  LogIn,
  RefreshCw,
  ReceiptText,
  Save,
  Server,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { API_BASE_URL } from "./config";
import "./App.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

type AppView = "overview" | "profile" | "payments" | "auth" | "settings";

interface BackendInfo {
  name: string;
  version: string;
  stack: {
    framework: string;
    database: string;
    deployment: string;
  };
}

interface HealthResponse {
  status: string;
}

interface UserProfile {
  id: number;
  clerk_user_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface ApiSnapshot {
  health: HealthResponse | null;
  info: BackendInfo | null;
  error: string | null;
  loading: boolean;
}

interface PaymentConfig {
  enabled: boolean;
  default_price_configured: boolean;
  webhook_configured: boolean;
  mode: string;
}

interface PaymentOrder {
  id: number;
  stripe_checkout_session_id: string;
  mode: string;
  status: string;
  payment_status: string;
  currency?: string | null;
  amount_total?: number | null;
  price_id: string;
  paid_at?: string | null;
  created_at: string;
}

const views: Record<
  AppView,
  {
    label: string;
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  overview: {
    label: "Overview",
    eyebrow: "Local development",
    title: "Overview",
    description: "The full template surface at a glance.",
    icon: Home,
  },
  profile: {
    label: "Profile",
    eyebrow: "User workspace",
    title: "Profile",
    description: "Edit the current user row created from Clerk identity data.",
    icon: UserRound,
  },
  payments: {
    label: "Payments",
    eyebrow: "Stripe Checkout",
    title: "Payments",
    description: "Create hosted Checkout Sessions for signed-in users.",
    icon: CreditCard,
  },
  auth: {
    label: "Auth",
    eyebrow: "Session state",
    title: "Authentication",
    description: "Inspect the Clerk session and protected API request flow.",
    icon: KeyRound,
  },
  settings: {
    label: "Settings",
    eyebrow: "Template config",
    title: "Settings",
    description: "Review the client, API, database, and deployment defaults.",
    icon: Settings,
  },
};

const navItems = Object.entries(views) as Array<[AppView, (typeof views)[AppView]]>;

function StatusBadge({
  status,
}: {
  status: "ready" | "loading" | "error" | "idle";
}) {
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

function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`skeleton-line ${className}`} aria-hidden="true" />;
}

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !currency) {
    return "Pending";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function SignedOutAction({ label = "Sign in to use this" }: { label?: string }) {
  return (
    <SignInButton mode="modal">
      <Button className="w-fit gap-2">
        <LogIn className="h-4 w-4" />
        {label}
      </Button>
    </SignInButton>
  );
}

function StarterShell() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const checkoutResult = useMemo(
    () => new URLSearchParams(window.location.search).get("checkout"),
    [],
  );
  const [activeView, setActiveView] = useState<AppView>(
    checkoutResult ? "payments" : "overview",
  );
  const [apiSnapshot, setApiSnapshot] = useState<ApiSnapshot>({
    health: null,
    info: null,
    error: null,
    loading: true,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [formState, setFormState] = useState({ email: "", name: "" });
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<
    "idle" | "starting" | "error"
  >("idle");

  const activeMeta = views[activeView];

  const loadApiSnapshot = useCallback(async () => {
    setApiSnapshot((current) => ({ ...current, loading: true, error: null }));

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

      setApiSnapshot({ health, info, error: null, loading: false });
    } catch (error) {
      setApiSnapshot({
        health: null,
        info: null,
        error: error instanceof Error ? error.message : "Unable to reach API",
        loading: false,
      });
    }
  }, []);

  const authenticatedRequest = useCallback(
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

  const loadPaymentConfig = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/config`);
      if (!response.ok) {
        throw new Error(`Payment config failed with status ${response.status}`);
      }
      setPaymentConfig((await response.json()) as PaymentConfig);
    } catch (error) {
      setPaymentConfig(null);
      setPaymentError(
        error instanceof Error ? error.message : "Unable to load payments",
      );
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  const loadPaymentOrders = useCallback(async () => {
    if (!isSignedIn) {
      setPaymentOrders([]);
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const response = await authenticatedRequest("/api/v1/payments/orders");
      if (!response.ok) {
        throw new Error(`Payment orders failed with status ${response.status}`);
      }
      setPaymentOrders((await response.json()) as PaymentOrder[]);
    } catch (error) {
      setPaymentOrders([]);
      setPaymentError(
        error instanceof Error ? error.message : "Unable to load payment orders",
      );
    } finally {
      setPaymentLoading(false);
    }
  }, [authenticatedRequest, isSignedIn]);

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null);
      setFormState({ email: "", name: "" });
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
      setFormState({
        email: nextProfile.email,
        name: nextProfile.name ?? "",
      });
    } catch (error) {
      setProfile(null);
      setProfileError(
        error instanceof Error ? error.message : "Unable to load profile",
      );
    } finally {
      setProfileLoading(false);
    }
  }, [authenticatedRequest, isSignedIn]);

  const saveProfile = async () => {
    setSaveState("saving");
    setProfileError(null);

    try {
      const response = await authenticatedRequest("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({
          email: formState.email,
          name: formState.name.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const nextProfile = (await response.json()) as UserProfile;
      setProfile(nextProfile);
      setFormState({
        email: nextProfile.email,
        name: nextProfile.name ?? "",
      });
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setProfileError(error instanceof Error ? error.message : "Unable to save");
    }
  };

  const startCheckout = async () => {
    setCheckoutState("starting");
    setPaymentError(null);

    try {
      const response = await authenticatedRequest(
        "/api/v1/payments/checkout-session",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) {
        throw new Error(`Checkout failed with status ${response.status}`);
      }
      const data = (await response.json()) as { checkout_url: string };
      window.location.assign(data.checkout_url);
    } catch (error) {
      setCheckoutState("error");
      setPaymentError(
        error instanceof Error ? error.message : "Unable to start Checkout",
      );
    }
  };

  useEffect(() => {
    loadApiSnapshot();
    loadPaymentConfig();
  }, [loadApiSnapshot, loadPaymentConfig]);

  useEffect(() => {
    if (isLoaded) {
      loadProfile();
      loadPaymentOrders();
    }
  }, [isLoaded, loadPaymentOrders, loadProfile]);

  const apiStatus = apiSnapshot.loading
    ? "loading"
    : apiSnapshot.error
      ? "error"
      : "ready";
  const profileStatus = profileLoading
    ? "loading"
    : profileError
      ? "error"
      : profile
        ? "ready"
        : "idle";
  const paymentStatus = paymentLoading
    ? "loading"
    : paymentError
      ? "error"
      : paymentConfig?.enabled
        ? "ready"
        : "idle";
  const signedInName = useMemo(
    () => user?.fullName ?? user?.username ?? "Signed-in user",
    [user?.fullName, user?.username],
  );

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <StatusBadge status="loading" />
      </div>
    );
  }

  const renderApiCard = () => (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary" />
            API
          </CardTitle>
          <StatusBadge status={apiStatus} />
        </div>
        <CardDescription className="truncate">{API_BASE_URL}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {apiSnapshot.info ? (
          <>
            <div className="meta-row">
              <span className="meta-label">Service</span>
              <span className="meta-value">{apiSnapshot.info.name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Version</span>
              <span className="meta-value">{apiSnapshot.info.version}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {apiSnapshot.error ?? "Waiting for API response"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const renderAuthCard = () => (
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

  const renderDatabaseCard = () => (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            Database
          </CardTitle>
          <StatusBadge status={profileStatus} />
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

  const renderPaymentCard = () => (
    <Card className="panel">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            Payments
          </CardTitle>
          <StatusBadge status={paymentStatus} />
        </div>
        <CardDescription>Stripe Checkout</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
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

  const renderProfileEditor = () => (
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
            <label className="space-y-2 text-sm font-medium">
              Email
              <input
                className="form-input"
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
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

  const renderPaymentOrders = () => (
    <Card className="panel">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4 text-primary" />
              Payment Orders
            </CardTitle>
            <CardDescription>/api/v1/payments/orders</CardDescription>
          </div>
          {isSignedIn && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={loadPaymentOrders}
              disabled={paymentLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isSignedIn ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to view Checkout Sessions for the current user.
            </p>
            <SignedOutAction label="Sign in to view payments" />
          </div>
        ) : paymentOrders.length > 0 ? (
          <div className="payment-list">
            {paymentOrders.map((order) => (
              <div className="payment-row" key={order.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {formatMoney(order.amount_total, order.currency)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.stripe_checkout_session_id}
                  </p>
                </div>
                <div className="payment-row-meta">
                  <Badge variant="outline" className="stack-chip">
                    {order.payment_status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No payment orders for this user yet.
          </p>
        )}
      </CardContent>
    </Card>
  );

  const renderStackCard = () => (
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
        {apiSnapshot.info ? (
          <div className="space-y-2">
            <div className="meta-row">
              <span className="meta-label">Framework</span>
              <span className="meta-value">{apiSnapshot.info.stack.framework}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Database</span>
              <span className="meta-value">{apiSnapshot.info.stack.database}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Deployment</span>
              <span className="meta-value">{apiSnapshot.info.stack.deployment}</span>
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

  const renderOverview = () => (
    <>
      <section className="status-grid">
        {renderApiCard()}
        {renderAuthCard()}
        {renderDatabaseCard()}
        {renderPaymentCard()}
      </section>

      <section className="workspace-grid">
        {renderProfileEditor()}
        {renderStackCard()}
      </section>
    </>
  );

  const renderProfileView = () => (
    <>
      <section className="workspace-grid">
        {renderProfileEditor()}
        <div className="space-y-4">
          {renderAuthCard()}
          {renderDatabaseCard()}
        </div>
      </section>
    </>
  );

  const renderPaymentsView = () => (
    <section className="workspace-grid">
      <div className="space-y-4">
        {checkoutResult === "success" && (
          <Card className="panel">
            <CardHeader>
              <CardTitle className="text-base">Checkout Complete</CardTitle>
              <CardDescription>
                Stripe returned to the app. Webhooks update the final payment state.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {checkoutResult === "canceled" && (
          <Card className="panel">
            <CardHeader>
              <CardTitle className="text-base">Checkout Canceled</CardTitle>
              <CardDescription>
                The Checkout Session was not completed.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {renderPaymentOrders()}
      </div>
      <div className="space-y-4">{renderPaymentCard()}</div>
    </section>
  );

  const renderAuthView = () => (
    <section className="two-panel-grid">
      {renderAuthCard()}
      <Card className="panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Protected Request
          </CardTitle>
          <CardDescription>Bearer token sent to FastAPI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flow-row">
            <span className="flow-step">1</span>
            <div>
              <p className="text-sm font-semibold">Clerk issues session token</p>
              <p className="text-sm text-muted-foreground">
                {isSignedIn ? "Session available" : "Preview only while signed out"}
              </p>
            </div>
          </div>
          <div className="flow-row">
            <span className="flow-step">2</span>
            <div>
              <p className="text-sm font-semibold">React calls /api/v1/users/me</p>
              <p className="text-sm text-muted-foreground">
                Authorization header is attached before the request is sent.
              </p>
            </div>
          </div>
          <div className="flow-row">
            <span className="flow-step">3</span>
            <div>
              <p className="text-sm font-semibold">FastAPI validates JWT</p>
              <p className="text-sm text-muted-foreground">
                The database row is created or updated for the current user.
              </p>
            </div>
          </div>
          {!isSignedIn && <SignedOutAction label="Sign in to test auth" />}
        </CardContent>
      </Card>
    </section>
  );

  const renderSettingsView = () => (
    <section className="two-panel-grid">
      <Card className="panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            Client Settings
          </CardTitle>
          <CardDescription>Runtime values visible to the browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="meta-row">
            <span className="meta-label">API base</span>
            <span className="meta-value">{API_BASE_URL}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Clerk key</span>
            <span className="meta-value">Configured</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Auth state</span>
            <span className="meta-value">
              {isSignedIn ? "Authenticated" : "Unauthenticated preview"}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Stripe</span>
            <span className="meta-value">
              {paymentConfig?.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
      {renderStackCard()}
    </section>
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="flex items-center gap-3">
          <div className="brand-mark">
            <Server className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Starter
            </p>
            <h1 className="truncate text-base font-semibold">Fullstack App</h1>
          </div>
        </div>

        <nav className="space-y-1" aria-label="App views">
          {navItems.map(([view, item]) => {
            const Icon = item.icon;
            return (
              <button
                key={view}
                type="button"
                className="nav-item"
                data-active={activeView === view}
                onClick={() => setActiveView(view)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer mt-auto rounded-lg border bg-card/70 p-3">
          <p className="text-xs font-medium text-muted-foreground">API base</p>
          <p className="mt-1 truncate text-sm font-semibold">{API_BASE_URL}</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {activeMeta.eyebrow}
            </p>
            <h2 className="truncate text-lg font-semibold">{activeMeta.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="topbar-refresh gap-2"
              onClick={loadApiSnapshot}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <div className="topbar-auth">
              {isSignedIn ? (
                <UserButton />
              ) : (
                <SignInButton mode="modal">
                  <Button className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">
          <section className="mb-6 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="stack-chip">
                React
              </Badge>
              <Badge variant="outline" className="stack-chip">
                FastAPI
              </Badge>
              <Badge variant="outline" className="stack-chip">
                Postgres
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {activeMeta.title}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {activeMeta.description}
            </p>
          </section>

          {activeView === "overview" && renderOverview()}
          {activeView === "profile" && renderProfileView()}
          {activeView === "payments" && renderPaymentsView()}
          {activeView === "auth" && renderAuthView()}
          {activeView === "settings" && renderSettingsView()}
        </main>
      </div>
    </div>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Missing Clerk Configuration</CardTitle>
            <CardDescription>
              Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>client/.env</code>{" "}
              and restart the Vite dev server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <StarterShell />
    </ClerkProvider>
  );
}

export default App;
