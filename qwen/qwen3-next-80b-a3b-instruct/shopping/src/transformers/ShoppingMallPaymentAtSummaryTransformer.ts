import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        paymentIntent: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
              },
            },
            sellerId: true,
            method_type: true,
            payment_type: true,
            reference_id: true,
            channel: true,
            method_name: true,
            description: true,
          },
        },
        shopping_mall_payment_refunds: {
          select: {
            id: true,
            refund_amount: true,
            refund_reason: true,
          },
        },
        shopping_mall_payment_reconciliation: {
          select: {
            id: true,
            amount: true,
            reference: true,
          },
        },
        shopping_mall_payment_disputes: {
          select: {
            id: true,
            dispute_status: true,
          },
        },
        shopping_mall_payment_cryptocurrency_conversions: {
          select: {
            id: true,
            currency: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPayment.ISummary> {
    const refundAmount =
      input.shopping_mall_payment_refunds?.reduce(
        (sum, ref) => sum + ref.refund_amount,
        0,
      ) || 0;
    const refundReason =
      input.shopping_mall_payment_refunds &&
      input.shopping_mall_payment_refunds.length > 0
        ? input.shopping_mall_payment_refunds[0].refund_reason
        : "none";
    const paymentType =
      input.paymentIntent?.payment_type ||
      (input.shopping_mall_payment_reconciliation &&
      input.shopping_mall_payment_reconciliation.length > 0
        ? input.shopping_mall_payment_reconciliation[0].amount
        : "unknown");
    const paymentReference =
      input.paymentIntent?.reference_id ||
      (input.shopping_mall_payment_reconciliation &&
      input.shopping_mall_payment_reconciliation.length > 0
        ? input.shopping_mall_payment_reconciliation[0].reference
        : "");
    const paymentMethodType =
      input.paymentIntent?.method_type ||
      (input.shopping_mall_payment_cryptocurrency_conversions
        ? "cryptocurrency"
        : "unknown");
    const paymentMethod =
      input.paymentIntent?.method_name ||
      (input.shopping_mall_payment_cryptocurrency_conversions
        ? input.shopping_mall_payment_cryptocurrency_conversions.currency
        : "unknown");
    return {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      paymentStatus: input.status,
      paymentMethodType: paymentMethodType as
        | "credit_card"
        | "debit_card"
        | "digital_wallet"
        | "bank_transfer"
        | "cryptocurrency",
      createdAt: toISOStringSafe(input.created_at),
      customerId: input.paymentIntent?.customer?.id || "",
      sellerId: input.paymentIntent?.sellerId || "",
      refundAmount: refundAmount,
      paymentType: paymentType,
      paymentLabel: `Payment for ${paymentReference}`,
      paymentDescription:
        input.paymentIntent?.description ||
        "Payment for order through payment gateway",
      refundReason:
        (refundReason as
          | "customer_requested"
          | "order_cancellation"
          | "product_return"
          | "duplicate_charge"
          | "system_error"
          | "fraud_prevention") || "none",
      paymentReference: paymentReference,
      paymentChannel: input.paymentIntent?.channel || "web",
      paymentMethod: paymentMethod || "unknown",
    };
  }
}
