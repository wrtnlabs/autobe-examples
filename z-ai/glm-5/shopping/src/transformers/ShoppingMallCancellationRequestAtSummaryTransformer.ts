import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCancellationRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        responded_at: true,
        orderItem: {
          select: {
            id: true,
            product: {
              select: {
                name: true,
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
            order: {
              select: {
                order_number: true,
              },
            } satisfies Prisma.shopping_mall_ordersFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationRequest.ISummary> {
    return {
      id: input.id,
      orderItemId: input.orderItem.id,
      productName: input.orderItem.product.name,
      orderNumber: input.orderItem.order.order_number,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      createdAt: input.created_at.toISOString(),
      respondedAt: input.responded_at ? input.responded_at.toISOString() : null,
    };
  }
}
