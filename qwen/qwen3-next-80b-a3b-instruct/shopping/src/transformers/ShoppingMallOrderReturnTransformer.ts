import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import { IShoppingMallOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnItem";
import { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";
import { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderReturnTransformer {
  export type Payload = Prisma.shopping_mall_order_returnsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
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
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_returnsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderReturn> {
    const refundAmount = input.shopping_mall_order_refunds?.amount ?? 0;
    const statusMap: Record<string, IShoppingMallOrderReturn["status"]> = {
      requested: "requested",
      pending: "pending",
      processed: "processed",
      rejected: "rejected",
      completed: "completed",
    };
    return {
      returnCode: input.id,
      orderCode: input.order.id,
      status:
        (statusMap[input.status] as IShoppingMallOrderReturn["status"]) ||
        "requested",
      reason: input.reason,
      refundAmount,
      requestedAt: input.created_at.toISOString(),
      returnShippingMethod: undefined,
      returnAddress: undefined,
      notes: undefined,
      items: [],
    };
  }
}
