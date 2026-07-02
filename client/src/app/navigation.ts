import {
  CreditCard,
  Home,
  KeyRound,
  Settings,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppView } from "./types";

export const views: Record<
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
    description: "Edit app-owned profile fields for the signed-in Clerk user.",
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

export const navItems = Object.entries(views) as Array<
  [AppView, (typeof views)[AppView]]
>;
