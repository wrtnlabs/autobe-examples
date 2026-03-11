import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryRecordTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
        refundRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord> {
    return {
      id: input.id,
      variant_id: input.variant.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      order_id: input.order?.id ?? null,
      cancellation_request_id: input.cancellationRequest?.id ?? null,
      refund_request_id: input.refundRequest?.id ?? null,
      seller_id: input.seller?.id ?? null,
    };
  }
}
