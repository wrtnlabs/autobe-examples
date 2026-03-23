import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        status: true,
        quantity: true,
        price: true,
        product_snapshot: true,
        variant_snapshot: true,
        seller_profile_snapshot: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
        shipmentItem: true,
        reviews: true,
        cancellationRequests: true,
        refundRequests: true,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      orderId: input.order.id,
      status: input.status,
      quantity: input.quantity,
      price: input.price,
      productSnapshot: JSON.parse(input.product_snapshot),
      variantSnapshot: JSON.parse(input.variant_snapshot),
      createdAt: input.created_at.toISOString(),
    };
  }
}
