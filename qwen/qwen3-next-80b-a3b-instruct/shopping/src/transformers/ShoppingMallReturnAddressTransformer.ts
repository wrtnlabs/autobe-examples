import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReturnAddressTransformer {
  export type Payload = Prisma.shopping_mall_order_returnsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: {
          select: {
            id: true,
          },
        },
        shopping_mall_order_refunds: {
          select: {
            amount: true,
            refund_method: true,
            status: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_returnsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReturnAddress> {
    return {
      returnId: input.id,
      returnReason: input.reason,
      returnStatus: input.status,
      returnDate: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      orderId: input.order.id,
      refundAmount: input.shopping_mall_order_refunds?.amount ?? undefined,
      refundMethod:
        input.shopping_mall_order_refunds?.refund_method ?? undefined,
      refundStatus: input.shopping_mall_order_refunds?.status ?? undefined,
      processedAt:
        toISOStringSafe(input.shopping_mall_order_refunds?.processed_at) ??
        null,
      customerNotes: input.customer_notes ?? undefined,
      returnShippingMethod: input.return_shipping_method ?? undefined,
      returnShippingCost: input.return_shipping_cost ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
