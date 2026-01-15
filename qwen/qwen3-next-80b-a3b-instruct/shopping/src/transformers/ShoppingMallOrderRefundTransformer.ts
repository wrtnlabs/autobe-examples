import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderRefundTransformer {
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
            currency: true,
          },
        },
        refund_code: true,
      },
    } satisfies Prisma.shopping_mall_order_refundsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderRefund> {
    return {
      id: input.id,
      refund_code: input.refund_code,
      amount: input.amount,
      currency: input.order.currency,
      status: input.status as
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "failed",
      refund_method: input.refund_method,
      created_at: toISOStringSafe(input.created_at),
      processed_at: toISOStringSafe(input.updated_at),
      transaction_id:
        input.gateway_reference_id || "00000000-0000-0000-0000-000000000000",
      gateway_response:
        input.gateway_reference_id !== null
          ? input.gateway_reference_id
          : undefined,
    };
  }
}
