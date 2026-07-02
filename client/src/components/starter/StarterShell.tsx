import { useMemo, useState } from "react";
import { SignInButton, UserButton, useClerk, useUser } from "@clerk/clerk-react";
import { LogIn, RefreshCw, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";
import { navItems, views } from "@/app/navigation";
import type { AppView } from "@/app/types";
import { useApiSnapshot } from "@/hooks/useApiSnapshot";
import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";
import { usePayments } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";
import { StatusBadge } from "./Common";
import {
  AuthView,
  OverviewView,
  PaymentsView,
  ProfileView,
  SettingsView,
  type StarterViewProps,
} from "./StarterViews";

export function StarterShell() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const authenticatedRequest = useAuthenticatedRequest(clerk);
  const checkoutResult = useMemo(
    () => new URLSearchParams(window.location.search).get("checkout"),
    [],
  );
  const [activeView, setActiveView] = useState<AppView>(
    checkoutResult ? "payments" : "overview",
  );

  const api = useApiSnapshot();
  const profile = useProfile(isLoaded, isSignedIn, authenticatedRequest);
  const payments = usePayments(isLoaded, isSignedIn, authenticatedRequest);

  const activeMeta = views[activeView];

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <StatusBadge status="loading" />
      </div>
    );
  }

  const viewProps: StarterViewProps = {
    apiSnapshot: api.snapshot,
    apiStatus: api.status,
    isSignedIn,
    user,
    profile: profile.profile,
    profileError: profile.profileError,
    profileLoading: profile.profileLoading,
    profileStatus: profile.status,
    saveState: profile.saveState,
    formState: profile.formState,
    setFormState: profile.setFormState,
    loadProfile: profile.loadProfile,
    saveProfile: profile.saveProfile,
    paymentConfig: payments.paymentConfig,
    paymentOrders: payments.paymentOrders,
    paymentAccess: payments.paymentAccess,
    paymentLoading: payments.paymentLoading,
    paymentError: payments.paymentError,
    paymentStatus: payments.status,
    checkoutState: payments.checkoutState,
    startCheckout: payments.startCheckout,
    reloadPayments: payments.reloadPayments,
    checkoutResult,
  };

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
              onClick={api.reload}
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

          {activeView === "overview" && <OverviewView {...viewProps} />}
          {activeView === "profile" && <ProfileView {...viewProps} />}
          {activeView === "payments" && <PaymentsView {...viewProps} />}
          {activeView === "auth" && <AuthView {...viewProps} />}
          {activeView === "settings" && <SettingsView {...viewProps} />}
        </main>
      </div>
    </div>
  );
}
