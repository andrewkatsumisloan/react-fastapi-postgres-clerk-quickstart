export function formatMoney(
  amount: number | null | undefined,
  currency?: string | null,
) {
  if (amount == null || !currency) {
    return "Pending";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
