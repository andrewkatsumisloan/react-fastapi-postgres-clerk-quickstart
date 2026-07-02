import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import type {
  LoadStatus,
  PaymentAccessStatus,
  PaymentConfig,
  PaymentOrder,
} from "@/app/types";
import type { AuthenticatedRequest } from "./useProfile";

export function usePayments(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
  authenticatedRequest: AuthenticatedRequest,
) {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [paymentAccess, setPaymentAccess] = useState<PaymentAccessStatus | null>(
    null,
  );
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<
    "idle" | "starting" | "error"
  >("idle");

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

  const loadPaymentStatus = useCallback(async () => {
    if (!isSignedIn) {
      setPaymentAccess(null);
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const response = await authenticatedRequest("/api/v1/payments/status");
      if (!response.ok) {
        throw new Error(`Payment status failed with status ${response.status}`);
      }
      setPaymentAccess((await response.json()) as PaymentAccessStatus);
    } catch (error) {
      setPaymentAccess(null);
      setPaymentError(
        error instanceof Error ? error.message : "Unable to load payment status",
      );
    } finally {
      setPaymentLoading(false);
    }
  }, [authenticatedRequest, isSignedIn]);

  const startCheckout = useCallback(async () => {
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
  }, [authenticatedRequest]);

  const reloadPayments = useCallback(() => {
    loadPaymentOrders();
    loadPaymentStatus();
  }, [loadPaymentOrders, loadPaymentStatus]);

  useEffect(() => {
    loadPaymentConfig();
  }, [loadPaymentConfig]);

  useEffect(() => {
    if (isLoaded) {
      reloadPayments();
    }
  }, [isLoaded, reloadPayments]);

  const status: LoadStatus = paymentLoading
    ? "loading"
    : paymentError
      ? "error"
      : paymentConfig?.enabled
        ? "ready"
        : "idle";

  return {
    paymentConfig,
    paymentOrders,
    paymentAccess,
    paymentLoading,
    paymentError,
    checkoutState,
    startCheckout,
    reloadPayments,
    status,
  };
}
