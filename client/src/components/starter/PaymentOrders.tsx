import { ReceiptText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/app/format";
import type { PaymentOrder } from "@/app/types";
import { SignedOutAction } from "./Common";

export function PaymentOrders({
  isSignedIn,
  paymentOrders,
  paymentLoading,
  reloadPayments,
}: {
  isSignedIn: boolean | undefined;
  paymentOrders: PaymentOrder[];
  paymentLoading: boolean;
  reloadPayments: () => void;
}) {
  return (
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
              onClick={reloadPayments}
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
}
