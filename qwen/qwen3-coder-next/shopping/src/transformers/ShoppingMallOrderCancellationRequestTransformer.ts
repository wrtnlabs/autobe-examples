import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderCancellationRequestTransformer {
  export type Payload =
    Prisma.shopping_mall_order_cancellation_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        responded_by: true,
        created_at: true,
        responded_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderCancellationRequest> {
    return {
      id: input.id,
      order_item_id: input.order_item_id,
      customer_id: input.customer_id,
      reason: input.reason ?? undefined,
      status: input.status as "pending" | "approved" | "rejected",
      rejection_reason: input.rejection_reason ?? undefined,
      responded_by: input.responded_by ?? undefined,
      created_at: input.created_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? undefined,
    };
  }
}
