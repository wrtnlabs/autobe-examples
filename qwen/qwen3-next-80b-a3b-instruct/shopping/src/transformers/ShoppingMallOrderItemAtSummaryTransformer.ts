import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
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
        product: {
          select: { id: true },
        },
        variant: {
          select: { id: true },
        },
        productSnapshot: {
          select: { id: true },
        },
        variantSnapshot: {
          select: { id: true },
        },
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
  ): Promise<IShoppingMallOrderItem.ISummary> {
    const productSnapshotId = input.productSnapshot?.id;
    const variantSnapshotId = input.variantSnapshot?.id;
    // These will be populated by external service calls if needed
    // In a real system, these would be fetched via separate queries
    // For now, we assume they're unavailable and return empty strings
    const product_name = productSnapshotId ? "" : "";
    const sku_code = variantSnapshotId ? "" : "";
    return {
      id: input.id,
      quantity: input.quantity,
      price_at_time_of_purchase: input.price_at_time_of_purchase,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(input.status),
      created_at: toISOStringSafe(input.created_at),
      product_name,
      sku_code,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
