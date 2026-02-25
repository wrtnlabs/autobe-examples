import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price_at_time_of_purchase: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: { id: true },
        },
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        product: ShoppingMallProductAtSummaryTransformer.select(),
        variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        productSnapshot: ShoppingMallProductAtSummaryTransformer.select(),
        variantSnapshot:
          ShoppingMallProductVariantAtSummaryTransformer.select(),
        snapshot: {
          select: { id: true },
        },
        orderItem: {
          select: { id: true },
        },
        review: {
          select: { id: true },
        },
        cancellationRequests: {
          select: { id: true },
        },
        refundRequests: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      orderId: input.order.id,
      sellerId: input.seller.id,
      productId: input.product.id,
      variantId: input.variant.id,
      productSnapshotId: input.productSnapshot.id,
      variantSnapshotId: input.variantSnapshot.id,
      quantity: input.quantity,
      priceAtTimeOfPurchase: input.price_at_time_of_purchase,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(input.status),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
    };
  }
}
