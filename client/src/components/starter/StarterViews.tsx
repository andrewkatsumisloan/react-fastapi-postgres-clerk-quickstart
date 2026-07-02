import type { Dispatch, SetStateAction } from "react";
import { KeyRound, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  PaymentOrder,
  UserProfile,
} from "@/app/types";
import { AuthCard, DatabaseCard, PaymentCard, StackCard } from "./StatusCards";
import { PaymentOrders } from "./PaymentOrders";
import { ProfileEditor } from "./ProfileEditor";
import { SignedOutAction } from "./Common";

interface StarterViewProps {
  apiSnapshot: ApiSnapshot;
  apiStatus: LoadStatus;
  isSignedIn: boolean | undefined;
  user: ClerkUserSummary | null | undefined;
  profile: UserProfile | null;
  profileError: string | null;
  profileLoading: boolean;
  profileStatus: LoadStatus;
  saveState: "idle" | "saving" | "saved" | "error";
  formState: { name: string };
  setFormState: Dispatch<SetStateAction<{ name: string }>>;
  loadProfile: () => void;
  saveProfile: () => void;
  paymentConfig: PaymentConfig | null;
  paymentOrders: PaymentOrder[];
  paymentAccess: PaymentAccessStatus | null;
  paymentLoading: boolean;
  paymentError: string | null;
  paymentStatus: LoadStatus;
  checkoutState: "idle" | "starting" | "error";
  startCheckout: () => void;
  reloadPayments: () => void;
  checkoutResult: string | null;
}

function ProfilePanel(props: Pick<
  StarterViewProps,
  | "isSignedIn"
  | "profile"
  | "profileError"
  | "profileLoading"
  | "saveState"
  | "formState"
  | "setFormState"
  | "loadProfile"
  | "saveProfile"
>) {
  return <ProfileEditor {...props} />;
}

function PaymentsPanel(props: Pick<
  StarterViewProps,
  | "isSignedIn"
  | "paymentConfig"
  | "paymentAccess"
  | "paymentError"
  | "checkoutState"
  | "paymentStatus"
  | "startCheckout"
>) {
  return (
    <PaymentCard
      isSignedIn={props.isSignedIn}
      paymentConfig={props.paymentConfig}
      paymentAccess={props.paymentAccess}
      paymentError={props.paymentError}
      checkoutState={props.checkoutState}
      status={props.paymentStatus}
      startCheckout={props.startCheckout}
    />
  );
}

export function OverviewView(props: StarterViewProps) {
  return (
    <>
      <section className="status-grid">
        <AuthCard isSignedIn={props.isSignedIn} user={props.user} />
        <DatabaseCard
          profile={props.profile}
          profileError={props.profileError}
          isSignedIn={props.isSignedIn}
          status={props.profileStatus}
        />
        <PaymentsPanel {...props} />
        <StackCard snapshot={props.apiSnapshot} />
      </section>

      <section className="workspace-grid">
        <ProfilePanel {...props} />
        <ApiAndStack snapshot={props.apiSnapshot} status={props.apiStatus} />
      </section>
    </>
  );
}

export function ProfileView(props: StarterViewProps) {
  return (
    <section className="workspace-grid">
      <ProfilePanel {...props} />
      <div className="space-y-4">
        <AuthCard isSignedIn={props.isSignedIn} user={props.user} />
        <DatabaseCard
          profile={props.profile}
          profileError={props.profileError}
          isSignedIn={props.isSignedIn}
          status={props.profileStatus}
        />
      </div>
    </section>
  );
}

export function PaymentsView(props: StarterViewProps) {
  return (
    <section className="workspace-grid">
      <div className="space-y-4">
        {props.checkoutResult === "success" && (
          <Card className="panel">
            <CardHeader>
              <CardTitle className="text-base">Checkout Complete</CardTitle>
              <CardDescription>
                Stripe returned to the app. Webhooks update the final payment state.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {props.checkoutResult === "canceled" && (
          <Card className="panel">
            <CardHeader>
              <CardTitle className="text-base">Checkout Canceled</CardTitle>
              <CardDescription>
                The Checkout Session was not completed.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        <PaymentOrders
          isSignedIn={props.isSignedIn}
          paymentOrders={props.paymentOrders}
          paymentLoading={props.paymentLoading}
          reloadPayments={props.reloadPayments}
        />
      </div>
      <div className="space-y-4">
        <PaymentsPanel {...props} />
      </div>
    </section>
  );
}

export function AuthView({
  isSignedIn,
  user,
}: Pick<StarterViewProps, "isSignedIn" | "user">) {
  return (
    <section className="two-panel-grid">
      <AuthCard isSignedIn={isSignedIn} user={user} />
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
                The database row is created for the current Clerk identity.
              </p>
            </div>
          </div>
          {!isSignedIn && <SignedOutAction label="Sign in to test auth" />}
        </CardContent>
      </Card>
    </section>
  );
}

export function SettingsView(props: StarterViewProps) {
  return (
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
              {props.isSignedIn ? "Authenticated" : "Unauthenticated preview"}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Stripe</span>
            <span className="meta-value">
              {props.paymentConfig?.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
      <StackCard snapshot={props.apiSnapshot} />
    </section>
  );
}

function ApiAndStack({ snapshot, status }: { snapshot: ApiSnapshot; status: LoadStatus }) {
  return (
    <div className="space-y-4">
      <Card className="panel">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">API</CardTitle>
            <Badge variant="outline" className="stack-chip">
              {status === "ready" ? "Connected" : status}
            </Badge>
          </div>
          <CardDescription className="truncate">{API_BASE_URL}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="meta-row">
            <span className="meta-label">Health</span>
            <span className="meta-value">{snapshot.health?.status ?? "Unknown"}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Service</span>
            <span className="meta-value">{snapshot.info?.name ?? "Unavailable"}</span>
          </div>
        </CardContent>
      </Card>
      <StackCard snapshot={snapshot} />
    </div>
  );
}

export type { StarterViewProps };
