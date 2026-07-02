export type AppView = "overview" | "profile" | "payments" | "auth" | "settings";

export type LoadStatus = "ready" | "loading" | "error" | "idle";

export interface BackendInfo {
  name: string;
  version: string;
  stack: {
    framework: string;
    database: string;
    deployment: string;
  };
}

export interface HealthResponse {
  status: string;
}

export interface UserProfile {
  id: number;
  clerk_user_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ApiSnapshot {
  health: HealthResponse | null;
  info: BackendInfo | null;
  error: string | null;
  loading: boolean;
}

export interface PaymentConfig {
  enabled: boolean;
  default_price_configured: boolean;
  webhook_configured: boolean;
  mode: string;
}

export interface PaymentOrder {
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

export interface PaymentAccessStatus {
  is_paid: boolean;
  payment_status: string;
  order_id?: number | null;
  paid_at?: string | null;
}

export interface ClerkUserSummary {
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string;
  firstName?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
}

export interface ClerkSessionClient {
  session?: {
    getToken: () => Promise<string | null>;
  } | null;
}
