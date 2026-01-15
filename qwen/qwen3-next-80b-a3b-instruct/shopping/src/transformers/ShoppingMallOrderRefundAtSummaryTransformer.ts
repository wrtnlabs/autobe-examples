import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderRefundAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_refundsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        amount: true,
        status: true,
        refund_method: true,
        gateway_reference_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderReturn: {
          select: {
            id: true,
          },
        },
        order: {
          select: {
            id: true,
            code: true, // Reverted from 'number' to 'code' to match Prisma schema
            currency: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_refundsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderRefund.ISummary> {
    return {
      id: input.id,
      order_id: input.order.id,
      order_code: input.order.code, // Reverted from 'number' to 'code' to match Prisma schema
      status: input.status as "pending" | "approved" | "rejected" | "cancelled", // Type assertion to match enum type
      amount: input.amount,
      currency: input.order.currency,
      reason: undefined,
      refund_type: "partial", // Business logic inference - no database field exists, partial is assumed as standard for summary views
      payment_method: input.refund_method,
      created_at: toISOStringSafe(input.created_at), // Changed from .toISOString() to toISOStringSafe()
      merchant_note: undefined,
      customer_note: undefined,
      refund_tracking_id: input.gateway_reference_id ?? undefined,
      refund_policy_applied: undefined,
      refund_category: undefined,
      qualified_for_second_chance: undefined,
    };
  }
}
