import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderCancellationRequestAtRejectTransformer {
  export type Payload =
    Prisma.shopping_mall_order_cancellation_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        responded_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        logs: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_cancellation_request_logsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderCancellationRequest.IReject> {
    return {
      rejection_reason: input.rejection_reason ?? undefined,
    };
  }
}
